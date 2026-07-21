"""agent_mgmt service — agent management plane (registry, runs, schedules, webhooks, DLQ).

Implements the agent_mgmt service layer that
is now merged into be-python as a mandatory router. A single FastAPI process serves
both the app-domain thin glue and the agent management plane.

Integration pattern:
- be-python's `service/agent.py` (FE-facing AgentService) calls methods here
  **directly** (Python import) — no HTTP loopback.
- agent-python's `_runs.py` (separate process per agent) calls via HTTP to
  `/agent-mgmt/agent-runs` with the `X-Internal-Token` header.
- The scheduler tick loop runs from be-python's FastAPI lifespan (see api.py).

Sync supabase-py is used inside async handlers — acceptable for a low-volume
internal management plane. If call rates grow, switch to acreate_client.
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import os
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from croniter import croniter

from config.base import settings
from service import BaseSupabaseRepository
from dto.agent_mgmt import AgentIn, RunIn, RunPatch, ScheduleIn, WebhookIn

log = logging.getLogger("agent_mgmt")


_TRANSIENT_ERROR_CLASSES = {
    "TimeoutException", "ReadTimeout", "ConnectTimeout",
    "ConnectError", "RemoteProtocolError",
}


def _is_transient(exc: Exception) -> bool:
    """Decide if an exception is transient (retryable). Conservative — only known-safe classes."""
    name = type(exc).__name__
    if name in _TRANSIENT_ERROR_CLASSES:
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        return 500 <= exc.response.status_code < 600
    return False


class AgentMgmtService(BaseSupabaseRepository):
    """Service handling all agent_mgmt operations. Singleton — instantiate once at module load."""

    def __init__(self):
        super().__init__()

    # --- agents -----------------------------------------------------------
    def upsert_agent(self, payload: AgentIn) -> dict:
        row = (self.table("agents")
               .upsert(payload.model_dump(exclude_none=False), on_conflict="slug")
               .execute()).data[0]
        log.info("agent upserted slug=%s id=%s", row.get("slug"), row.get("id"))
        return row

    def list_agents(self) -> list[dict]:
        return (self.table("agents").select("*").order("created_at").execute()).data

    def get_agent_by_id(self, agent_id: str) -> Optional[dict]:
        rows = (self.table("agents").select("*").eq("id", agent_id).limit(1).execute()).data
        return rows[0] if rows else None

    def get_agent_by_slug(self, slug: str) -> Optional[dict]:
        rows = (self.table("agents").select("*").eq("slug", slug).limit(1).execute()).data
        return rows[0] if rows else None

    # --- agent_runs -------------------------------------------------------
    def start_run(self, payload: RunIn) -> dict:
        agent_id = payload.agent_id
        if not agent_id and payload.agent_slug:
            agent = self.get_agent_by_slug(payload.agent_slug)
            if not agent:
                raise ValueError(f"agent slug not found: {payload.agent_slug}")
            agent_id = agent["id"]
        if not agent_id:
            raise ValueError("agent_id or agent_slug required")
        row = (self.table("agent_runs")
               .insert({
                   "agent_id": agent_id,
                   "input": payload.input,
                   "triggered_by": payload.triggered_by,
                   "trigger_meta": payload.trigger_meta,
                   "attempt": payload.attempt,
                   "parent_run_id": payload.parent_run_id,
                   "status": "running",
               })
               .execute()).data[0]
        return {"run_id": row["id"], "started_at": row["started_at"]}

    def finish_run(self, run_id: str, payload: RunPatch) -> dict:
        update_data = {
            **payload.model_dump(exclude_none=True),
            "finished_at": datetime.now(timezone.utc).isoformat(),
        }
        self.table("agent_runs").update(update_data).eq("id", run_id).execute()
        return {"ok": True, "run_id": run_id}

    def list_runs(self, agent_id: Optional[str] = None, agent_slug: Optional[str] = None,
                  limit: int = 50) -> list[dict]:
        if agent_slug and not agent_id:
            agent = self.get_agent_by_slug(agent_slug)
            agent_id = agent["id"] if agent else None
        q = self.table("agent_runs").select("*").order("started_at", desc=True).limit(min(limit, 200))
        if agent_id:
            q = q.eq("agent_id", agent_id)
        return q.execute().data

    def get_run(self, run_id: str) -> Optional[dict]:
        rows = (self.table("agent_runs").select("*").eq("id", run_id).limit(1).execute()).data
        return rows[0] if rows else None

    # --- agent_schedules --------------------------------------------------
    def create_schedule(self, payload: ScheduleIn) -> dict:
        if not croniter.is_valid(payload.cron_expr):
            raise ValueError(f"invalid cron_expr: {payload.cron_expr}")
        next_run = croniter(payload.cron_expr, datetime.now(timezone.utc)).get_next(datetime)
        return (self.table("agent_schedules")
                .insert({**payload.model_dump(), "next_run_at": next_run.isoformat()})
                .execute()).data[0]

    def list_schedules(self, agent_id: Optional[str] = None) -> list[dict]:
        q = self.table("agent_schedules").select("*").order("next_run_at")
        if agent_id:
            q = q.eq("agent_id", agent_id)
        return q.execute().data

    # --- agent_webhooks ---------------------------------------------------
    def create_webhook(self, payload: WebhookIn) -> dict:
        secret = secrets.token_urlsafe(32)
        secret_hash = hashlib.sha256(secret.encode()).hexdigest()
        row = (self.table("agent_webhooks")
               .insert({**payload.model_dump(), "secret_hash": secret_hash})
               .execute()).data[0]
        return {**row, "secret": secret}

    def list_webhooks(self, agent_id: Optional[str] = None) -> list[dict]:
        q = self.table("agent_webhooks").select(
            "id, agent_id, path, enabled, last_fired_at, created_at"
        )
        if agent_id:
            q = q.eq("agent_id", agent_id)
        return q.execute().data

    async def receive_webhook(self, path: str, raw_body: bytes, x_signature: str) -> dict:
        rows = (self.table("agent_webhooks")
                .select("*, agents(*)")
                .eq("path", path)
                .eq("enabled", True)
                .limit(1)
                .execute()).data
        if not rows:
            raise ValueError(f"webhook not found or disabled: {path}")
        hook = rows[0]
        # Caller signs raw body with HMAC-SHA256(secret_hash, body); server recomputes.
        expected = hmac.new(hook["secret_hash"].encode(), raw_body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, x_signature):
            raise PermissionError("bad signature")
        self.table("agent_webhooks").update({
            "last_fired_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", hook["id"]).execute()
        try:
            body_json = json.loads(raw_body or b"{}")
        except json.JSONDecodeError:
            body_json = {"_raw": raw_body.decode("utf-8", errors="replace")}
        asyncio.create_task(
            self.fire_agent(hook["agents"], body_json, "webhook", {"path": path})
        )
        return {"queued": True, "agent_slug": hook["agents"]["slug"]}

    # --- DLQ --------------------------------------------------------------
    def list_dlq(self, only_unhandled: bool = True, limit: int = 100) -> list[dict]:
        q = self.table("agent_dlq").select("*").order("created_at", desc=True).limit(min(limit, 500))
        if only_unhandled:
            q = q.is_("handled_at", "null")
        return q.execute().data

    def _record_dlq(self, agent: dict, run_id: Optional[str], payload: dict,
                    error: str, error_class: str, attempts: int, source: str) -> None:
        try:
            self.table("agent_dlq").insert({
                "agent_id": agent["id"],
                "run_id": run_id,
                "source": source,
                "payload": payload,
                "error": error,
                "error_class": error_class,
                "attempts": attempts,
            }).execute()
        except Exception:
            log.exception("DLQ insert failed (slug=%s)", agent.get("slug"))

    # --- agent firing (orchestrator + scheduler + webhook) ----------------
    async def fire_agent(
        self,
        agent: dict,
        payload: dict,
        triggered_by: str,
        meta: dict,
        attempt: int = 1,
        parent_run_id: Optional[str] = None,
    ) -> None:
        """Invoke agent via its MCP tool in the project group, recording a run row.

        Lifecycle: create run row → call agent's MCP tool → patch with status/output/error.
        Failure → retry (transient + within max_retries) OR DLQ + escalate.
        """
        run_id: Optional[str] = None
        output: Optional[dict] = None
        error: Optional[str] = None
        error_exc: Optional[Exception] = None
        status = "failed"

        try:
            run = self.start_run(RunIn(
                agent_id=agent["id"],
                input=payload,
                triggered_by=triggered_by,
                trigger_meta=meta,
                attempt=attempt,
                parent_run_id=parent_run_id,
            ))
            run_id = run["run_id"]

            # Lazy-import Agno MCP tools so be-python boots even if agno not pinned.
            from agno.tools.mcp import MCPTools

            url = f"{settings.MCP_HUB_URL}/mcp/{settings.MCP_HUB_GROUP}"
            async with MCPTools(
                transport="streamable-http",
                url=url,
                client_params=dict(headers={
                    "Authorization": f"Bearer {settings.MCP_HUB_API_KEY}"
                }),
            ) as mcp:
                tool_name = f"{agent['slug']}__run"
                result = await mcp.call_tool(tool_name, {"input": json.dumps(payload)})
                output = {"text": getattr(result, "data", None) or str(result)}
                status = "success"
        except Exception as e:
            log.exception("agent fire failed (slug=%s, attempt=%d): %s",
                          agent.get("slug"), attempt, e)
            error = f"{type(e).__name__}: {e}"
            error_exc = e

        if run_id:
            try:
                self.finish_run(run_id, RunPatch(status=status, output=output, error=error))
            except Exception:
                log.exception("finish_run failed (run_id=%s)", run_id)

        # Retry / escalation handling
        if status == "failed" and error_exc is not None:
            max_retries = int(agent.get("max_retries") or 0)
            backoff_base = int(agent.get("retry_backoff_seconds") or 5)
            if _is_transient(error_exc) and attempt <= max_retries:
                delay = backoff_base * (2 ** (attempt - 1))
                log.info("scheduling retry in %ds (slug=%s, next_attempt=%d)",
                         delay, agent.get("slug"), attempt + 1)
                await asyncio.sleep(delay)
                await self.fire_agent(
                    agent, payload, "retry",
                    {**meta, "retry_of": run_id},
                    attempt=attempt + 1, parent_run_id=run_id,
                )
                return
            # Non-recoverable: DLQ + escalate
            self._record_dlq(agent, run_id, payload, error or "",
                             type(error_exc).__name__, attempt, source=triggered_by)
            await self._escalate(agent, run_id, payload, error or "")

    async def _escalate(self, agent: dict, run_id: Optional[str],
                        payload: dict, error: str) -> None:
        """Fire the agent's escalation_agent (typically notifier) with run context."""
        esc_id = agent.get("escalation_agent_id")
        if not esc_id:
            return
        esc = self.get_agent_by_id(esc_id)
        if not esc:
            return
        try:
            await self.fire_agent(
                esc,
                {
                    "event": "escalation",
                    "source_agent_slug": agent.get("slug"),
                    "source_run_id": run_id,
                    "original_payload": payload,
                    "error": error,
                },
                triggered_by="escalation",
                meta={
                    "escalated_for_agent_id": agent["id"],
                    "escalated_for_run_id": run_id,
                },
            )
            if run_id:
                self.table("agent_runs").update({
                    "escalated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", run_id).execute()
        except Exception:
            log.exception("escalation failed (slug=%s)", agent.get("slug"))


# Singleton — imported by router/agent_mgmt.py and service/agent.py
_service_instance: Optional[AgentMgmtService] = None


def get_service() -> AgentMgmtService:
    global _service_instance
    if _service_instance is None:
        _service_instance = AgentMgmtService()
    return _service_instance


# --- Scheduler tick loop (started from api.py lifespan) ------------------
async def scheduler_loop():
    """Poll agent_schedules every TICK_SECONDS, fire due rows."""
    tick_seconds = int(getattr(settings, "BE_AGENTS_TICK_SECONDS", 30))
    log.info("agent_mgmt scheduler tick loop started (every %ds)", tick_seconds)
    svc = get_service()
    while True:
        try:
            now = datetime.now(timezone.utc)
            due = (svc.table("agent_schedules")
                   .select("*, agents(*)")
                   .eq("enabled", True)
                   .lte("next_run_at", now.isoformat())
                   .execute()).data
            for s in due:
                asyncio.create_task(svc.fire_agent(
                    s["agents"], s["payload"], "scheduled",
                    {"schedule_id": s["id"]},
                ))
                next_run = croniter(s["cron_expr"], now).get_next(datetime)
                svc.table("agent_schedules").update({
                    "last_run_at": now.isoformat(),
                    "next_run_at": next_run.isoformat(),
                }).eq("id", s["id"]).execute()
        except Exception as e:
            log.exception("scheduler tick failed: %s", e)
        await asyncio.sleep(tick_seconds)
