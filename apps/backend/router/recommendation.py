"""Recommendation routes — `POST /cases/{id}/recommendation`,
`GET /cases/{id}/recommendation` (pinned contract
`apps/web/docs/api-spec-triage.md`).

JWT-protected at the router level. The provider call, the safety checker and
the role split all run SERVER-SIDE; a petani response carries no technical view
and no provider/model versions at all.

Sync `def` handlers on purpose: the provider call is a blocking HTTP request
that belongs on the threadpool, not on the event loop.

`POST` is idempotent — a case that already has a card returns it rather than
paying for a second provider call.
"""
from time import time

from fastapi import APIRouter, Depends

from dto.triage import ComposeRecommendationDTO
from middleware.user_context import require_user
from models.base_response import BaseResponse
from models.metadata import MetadataSuccess
from service.recommendation import RecommendationService
from util.helper import (
    custom_router_param_builder,
    get_execution_time,
    is_include_schema,
)
from util.siaga_response import siaga_error_response

obj = RecommendationService()
tag = "recommendation"
# Nested under the /cases resource — a recommendation belongs to a case.
router = APIRouter(**custom_router_param_builder(tags=[tag], prefix="/cases"))


@router.post(
    "/{case_id}/recommendation", include_in_schema=is_include_schema(tag, "compose")
)
def compose_recommendation(
    case_id: str,
    dto: ComposeRecommendationDTO = ComposeRecommendationDTO(),
    user_id: str = Depends(require_user),
):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.compose(user_id, case_id),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.get(
    "/{case_id}/recommendation", include_in_schema=is_include_schema(tag, "get-one")
)
def get_recommendation(case_id: str, user_id: str = Depends(require_user)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.get_recommendation(user_id, case_id),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)
