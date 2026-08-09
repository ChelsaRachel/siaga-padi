"""KB ingest — extract a registered document, split it into reference chunks.

Pipeline (FR-011 §4.1): registered source → text extraction (PDF page by page,
or plain text/markdown section by section) → chunking with a location label
("Hal. 12", "§ Pengendalian") → auto-tagging → the review queue.

Two rules are absolute here:

1. Every produced chunk lands `menunggu`. Ingest NEVER approves anything — the
   domain reviewer is the only path into the active index.
2. The auto-tagger only SUGGESTS. A `policy_flag` detected at ingest is written
   so the queue shows it, but approval re-checks the content itself
   (`kb_governance`), so a wrong suggestion cannot open the narration gate.

Extraction is pure text work on the request thread: documents are curated by
hand, a handful per week (brief 06 §6.2 — no crawler in the MVP).
"""
import hashlib
import re
from typing import Optional

from loguru import logger

from dto.siaga_kb import KbIngestOut
from exceptions.siaga_exceptions import SiagaValidationError
from models.siaga_kb import (
    APPROVAL_MENUNGGU,
    AUDIENCE_PENYULUH,
    detect_action_type,
    detect_disease_tags,
    detect_phase_tags,
    detect_policy_flag,
    risk_for_policy_flag,
)
from service.kb_support import (
    AUDIT_CHUNKS_INGESTED,
    KbRepositoryProtocol,
    RefCodeAllocator,
    record_audit,
)
from service.siaga_case_support import new_id, now_iso

# Chunk sizing — a reference chunk must be quotable on a recommendation card
# yet keep enough context for a reviewer to judge it.
TARGET_CHUNK_CHARS = 700
MIN_CHUNK_CHARS = 80
MAX_CHUNK_CHARS = 1500
MAX_CHUNKS_PER_INGEST = 500
MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

PDF_CONTENT_TYPES = ("application/pdf",)
TEXT_CONTENT_TYPES = ("text/plain", "text/markdown", "text/x-markdown")
PDF_MAGIC = b"%PDF-"

EMPTY_DOCUMENT_MESSAGE = "Dokumen kosong — tidak ada teks yang bisa dipecah."
UNSUPPORTED_DOCUMENT_MESSAGE = "Format dokumen harus PDF, teks, atau markdown."
DOCUMENT_TOO_LARGE_MESSAGE = "Ukuran dokumen maksimal 10 MB."
PDF_READER_MISSING_MESSAGE = (
    "Pembaca PDF belum terpasang di server. Tempelkan teks dokumen sebagai "
    "gantinya."
)
PDF_UNREADABLE_MESSAGE = (
    "PDF tidak bisa dibaca (kemungkinan hasil pindaian tanpa teks). "
    "Tempelkan teks dokumen sebagai gantinya."
)

_HEADING_PATTERN = re.compile(r"^\s{0,3}(#{1,6})\s+(.+?)\s*$")
_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def extract_segments(
    data: bytes, content_type: Optional[str] = None
) -> list[tuple[str, str]]:
    """`[(location, text)]` for the document — one entry per page or section."""
    if not data:
        raise SiagaValidationError(EMPTY_DOCUMENT_MESSAGE)
    if len(data) > MAX_DOCUMENT_BYTES:
        raise SiagaValidationError(DOCUMENT_TOO_LARGE_MESSAGE)
    if data.startswith(PDF_MAGIC) or (content_type or "") in PDF_CONTENT_TYPES:
        return _extract_pdf_segments(data)
    return _extract_text_segments(_decode_text(data, content_type))


def _decode_text(data: bytes, content_type: Optional[str]) -> str:
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        if (content_type or "") in TEXT_CONTENT_TYPES:
            return data.decode("utf-8", errors="replace")
        raise SiagaValidationError(UNSUPPORTED_DOCUMENT_MESSAGE)


def _extract_pdf_segments(data: bytes) -> list[tuple[str, str]]:
    """One segment per PDF page, labelled `Hal. N` (brief 06 §5.1 location)."""
    try:
        from pypdf import PdfReader
    except ImportError:
        logger.error("pypdf missing — PDF ingest unavailable")
        raise SiagaValidationError(PDF_READER_MISSING_MESSAGE)
    from io import BytesIO

    try:
        reader = PdfReader(BytesIO(data))
        pages = [
            (page_no, page.extract_text() or "")
            for page_no, page in enumerate(reader.pages, start=1)
        ]
    except Exception as error:
        logger.warning(f"pdf extraction failed: {error}")
        raise SiagaValidationError(PDF_UNREADABLE_MESSAGE)
    segments = [
        (f"Hal. {page_no}", text.strip())
        for page_no, text in pages
        if text.strip()
    ]
    if not segments:
        raise SiagaValidationError(PDF_UNREADABLE_MESSAGE)
    return segments


def _extract_text_segments(text: str) -> list[tuple[str, str]]:
    """Markdown/plain text → one segment per heading, else one block."""
    segments: list[tuple[str, str]] = []
    current_location = "Bagian 1"
    buffer: list[str] = []

    def flush(location: str) -> None:
        body = "\n".join(buffer).strip()
        if body:
            segments.append((location, body))

    for line in text.splitlines():
        heading = _HEADING_PATTERN.match(line)
        if heading:
            flush(current_location)
            buffer = []
            current_location = f"§ {heading.group(2)}"
            continue
        buffer.append(line)
    flush(current_location)

    if not segments:
        raise SiagaValidationError(EMPTY_DOCUMENT_MESSAGE)
    return segments


