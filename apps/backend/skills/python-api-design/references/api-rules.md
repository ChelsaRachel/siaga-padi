# API & Interface Design — Detailed Rules (be-python)

> Comprehensive reference for endpoint design, routing, DTOs, response envelope, pagination, and file naming.
> Loaded by [skills/python-api-design/SKILL.md](../SKILL.md). Primary external reference: `fusion-openapi.json`.

---

## Layer Architecture (strict — no shortcuts)

```
HTTP Request
  → router/<name>.py      ← thin controller: validate DTO, call service, wrap BaseResponse
    → dto/<name>.py       ← Pydantic input models, boundary validation
      → service/<name>.py ← all business logic + data access
        → models/         ← response wrappers (BaseResponse, Metadata, Pagination)
          → HTTP Response
```

### Layer Responsibilities

| Layer | Owns | Must NOT |
|-------|------|----------|
| `router/` | Endpoint definition, DTO intake, BaseResponse wrapping | Business logic, DB calls |
| `dto/` | Pydantic models, input validation at boundary | Service calls, DB queries |
| `service/` | Business logic, data access via BaseSupabaseRepository | Build HTTP responses |
| `models/` | Response wrappers, Metadata, Pagination | Business logic |
| `auth/` | JWT validation, request-mutation dependencies | Business logic |
| `middleware/` | Cross-cutting concerns (rate limiting, decryption) | Per-endpoint logic |
| `util/` | Pure helpers, DB clients, query builders | Business logic |

### Forbidden Cross-Layer Patterns

| Pattern | Fix |
|---------|-----|
| `collection.find()` inside a `router/` function | Move DB call to `service/` |
| `BaseResponse(...)` returned from `service/` | Wrap response only in `router/` |
| Business logic (`if user.role == ...`) inside `router/` | Move to `service/` |
| `os.getenv(...)` anywhere in application code | Use `from config.base import settings` |
| `print(...)` for logging | Use `from loguru import logger` |
| Direct `create_client(...)` inside a service method | Use `Services.supabase()` or `BaseSupabaseRepository.table()` |
| `dto` types used directly as Postgres rows | Map DTO → row dict; let supabase-py serialise the JSON |

---

## Folder Structure

```
be-python/
├── api.py                    ← Entry point. Parses CLI args, registers routers, starts uvicorn.
├── requirements.txt
├── .env.example
│
├── config/
│   ├── base.py               ← Settings class (Pydantic BaseSettings). Only source of env vars.
│   └── __init__.py
│
├── auth/
│   ├── auth_bearer.py        ← JWTBearer, JWTChangeUserId, JWTRefresh dependencies.
│   ├── auth_handler.py       ← Token encode/decode helpers.
│   └── __init__.py
│
├── dto/
│   ├── auth.py               ← LoginDTO, RegisterDTO, etc.
│   ├── user.py               ← UserDTO, UpdateUserDTO, FindUserDTO
│   ├── group.py
│   ├── permission.py
│   ├── workspace.py
│   └── __init__.py
│
├── router/
│   ├── auth.py               ← Thin controller. Validates input, calls service, wraps response.
│   ├── user.py
│   ├── group.py
│   ├── permission.py
│   ├── middleware.py          ← DecryptPayload middleware.
│   └── __init__.py
│
├── service/
│   ├── auth.py               ← Business logic + data access for auth.
│   ├── user.py
│   ├── group.py
│   ├── permission.py
│   ├── workspace.py
│   ├── external_auth.py
│   └── __init__.py           ← BaseSupabaseRepository, Services factory.
│
├── supabase/
│   ├── config.toml           ← Supabase CLI config.
│   └── migrations/           ← *.sql migrations applied via `supabase db reset/push`.
│
├── models/
│   ├── base_response.py      ← BaseResponse, BaseResponseFailed.
│   ├── metadata.py           ← MetadataSuccess, MetadataFailed, Pagination.
│   ├── pagination.py         ← Pagination.count_total_pages()
│   └── __init__.py
│
├── middleware/
│   └── rate_limiter.py       ← RateLimitMiddleware.
│
├── exceptions/
│   ├── fusion_exceptions.py  ← ValidationException, ErrorSubCategory, domain errors.
│   └── __init__.py
│
└── util/
    ├── helper.py             ← router_param_builder, is_include_schema, get_execution_time,
    │                            supabase_query_builder, censor_email, encrypt, etc.
    ├── supabase.py           ← SupabaseService, NewSupabaseService (singleton + alt-key).
    ├── redis.py              ← RedisService, AsyncRedisService, NewRedisService.
    ├── aes_encryption.py     ← AES payload encryption/decryption.
    ├── kafka_util.py         ← Kafka producer helpers.
    └── __init__.py
```

