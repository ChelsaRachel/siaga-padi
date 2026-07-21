---
name: orchestra-skills
description: Master directory for backend (be-python / FastAPI) technical skills. Use this to locate the SOP needed for API design, auth, agent management, data access, configuration, performance, logging, and conventions. The active database is Supabase (Postgres) — pymongo / MongoDB references are gone.
---

# Orchestra: The Skill Directory (be-python)

This is the primary "Toolbox" index for **be-python (FastAPI)** backend work. Click any skill link to open the corresponding Standard Operating Procedure (SOP) and follow it closely.

## Specialist Inventory

### API & Interface
- **[python-api-design](python-api-design/SKILL.md)** — endpoints, DTO payloads, response envelope contract (`BaseResponse` / `BaseResponseFailed`), pagination, error handling.

### Auth & Security
- **[python-auth](python-auth/SKILL.md)** — JWT bearer/cookie tokens, single-login enforcement via Redis sessions, password hashing, FastAPI dependencies for ownership/scoping, RBAC.

### Agent Management Plane
- **[python-agent-mgmt](python-agent-mgmt/SKILL.md)** — built-in `/agent-mgmt/*` router (registry, runs, schedules, webhooks, DLQ + scheduler tick loop). JWT-admin protected with `X-Internal-Token` bypass. Contract for `agent-python` `_runs.py` integration.

### Architecture & Data Access
- **[python-data](python-data/SKILL.md)** — service / data layer: `BaseSupabaseRepository`, Supabase Postgres via `supabase-py`, Redis for caching + sessions, Mongo→Supabase migration cheat sheet.

### Configuration & Middleware
- **[python-config](python-config/SKILL.md)** — settings, app startup, middleware conventions (decrypt, rate limit, endpoint-toggle).

### Performance & Async
- **[python-async-performance](python-async-performance/SKILL.md)** — blocking calls, `asyncio.to_thread`, threadpool interactions for `def` vs `async def` endpoints.

### Tooling, Logging & Conventions
- **[python-logging](python-logging/SKILL.md)** — `loguru` usage, PII masking, forbidden `print()` patterns.
- **[python-file-naming](python-file-naming/SKILL.md)** — file/module naming rules and new-module registration conventions.
- **[python-dependency-constraints](python-dependency-constraints/SKILL.md)** — rules for adding dependencies (and when not to) when consuming the be-python boilerplate.
- **[python-virtual-environment](python-virtual-environment/SKILL.md)** — venv setup and dependency installation workflow.

## Quick Finder

- **Adding/changing an endpoint?** → [python-api-design](python-api-design/SKILL.md)
- **Implementing login/auth protection?** → [python-auth](python-auth/SKILL.md)
- **Registering an agent / configuring schedule / debugging agent runs?** → [python-agent-mgmt](python-agent-mgmt/SKILL.md)
- **Writing DB / business logic?** → [python-data](python-data/SKILL.md)
- **Adding env vars or middleware?** → [python-config](python-config/SKILL.md)
- **Async handler is slow or blocking?** → [python-async-performance](python-async-performance/SKILL.md)
- **Need to add logs/debug?** → [python-logging](python-logging/SKILL.md)

"Use the right tool for the job, and the job will do itself."
