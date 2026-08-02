# AI_GUIDE.md — Backend Python (FastAPI) Boilerplate

> Mandatory entry point. Read this file first before writing or modifying any code.
> All implementation skills live under `skills/`. Use the **Skills Index** and **Trigger Conditions** tables below to pick which `skills/<domain>/SKILL.md` to load for your task.

---

## BE = service layer for the agents workforce — read this first

> **Axiom:** be-python is NOT just an app-domain CRUD backend. **be-python is the service layer for the agents workforce.** Without be-python, the agents under `<cwd>/apps/agents/` have nowhere to register, log runs, configure schedules, or receive webhooks. Therefore, **be-python + at least one agent must always run together during development** — there is no Argus app with be-python alone or agents alone.

### be-python's dual responsibility

1. **App-domain thin glue** — auth (JWT/cookie), RBAC, request validation (Pydantic DTO), expose agent outputs via REST, receive webhooks from upstream, app-domain CRUD for entities that are NOT agent-derived (user, role, organization).
2. **Agent management plane** — registry, runs, schedules, webhooks, DLQ. Mandatory router `agent_mgmt` di `/agent-mgmt/*`. Scheduler tick loop dijalankan di FastAPI lifespan task. Lihat [`skills/python-agent-mgmt/SKILL.md`](skills/python-agent-mgmt/SKILL.md).

### NOT BE responsibility

- Scoring, classification, crawling, generation, orchestration, threshold tuning, alert routing — semua ini agent territory di `<cwd>/apps/agents/<role>/`.
- Long-running pipeline business logic — itu specialist agent territory (crawler, analyzer, reporter).
- Decision-making (apa yang valid / apa yang escalate / apa yang retry) — itu validator/monitor/notifier territory (ops triple).

**Pattern integration BE ↔ agent (semua in-process di be-python):**

```
FE → BE /api/<feature>/invoke → service.agent.AgentService.invoke(dto) →
                                  ↓ (Python import — direct call, no HTTP loopback)
                                service.agent_mgmt.AgentMgmtService.fire_agent(...) →
                                  ↓ (in-process, async)
                                fires <cwd>/apps/agents/<role>/ via MCPHub project group →
                                  ↓
                                agent (separate process) runs, calls back via:
                                  ↓
                                _runs.py POST /agent-mgmt/agent-runs (HTTP, X-Internal-Token) →
                                  ↓ (writes run row in be-python DB)
                                run completes → PATCH /agent-mgmt/agent-runs/{id}
                                  ↓
                                FE polls /apps/agent/run/{id} (camelCase DTO) → render
```

**Scheduled agents:** scheduler tick loop di `service.agent_mgmt.scheduler_loop` (started in api.py lifespan) poll `agent_schedules`, fire due rows tanpa HTTP — full in-process.

**Webhook intake:** external system POSTs to `/agent-mgmt/webhooks/{path}` with an HMAC signature → fire_agent runs async.

Konsekuensinya:
- `service/<feature>.py` yang call agent **TIDAK** implement scoring/classification/etc. langsung — call `agent_service.invoke(...)` saja.
- `router/<feature>.py` yang expose agent output **TIDAK** transform substantif di handler — wrap output as-is dalam BaseResponse.
- `service/agent.py` (FE-facing camelCase DTO) **direct-call** ke `service/agent_mgmt.py` (snake_case internal DTO). NO httpx loopback ke localhost.
- agent-python (separate process per role) still uses HTTP via `_runs.py` to `/agent-mgmt/agent-runs` with the `X-Internal-Token` header.

**Anti-pattern:** substantive business logic in `service/<feature>.py` (scoring, classification, generation, multi-step pipeline). That is a signal the logic must move to an agent. BE is only a wrapper + state mapper.

**Anti-pattern:** disable router `agent_mgmt` via `--routers` / ENABLED_ROUTERS. Router ini **mandatory** — terdaftar di `MANDATORY_ROUTERS` di api.py dan akan force-included.

---

## Project Overview

Production-ready Python FastAPI backend shell that acts as the **thin glue layer + agents service layer** in Argus apps. Auth/RBAC/REST exposure of agent outputs, plus app-domain CRUD for non-agent entities, plus the mandatory `/agent-mgmt/*` router that powers the entire workforce of agents.

**Tech stack**

