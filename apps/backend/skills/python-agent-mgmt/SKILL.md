---
name: python-agent-mgmt
description: Mandatory agent management plane in be-python — registry, runs, schedules, webhooks, DLQ. be-python is the service layer for the agents workforce; without this router, app-domain agents have no backbone to register / run / schedule / escalate. Use when adding a new agent to the registry, configuring a cron schedule, setting up a signed webhook, debugging agent runs, or reviewing DLQ entries. Triggers — "register agent", "set up schedule for crawler", "webhook from LPSE", "check agent_runs", "DLQ entries", "agent retry not firing".
---

# agent-mgmt — Agent Management Plane

> **Axiom:** be-python is NOT just an app-domain CRUD backend. **be-python is the service layer for the agents workforce.** Without the `agent_mgmt` router, no agent can register, be scheduled, be fired, or escalate. That is why this router is **mandatory** — listed in `MANDATORY_ROUTERS` in [`api.py`](../../api.py) and cannot be disabled via the `--routers` flag.

## Position in the stack

```
FE (chrome)
  ↓ HTTP /api/<feature>/* (JWT user)
be-python (THIS SERVICE — port 8020)
  ├── /apps/<feature>/* — app-domain thin glue
  ├── /apps/agent/* — FE-facing agent invoke/poll endpoints (router/agent.py)
  └── /agent-mgmt/* — agent management plane (router/agent_mgmt.py — MANDATORY)
        ├── registry: /agents
        ├── runs:     /agent-runs (POST/PATCH/GET)
        ├── schedule: /agent-schedules
        ├── webhook:  /agent-webhooks + /webhooks/{path}
        └── DLQ:      /dlq
  ↓ asyncio scheduler tick loop (lifespan task) → fires due schedules
  ↓ MCPHub (project group) ← agents register & route via this
agent-python processes (separate, port 8000+ each)
  ├── _runs.py POST /agent-runs (lifecycle logging)
  └── server.py (FastMCP wrapper)
```

**Key relationships:**
- be-python's [`service/agent_mgmt.py`](../../service/agent_mgmt.py) = single source-of-truth for agent state.
- be-python's [`service/agent.py`](../../service/agent.py) (FE-facing invoke) calls `agent_mgmt` **directly** (Python import) — no HTTP loopback.
- agent-python's `_runs.py` calls `/agent-mgmt/agent-runs` via HTTP **with the `X-Internal-Token` header** (separate process).
- The scheduler tick loop (in-process in be-python) reads `agent_schedules` and fires via the MCPHub project group.

## Routes inventory

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/agent-mgmt/healthz` | GET | None | Health probe |
| `/agent-mgmt/agents` | POST/GET | JWT-admin OR X-Internal-Token | Register/upsert agent + list |
| `/agent-mgmt/agent-runs` | POST | JWT-admin OR X-Internal-Token | Start a run (used by agent-python `_runs.py`) |
| `/agent-mgmt/agent-runs/{id}` | PATCH/GET | JWT-admin OR X-Internal-Token | Finish run + read |
| `/agent-mgmt/agent-runs` | GET | JWT-admin OR X-Internal-Token | List recent runs |
| `/agent-mgmt/agent-schedules` | POST/GET | JWT-admin OR X-Internal-Token | Cron schedule CRUD |
| `/agent-mgmt/agent-webhooks` | POST/GET | JWT-admin OR X-Internal-Token | Signed webhook config |
| `/agent-mgmt/webhooks/{path}` | POST | HMAC signature only | External system webhook intake |
| `/agent-mgmt/dlq` | GET | JWT-admin OR X-Internal-Token | Read failed-run DLQ |

**Auth model:**
- **JWT admin path** — admin user opens an admin dashboard on FE and views agent runs.
- **X-Internal-Token path** — service-to-service. Header value matches `settings.INTERNAL_API_TOKEN`. Used by agent-python's `_runs.py`.
- **Webhook signature only** — `/webhooks/{path}` — HMAC-SHA256 via `agent_webhooks.secret_hash`. Public-ish endpoint.

## Always-connected — dev-time pairing

**Rule:** during development, **be-python + at least one agent must always run together**. You cannot dev BE alone without a connected agent (or the reverse). Consequences:

1. **Bootstrap workflow:** when the user runs `npm run dev` / `python api.py`, the scheduler tick loop in be-python polls `agent_schedules`. Unscaffolded agents = poll is empty (OK). But if a schedule points to an agent not registered in the `agents` table, the scheduler logs a warning.
2. **Smoke test pairing:**
   ```bash
   # Terminal 1: be-python
   cd <cwd>/apps/be && python api.py
   # → log "agent_mgmt scheduler tick loop started"

   # Terminal 2: register dummy agent
   curl -X POST http://localhost:8020/agent-mgmt/agents \
     -H "X-Internal-Token: $INTERNAL_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"slug":"<slug>_pm","trigger_types":["manual"]}'

   # Terminal 3: run agent
   cd <cwd>/apps/agents/pm && python agent.py "ping"
   # → run row appears in agent_runs via _runs.py POST/PATCH
   ```
3. **CI smoke test:** sprint task `00-agent-mgmt-enabled.md` (workforce-scaffold sprint) must include:
   - Apply migration 0008.
   - Boot be-python.
   - Hit `/agent-mgmt/healthz`.
   - Register a dummy agent + fire-and-forget a dummy run.
   - Assert that the run row was written.

## Adding a new agent to the registry

```bash
INTERNAL_TOKEN=<from settings.INTERNAL_API_TOKEN>

