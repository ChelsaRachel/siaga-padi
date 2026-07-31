"""Case-photo routes — `POST /cases/{id}/photos` (multipart upload),
`GET /cases/{id}/photos`, `POST /cases/{id}/photos/escalate`
(pinned contract `apps/web/docs/api-spec-photo.md`).

JWT-protected at the router level; ownership/visibility scoping happens
SERVER-SIDE in the service. Sync `def` handlers on purpose: Pillow/numpy
quality checks run on the threadpool, never blocking the event loop.
Success wraps in BaseResponse; failures return the contract-exact top-level
envelope via `util.siaga_response`.
"""
from time import time

from fastapi import APIRouter, Depends, File, Form, UploadFile

from middleware.user_context import require_user
from models.base_response import BaseResponse
from models.metadata import MetadataSuccess
from service.photos import PhotoService
from util.helper import (
    custom_router_param_builder,
    get_execution_time,
    is_include_schema,
)
from util.siaga_response import siaga_error_response

obj = PhotoService()
tag = "photos"
# Nested under the /cases resource — photos belong to a case.
router = APIRouter(**custom_router_param_builder(tags=[tag], prefix="/cases"))


@router.post(
    "/{case_id}/photos", include_in_schema=is_include_schema(tag, "upload")
)
def upload_photo(
    case_id: str,
    file: UploadFile = File(...),
    slotNo: int = Form(...),
    user_id: str = Depends(require_user),
):
    start_time = time()
    try:
        data = file.file.read()
        return BaseResponse(
            data=obj.upload_photo(
                user_id, case_id, slotNo, file.content_type, data
            ),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.get(
    "/{case_id}/photos", include_in_schema=is_include_schema(tag, "list")
)
def list_photos(case_id: str, user_id: str = Depends(require_user)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.list_photos(user_id, case_id),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post(
    "/{case_id}/photos/escalate",
    include_in_schema=is_include_schema(tag, "escalate"),
)
def escalate(case_id: str, user_id: str = Depends(require_user)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.escalate(user_id, case_id),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)
