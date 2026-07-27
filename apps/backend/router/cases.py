"""Case routes — `POST /cases`, `POST /cases/get-all`, `GET /cases/{id}`,
`GET /cases/{id}/timeline` (pinned contract `apps/web/docs/api-spec-case.md`).

JWT-protected at the router level (boilerplate default); any authenticated
role may call — visibility scoping happens SERVER-SIDE in the service.
Success wraps in BaseResponse; failures return the contract-exact top-level
envelope via `util.siaga_response`.
"""
import os
from time import time
from typing import Optional

from fastapi import APIRouter, Depends, Header

from dto.cases import CreateCaseDTO, FindCasesDTO
from middleware.user_context import require_user
from models.base_response import BaseResponse
from models.metadata import MetadataSuccess
from models.pagination import Pagination
from service.cases import CaseService
from util.helper import get_execution_time, is_include_schema, router_param_builder
from util.siaga_response import siaga_error_response

obj = CaseService()
tag = os.path.splitext(os.path.basename(os.path.abspath(__file__)))[0]
router = APIRouter(**router_param_builder(tag))


@router.post("", include_in_schema=is_include_schema(tag, "add"))
def create_case(
    dto: CreateCaseDTO,
    user_id: str = Depends(require_user),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.create_case(user_id, idempotency_key, dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post("/get-all", include_in_schema=is_include_schema(tag, "get-all"))
def get_all(dto: FindCasesDTO, user_id: str = Depends(require_user)):
    start_time = time()
    try:
        data, count = obj.list_cases(user_id, dto)
        return BaseResponse(
            data=data,
            metaData=MetadataSuccess(
                pagination=Pagination.count_total_pages(dto.limit, count),
                executionTime=get_execution_time(start_time),
            ),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.get("/{case_id}", include_in_schema=is_include_schema(tag, "get-one"))
def get_one(case_id: str, user_id: str = Depends(require_user)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.get_case(user_id, case_id),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.get(
    "/{case_id}/timeline", include_in_schema=is_include_schema(tag, "timeline")
)
def timeline(case_id: str, user_id: str = Depends(require_user)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.get_timeline(user_id, case_id),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)
