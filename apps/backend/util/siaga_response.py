"""Failure-envelope builders for the Siaga Padi routers.

The pinned FE↔BE contract (`apps/web/docs/api-spec.md`) requires failures to
return the SAME top-level envelope as successes (`metaData.status=false`,
`metaData.responseCode` mirroring the HTTP status, optional `additionalInfo`).
Returning a JSONResponse keeps the envelope at the top level of the body.
"""
import time
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from loguru import logger

from exceptions.siaga_exceptions import SiagaError
from models.base_response import BaseResponseFailed
from models.metadata import MetadataFailed
from util.helper import get_execution_time

SERVER_ERROR_MESSAGE = "Terjadi kesalahan pada server. Silakan coba lagi."
HTTP_INTERNAL_SERVER_ERROR = 500


def siaga_failed_response(
    message: str,
    status_code: int,
    start_time: float,
    additional_info: Optional[dict] = None,
) -> JSONResponse:
    """Build a contract-exact failure envelope with the given HTTP status."""
    body = BaseResponseFailed(
        metaData=MetadataFailed(
            executionTime=get_execution_time(start_time),
            responseCode=status_code,
            message=message,
        ),
        additionalInfo=additional_info,
    ).dict()
    return JSONResponse(status_code=status_code, content=body)


def siaga_error_response(error: Exception, start_time: float) -> JSONResponse:
    """Map a service exception to the failure envelope.

    Domain errors carry their own status/message; anything else becomes a
    generic 500 (never leak internals to the client).
    """
    if isinstance(error, SiagaError):
        return siaga_failed_response(
            error.message, error.status_code, start_time, error.additional_info
        )
    logger.exception(f"unhandled error in siaga route: {error}")
    return siaga_failed_response(
        SERVER_ERROR_MESSAGE, HTTP_INTERNAL_SERVER_ERROR, start_time
    )


def register_siaga_exception_handlers(app: FastAPI) -> None:
    """Render `SiagaError` raised anywhere (incl. dependencies) as the
    contract's top-level failure envelope.

    Dependencies like `middleware.role_guard.require_role` cannot return a
    JSONResponse, so they raise domain errors and this handler serializes
    them — keeping guard rejections byte-compatible with router failures.
    """

    async def _siaga_error_handler(_: Request, error: SiagaError) -> JSONResponse:
        return siaga_failed_response(
            error.message, error.status_code, time.time(), error.additional_info
        )

    app.add_exception_handler(SiagaError, _siaga_error_handler)
