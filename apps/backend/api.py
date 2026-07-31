
import uvicorn
from fastapi import FastAPI
from config.base import Setting
import argparse

from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import threading
import asyncio
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from loguru import logger

load_dotenv()

ROUTER_MODULES = {
    "auth": "auth",
    "group": "group",
    "permission": "permission",
    "user": "user",
    "agent": "agent",
    # Siaga Padi Sprint 01 (Auth & Roles): /siaga/auth/* and /assisted/*.
    "siaga_auth": "siaga_auth",
    "assisted": "assisted",
    # Siaga Padi Sprint 02 (Case Management): /cases/* and /farmer/profile/*.
    "cases": "cases",
    "farmer_profile": "farmer_profile",
    # Siaga Padi Sprint 03 (Photo & Quality): /cases/{id}/photos*.
    "photos": "photos",
    # Mandatory: agent_mgmt is the agent management plane that every Argus app needs.
    # Cannot be disabled via --routers / ENABLED_ROUTERS — be-python is the service
    # layer for the workforce of agents.
    "agent_mgmt": "agent_mgmt",
}
MANDATORY_ROUTERS = {"agent_mgmt"}

argument_parser = argparse.ArgumentParser(
    description="Issue Cluster", formatter_class=argparse.RawDescriptionHelpFormatter
)
argument_parser.add_argument("-p", "--port", help="Port", metavar="", default="8020")
argument_parser.add_argument("-worker", "--worker", type=int, default=1)
argument_parser.add_argument(
    "-routers", "--routers", help="Include Routers", default=None
)
argument_parser.add_argument("-uenv", "--update_env", default=None)
argument_parser.add_argument("-fenv", "--file_env", default=".env")
args = argument_parser.parse_args()

settings = Setting(file=args.file_env, update_env=args.update_env, routers=args.routers)

threadpool = ThreadPoolExecutor(
    thread_name_prefix="syncpool", max_workers=settings.MAX_THREADS_WORKERS
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.debug(
        f"setting up thread pool with {settings.MAX_THREADS_WORKERS} max threads workers"
    )
    loop = asyncio.get_running_loop()
    loop.set_default_executor(threadpool)

    # Start the agent_mgmt scheduler tick loop. be-python is the service layer for
    # the agents workforce — the scheduler runs cron-driven agents (e.g. monitor
    # every 5 min, crawler at 06:00). Single in-process task; cancelled on shutdown.
    scheduler_task = None
    try:
        from service.agent_mgmt import scheduler_loop
        scheduler_task = asyncio.create_task(scheduler_loop())
        logger.info("agent_mgmt scheduler tick loop started")
    except Exception as e:
        logger.exception(f"failed to start agent_mgmt scheduler: {e}")

    yield

    if scheduler_task and not scheduler_task.done():
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass
        logger.info("agent_mgmt scheduler stopped")


from router.middleware import DecryptPayload
from middleware.rate_limiter import RateLimitMiddleware

app_args = {
    "title": "Base API",
    "description": "REST API for Vibe Codebase",
    "lifespan": lifespan,
}
app = FastAPI(**app_args)


app.add_middleware(
    DecryptPayload,
)
app.add_middleware(
    SessionMiddleware,
    # to generate secret_key run: openssl rand -hex 32
    secret_key=settings.JWT_SECRET,
)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

# Per-IP request throttle (Redis-backed). Limits come from settings.RATE_LIMIT /
# settings.RATE_LIMIT_WINDOW — required in front of /siaga/auth/login, which
# otherwise only has the per-email lockout.
app.add_middleware(RateLimitMiddleware)

# SiagaError raised in routers OR dependencies (role guard) renders as the
# contract's top-level failure envelope.
from util.siaga_response import register_siaga_exception_handlers

register_siaga_exception_handlers(app)


def _pool_threads(prefix="syncpool"):
    return [t for t in threading.enumerate() if t.name.startswith(prefix)]


def _queue_size(executor):
    # CPython detail: ThreadPoolExecutor._work_queue is a queue.SimpleQueue
    # Not guaranteed public API, but widely used for ops introspection
    q = getattr(executor, "_work_queue", None)
    try:
        return q.qsize() if q is not None else None
    except Exception:
        return None


@app.get("/monitoring/threadpool", tags=["monitoring"])
def threadpool_stats():
    threads = _pool_threads()
    return {
        "max_workers": getattr(threadpool, "_max_workers", None),
        "current_threads": len(threads),
        # “active” is an estimate; see section 3 for precise tracking
        "active_threads_estimate": sum(1 for t in threads if t.is_alive()),
        "queue_size_best_effort": _queue_size(threadpool),
    }

enable_routers = {
    r.strip() for r in settings.ENABLED_ROUTERS.split(",") if r.strip()
} or set(ROUTER_MODULES)
# Mandatory routers (agent_mgmt) cannot be excluded — force-include.
enable_routers |= MANDATORY_ROUTERS
for router_name, module_name in ROUTER_MODULES.items():
    is_mandatory = router_name in MANDATORY_ROUTERS
    if (
        is_mandatory
        or (
            (not args.routers or router_name in args.routers)
            and router_name in enable_routers
        )
    ):
        module = __import__(f"router.{module_name}", fromlist=["router"])
        app.include_router(module.router)

MAX_REQUEST_BODY = 1024 * 1024 * 1024

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=int(args.port),
        workers=args.worker,
        reload=False if args.worker > 1 else True,
        limit_max_requests=MAX_REQUEST_BODY,
    )