---

## File Naming & Module Layout

When adding a new feature/module, create all three layers:

```
dto/
└── <feature>.py          ← FeatureDTO, UpdateFeatureDTO, FindFeatureDTO(FindDTO)

service/
└── <feature>.py          ← class Feature(BaseSupabaseRepository)

router/
└── <feature>.py          ← router = APIRouter(**router_param_builder(tag))
```

### Naming Rules Per Layer

**DTO (`dto/<feature>.py`)**

| Class | Pattern | Example |
|-------|---------|---------|
| Create payload | `<Feature>DTO` | `ProductDTO` |
| Update payload | `Update<Feature>DTO` | `UpdateProductDTO` |
| Search / filter | `Find<Feature>DTO` | `FindProductDTO` |

**Service (`service/<feature>.py`)**

| Element | Pattern | Example |
|---------|---------|---------|
| Class name | `<Feature>` (PascalCase) | `class Product(BaseSupabaseRepository)` |
| Method names | `snake_case` verbs | `add`, `update`, `remove`, `get`, `find` |

**Router (`router/<feature>.py`)**

| Element | Pattern | Example |
|---------|---------|---------|
| Tag variable | `tag = "<feature>"` | `tag = "product"` |
| Exported variable | `router` (always this name) | `router = APIRouter(...)` |

### File Naming Convention

| Layer | Convention | Example |
|-------|-----------|---------|
| DTO | `snake_case.py` | `product_category.py` |
| Service | `snake_case.py` | `product_category.py` |
| Router | `snake_case.py` | `product_category.py` |

Multi-word features use `snake_case` — never `kebab-case` or `camelCase` for Python file names.

### File Naming Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| `router/ProductManager.py` (PascalCase filename) | Python files must be `snake_case` |
| Creating a router without registering it in `api.py` | The module will never load |
| Putting multiple unrelated features in one DTO file | One feature per file — keeps scope clear |
| Naming the exported router anything other than `router` | `api.py` relies on the `router` variable name |

---

## New Module Checklist

When adding a new feature module, follow this exact order:

```
1. dto/<feature>.py
   └── FeatureDTO
   └── UpdateFeatureDTO
   └── FindFeatureDTO(FindDTO)

2. service/<feature>.py
   └── class Feature(BaseSupabaseRepository)
   └── methods: add(), update(), remove(), find(), count()

3. router/<feature>.py
   └── tag = "<feature>"
   └── router = APIRouter(**router_param_builder(tag))
   └── all CRUD endpoints with is_include_schema gate

4. api.py
   └── add "feature": "feature" to ROUTER_MODULES dict

5. config/base.py (if needed)
   └── add new env keys with type annotation + default
   └── add to .env.example
```

---

## Router Setup (Mandatory)

Every `router/<name>.py` MUST follow this setup:

```python
from fastapi import APIRouter
from util.helper import router_param_builder, is_include_schema

tag    = "feature"          # matches filename: router/feature.py
router = APIRouter(**router_param_builder(tag))
deps   = router.dependencies
```

- Export variable must be named exactly `router`.
- Prefix and tags are controlled by `router_param_builder(tag)` — never hardcode.
- Every endpoint must include `include_in_schema=is_include_schema(tag, "endpoint-name")`.

Key behavior in `router_param_builder(tag, jwt=True)`:

- `prefix` becomes `/{tag.replace('_', '/').replace('-', '_')}`
  - Use underscores in filenames to create nested path segments.
  - Example: `router/app_users.py` → prefix `/app/users`.
- `dependencies` default to JWT protection (`Depends(JWTBearer())`) when `settings.JWT_ACTIVE` is true.
  - For public routers (e.g. auth), pass `jwt=False`.

---

## Standard CRUD Routes

Every module follows this exact contract — derived from `fusion-openapi.json`:

| Action | Method | Path | `id` location |
|--------|--------|------|---------------|
| Create | `POST` | `/<module>/add` | Request body |
| Update | `PUT` | `/<module>/update` | Request body field `id` |
| Delete | `DELETE` | `/<module>/delete` | Query param `?id=` |
| List/Filter | `POST` | `/<module>/get-all` | — (body = FindDTO) |
| Get single | `GET` | `/<module>/get-one` | Query param `?id=` |

