"""Knowledge-base governance routes — source catalog, ingest, chunk review,
version diff, retirement (pinned contract `apps/web/docs/api-spec-kb.md`).

Role split (brief 06 §1.2), enforced by the guard dependency, not in code:
- **admin** curates the catalog: register/edit/ingest/retire sources.
- **domain_reviewer** decides content: approve/reject chunks.
- Both may browse the catalog, the queue and the diff view.
- The read-only chunk preview by ref code is open to ANY signed-in role — the
  Sprint 05 recommendation drawer links petani/penyuluh straight to it, and it
  only ever resolves approved chunks.

Success wraps in BaseResponse; failures return the contract-exact top-level
envelope via `util.siaga_response`.
"""
from time import time
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile

from dto.kb import (
    ApproveKbChunkDTO,
    FindKbChunksDTO,
    FindKbSourcesDTO,
    RegisterKbSourceDTO,
    RejectKbChunkDTO,
    RetireKbSourceDTO,
    ReviseKbChunkDTO,
    UpdateKbSourceDTO,
)
from exceptions.siaga_exceptions import SiagaValidationError
from middleware.role_guard import require_role
from middleware.user_context import require_user
from models.base_response import BaseResponse
from models.metadata import MetadataSuccess
from models.pagination import Pagination
from service.kb_governance import KbGovernanceService
from util.helper import (
    custom_router_param_builder,
    get_execution_time,
    is_include_schema,
)
from util.siaga_response import siaga_error_response

obj = KbGovernanceService()
tag = "kb"
router = APIRouter(**custom_router_param_builder(tags=[tag], prefix="/kb"))

require_admin = require_role("admin")
require_reviewer = require_role("domain_reviewer")
require_curator = require_role("admin", "domain_reviewer")

INGEST_INPUT_REQUIRED_MESSAGE = "Unggah berkas dokumen atau tempelkan teksnya."


# ---- sources -------------------------------------------------------------------


@router.post("/sources", include_in_schema=is_include_schema(tag, "add-source"))
def register_source(dto: RegisterKbSourceDTO, ctx: dict = Depends(require_admin)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.register_source(ctx["profile"], dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post(
    "/sources/get-all", include_in_schema=is_include_schema(tag, "get-all-sources")
)
def get_all_sources(dto: FindKbSourcesDTO, ctx: dict = Depends(require_curator)):
    start_time = time()
    try:
        data, count = obj.list_sources(dto)
        return BaseResponse(
            data=data,
            metaData=MetadataSuccess(
                pagination=Pagination.count_total_pages(dto.limit, count),
                executionTime=get_execution_time(start_time),
            ),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.get(
    "/sources/{source_id}", include_in_schema=is_include_schema(tag, "get-source")
)
def get_source(source_id: str, ctx: dict = Depends(require_curator)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.get_source(source_id),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.patch(
    "/sources/{source_id}", include_in_schema=is_include_schema(tag, "update-source")
)
def update_source(
    source_id: str, dto: UpdateKbSourceDTO, ctx: dict = Depends(require_admin)
):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.update_source(ctx["profile"], source_id, dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


def _read_ingest_input(
    file: Optional[UploadFile], content: Optional[str]
) -> tuple[bytes, Optional[str]]:
    """Bytes + content type from whichever half of the form was filled in."""
    if file is not None:
        return file.file.read(), file.content_type
    if (content or "").strip():
        return content.encode("utf-8"), "text/plain"
    raise SiagaValidationError(INGEST_INPUT_REQUIRED_MESSAGE)


@router.post(
    "/sources/{source_id}/ingest", include_in_schema=is_include_schema(tag, "ingest")
)
def ingest_source(
    source_id: str,
    file: Optional[UploadFile] = File(default=None),
    content: Optional[str] = Form(default=None),
    ctx: dict = Depends(require_admin),
):
    """Multipart: a document `file` (PDF/text/markdown) OR pasted `content`.

    Sync `def` on purpose — PDF text extraction runs on the threadpool, never
    blocking the event loop (same reasoning as the photo upload route).
    """
    start_time = time()
    try:
        data, content_type = _read_ingest_input(file, content)
        return BaseResponse(
            data=obj.ingest_source(ctx["profile"], source_id, data, content_type),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post(
    "/sources/{source_id}/retire", include_in_schema=is_include_schema(tag, "retire")
)
def retire_source(
    source_id: str, dto: RetireKbSourceDTO, ctx: dict = Depends(require_admin)
):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.retire_source(ctx["profile"], source_id, dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


# ---- chunks ---------------------------------------------------------------------


@router.post(
    "/chunks/get-all", include_in_schema=is_include_schema(tag, "get-all-chunks")
)
def get_all_chunks(dto: FindKbChunksDTO, ctx: dict = Depends(require_curator)):
    start_time = time()
    try:
        data, count = obj.list_chunks(dto)
        return BaseResponse(
            data=data,
            metaData=MetadataSuccess(
                pagination=Pagination.count_total_pages(dto.limit, count),
                executionTime=get_execution_time(start_time),
            ),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.get(
    "/chunks/ref/{ref_code}/diff", include_in_schema=is_include_schema(tag, "diff")
)
def diff_chunk(
    ref_code: str,
    baseVersion: Optional[int] = None,
    compareVersion: Optional[int] = None,
    ctx: dict = Depends(require_curator),
):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.diff_chunk(ref_code, baseVersion, compareVersion),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.get(
    "/chunks/ref/{ref_code}", include_in_schema=is_include_schema(tag, "get-by-ref")
)
def get_chunk_by_ref(
    ref_code: str,
    version: Optional[int] = None,
    user_id: str = Depends(require_user),
):
    """Read-only preview for ANY signed-in role — the citation target.

    Historical versions stay resolvable (`isCurrent: false` drives the
    "versi lama — sudah diperbarui/dipensiunkan" label).
    """
    start_time = time()
    try:
        return BaseResponse(
            data=obj.get_chunk_by_ref(ref_code, version),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.get(
    "/chunks/{chunk_id}", include_in_schema=is_include_schema(tag, "get-chunk")
)
def get_chunk(chunk_id: str, ctx: dict = Depends(require_curator)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.get_chunk(chunk_id),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post(
    "/chunks/{chunk_id}/approve", include_in_schema=is_include_schema(tag, "approve")
)
def approve_chunk(
    chunk_id: str, dto: ApproveKbChunkDTO, ctx: dict = Depends(require_reviewer)
):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.approve_chunk(ctx["profile"], chunk_id, dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post(
    "/chunks/{chunk_id}/reject", include_in_schema=is_include_schema(tag, "reject")
)
def reject_chunk(
    chunk_id: str, dto: RejectKbChunkDTO, ctx: dict = Depends(require_reviewer)
):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.reject_chunk(ctx["profile"], chunk_id, dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post(
    "/chunks/{chunk_id}/revise", include_in_schema=is_include_schema(tag, "revise")
)
def revise_chunk(
    chunk_id: str, dto: ReviseKbChunkDTO, ctx: dict = Depends(require_curator)
):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.revise_chunk(ctx["profile"], chunk_id, dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)