| Layer | Choice |
|-------|--------|
| Framework | FastAPI 0.136 + Python 3.10+ |
| ASGI server | Uvicorn (invoked via `python api.py` — never directly) |
| Database | Supabase Postgres via `supabase-py` (PostgREST). Schema in `supabase/migrations/`. |
| Cache / Session | Redis 7 via `redis-py` |
| Auth | JWT Bearer (`PyJWT`) + bcrypt password hashing |
| Validation | Pydantic v2 |
| Logging | `loguru` |
| Encryption | AES-256 (`pycryptodome`) |
| Messaging | Kafka (`kafka-python`) |
| Config | Pydantic `BaseSettings` + `python-dotenv` |

**Python version:** 3.10+ (uses `match` statement patterns in some helpers)

---

## Build & Run Commands

```bash
# 1. Create and activate virtual environment (nama wajib `.venv` — satu-satunya
#    yang dikenali scripts/dev.sh)
python -m venv .venv
source .venv/bin/activate         # Linux / macOS
# .venv\Scripts\activate          # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with real values

# 4. Generate INTERNAL_API_TOKEN (gates /agent-mgmt/* for service-to-service callers)
#    This token must match the value in every <cwd>/apps/agents/<role>/.env so that
#    agent-python's _runs.py can POST to /agent-mgmt/agent-runs with X-Internal-Token.
python -c "import secrets; print('INTERNAL_API_TOKEN=' + secrets.token_urlsafe(48))" >> .env
# Then propagate the same value into every agent project's .env (use a script).

# 5. Run the API (default port 8020). The lifespan starts the agent_mgmt
#    scheduler tick loop automatically.
python api.py

# Run on a custom port
python api.py --port 8080

# Run with multiple workers (disables auto-reload)
python api.py --worker 4

# Load only specific routers
python api.py --routers auth,user

# Point to a different .env file
python api.py --file_env .env.staging

# Override specific env vars at runtime
python api.py --update_env "JWT_ACTIVE=False"
```

> **Never** use `uvicorn api:app --reload` — `api.py` parses CLI args at import time and will crash.

**Threadpool monitoring endpoint** (built-in, no auth):
```
GET /monitoring/threadpool
```

---

## Folder Structure (Quick Reference)

```
be-python/
├── api.py                                    ← Entry point + router registration + lifespan (incl. scheduler tick loop)
├── config/base.py                            ← Settings (Pydantic BaseSettings) — only source of env vars
├── auth/
│   ├── jwt_*                                  ← JWTBearer, JWTChangeUserId, JWTRefresh, token encode/decode
│   └── internal_token.py                     ← internal_or_admin_jwt dep — gates /agent-mgmt/* routes
├── dto/
│   ├── <feature>.py                           ← Pydantic models per module
│   ├── agent.py                               ← FE-facing agent invoke/run DTOs (camelCase)
│   └── agent_mgmt.py                          ← Internal agent management DTOs (snake_case)
├── router/
│   ├── <feature>.py                           ← Thin controllers (validate DTO → call service → wrap BaseResponse)
│   ├── agent.py                               ← FE-facing /apps/agent/* — invoke/poll/list runs
│   └── agent_mgmt.py                          ← /agent-mgmt/* mandatory — registry/runs/schedules/webhooks/DLQ
├── service/
│   ├── <feature>.py                           ← Business logic + data access (extends BaseSupabaseRepository)
│   ├── agent.py                               ← FE-facing AgentService (direct-calls agent_mgmt)
│   └── agent_mgmt.py                          ← AgentMgmtService + scheduler_loop + fire_agent + retry/escalation/DLQ
├── models/                                    ← BaseResponse, BaseResponseFailed, Metadata, Pagination
├── middleware/                                ← RateLimitMiddleware and other cross-cutting concerns
├── exceptions/                                ← Domain exceptions (ValidationException, ErrorSubCategory)
├── supabase/migrations/
│   ├── 0001_user.sql ... 0007_organization.sql ← App-domain schema
│   └── 0008_agent_mgmt.sql                    ← Agent management schema (mandatory)
└── util/                                      ← helper.py, supabase.py, redis.py, aes_encryption.py, kafka_util.py
```

See the **Skills Index** below for detailed placement rules, naming conventions, and the new-module checklist.

---

## Code Style Guidelines

**Python style:** PEP 8. `snake_case` for all Python identifiers. No type `Any` in production code.

**Detailed convention docs:** All implementation skills live under [skills/](skills/). See the **Skills Index** and **Trigger Conditions** tables below.

**Global forbidden patterns (applies to every file):**

