"""Row-shape models and the FR-011 knowledge-base vocabulary.

Mirrors `supabase/migrations/0012_knowledge_base.sql` (snake_case columns).
FE-facing camelCase DTOs live in `dto/siaga_kb.py`.

Everything here is PURE: the tag/policy detectors take text and return values
with no I/O, so the ingest pipeline and the governance approval gate share one
implementation (and one set of unit tests) instead of drifting apart.

Domain values are the Indonesian vocabulary from brief 06 §5.1 — stored as-is,
same convention as case photos (no canonical/display split).
"""
import re
from typing import Optional

from pydantic import BaseModel

# ---- source lifecycle (brief 06 §5.1) ---------------------------------------

SOURCE_STATUS_DRAF = "draf"
SOURCE_STATUS_DISETUJUI = "disetujui"
SOURCE_STATUS_DIPENSIUNKAN = "dipensiunkan"

SOURCE_STATUSES = (
    SOURCE_STATUS_DRAF,
    SOURCE_STATUS_DISETUJUI,
    SOURCE_STATUS_DIPENSIUNKAN,
)

AVAILABILITY_TERSEDIA = "tersedia"
AVAILABILITY_ARSIP = "arsip"  # original offline; a legal copy is held
AVAILABILITY_TIDAK_TERSEDIA = "tidak_tersedia"

AVAILABILITY_STATUSES = (
    AVAILABILITY_TERSEDIA,
    AVAILABILITY_ARSIP,
    AVAILABILITY_TIDAK_TERSEDIA,
)

# ---- chunk approval (brief 06 §2.2) ------------------------------------------

APPROVAL_MENUNGGU = "menunggu"
APPROVAL_DISETUJUI = "disetujui"
APPROVAL_DITOLAK = "ditolak"

APPROVAL_STATUSES = (APPROVAL_MENUNGGU, APPROVAL_DISETUJUI, APPROVAL_DITOLAK)

AUDIENCE_PETANI = "petani"
AUDIENCE_PENYULUH = "penyuluh"
AUDIENCES = (AUDIENCE_PETANI, AUDIENCE_PENYULUH)

RISK_AMAN = "aman"
RISK_DIBATASI = "dibatasi"
RISKS = (RISK_AMAN, RISK_DIBATASI)

# ---- policy flags (FR-011 narration control) ---------------------------------

POLICY_FLAG_DOSIS = "memuat_dosis"
POLICY_FLAG_MEREK = "memuat_merek"
POLICY_FLAG_DOSIS_DAN_MEREK = "memuat_dosis_dan_merek"

POLICY_FLAGS = (
    POLICY_FLAG_DOSIS,
    POLICY_FLAG_MEREK,
    POLICY_FLAG_DOSIS_DAN_MEREK,
)

# ---- content tags -------------------------------------------------------------

ACTION_KULTUR_TEKNIS = "kultur_teknis"
ACTION_KIMIAWI = "kimiawi"
ACTION_BIOLOGIS = "biologis"
ACTION_PENCEGAHAN = "pencegahan"
ACTION_PEMANTAUAN = "pemantauan"
ACTION_ESKALASI = "eskalasi"

ACTION_TYPES = (
    ACTION_KULTUR_TEKNIS,
    ACTION_KIMIAWI,
    ACTION_BIOLOGIS,
    ACTION_PENCEGAHAN,
    ACTION_PEMANTAUAN,
    ACTION_ESKALASI,
)

DISEASE_UMUM = "umum"

