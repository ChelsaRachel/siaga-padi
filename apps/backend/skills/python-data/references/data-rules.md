# Service Layer, Database & Performance — Detailed Rules (be-python)

> Comprehensive reference for the service layer, BaseSupabaseRepository, Supabase Postgres + Redis access, async/threading, and logging.
> Loaded by [skills/python-data/SKILL.md](../SKILL.md).

---

## Service Layer Responsibilities

The service layer owns **all business logic and data access**. Routers may not call DB clients directly.

- Execute domain logic: validation, transformation, orchestration.
- Access data via `BaseSupabaseRepository` and `Services` factories.
- Return typed data to the router — never build HTTP responses here.
- Raise exceptions on failure — let the router catch and wrap into `HTTPException`.

---

## BaseSupabaseRepository

Inherit `BaseSupabaseRepository` for all Postgres tables. It lives in `service/__init__.py`.

```python
from datetime import datetime, timezone

from service import BaseSupabaseRepository
from config.base import settings
from util.helper import supabase_query_builder

class ProductService(BaseSupabaseRepository):
    def __init__(self):
        super().__init__()
        self.table_name = settings.SUPABASE_TABLE_PRODUCT

    def _t(self):
        return self.table(self.table_name)

    def add(self, dto) -> dict:
        row = dto.dict()
        row["createdAt"] = datetime.now(timezone.utc).isoformat()
        self._t().insert(row).execute()
        return row

    def find(self, dto) -> tuple[list, int]:
        builder = self._t().select("*", count="exact")
        builder = supabase_query_builder(builder, dto)
        builder = builder.order(dto.orderBy, desc=dto.order.lower() == "desc")
        start = (dto.page - 1) * dto.size
        end = start + dto.size - 1
        resp = builder.range(start, end).execute()
        return resp.data or [], (resp.count or 0)

    def count(self, dto) -> int:
        builder = self._t().select("id", count="exact")
        builder = supabase_query_builder(builder, dto)
        return builder.execute().count or 0
```

### `self.table(name)` — schema + table resolution

`BaseSupabaseRepository.table(name)` returns a PostgREST query builder bound to the configured `SUPABASE_SCHEMA` (default `public`). All chains start from there.

Never hardcode table names — always source them from `settings.SUPABASE_TABLE_*`.

---

## Services Factory

Use `Services` to get pre-pooled clients. Defined in `service/__init__.py`.

```python
from service import Services

sb      = Services.supabase()        # Supabase client (singleton)
redis   = Services.redis()           # Redis sync client
a_redis = Services.a_redis()         # Redis async client
fresh   = Services.new_supabase(url=..., key=...)  # alt-key client (rare)
```

**No ad-hoc client creation.** Never call `create_client(...)` or `redis.Redis()` directly inside a service method — bypasses the singleton/pooling.

---

## supabase_query_builder

`util.helper.supabase_query_builder(builder, dto)` applies DTO-derived filters to a PostgREST query builder and returns the (mutated) chain.

Handles:
- `search` + `search_by` → `ilike("col", "%pattern%")` clauses joined with `or_`
- `multiSearch` → multi-term `ilike` across `search_by` fields
- `filters` → structured filter array delegated to `supabase_filter_query_builder`
- `startDate` / `endDate` → `gte("createdAt", ...).lte("createdAt", ...)`
- `timeframe` → `gte/lte` on the named field
- field-level filters → `.eq` / `.in_` / `.neq` / `.ilike` (when `text_type` matches)
- `searchIgnoreSpecial` → escapes special chars in the search term

```python
from util.helper import supabase_query_builder

builder = self._t().select("*", count="exact")
builder = supabase_query_builder(builder, dto, text_type="name,description")
resp = builder.range(0, 19).execute()
```

Fields excluded from query automatically: `orderBy`, `order`, `page`, `size`, `search`, `search_by`, `operator`, `filters`, `timeframe`, `multiSearch`, `readWrite`, plus anything in `additional_ignore`.

