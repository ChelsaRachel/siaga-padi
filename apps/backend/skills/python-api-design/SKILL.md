---
name: python-api-design
description: "be-python FastAPI conventions: router/DTO/service layout, BaseResponse envelope, JWT, pagination, file naming, encrypted payloads. Use when adding or changing endpoints, DTOs, or module boundaries."
---

# api-design — FastAPI API & Interface Conventions (be-python)

## Use this skill when

- Adding a new FastAPI router/module or endpoint to the be-python boilerplate
- Designing or changing request DTOs (`FeatureDTO`, `UpdateFeatureDTO`, `FindFeatureDTO`)
- Standardising response shapes, pagination, or error envelopes
- Naming a new file in `router/`, `dto/`, or `service/`
- Wiring router enablement (`ENABLED_ROUTERS`, `--routers` CLI flag, `is_include_schema`)

## Patterns (do this)

| Pattern | Example |
| --- | --- |
| Build router with `router_param_builder(tag)` | `router = APIRouter(**router_param_builder("feature"))` |
| Gate every endpoint via `is_include_schema` | `@router.post("/add", include_in_schema=is_include_schema(tag, "add"))` |
| Standard CRUD verbs in `kebab-case` | `add`, `update`, `delete`, `get-all`, `get-one` |
| `id` for delete/get-one as **query param** | `DELETE /feature/delete?id=...` |
| `id` for update inside the **request body** | `PUT /feature/update` with `UpdateFeatureDTO.id` |
| `get-all` is **POST** with `FindDTO` body | `POST /feature/get-all` carries pagination + filters |
| Wrap success in `BaseResponse + MetadataSuccess` | `BaseResponse(data=..., metaData=MetadataSuccess(executionTime=...))` |
| Wrap failure in `HTTPException(detail=BaseResponseFailed(...).dict())` | Always include `executionTime`, never leak secrets |
| List endpoints include `Pagination.count_total_pages(dto.size, count)` | Inside `MetadataSuccess.pagination` |
| DTO fields **camelCase**; `search_by`/`filters` intentional snake_case | `createdBy`, `orderBy`, `workspaceId` |

## Anti-patterns (don't do this)

| Anti-pattern | Use instead |
| --- | --- |
| `DELETE /<module>/delete/{id}` (path param) | `DELETE /<module>/delete?id=...` (query param) |
| `GET /<module>/get-all` | `POST /<module>/get-all` with `FindDTO` body |
| `PUT /<module>/update/{id}` | `id` field inside `UpdateFeatureDTO` body |
| `router = APIRouter(prefix=..., tags=...)` raw | `router_param_builder(tag)` is mandatory |
| Missing `is_include_schema` on an endpoint | Schema exposure must be gated per endpoint |
| `metadata` or `meta_data` field | Always `metaData` (camelCase) |
| `execution_time` field | Always `executionTime` (camelCase) |
| Returning a raw dict | Always `BaseResponse` (envelope + encryption contract) |
| `def add(data: dict)` untyped input | Typed Pydantic DTO |
| Validating in service layer | Validate at the DTO boundary |
| Reusing one DTO for create + update | Separate `FeatureDTO` and `UpdateFeatureDTO` |
| Path param before static route | Static routes declared first (avoids Starlette shadowing) |

---

## Overview

This boilerplate's API surface follows established conventions for:

- How routers are structured and registered
- How request DTOs are modeled/validated
- How responses are wrapped (success + failure)
- How JWT auth/session context is applied
- How pagination and filtering work
- Optional request/response encryption at the HTTP boundary

The goal is to keep the backend's public contract stable and predictable for clients.

## Template map (what lives where)

- `api.py`
  - FastAPI app entrypoint
  - Parses CLI args at import time
  - Loads `Setting(...)` and includes routers dynamically
  - Adds middleware (CORS, sessions, decrypt payload)
  - Runs uvicorn programmatically
- `config/base.py`
  - `BaseSetting` via `pydantic.v1.BaseSettings`
  - `Setting` singleton that loads `.env` + CLI overrides
  - Builds `ACTIVE_ROUTERS` for OpenAPI schema inclusion
- `router/`
  - FastAPI routers (one file per module)
  - Conventional endpoints: `add`, `update`, `delete`, `get-all`, `get-one`, etc.