# tag -> (ref_code token, keyword aliases). Keywords are matched case-folded on
# word boundaries, so "blas" never fires inside another word.
DISEASE_VOCABULARY: dict[str, tuple[str, tuple[str, ...]]] = {
    "blas_daun": ("BLAS", ("blas daun", "blast daun", "pyricularia", "blas")),
    "blas_leher": ("BLASLHR", ("blas leher", "busuk leher malai", "neck blast")),
    "hawar_daun_bakteri": (
        "HDB",
        ("hawar daun bakteri", "hdb", "kresek", "xanthomonas"),
    ),
    "tungro": ("TUNGRO", ("tungro", "virus tungro")),
    "kerdil_rumput": ("KERDIL", ("kerdil rumput", "kerdil hampa", "grassy stunt")),
    "bercak_coklat": (
        "BERCAK",
        ("bercak coklat", "bercak cokelat", "helminthosporium"),
    ),
    "busuk_batang": ("BUSUK", ("busuk batang", "busuk pelepah")),
    "wereng_batang_coklat": (
        "WERENG",
        ("wereng batang coklat", "wereng coklat", "wbc", "wereng"),
    ),
    "penggerek_batang": ("PGGR", ("penggerek batang", "sundep", "beluk")),
    "tikus_sawah": ("TIKUS", ("tikus sawah", "tikus")),
}

# Growth phases the retrieval test filters on (FRD growth-stage vocabulary).
PHASE_VOCABULARY: dict[str, tuple[str, ...]] = {
    "persemaian": ("persemaian", "pesemaian", "benih", "bibit"),
    "vegetatif": ("vegetatif", "anakan", "pertunasan", "tanam pindah"),
    "generatif": ("generatif", "bunting", "berbunga", "primordia", "malai"),
    "pemasakan": ("pemasakan", "masak susu", "menjelang panen", "panen"),
}

ACTION_VOCABULARY: dict[str, tuple[str, ...]] = {
    ACTION_KIMIAWI: (
        "fungisida",
        "insektisida",
        "pestisida",
        "bakterisida",
        "semprot",
    ),
    ACTION_BIOLOGIS: ("agens hayati", "trichoderma", "musuh alami", "biopestisida"),
    ACTION_PENCEGAHAN: ("varietas tahan", "pencegahan", "sanitasi", "benih sehat"),
    ACTION_PEMANTAUAN: ("pengamatan", "pemantauan", "monitoring", "gejala awal"),
    ACTION_ESKALASI: ("laporkan", "petugas popt", "eskalasi", "hubungi penyuluh"),
    ACTION_KULTUR_TEKNIS: ("pemupukan", "pengairan", "jarak tanam", "kultur teknis"),
}

# ---- policy detection ---------------------------------------------------------

# A number followed by a dosing unit — "2 ml/l", "300 g/ha", "1,5 kg per hektar".
_DOSAGE_PATTERN = re.compile(
    r"\b\d+([.,]\d+)?\s*"
    r"(ml|cc|liter|gram|kg|mg|g|l)\b\s*"
    r"(/|per\s+)?\s*"
    r"(liter|hektar|tangki|petak|ha|m2|l)?",
    re.IGNORECASE,
)
_DOSAGE_KEYWORDS = ("dosis", "takaran", "konsentrasi", "aplikasi per hektar")

_BRAND_MARKERS = ("®", "™", "merek dagang", "nama dagang", "merk dagang")
# Trade names that appear in Indonesian rice guidance. Extendable — the reviewer
# can always set the flag by hand; detection only makes the approval gate fire
# automatically for the obvious cases.
_BRAND_TOKENS = (
    "score",
    "nativo",
    "filia",
    "amistartop",
    "regent",
    "furadan",
    "virtako",
    "plenum",
)

MAX_REF_CODE_SEQUENCE = 999


def _normalize(text: str) -> str:
    return (text or "").casefold()


def _contains_word(haystack: str, needle: str) -> bool:
    """Word-boundary containment on already case-folded text."""
    return re.search(rf"(?<!\w){re.escape(needle)}(?!\w)", haystack) is not None


def detect_disease_tags(content: str) -> list[str]:
    """Disease tags mentioned in the chunk, in vocabulary order (stable)."""
    text = _normalize(content)
    return [
        tag
        for tag, (_, keywords) in DISEASE_VOCABULARY.items()
        if any(_contains_word(text, keyword) for keyword in keywords)
    ]