```python
@router.post("/add",      include_in_schema=is_include_schema(tag, "add"))
@router.put("/update",    include_in_schema=is_include_schema(tag, "update"))
@router.delete("/delete", include_in_schema=is_include_schema(tag, "delete"))
@router.post("/get-all",  include_in_schema=is_include_schema(tag, "get-all"))
@router.get("/get-one",   include_in_schema=is_include_schema(tag, "get-one"))
```

> `get-all` is **POST** — it carries a `FindDTO` body for filtering and pagination.
> `delete` and `get-one` use `?id=` query param — never path segment `/{id}`.

---

## Canonical Endpoint Template

```python
from time import time
import traceback
from fastapi import APIRouter, HTTPException
from models.base_response import BaseResponse, BaseResponseFailed
from models.metadata import MetadataSuccess, MetadataFailed, Pagination
from util.helper import router_param_builder, is_include_schema, get_execution_time

tag    = "feature"
router = APIRouter(**router_param_builder(tag))
deps   = router.dependencies


@router.post("/add", include_in_schema=is_include_schema(tag, "add"))
def add(dto: FeatureDTO):
    start_time = time()
    try:
        data = service.add(dto)
        return BaseResponse(
            data=data,
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=BaseResponseFailed(
            metaData=MetadataFailed(
                executionTime=get_execution_time(start_time),
                message=str(error),
            )
        ).dict())


@router.put("/update", include_in_schema=is_include_schema(tag, "update"))
def update(dto: UpdateFeatureDTO):   # id is a field inside UpdateFeatureDTO
    ...


@router.delete("/delete", include_in_schema=is_include_schema(tag, "delete"))
def delete(id: str):        # id arrives as query param: DELETE /feature/delete?id=...
    start_time = time()
    try:
        data = service.delete(id)
        return BaseResponse(
            data=data,
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=BaseResponseFailed(
            metaData=MetadataFailed(executionTime=get_execution_time(start_time), message=str(error))
        ).dict())


@router.post("/get-all", include_in_schema=is_include_schema(tag, "get-all"))
def get_all(dto: FindFeatureDTO):   # POST — body carries filters + pagination
    start_time = time()
    try:
        count = service.count(dto)
        data  = service.find(dto)
        return BaseResponse(
            data=data,
            metaData=MetadataSuccess(
                executionTime=get_execution_time(start_time),
                pagination=Pagination.count_total_pages(dto.size, count),
            ),
        )
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=BaseResponseFailed(
            metaData=MetadataFailed(executionTime=get_execution_time(start_time), message=str(error))
        ).dict())


@router.get("/get-one", include_in_schema=is_include_schema(tag, "get-one"))
def get_one(id: str):       # id arrives as query param: GET /feature/get-one?id=...
    ...
```

---

## Path Naming Rules

| Rule | Correct | Wrong |
|------|---------|-------|
| Segment case | `kebab-case` | `getAll`, `get_all` |
| Standard verbs | `add`, `update`, `delete`, `get-all`, `get-one` | `create`, `remove`, `list`, `fetch`, `get-by-id` |
| `id` on delete/get-one | Query param `?id=` | Path segment `/delete/{id}` |
| `id` on update | Inside request body | Path segment `/update/{id}` |
| Multi-word module | `/<ns>/<module>/add` (slash) | `/<ns>-<module>/add` (dash) |
| No version prefix | `/add` | `/v2/add` |

Multi-word / nested modules (tag uses space):

```
/ai/api/add              →  tag = "ai api"
/ai/assistant/add        →  tag = "ai assistant"
/coms/calls/add          →  tag = "coms calls"
/document/knowledge/add  →  tag = "document knowledge"
```

`router_param_builder("ai api")` handles the prefix automatically.

---

## Extended Action Endpoints

All non-CRUD operations use the same `kebab-case` verb pattern. The full list below is derived from `fusion-openapi.json`:

| Category | Paths (verb part) | Method |
|----------|-------------------|--------|
| Partial / batch update | `update-status`, `update-connection`, `update-partial`, `multi-update`, `update-menu` | `PUT` |
| Batch create | `add-multi`, `upload-file`, `upload-legal` | `POST` |
| Bulk | `bulk-operation` | `POST` |
| Retrieval variants | `get-by-pattern`, `get-by-client`, `get-by-email`, `get-tags`, `get-fields`, `get-members`, `get-one`, `get-all-log` | `GET` or `POST` |
| Actions / lifecycle | `duplicate`, `move`, `close`, `start`, `stop`, `restart`, `force-stop`, `rollback`, `execute`, `execute-sse` | `POST` or `PUT` |
| Sync / share | `sync-to-qdrant`, `sync-as-knowledge`, `share-to-workspace`, `use-to-application` | `POST` |
| Checks / validation | `check-alias`, `check-duplicate`, `test-connection`, `test-hook`, `access-check`, `validate` | `GET` or `POST` |
| Auth-specific | `login`, `logout`, `refresh`, `verify`, `register`, `verify-email`, `resend` | `POST` / `DELETE` / `GET` |
| Import / Export | `import`, `download`, `extract-from-file` | `POST` or `GET` |

Rule: use **POST** for actions that mutate state; **GET** for read-only checks.

---

## Path Parameters (Rare — Exceptions Only)

Path params appear **only for non-ID lookups** (human-readable key, type slug, redirect):

```
GET  /user/{username}
GET  /settings/{type}/{reference_id}
GET  /shortlinks/goto/{shortCode}
GET  /knowledge/folder/get-directory/{type}
GET  /ticket/statistic/{type}
```

**Never use path params for standard CRUD `id`.** Always use query param `?id=`.

---

## Route Ordering

Declare static routes **before** path-parameter routes (prevents Starlette shadowing):

```python
@router.get("/get-one")       # static — first
@router.get("/get-by-email")  # static — first
@router.get("/{username}")    # path param — last
```

---

## Module Registration

After creating `router/<feature>.py`, register in `api.py`:

```python
ROUTER_MODULES = {
    "auth":    "auth",
    "feature": "feature",   # ← add here
}
```

Or:

```python
ROUTER_MODULES = [
    "router.feature",   # ← add here after creating router/feature.py
]
```

(Existing convention varies by codebase — match what the repo already uses.)

---

## DTO Conventions

Every endpoint body must be a dedicated `dto/*DTO` Pydantic model. Never accept raw `dict` or untyped input at the API boundary.

| DTO Type | Naming | Location |
|----------|--------|----------|
| Create payload | `FeatureDTO` | `dto/feature.py` |
| Update payload | `UpdateFeatureDTO` | `dto/feature.py` |
| Search / filter | `FindFeatureDTO(FindDTO)` | `dto/feature.py` |

Extend `FindDTO` from shared DTOs for list/search endpoints — do not reinvent pagination fields.

### Field Naming

- Use **camelCase** for all DTO fields: `createdBy`, `orderBy`, `pageSize`, `startDate`.
- Do **not** mix snake_case and camelCase in the same DTO.
- 97%+ of OpenAPI fields are camelCase.
- snake_case only for special integration fields: `search_by`, `client_id`, `redirect_url`, `authorization_code` (OAuth/external-system params).

```python
# ✅ Correct
class ProductDTO(BaseModel):
    productName: str
    categoryId: str
    createdBy: Optional[str] = None

# ❌ Wrong — snake_case field names
class ProductDTO(BaseModel):
    product_name: str
    category_id: str
```

### Validation

- Validate at the **DTO boundary** — not inside the service layer.
- Use Pydantic field validators (`@validator`, `@field_validator`) for complex validation.
- Use `Field(...)` for constraints like `min_length`, `max_length`, `ge`, `le`.

```python
from pydantic import BaseModel, Field, validator

class CreateUserDTO(BaseModel):
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=8)

    @validator("email")
    def email_must_be_lowercase(cls, v):
        return v.lower()
```

### Create DTO

```python
# dto/feature.py
from pydantic import BaseModel
from typing import Optional, List, Any

class FeatureDTO(BaseModel):
    name:        Optional[str]  = None
    description: Optional[str]  = None
    workspaceId: Optional[str]  = None
    config:      Optional[dict] = None
    tags:        Optional[List[Any]] = None
    createdBy:   Optional[str]  = None
    updatedBy:   Optional[str]  = None
```

- All fields are **optional with `None` default** unless the schema has an explicit `required` array.

### Update DTO