def split_into_chunks(text: str) -> list[str]:
    """Paragraph-first splitting, bounded by `TARGET_CHUNK_CHARS`.

    Deterministic: the same document always produces the same chunk list, so a
    re-ingest of an unchanged edition yields comparable versions.
    """
    chunks: list[str] = []
    buffer = ""
    for paragraph in _PARAGRAPH_SPLIT.split(text):
        cleaned = " ".join(paragraph.split())
        if not cleaned:
            continue
        if len(cleaned) > MAX_CHUNK_CHARS:
            if buffer:
                chunks.append(buffer)
                buffer = ""
            chunks.extend(_split_long_paragraph(cleaned))
            continue
        candidate = f"{buffer}\n\n{cleaned}" if buffer else cleaned
        if len(candidate) <= TARGET_CHUNK_CHARS:
            buffer = candidate
            continue
        if buffer:
            chunks.append(buffer)
        buffer = cleaned
    if buffer:
        chunks.append(buffer)
    return [chunk for chunk in chunks if len(chunk) >= MIN_CHUNK_CHARS]


def _split_long_paragraph(paragraph: str) -> list[str]:
    """Sentence-boundary split for a paragraph past `MAX_CHUNK_CHARS`."""
    parts: list[str] = []
    buffer = ""
    for sentence in _SENTENCE_SPLIT.split(paragraph):
        candidate = f"{buffer} {sentence}".strip()
        if len(candidate) <= TARGET_CHUNK_CHARS or not buffer:
            buffer = candidate
            continue
        parts.append(buffer)
        buffer = sentence
    if buffer:
        parts.append(buffer)
    return parts


def build_chunk_row(
    allocator: RefCodeAllocator,
    source: dict,
    content: str,
    location: str,
    ordinal: int,
) -> dict:
    """One pending `kb_chunks` row with auto-suggested tags."""
    disease_tags = detect_disease_tags(content)
    policy_flag = detect_policy_flag(content)
    now = now_iso()
    return {
        "id": new_id(),
        "ref_code": allocator.allocate(disease_tags),
        "source_id": source["id"],
        "source_version": source.get("edition_version"),
        "location": location,
        "content": content,
        "disease_tags": disease_tags,
        "phase_tags": detect_phase_tags(content),
        "action_type": detect_action_type(content),
        # Ingest cannot know the intended reader — the reviewer sets it. The
        # safe default is penyuluh: nothing reaches petani unreviewed.
        "audience": AUDIENCE_PENYULUH,
        "risk": risk_for_policy_flag(policy_flag),
        "policy_flag": policy_flag,
        "approval_status": APPROVAL_MENUNGGU,
        "version": 1,
        "is_current": True,
        "ordinal": ordinal,
        "created_at": now,
        "updated_at": now,
    }


class KbIngestService:
    """Extract + chunk a registered source into the review queue."""

    def __init__(self, repo: Optional[KbRepositoryProtocol] = None) -> None:
        self._repo = repo

    @property
    def repo(self) -> KbRepositoryProtocol:
        if self._repo is None:
            from service.kb_support import KbRepository

            self._repo = KbRepository()
        return self._repo

    def ingest_document(
        self,
        actor_profile: dict,
        source: dict,
        data: bytes,
        content_type: Optional[str] = None,
    ) -> dict:
        """Ingest one document into `source`; returns the `KbIngestOut` dict."""
        segments = extract_segments(data, content_type)
        rows = self._build_rows(source, segments)
        if not rows:
            raise SiagaValidationError(EMPTY_DOCUMENT_MESSAGE)
        self.repo.insert_chunks(rows)
        fingerprint = hashlib.sha256(data).hexdigest()
        self.repo.update_source(
            source["id"],
            {"document_fingerprint": fingerprint, "updated_at": now_iso()},
        )
        record_audit(
            self.repo,
            entity_type="source",
            entity_id=source["id"],
            action=AUDIT_CHUNKS_INGESTED,
            actor_profile_id=actor_profile.get("id"),
            detail={"chunkCount": len(rows), "fingerprint": fingerprint},
        )
        logger.info(
            f"kb ingest: source={source['id']} chunks={len(rows)} "
            f"fingerprint={fingerprint[:12]}"
        )
        return KbIngestOut(
            sourceId=source["id"],
            chunkCount=len(rows),
            pendingCount=len(rows),
            refCodes=[row["ref_code"] for row in rows],
        ).model_dump()

    def _build_rows(
        self, source: dict, segments: list[tuple[str, str]]
    ) -> list[dict]:
        """Chunk every segment, continuing the source's existing ordinals."""
        existing, _ = self.repo.find_chunks(
            {"source_id": source["id"]}, page=1, limit=MAX_CHUNKS_PER_INGEST
        )
        ordinal = (
            max((row.get("ordinal") or 0) for row in existing) + 1
            if existing
            else 0
        )
        allocator = RefCodeAllocator(self.repo)
        rows: list[dict] = []
        for location, text in segments:
            for chunk in split_into_chunks(text):
                if len(rows) >= MAX_CHUNKS_PER_INGEST:
                    logger.warning(
                        f"kb ingest truncated at {MAX_CHUNKS_PER_INGEST} "
                        f"chunks: source={source['id']}"
                    )
                    return rows
                rows.append(
                    build_chunk_row(allocator, source, chunk, location, ordinal)
                )
                ordinal += 1
        return rows
