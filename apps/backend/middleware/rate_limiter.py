from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from service import Services
from config.base import settings


class RateLimitMiddleware(BaseHTTPMiddleware):

    def __init__(self, app):
        super().__init__(app)
        self.redis = Services.a_redis()
        self.rate_limit = settings.RATE_LIMIT
        self.window = settings.RATE_LIMIT_WINDOW

    async def dispatch(self, request: Request, call_next):

        ip = request.client.host
        key = f"rate_limit:{ip}"

        current = await self.redis.get(key)

        if current and int(current) >= self.rate_limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests"}
            )

        pipe = self.redis.pipeline()
        pipe.incr(key, 1)
        pipe.expire(key, self.window)
        await pipe.execute()

        response = await call_next(request)
        return response