```python
class UpdateFeatureDTO(BaseModel):
    id:          Optional[str]  = None   # record to update — in body, never path
    name:        Optional[str]  = None
    description: Optional[str]  = None
    workspaceId: Optional[str]  = None
    updatedBy:   Optional[str]  = None
```

- Always includes `id` field (the record to update).
- All other fields optional — partial update semantics.

### Find DTO

```python
class FindFeatureDTO(BaseModel):
    # base FindDTO fields
    search:              Optional[str]       = None
    search_by:           Optional[List[Any]] = []   # snake_case — intentional exception
    operator:            Optional[str]       = None
    orderBy:             Optional[str]       = "createdAt"
    order:               Optional[str]       = "desc"
    page:                Optional[int]       = 1
    size:                Optional[int]       = 10
    searchIgnoreSpecial: Optional[bool]      = False
    workspaceId:         Optional[str]       = None
    filters:             Optional[List[Any]] = []
    organizationId:      Optional[str]       = None
    # module-specific filters
    name:                Optional[str]       = None
    createdBy:           Optional[str]       = None
```

> `search_by` and `filters` stay `snake_case` — this is the intentional exception from the base schema.

### API Shape Stability

- **Do not silently change existing DTO shapes.** If a new field is needed, add it and ensure backward compatibility or version the endpoint.
- If a new response shape is required, create a new model and use it consistently — do not mutate existing response models.

### DTO Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| `def add(data: dict)` | Untyped input bypasses validation |
| Business logic inside a validator | Validators are for data shape, not domain rules |
| Validation inside service methods | Validation belongs at the DTO boundary |
| `snake_case` field names | All fields must be `camelCase` to match API contract |
| Reusing the same DTO for both create and update | Update DTOs should be separate with all-optional fields |

---

## Response Envelope

Every endpoint in this project MUST use the unified response envelope. No exceptions.

### Success

Always return `models.base_response.BaseResponse` with `models.metadata.MetadataSuccess`.

```python
from models.base_response import BaseResponse
from models.metadata import MetadataSuccess

return BaseResponse(
    data=data,
    metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
)
```

```json
{
  "success": true,
  "data": "<any>",
  "metaData": {
    "executionTime": 42,
    "pagination": { "page": 1, "size": 10, "totalPage": 5, "totalData": 50 }
  }
}
```

`pagination` only on list (`get-all`) endpoints.

- `executionTime` is **camelCase** — do NOT invent `execution_time`.
- `data` must be a typed model or serializable object — never a raw dict unless the endpoint is intentionally streaming/downloading.

### Failure

Always raise `fastapi.HTTPException` with `detail=BaseResponseFailed(...).dict()`.

```python
from models.base_response import BaseResponseFailed
from models.metadata import MetadataFailed

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

```json
{
  "success": false,
  "data": null,
  "metaData": {
    "executionTime": 12,
    "message": "error description"
  }
}
```

**Rules:**
- `executionTime` (camelCase) is **required** in every response — success and failure.
- `metaData` (camelCase) — never `metadata` or `meta_data`.
- Never return a raw dict or skip the envelope.
- Use specific status codes when possible (401 missing/expired auth, 403 invalid session/forbidden).
- Keep messages user-safe: don't leak secrets (JWTs, passwords, DB URIs, internal stack traces).
- `MetadataSuccess`/`MetadataFailed` allow extra fields (`extra = "allow"`), so it's safe to attach structured details when needed.

### Encryption Middleware

If `settings.ENC_ACTIVE == True`:

- Request bodies may be decrypted automatically by `router.middleware.DecryptPayload`.
- Responses may be encrypted automatically via `BaseResponse.dict()`.
- **Do not return raw dict** to bypass this — it breaks the encryption contract.
- Request bodies for `POST/PUT/PATCH` must be wrapped as: `{ "hashedPayload": "<base64 AES ECB ciphertext>" }`.
- `BaseResponse`/`BaseResponseFailed` encrypt the entire response payload and return: `{ "data": "<encrypted>" }`.

Design implication: don't build endpoints that rely on reading raw request bodies outside FastAPI/Pydantic parsing.

### Response Envelope Forbidden Patterns

| Pattern | Why Forbidden |
|---------|--------------|
| `return {"data": ..., "success": True}` | Bypasses envelope; misses metadata and encryption |
| Missing `executionTime` in any response | Breaks monitoring and client contract |
| `return str(error)` directly | Not wrapped in `BaseResponseFailed` |
| Using `execution_time` (snake_case) | Field name must be `executionTime` (camelCase) |

---

## Pagination & Metadata

All list endpoints MUST return pagination metadata via `MetadataSuccess.pagination`.

```python
from models.metadata import MetadataSuccess, Pagination

