---
name: data
description: "be-python service & data layer: BaseSupabaseRepository pattern, Supabase Postgres + Redis access, supabase_query_builder, async/threading, logging. Use when creating services, querying Supabase, or implementing business logic."
---

# data — Service & Data Layer (be-python)

## Use this skill when

- Creating a new service for a new domain/module
- Adding, modifying, or deleting business logic in an existing service
- Querying Supabase Postgres (filters, joins, RPC calls)
- Using Redis (caching, session storage, rate limiting)
- Translating a `FindDTO` into a PostgREST query chain
- Handling async/threading concerns in service code

## Patterns (do this)

| Pattern | Example |
| --- | --- |
| Inherit `BaseSupabaseRepository` | `class Product(BaseSupabaseRepository): ...` |
| Use `Services` factory for clients | `sb = Services.supabase()`, `redis = Services.redis()` |
| Resolve table via `self.table(settings.SUPABASE_TABLE_*)` | Respects `SUPABASE_SCHEMA` env |
| Build queries with `supabase_query_builder(builder, dto)` | Translates DTO → PostgREST `.eq/.in_/.ilike/.gte/.lte/.or_` |
| Paginate with `.range(start, end)` | `start = (page-1)*size; end = start+size-1` |
| Sort with `.order(col, desc=True)` | Mirrors `dto.order` |
| Get total via `count="exact"` | `.select("*", count="exact").execute().count` |
| Upsert (insert or update) | `.upsert({"id": ..., ...}).execute()` |
| Bulk operations | `.upsert([row1, row2, ...]).execute()` |
| Raise exceptions on failure | Router catches and wraps |
| Offload blocking calls in async handlers | `await asyncio.to_thread(service.heavy_op)` |
| `loguru.logger` only | `from loguru import logger` |
| Mask PII in logs | `logger.info(f"login: {censor_email(email)}")` |
| Use ISO-8601 timestamps | `datetime.now(timezone.utc).isoformat()` |

## Anti-patterns (don't do this)

| Anti-pattern | Use instead |
| --- | --- |
| `create_client(...)` ad-hoc inside service | `Services.supabase()` (singleton) |
| `redis.Redis()` ad-hoc | `Services.redis()` / `Services.a_redis()` |
| Hardcoded table names | `settings.SUPABASE_TABLE_*` |
| `from pymongo import ...` | Mongo is gone — use `supabase-py` |
| Mongo-style filters (`{"$or":[...]}` in service code) | PostgREST chain methods |
| `_id` field in queries or responses | Postgres column is `id` natively |
| `return BaseResponse(...)` from service | Service returns plain data; router wraps |
| DB call directly in `router/` | All DB access in `service/` |
| Business logic in `router/` | Belongs in `service/` |
| `except: return None` | Re-raise or propagate |
| `print(...)` for logging | `loguru.logger` |
| `time.sleep()` in async handler | `await asyncio.sleep()` |
| Long CPU loop in request handler | `asyncio.to_thread` or background queue |
| Logging passwords / tokens | Never |
| `datetime.now()` (naive) for timestamps | `datetime.now(timezone.utc).isoformat()` |

---

## Overview

This skill outlines the conventions for the service and data access layers in the be-python FastAPI template. It focuses on the repository pattern implemented via `BaseSupabaseRepository`, interaction with Supabase Postgres (via PostgREST through `supabase-py`) and Redis, and the overall structure of business logic.

## Key Files and Components

- **`service/`**: This directory contains the business logic for each module, typically in a class that inherits from `BaseSupabaseRepository`.
- **`service/__init__.py`**: Defines `BaseSupabaseRepository` and the `Services` factory (`supabase()`, `redis()`, `a_redis()`, `new_supabase()`).
- **`util/supabase.py`**: Singleton wrapper around `supabase-py`'s `create_client`. Reads `SUPABASE_URL`/`SUPABASE_KEY` from settings.
- **`util/redis.py`**: Singleton wrappers around the Redis sync/async clients.
- **`util/helper.py`**: Includes `supabase_query_builder` for translating `FindDTO` → PostgREST filter chain, plus `supabase_filter_query_builder` for UI-builder filter objects.
- **`supabase/migrations/*.sql`**: Schema source of truth. Apply via the Supabase CLI (`supabase db reset`).