def detect_phase_tags(content: str) -> list[str]:
    """Growth phases mentioned in the chunk, in vocabulary order (stable)."""
    text = _normalize(content)
    return [
        phase
        for phase, keywords in PHASE_VOCABULARY.items()
        if any(_contains_word(text, keyword) for keyword in keywords)
    ]


def detect_action_type(content: str) -> Optional[str]:
    """Best-matching action type, or None when nothing matches."""
    text = _normalize(content)
    for action, keywords in ACTION_VOCABULARY.items():
        if any(_contains_word(text, keyword) for keyword in keywords):
            return action
    return None


def has_dosage_content(content: str) -> bool:
    """True when the text carries a concrete dose (number + unit) or names one."""
    text = _normalize(content)
    if any(keyword in text for keyword in _DOSAGE_KEYWORDS):
        return True
    return _DOSAGE_PATTERN.search(text) is not None


def has_brand_content(content: str) -> bool:
    """True when the text names a commercial product or carries a TM marker."""
    text = _normalize(content)
    if any(marker in text for marker in _BRAND_MARKERS):
        return True
    return any(_contains_word(text, token) for token in _BRAND_TOKENS)


def detect_policy_flag(content: str) -> Optional[str]:
    """The policy flag the content REQUIRES, or None when it carries neither.

    Single source shared by the ingest pipeline and the approval gate: a chunk
    this function flags cannot be approved without a policy flag.
    """
    dosage = has_dosage_content(content)
    brand = has_brand_content(content)
    if dosage and brand:
        return POLICY_FLAG_DOSIS_DAN_MEREK
    if dosage:
        return POLICY_FLAG_DOSIS
    if brand:
        return POLICY_FLAG_MEREK
    return None


def risk_for_policy_flag(policy_flag: Optional[str]) -> str:
    """Policy-flagged content is restricted; everything else is safe to narrate."""
    return RISK_DIBATASI if policy_flag else RISK_AMAN


def ref_code_token(disease_tags: list[str]) -> str:
    """Ref-code segment for a chunk — first matching disease, else UMUM."""
    for tag in disease_tags:
        entry = DISEASE_VOCABULARY.get(tag)
        if entry:
            return entry[0]
    return DISEASE_UMUM.upper()


def build_ref_code(disease_tags: list[str], sequence: int) -> str:
    """Stable reference code, e.g. `RUJ-BLAS-004` (brief 06 §5.1)."""
    return f"RUJ-{ref_code_token(disease_tags)}-{sequence:03d}"


# ---- row models ---------------------------------------------------------------


class KbSourceModel(BaseModel):
    """One row of `kb_sources`."""

    id: str
    title: str
    publisher: str
    published_date: Optional[str] = None
    edition_version: Optional[str] = None
    license_note: str
    category: Optional[str] = None
    source_url: Optional[str] = None
    status: str = SOURCE_STATUS_DRAF
    availability_status: str = AVAILABILITY_TERSEDIA
    document_fingerprint: Optional[str] = None
    last_reviewed_at: Optional[str] = None
    retired_at: Optional[str] = None
    registered_by_profile_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class KbChunkModel(BaseModel):
    """One row of `kb_chunks` — ONE version of one reference chunk."""

    id: str
    ref_code: str
    source_id: str
    source_version: Optional[str] = None
    location: Optional[str] = None
    content: str
    disease_tags: list[str] = []
    phase_tags: list[str] = []
    action_type: Optional[str] = None
    audience: str = AUDIENCE_PENYULUH
    risk: str = RISK_AMAN
    policy_flag: Optional[str] = None
    approval_status: str = APPROVAL_MENUNGGU
    reject_reason: Optional[str] = None
    decided_by_profile_id: Optional[str] = None
    decided_at: Optional[str] = None
    version: int = 1
    is_current: bool = True
    valid_until: Optional[str] = None
    ordinal: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