```
❌ os.getenv("VAR")                 → use settings.VAR from config.base
❌ print(...)                        → use loguru logger
❌ create_client(...) inside service → use Services.supabase() or BaseSupabaseRepository
❌ from pymongo / MongoClient        → Mongo is gone; use supabase-py
❌ return {"data": ..., "ok": True}  → always wrap in BaseResponse envelope
❌ Missing executionTime             → required in every success and failure response
❌ DELETE /<module>/delete/{id}      → id is always ?id= query param
❌ GET /<module>/get-all             → get-all is always POST with FindDTO body
❌ uvicorn api:app ...               → always python api.py
❌ Hardcoded secrets or tokens       → all secrets come from settings.*
❌ Business logic in router/         → belongs in service/
❌ DB access in router/              → belongs in service/
❌ HTTP response in service/         → belongs in router/
```

---

## Testing Instructions

**No test framework is pre-configured in this boilerplate.** Add tests using `pytest` + `httpx.AsyncClient` or `fastapi.testclient.TestClient`.

Recommended conventions when adding tests:

- Co-locate test files: `test_user.py` beside `service/user.py`
- Use `TestClient` from `fastapi.testclient` for integration tests against the real app
- Use a dedicated test Supabase project (separate cloud project, or `supabase start` local stack) — point `SUPABASE_URL` / `SUPABASE_KEY` at it via a `.env.test` file
- Pass `--file_env .env.test` when running tests to isolate from production data
- Do not mock `Services.supabase()` — point tests at the real test stack; mock/prod divergence causes silent failures
- Disable JWT during tests: `--update_env "JWT_ACTIVE=False"` or set `JWT_ACTIVE=False` in `.env.test`
- Assert the full response envelope, not just `data`: verify `metaData.executionTime` is present

```bash
# Run tests (once pytest is installed)
pytest

# With a test env file
python api.py --file_env .env.test --update_env "JWT_ACTIVE=False"
pytest
```

---

## Security Considerations

**JWT & Auth**
- All routes are JWT-protected by default via `router_param_builder(tag, jwt=True)`.
- `settings.JWT_ACTIVE` controls enforcement globally — set it to `False` only for local dev.
- Use `JWTBearer()` for simple auth checks; `JWTChangeUserId()` when user identity needs to be injected.
- Never implement custom JWT parsing in endpoint logic — use the `auth/` module only.

**Passwords**
- Always hash with `util.helper.encrypt()` (bcrypt, 10 rounds) before storing.
- Never log `dto.password` — not even at `DEBUG` level.
- Never return password fields in any response.

**Secrets & PII**
- All secrets come from environment variables via `settings.*` — never hardcoded.
- Use `util.helper.censor_email(email)` before logging any email address.
- Never log tokens, API keys, or connection strings.

**Encrypted Payloads**
- When `settings.ENC_ACTIVE == True`, requests are decrypted by `DecryptPayload` middleware (AES-256).
- Always return `BaseResponse` — returning a raw dict bypasses response encryption.

**CORS**
- Default: `allow_origins=["*"]` — restrict to specific origins in production.

**Rate Limiting**
- `RateLimitMiddleware` is enabled in `api.py` — configure limits in `config/base.py`.

**Input Validation**
- Validate all inputs at the DTO boundary (Pydantic) — do not re-validate in service layer.
- Never trust raw request body outside of a DTO — always use typed Pydantic models.

---

## Quick-Start: Adding a New Module

```
1. dto/<feature>.py
   → FeatureDTO, UpdateFeatureDTO, FindFeatureDTO

2. service/<feature>.py
   → class Feature(BaseSupabaseRepository)
   → methods: add, update, remove, find, count

3. router/<feature>.py
   → tag = "<feature>"
   → router = APIRouter(**router_param_builder(tag))
   → all 5 CRUD endpoints with is_include_schema gate

4. api.py
   → add "<feature>": "<feature>" to ROUTER_MODULES

5. config/base.py (if new env vars needed)
   → add typed field with default
   → add to .env.example
```

Full checklist and templates: [skills/python-api-design/SKILL.md](skills/python-api-design/SKILL.md)

---

## AI Tool Discovery

Any AI assistant working in this repo:

1. Read this `AI_GUIDE.md` (always-loaded contract).
2. Pick the relevant skill(s) from the **Skills Index** and **Trigger Conditions** tables below.
3. Load only those `skills/<domain>/SKILL.md` files. Never load all skills at once.
4. Load `skills/<domain>/references/*.md` only if that skill's SKILL.md tells you to.

**Tool-specific notes:**