## Mongo → Supabase mapping cheat sheet

| Mongo                                            | supabase-py                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| `coll.find_one({"email": e})`                    | `sb.table("user").select("*").eq("email", e).limit(1).execute()`       |
| `coll.find(query).sort(...).skip(...).limit(...)`| `.select("*").order(col, desc=...).range(start, end)`                  |
| `coll.count_documents(query)`                    | `.select("id", count="exact").execute().count`                         |
| `coll.insert_one(doc)`                           | `.insert(doc).execute()`                                               |
| `coll.update_one({"_id": id}, {"$set": ...})`    | `.update(fields).eq("id", id).execute()`                               |
| `coll.delete_one({"_id": id})`                   | `.delete().eq("id", id).execute()`                                     |
| `pymongo.UpdateOne` bulk                         | `.upsert(rows).execute()`                                              |
| `{"$or": [...]}`                                 | `.or_("col1.eq.x,col2.eq.y")`                                          |
| `{"$in": [...]}`                                 | `.in_("col", [...])`                                                   |
| `{"$regex": pattern, "$options": "i"}`           | `.ilike("col", f"%{pattern}%")`                                        |
| `{"$gte": d, "$lte": d}`                         | `.gte("col", d).lte("col", d)`                                         |

## Example: A `ProductService`

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

    def add(self, dto):
        row = {**dto.dict(), "id": dto.id, "createdAt": datetime.now(timezone.utc).isoformat()}
        self._t().insert(row).execute()
        return row

    def get_by_id(self, _id: str):
        resp = self._t().select("*").eq("id", _id).limit(1).execute()
        rows = resp.data or []
        return rows[0] if rows else {}

    def get_all(self, dto):
        builder = self._t().select("*", count="exact")
        builder = supabase_query_builder(builder, dto, text_type="name,description")
        builder = builder.order(dto.orderBy, desc=dto.order.lower() == "desc")
        start = (dto.page - 1) * dto.size
        end = start + dto.size - 1
        resp = builder.range(start, end).execute()
        return resp.data or [], (resp.count or 0)
```

## Using Redis

The `Redis` utility class provides a simple way to interact with a Redis server. It is used independently of Supabase for:

- **Session Management**: Storing the active JWT for single-login enforcement.
- **Caching**: Caching results from expensive operations or external API calls.
- **Rate Limiting**: `middleware/rate_limiter.py` uses Redis to track request counts.

```python
from service import Services

redis = Services.redis()
redis.setex("my_key", 3600, "my_value")  # TTL in seconds
value = redis.get("my_key")
```

For async Redis (inside `async def` handlers):

```python
a_redis = Services.a_redis()
await a_redis.setex("my_key", 3600, "my_value")
```

## Checklist: Creating a New Service

1. Create a new file `service/<module>.py`.
2. Define a class `<Module>` (or `<Module>Service`) that inherits from `BaseSupabaseRepository`.
3. Set `self.table_name = settings.SUPABASE_TABLE_<MODULE>` in `__init__`.
4. Implement business logic methods (`add`, `update`, `remove`, `get_by_id`, `get_all`, `count`, etc.).
5. For `get_all`, use `supabase_query_builder` to handle filtering, sorting, and pagination.
6. Add the table column names to `supabase/migrations/<n>_<module>.sql`.
7. Register the table name in `.env.example` (`SUPABASE_TABLE_<MODULE>=<module>`) and `config/base.py`.
8. Instantiate your new service in the corresponding router.

---

> Detailed rules, full forbidden-pattern matrix, async/threading guidance, error propagation, logging conventions, and Redis usage: [references/data-rules.md](references/data-rules.md)
