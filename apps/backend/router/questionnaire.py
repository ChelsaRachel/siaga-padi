"""Questionnaire routes — `GET /cases/{id}/questions`,
`POST /cases/{id}/answers` (pinned contract
`apps/web/docs/api-spec-triage.md`).

JWT-protected at the router level. Which questions a case gets, whether an
answer is allowed, and who is recorded as the FILLER are all decided
SERVER-SIDE — the client may submit any subset of the selected questions, and
anything outside that set is rejected with the contract's 400 envelope.
"""
from time import time

from fastapi import APIRouter, Depends

from dto.triage import SubmitAnswersDTO
from middleware.user_context import require_user
from models.base_response import BaseResponse
from models.metadata import MetadataSuccess
from service.questionnaire import QuestionnaireService
from util.helper import (
    custom_router_param_builder,
    get_execution_time,
    is_include_schema,
)
from util.siaga_response import siaga_error_response

obj = QuestionnaireService()
tag = "questionnaire"
# Nested under the /cases resource — a questionnaire belongs to a case.
router = APIRouter(**custom_router_param_builder(tags=[tag], prefix="/cases"))


@router.get(
    "/{case_id}/questions", include_in_schema=is_include_schema(tag, "get-questions")
)
def get_questions(case_id: str, user_id: str = Depends(require_user)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.get_questions(user_id, case_id),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post(
    "/{case_id}/answers", include_in_schema=is_include_schema(tag, "submit-answers")
)
def submit_answers(
    case_id: str, dto: SubmitAnswersDTO, user_id: str = Depends(require_user)
):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.submit_answers(user_id, case_id, dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)
