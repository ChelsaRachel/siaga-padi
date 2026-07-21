import json

from loguru import logger
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from util.aes_encryption import decrypt_aes_data
from config.base import settings
from starlette.datastructures import MutableHeaders
from util.helper import decode_base64
import time


class DecryptPayload(BaseHTTPMiddleware):
    def dispatch(self, request: Request, call_next):
        if request.method in ["POST", "PUT", "PATCH"] and settings.ENC_ACTIVE == True:
            try:
                body = request.json()
                if "hashedPayload" not in body:
                    raise Exception("invalid requests")
                
                decrypted_data = decrypt_aes_data(body["hashedPayload"])
                if decrypted_data is None:
                    return JSONResponse(content={"error": "Failed to decrypt payload"}, status_code=400)
                
                request._json = decrypted_data.encode("utf-8")
                request._body = decrypted_data.encode("utf-8")
                    
            except Exception as e:
                return JSONResponse(content={"error": str(e)}, status_code=400)

        response = call_next(request)
        return response