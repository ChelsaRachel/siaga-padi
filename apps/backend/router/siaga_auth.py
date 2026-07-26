"""Siaga Padi auth routes — `/siaga/auth/{login,refresh,me}`.

Public router (login/refresh need no token); `/me` carries its own bearer
dependency. Success wraps in BaseResponse; failures return the contract-exact
top-level envelope via `util.siaga_response`.
"""
import os
from time import time

from fastapi import APIRouter, Depends

from auth.auth_handler import decode_jwt
from dto.siaga_auth import SiagaLoginDTO, SiagaRefreshDTO
from exceptions.siaga_exceptions import SESSION_INVALID_MESSAGE
from middleware.role_guard import jwt_bearer
from models.base_response import BaseResponse
from models.metadata import MetadataSuccess
from service.siaga_auth import SiagaAuthService
from util.helper import get_execution_time, is_include_schema, router_param_builder
from util.siaga_response import siaga_error_response, siaga_failed_response

obj = SiagaAuthService()
tag = os.path.splitext(os.path.basename(os.path.abspath(__file__)))[0]
router = APIRouter(**router_param_builder(tag, jwt=False))

HTTP_UNAUTHORIZED = 401


@router.post("/login", include_in_schema=is_include_schema(tag, "login"))
def login(dto: SiagaLoginDTO):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.login(dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.post("/refresh", include_in_schema=is_include_schema(tag, "refresh"))
def refresh(dto: SiagaRefreshDTO):
    start_time = time()
    try:
        return BaseResponse(
            data=obj.refresh(dto),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)


@router.get("/me", include_in_schema=is_include_schema(tag, "me"))
def me(token: str = Depends(jwt_bearer)):
    start_time = time()
    payload = decode_jwt(token)
    if not isinstance(payload, dict) or not payload.get("user_id"):
        return siaga_failed_response(
            SESSION_INVALID_MESSAGE, HTTP_UNAUTHORIZED, start_time
        )
    try:
        return BaseResponse(
            data=obj.get_me(payload["user_id"]),
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        return siaga_error_response(error, start_time)