### Workflow for `get-all` Endpoints

1. **DTO at Boundary**: The router receives a `FindDTO` (or a subclass of it) in the request body.
2. **Pass to Service**: The router passes this DTO to the corresponding service's `get_all` method.
3. **Build chain**: Start with `self.table(...).select("*", count="exact")`, then apply `supabase_query_builder` to layer on filters.
4. **Sort + paginate**: Chain `.order(col, desc=...)` and `.range(start, end)` (1-indexed page → `start = (page-1)*size`).
5. **Execute and return**: `.execute()` returns `{ "data": [...], "count": N }`. Hand both to the router for pagination metadata.

```python
async def get_all(self, find_dto):
    builder = self._t().select("*", count="exact")
    builder = supabase_query_builder(
        builder, find_dto, text_type="name,description"
    )
    builder = builder.order(
        find_dto.orderBy, desc=find_dto.order.lower() == "desc"
    )
    start = (find_dto.page - 1) * find_dto.size
    end = start + find_dto.size - 1
    resp = builder.range(start, end).execute()
    return resp.data or [], (resp.count or 0)
```

---

## Error Propagation

Services raise exceptions on failure. Do NOT swallow errors inside services.

```python
# ✅ Correct — let error bubble to router
def get(self, product_id: str) -> dict:
    resp = self._t().select("*").eq("id", product_id).limit(1).execute()
    if not resp.data:
        raise ValueError(f"Product {product_id} not found")
    return resp.data[0]

# ❌ Wrong — swallows the error
def get(self, product_id: str):
    try:
        return self._t().select("*").eq("id", product_id).execute().data
    except:
        return None
```

The router catches and wraps into `HTTPException` + `BaseResponseFailed`.

---

## Redis Usage

Redis is **not** part of Supabase — it stays as a separate client. Used for:

- **Session Management**: storing the active JWT for single-login enforcement (`session:{user_id}` key).
- **Login throttling**: `login_fail:{user_id}`, `login_lock:{user_id}` counters.
- **Caching**: external API call results (e.g. email deliverability checks).
- **Rate limiting**: `middleware/rate_limiter.py` uses Redis to track request counts.

```python
from service import Services

redis = Services.redis()

# Cache a value (TTL in seconds)
redis.setex("key", 3600, "value")

# Get / delete
value = redis.get("key")
redis.delete("key")
```

For async Redis (inside `async def` handlers):

```python
a_redis = Services.a_redis()
await a_redis.setex("key", 3600, "value")
```

---

## Async, Threading & Performance

### Threadpool Configuration

`api.py` configures a threadpool as the default executor for the asyncio event loop. Synchronous `def` endpoints run in threads automatically — but you must still avoid blocking the event loop from within `async def` endpoints.

### Blocking Code Inside Async Endpoints

If you must call blocking (synchronous) code from inside an `async def` endpoint, use `asyncio.to_thread`:

```python
import asyncio

@router.get("/export")
async def export():
    # ✅ Offload blocking call to thread
    result = await asyncio.to_thread(service.generate_export)
    return BaseResponse(data=result, metaData=MetadataSuccess(...))
```

```python
# ❌ Wrong — blocking call directly in async handler stalls the event loop
@router.get("/export")
async def export():
    result = service.generate_export()   # blocks the loop if synchronous
    return BaseResponse(...)
```

### CPU-Bound Operations

Do not run long CPU-bound loops inside request handlers (sync or async). Options:

1. Offload to `asyncio.to_thread(...)` for short CPU work.
2. Use a background task queue (Kafka, Celery) for heavy computation.
3. Return a job ID immediately and let the client poll or receive a webhook.

### No Blocking Sleep

```python
# ❌ Wrong
import time
time.sleep(5)

# ✅ Correct inside async context
import asyncio
await asyncio.sleep(5)
```

