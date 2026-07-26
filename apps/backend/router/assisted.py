"""Assisted-mode routes — `/assisted/{search,start,end}` (penyuluh only).

JWT-protected at the router level (boilerplate default); every endpoint
additionally requires the `penyuluh` role via `require_role`. Success wraps in
BaseResponse; endpoint-level failures return the contract-exact top-level
envelope via `util.siaga_response`.
"""
import os
from time import time

from fastapi import APIRouter, Depends

from dto.assisted import AssistedEndDTO, AssistedSearchDTO, AssistedStartDTO
from middleware.role_guard import require_role
from models.base_response import BaseResponse
from models.metadata import MetadataSuccess
from models.siaga_profile import ROLE_PENYULUH
from service.assisted import AssistedService
from util.helper import get_execution_time, is_include_schema, router_param_builder
from util.siaga_response import siaga_error_response

obj = AssistedService()
tag = os.path.splitext(os.path.basename(os.path.abspath(__file__)))[0]
router = APIRouter(**router_param_builder(tag))

require_penyuluh = require_role(ROLE_PENYULUH)


@router.post("/search", include_in_schema=is_include_schema(tag, "search"))
def search(dto: AssistedSearchDTO, ctx: dict = Depends(require_penyuluh)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.search(ctx["user_id"], dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post("/start", include_in_schema=is_include_schema(tag, "start"))
def start(dto: AssistedStartDTO, ctx: dict = Depends(require_penyuluh)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.start(ctx["user_id"], dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post("/end", include_in_schema=is_include_schema(tag, "end"))
def end(dto: AssistedEndDTO, ctx: dict = Depends(require_penyuluh)):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.end(ctx["user_id"], dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)