| Tool          | Detects                                  | Notes                                                  |
| ------------- | ---------------------------------------- | ------------------------------------------------------ |
| Claude Code   | `AI_GUIDE.md` (and `CLAUDE.md` if present) | Skills auto-discovered via SKILL.md frontmatter.       |
| OpenCode      | `AI_GUIDE.md`                              | `AI_GUIDE.md` is the source of truth.                    |
| Codex CLI     | `AI_GUIDE.md`                              | Same contract.                                         |
| Cursor        | `AI_GUIDE.md` (no `.cursor/rules/` here)   | Treat this file's rules as the project rules.          |
| Generic agent | `AI_GUIDE.md`                              | Always loaded; index is below.                         |

**Skill format:** Each `skills/<domain>/` follows the [skill-creator standard](../../skills/skill-creator/SKILL.md): a required `SKILL.md` with `name` + `description` YAML frontmatter and Markdown body, plus optional `references/`, `scripts/`, `assets/` subfolders.

**When adding a new skill:** Create `skills/<name>/SKILL.md` with proper frontmatter, then add a row to the **Skills Index** and **Trigger Conditions** tables below.

---

## Skills Index

| Skill | Scope | When to use |
| --- | --- | --- |
| [python-api-design](skills/python-api-design/SKILL.md)             | Router/DTO/service layout, BaseResponse envelope, pagination, layer architecture, file naming, new-module checklist | Adding or changing endpoints, DTOs, response shapes; defining a new module's API surface |
| [python-auth](skills/python-auth/SKILL.md) | JWT bearer/cookies, session management, password hashing, RBAC dependencies (`JWTChangeUserId`, `JWTFilterUserIdBody`) | Login, registration, token refresh, protected routes, ownership/scoping enforcement |
| [python-config](skills/python-config/SKILL.md)     | Pydantic `Settings`, env vars, deployment flags, CLI/router enablement, custom middleware, virtual env, dependency constraints | Adding env vars, modifying startup, enabling/disabling routers, creating new middleware |
| [python-data](skills/python-data/SKILL.md)                   | `BaseSupabaseRepository`, `Services` factory, `supabase_query_builder`, Redis usage, async/threading, service-layer logging | Creating or modifying services, Supabase Postgres access, Redis usage, business logic, query construction |
| [python-agent-mgmt](skills/python-agent-mgmt/SKILL.md)             | Mandatory `/agent-mgmt/*` router — registry, runs, schedules, webhooks, DLQ. auth: JWT admin OR X-Internal-Token. Scheduler tick loop in lifespan. | Registering an agent, configuring cron schedule, setting up webhook intake, debugging agent runs, reviewing DLQ, integrating BE with agent-python `_runs.py` |

---

## Trigger Conditions

| Task                                                        | Use skills                                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| Adding a new endpoint or module                             | `python-api-design`                                              |
| Changing request/response shapes (DTO, BaseResponse)        | `python-api-design`                                              |
| Implementing pagination on a list endpoint                  | `python-api-design`, `python-data`                     |
| Implementing JWT auth, login, registration, or refresh      | `python-auth`                                      |
| Protecting a route or scoping data to current user/org      | `python-auth`                                      |
| Password hashing or session management                      | `python-auth`                                      |
| Creating a new service / repository                         | `python-data`                                                 |
| Postgres query construction or `supabase_query_builder` usage | `python-data`                                                 |
| Redis caching, session storage, or rate-limiting state      | `python-data`                                                 |
| Async/threading concerns (`asyncio.to_thread`, blocking IO) | `python-data`                                                 |
| Logging in services (`loguru`, masking PII)                 | `python-data`                                                 |
| Adding env vars or modifying `config/base.py`               | `python-config`                                          |
| Creating new middleware (rate limit, decryption, logging)   | `python-config`                                          |
| Modifying app startup, router enablement, or CLI flags      | `python-config`                                          |
| Setting up virtual environment or pinning new dependency    | `python-config`                                          |
| New module from scratch                                     | `python-api-design`, `python-data`, `python-auth` |
| Registering or upserting an agent in registry               | `python-agent-mgmt`                                                            |
| Configuring a cron schedule for an agent                     | `python-agent-mgmt`                                                            |
| Setting up a signed webhook for an external system           | `python-agent-mgmt`                                                            |
| Debugging agent runs / DLQ entries / retry chain             | `python-agent-mgmt`, `python-data`                                                    |
| Wiring agent-python `_runs.py` integration                   | `python-agent-mgmt`                                                            |
| Service-to-service authentication via `X-Internal-Token`     | `python-agent-mgmt`, `python-auth`                                                    |