### Async Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| Long synchronous loop inside `async def` handler | Blocks the event loop; all other requests stall |
| `time.sleep()` inside an async handler | Use `asyncio.sleep()` |
| Creating new DB connections per request | Connections pooled via `Services.*`; do not bypass |
| CPU-bound computation in a request handler without offloading | Degrades throughput; use task queues for heavy work |

---

## Logging in Services

All logging must use `loguru.logger`. Never use `print()`.

```python
from loguru import logger

class ProductService(BaseSupabaseRepository):
    def add(self, dto) -> dict:
        logger.info(f"Adding product: {dto.name}")
        # ...
        logger.error(f"Failed to add product: {str(error)}")
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| `logger.info(...)` | Normal flow — request received, operation completed |
| `logger.warning(...)` | Unexpected but recoverable — missing optional field, slow query |
| `logger.error(...)` | Failures that affect the response — DB errors, service exceptions |
| `logger.debug(...)` | Detailed trace data — only in development |

### What NOT to Log

- **Secrets:** tokens, passwords, API keys, connection strings, Supabase service-role key.
- **PII without masking:** email addresses must use `util.helper.censor_email(email)`; passwords must never appear.

```python
# ✅ Correct
logger.info(f"Login attempt: {censor_email(dto.email)}")

# ❌ Wrong — leaks PII and credentials
logger.info(f"Login: email={dto.email}, password={dto.password}")
```

### Logging Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| `print(...)` for any logging | Not captured by the log aggregator; disappears in production |
| Logging raw `dto.password` or token values | Secret/credential leakage |
| Logging unmasked email addresses | PII exposure |
| Using Python's built-in `logging` module | Project standard is `loguru`; avoid mixing loggers |

---

## Schema Migrations

Schema lives in `supabase/migrations/*.sql`. The Supabase CLI applies them in order.

- One migration per new module: `0008_<module>.sql`.
- Quote camelCase identifiers (`"createdBy"`, `"workspaceId"`) to keep PG columns aligned 1:1 with DTO fields.
- Always include `id text primary key`, `"createdAt" timestamptz default now()`, `"updatedAt" timestamptz default now()`.
- Add indexes for the columns most commonly used in `.eq` / `.in_` / `.gte` filters.

Apply locally:

```bash
supabase start          # boots local stack
supabase db reset       # drops + reapplies all migrations
```

When deploying to a remote Supabase project:

```bash
supabase link --project-ref <ref>
supabase db push
```

---

## Service-Layer Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| `create_client(...)` ad-hoc inside a service | Ad-hoc client creation breaks the singleton |
| `from pymongo import ...` | Mongo is gone; use `supabase-py` |
| `_id` field in queries or response shape | Postgres column is `id` natively |
| `return BaseResponse(...)` inside a service | HTTP concerns belong in the router |
| DB access directly in a router function | All DB access belongs in `service/` |
| Business logic inside a router function | Belongs in `service/` |
| `except: return None` | Swallows errors silently; always re-raise or propagate |
| `print(...)` for logging | Use `loguru.logger` |
| Hardcoded table names | Always read from `settings.SUPABASE_TABLE_*` |

---

## Checklist: Creating a New Service

1. Create a new file `service/<module>.py`.
2. Define a class `<Module>Service` (or `<Module>`) that inherits from `BaseSupabaseRepository`.
3. Set `self.table_name = settings.SUPABASE_TABLE_<MODULE>` in `__init__`.
4. Implement the business logic methods (`add`, `update`, `remove`, `get`, `find`, `count`).
5. For `find`/`get_all`, use `supabase_query_builder` to handle filtering, sorting, and pagination.
6. Use ISO timestamps (`datetime.now(timezone.utc).isoformat()`) for `createdAt` / `updatedAt`.
7. Add the table to `supabase/migrations/`.
8. Register the table name in `.env.example` (`SUPABASE_TABLE_<MODULE>=<module>`) and `config/base.py`.
9. Instantiate your new service in the corresponding router.
