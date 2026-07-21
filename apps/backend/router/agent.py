"""Agent router — thin glue endpoints for FE invoke / poll / list agent runs.

Pattern: FE calls /agent/invoke → BE calls agent_mgmt directly → agent fires → BE wraps response.
Substantive business logic lives in `<cwd>/apps/agents/<role>/`, NOT here.
"""

import os
import hmac
import hashlib
from time import time
from fastapi import APIRouter, HTTPException, Header, Request

from util.helper import get_execution_time, router_param_builder, is_include_schema
from models.base_response import BaseResponseFailed, BaseResponse
from models.metadata import MetadataSuccess, MetadataFailed
from dto.agent import AgentInvokeDTO, AgentWebhookDTO
from service.agent import AgentService

obj = AgentService()
tag = os.path.splitext(os.path.basename(os.path.abspath(__file__)))[0]
router = APIRouter(**router_param_builder(tag))


@router.post("/invoke", include_in_schema=is_include_schema(tag, "invoke"))
async def invoke(dto: AgentInvokeDTO):
    """Fire a workforce agent via agent_mgmt. Returns AgentRunResponse (queued or resolved)."""
    start_time = time()
    try:
        run = await obj.invoke(dto)
        return BaseResponse(data=run.model_dump(),
                            metaData=MetadataSuccess(execution_time=get_execution_time(start_time)))
    except Exception as error:
        raise HTTPException(status_code=400, detail=BaseResponseFailed(
            metaData=MetadataFailed(execution_time=get_execution_time(start_time),
                                    message=str(error))).dict())


@router.get("/run", include_in_schema=is_include_schema(tag, "run"))
async def get_run(id: str):
    """Get one run by run_id. FE polls this endpoint via useAgentRun hook."""
    start_time = time()
    try:
        run = await obj.get_run(id)
        return BaseResponse(data=run.model_dump(),
                            metaData=MetadataSuccess(execution_time=get_execution_time(start_time)))
    except Exception as error:
        raise HTTPException(status_code=400, detail=BaseResponseFailed(
            metaData=MetadataFailed(execution_time=get_execution_time(start_time),
                                    message=str(error))).dict())


@router.get("/runs", include_in_schema=is_include_schema(tag, "runs"))
async def list_runs(agent_slug: str | None = None, limit: int = 50):
    """List recent runs. Filter optional by agent_slug."""
    start_time = time()
    try:
        runs = await obj.list_runs(agent_slug=agent_slug, limit=limit)
        return BaseResponse(data=[r.model_dump() for r in runs],
                            metaData=MetadataSuccess(execution_time=get_execution_time(start_time)))
    except Exception as error:
        raise HTTPException(status_code=400, detail=BaseResponseFailed(
            metaData=MetadataFailed(execution_time=get_execution_time(start_time),
                                    message=str(error))).dict())


@router.post("/webhook", include_in_schema=is_include_schema(tag, "webhook"))
async def webhook(request: Request, x_signature: str = Header(default="")):
    """Receive callback from agent_mgmt when a run finishes. HMAC-SHA256 signed.

    Pattern: agent_mgmt fires this endpoint after a run completes; BE writes the result
    to an app-domain table when needed (e.g. tender_scored), triggers a sibling agent,
    or updates FE state via polling.
    """
    start_time = time()
    try:
        raw = await request.body()
        secret = os.environ.get("BE_AGENT_WEBHOOK_SECRET", "")
        if secret:
            expected = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
            if not hmac.compare_digest(expected, x_signature):
                raise HTTPException(status_code=401, detail="invalid signature")
        dto = AgentWebhookDTO.model_validate_json(raw)
        # TODO: route to a handler per agent_slug — implement at sprint time.
        # Example: if dto.agentSlug == "crawler": await tender_service.persist(dto.output)
        return BaseResponse(data={"received": True, "runId": dto.runId},
                            metaData=MetadataSuccess(execution_time=get_execution_time(start_time)))
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=400, detail=BaseResponseFailed(
            metaData=MetadataFailed(execution_time=get_execution_time(start_time),
                                    message=str(error))).dict())
