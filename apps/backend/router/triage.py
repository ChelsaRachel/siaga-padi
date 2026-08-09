"""Analysis routes — `POST /cases/{id}/analysis`, `GET /cases/{id}/analysis`
(pinned contract `apps/web/docs/api-spec-triage.md`).

JWT-protected at the router level; ownership/visibility scoping AND the role
split (petani never receives scores or evidence maps) happen SERVER-SIDE in the
service and DTO layers. Sync `def` handlers on purpose: the model call runs on
the threadpool, never blocking the event loop — same reasoning as the photo
quality gate.

`POST` is idempotent: a case that already holds a result returns it unchanged,
because `analysis_results` is immutable by design.
"""
from time import time

from fastapi import APIRouter, Depends

from dto.triage import RunAnalysisDTO
from middleware.user_context import require_user
from models.base_response import BaseResponse
from models.metadata import MetadataSuccess
from service.triage_pipeline import TriagePipelineService
from util.helper import (
    custom_router_param_builder,
    get_execution_time,
    is_include_schema,
)
from util.siaga_response import siaga_error_response

obj = TriagePipelineService()
tag = "triage"
# Nested under the /cases resource — an analysis belongs to a case.
router = APIRouter(**custom_router_param_builder(tags=[tag], prefix="/cases"))


@router.post(
    "/{case_id}/analysis", include_in_schema=is_include_schema(tag, "run-analysis")
)
def run_analysis(
    case_id: str,
    dto: RunAnalysisDTO = RunAnalysisDTO(),
    user_id: str = Depends(require_user),
):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.run_analysis(user_id, case_id),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.get(
    "/{case_id}/analysis", include_in_schema=is_include_schema(tag, "get-analysis")
)
def get_analysis(case_id: str, user_id: str = Depends(require_user)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.get_analysis(user_id, case_id),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)