curl -X POST http://localhost:8020/agent-mgmt/agents \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "<slug>_<role>",
    "description": "<one-line role>",
    "mcp_url": "http://<host>:8000/mcp",
    "trigger_types": ["scheduled", "orchestrated"],
    "max_retries": 3,
    "retry_backoff_seconds": 5,
    "escalation_agent_id": "<notifier-agent-uuid>"
  }'
```

`max_retries` + `retry_backoff_seconds` + `escalation_agent_id` are autonomy fields — if an agent fire fails with a transient error, be-python retries; if retries are exhausted or the failure is non-recoverable, it fires `escalation_agent` (typically the notifier).

## Configure schedule

```bash
curl -X POST http://localhost:8020/agent-mgmt/agent-schedules \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "<agent-uuid>",
    "cron_expr": "0 6 * * *",
    "payload": {"date": "today"}
  }'
```

The scheduler tick loop in the lifespan task fires on schedule. Standard 5-field POSIX cron expressions.

## Webhook intake (external system → agent)

```bash
# 1. Create webhook config (returns secret ONCE — store in the upstream system)
curl -X POST http://localhost:8020/agent-mgmt/agent-webhooks \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -d '{"agent_id":"<agent-uuid>","path":"lpse-update"}'
# Response: {..., "secret": "<long-random>"}

# 2. Upstream system signs each request body with HMAC-SHA256(secret_hash, body)
# where secret_hash = sha256(secret) hex digest. POST to:
#   http://<be-python>/agent-mgmt/webhooks/lpse-update
#   Header: X-Signature: <hex digest>
```

`receive_webhook` verifies the signature, fires the agent asynchronously via `fire_agent`, and returns `{queued: true}`.

## DLQ review (no human reviews this — the monitor agent does)

```bash
curl -H "X-Internal-Token: $INTERNAL_TOKEN" \
  http://localhost:8020/agent-mgmt/dlq?only_unhandled=true
```

**Axiom "no human maintainer":** the monitor agent reads the DLQ every 5 minutes, groups by `error_class`, and escalates via the notifier. This endpoint is **agent-facing**, NOT a human-facing dashboard. If human visibility is needed, build an admin FE feature with standard FE patterns (auth-guard + DataDisplay) — but the default is agent-driven.

## Anti-patterns

```
❌ FE calling /agent-mgmt/* directly
   → /agent-mgmt/* is a service-to-service plane. FE must call /apps/agent/* which
     is the thin glue to service/agent.py → agent_mgmt (in-process). The auth model
     and camelCase DTOs at /apps/agent/* are designed for FE.

❌ Disabling agent_mgmt via --routers / ENABLED_ROUTERS
   → Mandatory. be-python without agent_mgmt is not an Argus app. api.py validates
     this via MANDATORY_ROUTERS force-include.

❌ Using the BE_AGENTS_URL env var (legacy port 8030)
   → No more standalone be-agent. agent-python's `_runs.py` uses BE_URL
     (default http://localhost:8020) + path /agent-mgmt/agent-runs.

❌ Logging full agent input/output to agent_runs.input/output with PII
   → Sanitize inside agent.py before r.set_output(). agent_runs is queried by the
     monitor agent and admin FE — never leak PII.

❌ Manually retrying failed runs via INSERT
   → Use the retry policy on agents.max_retries. fire_agent handles the retry chain
     via parent_run_id. A manual INSERT skips retry semantics.

❌ DLQ review by human ops
   → Argus apps have no ops team. The monitor agent (Monitoring type) reads the DLQ,
     classifies, and escalates. If the brief lacks a monitor, the brief is weak —
     escalate to brief-builder Phase 4.5.
```

## Cross-references

- [`agent-builder/SKILL.md`](../../../../skills/agent-builder/SKILL.md) — scaffold a new agent and register it in the registry (Step 5b calls /agent-mgmt/agents).
- [`sprint-builder/SKILL.md`](../../../../skills/sprint-builder/SKILL.md) — sprint `00-workforce-scaffold` foundation task `backend/00-agent-mgmt-enabled.md`.
- [`agent-python/AI_GUIDE.md`](../../../agent-python/AI_GUIDE.md) — `_runs.py` integration contract.
- [`brief-builder/references/agent-types.md`](../../../../skills/brief-builder/references/agent-types.md) — Ops Layer Triple (Monitor + Validator + Notifier) consumes data from /agent-mgmt/* for autonomous ops.
