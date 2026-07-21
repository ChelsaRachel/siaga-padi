"""agent_mgmt router — /agent-mgmt/* endpoints.

Mandatory router for Argus apps — be-python is the service layer for the workforce
of agents. Routes serve registry, runs, schedules, webhooks, and the DLQ.

Auth: JWT admin role OR X-Internal-Token header (see auth/internal_token.py).
The webhook receiver `/webhooks/{path}` is the exception — HMAC-signed via
agent_webhooks.secret_hash, no JWT or internal-token required.
"""
import os
from time import time

from fastapi import APIRouter, HTTPException, Header, Request, Depends
from typing import Optional

from util.helper import get_execution_time, router_param_builder, is_include_schema
from models.base_response import BaseResponseFailed, BaseResponse
from models.metadata import MetadataSuccess, MetadataFailed
from auth.internal_token import internal_or_admin_jwt
from dto.agent_mgmt import AgentIn, RunIn, RunPatch, ScheduleIn, WebhookIn
from service.agent_mgmt import get_service

tag = "agent_mgmt"
# Custom prefix /agent-mgmt (instead of /agent_mgmt) for a cleaner URL.
router = APIRouter(prefix="/agent-mgmt", tags=[tag])
svc = get_service()


def _ok(data, start_time):
    return BaseResponse(
        data=data,
        metaData=MetadataSuccess(execution_time=get_execution_time(start_time)),
    )


def _fail(error, start_time, code=400):
    raise HTTPException(status_code=code, detail=BaseResponseFailed(
        metaData=MetadataFailed(
            execution_time=get_execution_time(start_time),
            message=str(error),
        )
    ).dict())


# --- Public-ish: healthz (unauthenticated) -------------------------------
@router.get("/healthz")
async def healthz():
    tick_seconds = int(os.environ.get("BE_AGENTS_TICK_SECONDS", "30"))
    return {"ok": True, "tick_seconds": tick_seconds}


# --- agents --------------------------------------------------------------
@router.post("/agents", dependencies=[Depends(internal_or_admin_jwt)])
async def upsert_agent(payload: AgentIn):
    start_time = time()
    try:
        return _ok(svc.upsert_agent(payload), start_time)
    except Exception as e:
        _fail(e, start_time)


@router.get("/agents", dependencies=[Depends(internal_or_admin_jwt)])
async def list_agents():
    start_time = time()
    try:
        return _ok(svc.list_agents(), start_time)
    except Exception as e:
        _fail(e, start_time)


# --- agent_runs ----------------------------------------------------------
@router.post("/agent-runs", dependencies=[Depends(internal_or_admin_jwt)])
async def start_run(payload: RunIn):
    start_time = time()
    try:
        return _ok(svc.start_run(payload), start_time)
    except Exception as e:
        _fail(e, start_time)


@router.patch("/agent-runs/{run_id}", dependencies=[Depends(internal_or_admin_jwt)])
async def finish_run(run_id: str, payload: RunPatch):
    start_time = time()
    try:
        return _ok(svc.finish_run(run_id, payload), start_time)
    except Exception as e:
        _fail(e, start_time)


@router.get("/agent-runs", dependencies=[Depends(internal_or_admin_jwt)])
async def list_runs(agent_id: Optional[str] = None, agent_slug: Optional[str] = None,
                    limit: int = 50):
    start_time = time()
    try:
        return _ok(svc.list_runs(agent_id, agent_slug, limit), start_time)
    except Exception as e:
        _fail(e, start_time)


@router.get("/agent-runs/{run_id}", dependencies=[Depends(internal_or_admin_jwt)])
async def get_run(run_id: str):
    start_time = time()
    try:
        run = svc.get_run(run_id)
        if not run:
            _fail(f"run not found: {run_id}", start_time, code=404)
        return _ok(run, start_time)
    except HTTPException:
        raise
    except Exception as e:
        _fail(e, start_time)


# --- agent_schedules -----------------------------------------------------
@router.post("/agent-schedules", dependencies=[Depends(internal_or_admin_jwt)])
async def create_schedule(payload: ScheduleIn):
    start_time = time()
    try:
        return _ok(svc.create_schedule(payload), start_time)
    except Exception as e:
        _fail(e, start_time)


@router.get("/agent-schedules", dependencies=[Depends(internal_or_admin_jwt)])
async def list_schedules(agent_id: Optional[str] = None):
    start_time = time()
    try:
        return _ok(svc.list_schedules(agent_id), start_time)
    except Exception as e:
        _fail(e, start_time)


# --- agent_webhooks ------------------------------------------------------
@router.post("/agent-webhooks", dependencies=[Depends(internal_or_admin_jwt)])
async def create_webhook(payload: WebhookIn):
    start_time = time()
    try:
        return _ok(svc.create_webhook(payload), start_time)
    except Exception as e:
        _fail(e, start_time)


@router.get("/agent-webhooks", dependencies=[Depends(internal_or_admin_jwt)])
async def list_webhooks(agent_id: Optional[str] = None):
    start_time = time()
    try:
        return _ok(svc.list_webhooks(agent_id), start_time)
    except Exception as e:
        _fail(e, start_time)


@router.post("/webhooks/{path}")
async def receive_webhook(path: str, request: Request,
                          x_signature: str = Header(default="")):
    """Public-ish: HMAC-signed webhook intake. NO JWT/internal-token required;
    signature verification gates access via agent_webhooks.secret_hash."""
    start_time = time()
    try:
        raw = await request.body()
        result = await svc.receive_webhook(path, raw, x_signature)
        return _ok(result, start_time)
    except PermissionError as e:
        _fail(str(e), start_time, code=401)
    except ValueError as e:
        _fail(str(e), start_time, code=404)
    except Exception as e:
        _fail(e, start_time)


# --- DLQ -----------------------------------------------------------------
@router.get("/dlq", dependencies=[Depends(internal_or_admin_jwt)])
async def list_dlq(only_unhandled: bool = True, limit: int = 100):
    start_time = time()
    try:
        return _ok(svc.list_dlq(only_unhandled, limit), start_time)
    except Exception as e:
        _fail(e, start_time)
