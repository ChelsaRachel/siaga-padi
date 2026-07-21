# -*- coding: utf-8 -*-
"""AgentService — FE-facing thin glue to the agent management plane.

After the be-agent merge into be-python, AgentService NO LONGER uses httpx to port 8030.
It calls `service.agent_mgmt.AgentMgmtService` directly (Python import) — both run
in-process inside be-python.

Integration pattern:
- FE → BE /api/agent/invoke → AgentService.invoke(dto) → AgentMgmtService.fire_agent(...)
- FE poll → BE /api/agent/run → AgentService.get_run(run_id) → DB query

DTOs here stay camelCase (dto/agent.py) for FE consumption; the service translates
to snake_case agent_mgmt DTOs at the internal call boundary.
"""

import asyncio
from typing import Any, Dict, Optional

from loguru import logger

from dto.agent import AgentInvokeDTO, AgentRunResponse
from dto.agent_mgmt import RunIn
from service.agent_mgmt import get_service as get_agent_mgmt


class AgentService:
    """Thin glue ke agent_mgmt service layer (direct in-process call, no HTTP)."""

    def __init__(self):
        self.mgmt = get_agent_mgmt()
        self.poll_interval_seconds = 0.5

    async def invoke(self, dto: AgentInvokeDTO) -> AgentRunResponse:
        """Fire agent. Bila waitForResult, poll until terminal state."""
        agent = self.mgmt.get_agent_by_slug(dto.agentSlug)
        if not agent:
            raise ValueError(f"agent slug not found: {dto.agentSlug}")

        # Trigger fire-and-forget (returns quickly with run_id) — fire_agent runs
        # the actual MCP call asynchronously.
        run_info = self.mgmt.start_run(RunIn(
            agent_id=agent["id"],
            input=dto.input,
            triggered_by=dto.triggerType,
            trigger_meta={"triggered_by_user": dto.triggeredBy} if dto.triggeredBy else {},
        ))
        run_id = run_info["run_id"]

        # Background fire — don't await; let it run.
        asyncio.create_task(self.mgmt.fire_agent(
            agent, dto.input, dto.triggerType,
            {"triggered_by_user": dto.triggeredBy} if dto.triggeredBy else {},
            attempt=1, parent_run_id=None,
        ))

        if not dto.waitForResult:
            return await self.get_run(run_id)
        return await self.poll_run(run_id, max_seconds=dto.waitMaxSeconds)

    async def fire_and_forget(self, dto: AgentInvokeDTO) -> str:
        """Fire agent without polling. Returns run_id."""
        run = await self.invoke(dto)
        return run.runId

    async def get_run(self, run_id: str) -> AgentRunResponse:
        run = self.mgmt.get_run(run_id)
        if not run:
            raise ValueError(f"run not found: {run_id}")
        return AgentRunResponse(**self._normalize_run(run))

    async def poll_run(self, run_id: str, max_seconds: int = 60) -> AgentRunResponse:
        deadline = asyncio.get_event_loop().time() + max_seconds
        while asyncio.get_event_loop().time() < deadline:
            run = await self.get_run(run_id)
            if run.status in ("success", "failed"):
                return run
            await asyncio.sleep(self.poll_interval_seconds)
        logger.warning(f"poll_run timeout for run_id={run_id} after {max_seconds}s")
        return await self.get_run(run_id)

    async def list_runs(self, agent_slug: Optional[str] = None,
                        limit: int = 50) -> list[AgentRunResponse]:
        runs = self.mgmt.list_runs(agent_slug=agent_slug, limit=limit)
        return [AgentRunResponse(**self._normalize_run(r)) for r in runs]

    @staticmethod
    def _normalize_run(payload: Dict[str, Any]) -> Dict[str, Any]:
        """Map agent_mgmt snake_case row → FE-facing camelCase DTO."""
        return {
            "runId": payload.get("id") or payload.get("run_id"),
            "agentSlug": payload.get("agent_slug"),
            "status": payload.get("status"),
            "input": payload.get("input") or {},
            "output": payload.get("output"),
            "error": payload.get("error"),
            "metrics": payload.get("metrics"),
            "triggerType": payload.get("triggered_by") or "manual",
            "triggeredBy": (payload.get("trigger_meta") or {}).get("triggered_by_user"),
            "startedAt": payload.get("started_at"),
            "finishedAt": payload.get("finished_at"),
        }
