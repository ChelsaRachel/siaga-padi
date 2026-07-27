"""Farmer profile routes — `/farmer/profile{,/fields,/fields/get-all,
/deletion-request}` (pinned contract `apps/web/docs/api-spec-case.md`).

JWT-protected at the router level (boilerplate default); every operation is
scoped to the CALLER's own profile in the service (assisted mode acts for the
session's subject petani). Success wraps in BaseResponse; failures return the
contract-exact top-level envelope via `util.siaga_response`.
"""
import os
from time import time

from fastapi import APIRouter, Depends

from dto.farmer_profile import (
    CreateFarmerFieldDTO,
    DeletionRequestDTO,
    FindFarmerFieldsDTO,
    UpdateFarmerFieldDTO,
    UpdateFarmerProfileDTO,
)
from middleware.user_context import require_user
from models.base_response import BaseResponse
from models.metadata import MetadataSuccess
from models.pagination import Pagination
from service.farmer_profile import FarmerProfileService
from util.helper import get_execution_time, is_include_schema, router_param_builder
from util.siaga_response import siaga_error_response

obj = FarmerProfileService()
tag = os.path.splitext(os.path.basename(os.path.abspath(__file__)))[0]
router = APIRouter(**router_param_builder(tag))


@router.put("", include_in_schema=is_include_schema(tag, "update"))
def update_profile(dto: UpdateFarmerProfileDTO, user_id: str = Depends(require_user)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.update_profile(user_id, dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post("/fields", include_in_schema=is_include_schema(tag, "fields-add"))
def create_field(dto: CreateFarmerFieldDTO, user_id: str = Depends(require_user)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.create_field(user_id, dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.put("/fields", include_in_schema=is_include_schema(tag, "fields-update"))
def update_field(dto: UpdateFarmerFieldDTO, user_id: str = Depends(require_user)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.update_field(user_id, dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post(
    "/fields/get-all", include_in_schema=is_include_schema(tag, "fields-get-all")
)
def get_all_fields(dto: FindFarmerFieldsDTO, user_id: str = Depends(require_user)):
    start_time = time()
    try:
        data, count = obj.list_fields(user_id, dto)
        return BaseResponse(
            data=data,
            metaData=MetadataSuccess(
                pagination=Pagination.count_total_pages(dto.limit, count),
                executionTime=get_execution_time(start_time),
            ),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post(
    "/deletion-request",
    include_in_schema=is_include_schema(tag, "deletion-request-add"),
)
def create_deletion_request(
    dto: DeletionRequestDTO, user_id: str = Depends(require_user)
):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.create_deletion_request(user_id, dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.get(
    "/deletion-request",
    include_in_schema=is_include_schema(tag, "deletion-request-get"),
)
def get_deletion_request(user_id: str = Depends(require_user)):
    start_time = time()
    try:
        # `data` may be null per contract — model_construct skips the envelope
        # validator that cannot take None.
        return BaseResponse.model_construct(
            data=obj.get_latest_deletion_request(user_id),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)