- `dto/`
  - Pydantic DTOs for request bodies and common “find/list” parameters
  - Note: the template intentionally uses camelCase field names to match JSON
- `service/`
  - Business logic, Supabase Postgres + Redis access
  - Uses `BaseSupabaseRepository` + `Services` factory
- `models/`
  - Response envelope models: `BaseResponse`, `BaseResponseFailed`
  - Metadata: `MetadataSuccess`, `MetadataFailed`
  - Pagination: `Pagination`
- `auth/`
  - JWT signing/decoding (`auth_handler.py`)
  - FastAPI auth dependencies (`auth_bearer.py`)
- `middleware/` and `router/middleware.py`
  - Middlewares (rate limiting, optional payload decryption)
- `util/`
  - Supabase query builder, crypto helpers, Supabase + Redis clients, misc utilities

## Runtime & configuration conventions

### Run the server

Run using `python api.py ...` (not `uvicorn api:app ...`). The template’s `api.py` parses CLI args during import, which commonly breaks when using the `uvicorn` CLI.

Common:

```bash
python api.py --port {8020}
```

### Router enablement (docs + runtime)

There are two knobs:

1) `--routers` CLI arg (comma-separated)
- Enables a subset of routers.
- Supports endpoint filtering using bracket syntax, e.g. `user[add:get-all]`.

2) `ENABLED_ROUTERS` env (comma-separated)
- Allowlist of routers to include.
- If empty, all routers in `ROUTER_MODULES` are enabled.

Example:

```bash
python api.py --routers auth[login:refresh],user[get-all:get-one] --port {8020}
```

## Router + endpoint design (the public contract)

### Router construction pattern

Routers follow a consistent pattern:

- `tag` is derived from the filename
- `APIRouter` is created via `router_param_builder(tag)`
- `include_in_schema` is controlled via `is_include_schema(tag, endpoint_name)`

Key behavior in `router_param_builder(tag, jwt=True)`:

- `prefix` becomes `/{tag.replace('_', '/').replace('-', '_')}`
  - Use underscores in filenames to create nested path segments.
  - Example: `router/app_users.py` → prefix `/app/users`.
- `dependencies` default to JWT protection (`Depends(JWTBearer())`) when `settings.JWT_ACTIVE` is true.
  - For public routers (e.g. auth), pass `jwt=False`.

### Endpoint path style (RPC-style)

This template is intentionally not pure REST resource routing. Existing modules use verb-ish action paths:

- `POST /<module>/add`
- `PUT /<module>/update`
- `DELETE /<module>/delete`
- `POST /<module>/get-all` (filter + pagination in request body)
- `GET /<module>/get-one?id=...`

When extending the API, prefer following the existing style so clients stay consistent.

## DTO conventions (inputs)

- DTOs live in `dto/` and use `pydantic.BaseModel`.
- Keep field names in **camelCase** when the JSON contract is camelCase (this template does that broadly: `workspaceId`, `orderBy`, `totalElements`, etc.).
- For list/find endpoints, reuse/extend:
  - `dto.BaseFindDTO`, `dto.FindDTO` (supports `page`, `size`, `orderBy`, `order`, `search`, `filters`, `organizationId`, etc.).
- Put boundary validation in DTO validators when possible.
  - Example: `dto/auth.py` validates email format, MX record existence, and (optionally) deliverability via external API with Redis caching.

Rule of thumb:

- Validate at boundaries (DTO/router).
- Services can assume DTOs are already well-formed.

## Response envelope conventions (outputs)

### Success

Return `models.base_response.BaseResponse`.

- Always include execution time in metadata.
- For lists, include pagination.

Pattern:

```python
start_time = time()
# ...
return BaseResponse(
    data=data,
    metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
)
```

Pagination pattern:

```python
data, count = obj.get_all(dto)
return BaseResponse(
    data=data,
    metaData=MetadataSuccess(
        pagination=Pagination.count_total_pages(dto.size, count),
        executionTime=get_execution_time(start_time),
    ),
)
```

### Failure

Routers typically raise `fastapi.HTTPException` where `detail` is a serialized `BaseResponseFailed`:

```python
except Exception as error:
    raise HTTPException(
        status_code=400,
        detail=BaseResponseFailed(
            metaData=MetadataFailed(
                executionTime=get_execution_time(start_time),
                message=str(error),
            )
        ).dict(),
    )
```

Guidance:

- Use specific status codes when possible (401 missing/expired auth, 403 invalid session/forbidden).
- Keep messages user-safe: don’t leak secrets (JWTs, passwords, DB URIs, internal stack traces).
- `MetadataSuccess`/`MetadataFailed` allow extra fields (`extra = "allow"`), so it’s safe to attach structured details when needed.

## Auth & session conventions

### Token sources

Auth dependencies support both:

- `Authorization: Bearer <token>`
- Cookies (`token` and `refresh_token`) set by the auth router

### Multi-login vs single-login

JWT payload includes `multiLogin`.

- If `multiLogin` is `false`, the backend stores the active access token in Redis under `session:{user_id}`.
- `JWTBearer` enforces that the presented token matches that Redis value.

### Dependencies for injecting user context

The template includes helper dependencies that mutate request body/query context:

- `JWTChangeUserId`, `JWTChangeCreatedBy`: inject `id`, `userId`, `createdBy`, `permissionId` into the request so clients can’t spoof ownership.
- `JWTFilterUserIdBody`, `JWTFilterOrganizationIdBody`: append filters to the incoming `filters` list and stash a modified DTO into `request.state.find_dto`.

Prefer these dependencies for “current user” or “scoped list” endpoints instead of trusting client-provided IDs.

## Services + database conventions

- Domain logic lives in `service/<module>.py` and typically defines a class extending `service.BaseSupabaseRepository`.
- Get Supabase tables via `self.table(settings.SUPABASE_TABLE_...)`.
  - Table names are env-driven; don't hardcode.
  - `BaseSupabaseRepository` reads `SUPABASE_SCHEMA` so multi-schema setups work without extra plumbing.
- For list endpoints:
  - Use `util.helper.supabase_query_builder(builder, dto, ...)` to translate `FindDTO`-style inputs into PostgREST chain calls.
  - Implement pagination using `.skip((page - 1) * size).limit(size)` and return `(data, count)`.

## Optional payload encryption (ENC_ACTIVE)

When `settings.ENC_ACTIVE == True`:

- Request bodies for `POST/PUT/PATCH` must be wrapped as:
  - `{ "hashedPayload": "<base64 AES ECB ciphertext>" }`
- `router/middleware.py` decrypts the payload before normal FastAPI parsing.
- `BaseResponse`/`BaseResponseFailed` encrypt the entire response payload and return:
  - `{ "data": "<encrypted>" }`

Design implication: don’t build endpoints that rely on reading raw request bodies outside FastAPI/Pydantic parsing.

## Operational endpoints

- `GET /monitoring/threadpool` exposes threadpool sizing and queue stats (best-effort).

## Checklist: add a new module/router

1) Create `dto/<module>.py` (request schemas and validators)
2) Create `service/<module>.py` (business logic; Supabase Postgres + Redis interactions)
3) Create `router/<module>.py`
   - `tag` from filename
   - `APIRouter(**router_param_builder(tag))`
   - Use `BaseResponse` + `MetadataSuccess` and `BaseResponseFailed` + `MetadataFailed`
   - Use `include_in_schema=is_include_schema(tag, "...")`
4) Register in `api.py` (`ROUTER_MODULES`)
5) Add any required env keys to `.env` / `.env.example` and `config/base.py` if you introduce new settings

## Verification (quick)

- [ ] Endpoints follow the existing path style for the module
- [ ] DTOs validate at boundaries; service assumes validated input
- [ ] Success responses use `BaseResponse` + `MetadataSuccess`
- [ ] List endpoints include `Pagination.count_total_pages(...)`
- [ ] Errors use `BaseResponseFailed` + `MetadataFailed` with appropriate HTTP status
- [ ] Router is registered in `api.py` and respects `--routers` / `ENABLED_ROUTERS`
- [ ] No secret leakage in error messages/logs

---

> Detailed rules, full forbidden-pattern matrix, layer architecture, file naming, DTO/response/pagination specs, and the new-module checklist: [references/api-rules.md](references/api-rules.md)