count = service.count(dto)
data  = service.find(dto)

return BaseResponse(
    data=data,
    metaData=MetadataSuccess(
        executionTime=get_execution_time(start_time),
        pagination=Pagination.count_total_pages(dto.size, count),
    ),
)
```

### FindDTO Pagination Fields

All search/list DTOs must extend `FindDTO` which provides the standard pagination fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `int` | `1` | Current page (1-indexed) |
| `size` | `int` | `10` | Items per page |
| `orderBy` | `str` | — | Sort field name |
| `orderType` | `str` | `"asc"` | `"asc"` or `"desc"` |

```python
from dto.shared import FindDTO

class FindProductDTO(FindDTO):
    categoryId: Optional[str] = None
    keyword: Optional[str] = None
```

### Pagination Response Shape

`Pagination.count_total_pages(size, total_count)` returns:

```json
{ "page": 1, "size": 10, "totalPage": 5, "totalData": 50 }
```

This object is placed inside `metaData.pagination`.

### ExecutionTime is Always Required

Both success and failure responses MUST include `executionTime`:

```python
start_time = time()
# ... do work ...
metaData=MetadataSuccess(executionTime=get_execution_time(start_time))
```

Never omit `executionTime` even on simple endpoints.

### Pagination Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| Returning a list without `pagination` in `metaData` | Client cannot determine total pages |
| Manually computing `totalPage` inline | Use `Pagination.count_total_pages(dto.size, count)` |
| Using `page` as 0-indexed | Standard is 1-indexed |
| Omitting `executionTime` from any response | Required in all metadata objects |

---

## Auth at the Router Level

Default: all endpoints require `JWTBearer` unless explicitly set to public.

```python
# JWT for all endpoints in this router
router = APIRouter(**router_param_builder(tag, jwt=True))

# Override — public endpoint (e.g. login)
@router.post("/login", dependencies=[], include_in_schema=is_include_schema(tag, "login"))
def login(dto: LoginDTO): ...

# Add extra dependency on top of defaults
@router.post("/admin", dependencies=[*deps, Depends(JWTChangeUserId())])
def admin(dto: FeatureDTO): ...
```

Security schemes from OpenAPI:
- `JWTBearer` — standard auth, Bearer token
- `JWTRefresh` — refresh-token routes only

Detailed JWT/auth dependency rules: see `skills/python-auth/SKILL.md`.

---

## Operational Endpoints

- `GET /monitoring/threadpool` exposes threadpool sizing and queue stats (best-effort).

---

## Verification Checklist

- [ ] Endpoints follow the existing path style for the module
- [ ] DTOs validate at boundaries; service assumes validated input
- [ ] Success responses use `BaseResponse` + `MetadataSuccess`
- [ ] List endpoints include `Pagination.count_total_pages(...)`
- [ ] Errors use `BaseResponseFailed` + `MetadataFailed` with appropriate HTTP status
- [ ] Router is registered in `api.py` and respects `--routers` / `ENABLED_ROUTERS`
- [ ] No secret leakage in error messages/logs

---

## Aggregate Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| `DELETE /delete/{id}` path param | Standard is `?id=` query param |
| `GET /get-all` | Must be `POST` — it carries a `FindDTO` body |
| `GET /get-one/{id}` | Use `GET /get-one?id=` |
| `PUT /update/{id}` path param | `id` belongs inside request body |
| Verb names not in `fusion-openapi.json` | Derive from existing patterns; do not invent |
| `router = APIRouter(prefix=...)` without `router_param_builder` | Prefix format is enforced by the helper |
| Missing `is_include_schema` on any endpoint | Schema exposure must be gated |
| Path-param route declared before static route | Causes route shadowing in Starlette |
| `executionTime` spelled as `execution_time` | Must be camelCase |
| `metaData` spelled as `metadata` | Must match envelope contract exactly |
| `snake_case` DTO fields (except `search_by`, `filters`, OAuth params) | All other fields must be camelCase |
| `def add(data: dict)` | Untyped input bypasses validation |
| Reusing the same DTO for both create and update | Update DTOs should be separate with all-optional fields |
