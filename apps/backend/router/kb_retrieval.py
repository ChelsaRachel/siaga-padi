"""Knowledge-base retrieval routes (pinned contract
`apps/web/docs/api-spec-kb.md`).

Two doors onto the SAME ranked read of the active index:

- `POST /kb/retrieval` — the runtime door. Sprint 05's recommendation engine
  calls it service-to-service with `X-Internal-Token` (no user identity), so
  the router carries no blanket JWT dependency; a curator JWT is also accepted
  for debugging.
- `POST /kb/retrieval-test` — the curation door. Admin/domain_reviewer run
  "Blas Daun fase anakan → rujukan apa yang terambil?" BEFORE activating a
  version. Logged under the `uji` channel so test traffic never pollutes the
  runtime retrieval record.
"""
from time import time

from fastapi import APIRouter, Depends

from dto.kb import KbRetrievalQueryDTO
from middleware.role_guard import require_internal_or_role, require_role
from models.base_response import BaseResponse
from models.metadata import MetadataSuccess
from service.kb_retrieval import CHANNEL_RUNTIME, CHANNEL_TEST, KbRetrievalService
from util.helper import (
    custom_router_param_builder,
    get_execution_time,
    is_include_schema,
)
from util.siaga_response import siaga_error_response

obj = KbRetrievalService()
tag = "kb_retrieval"
# jwt=False: the runtime endpoint authenticates with the internal token, so the
# guard lives on each route instead of the router.
router = APIRouter(
    **custom_router_param_builder(tags=[tag], prefix="/kb", jwt=False)
)

require_runtime_caller = require_internal_or_role("admin", "domain_reviewer")
require_curator = require_role("admin", "domain_reviewer")


@router.post("/retrieval", include_in_schema=is_include_schema(tag, "retrieval"))
def retrieval(dto: KbRetrievalQueryDTO, ctx: dict = Depends(require_runtime_caller)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.retrieve(dto, CHANNEL_RUNTIME, ctx.get("profile")),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post(
    "/retrieval-test", include_in_schema=is_include_schema(tag, "retrieval-test")
)
def retrieval_test(dto: KbRetrievalQueryDTO, ctx: dict = Depends(require_curator)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.retrieve(dto, CHANNEL_TEST, ctx.get("profile")),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)
