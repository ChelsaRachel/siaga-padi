---
name: python-async-performance
description: "Async, threading, and performance rules for Python/FastAPI. Load when writing async endpoints, calling blocking code, or handling CPU-bound operations."
---

# Async & Performance

---

## Threadpool Configuration

`api.py` configures a threadpool as the default executor for the asyncio event loop. This means synchronous `def` endpoints run in threads automatically — but you must still avoid blocking the event loop from within `async def` endpoints.

---

## Blocking Code Inside Async Endpoints

If you must call blocking (synchronous) code from inside an `async def` endpoint, use `asyncio.to_thread`:

```py
import asyncio

@router.get("/export")
async def export():
    # ✅ Offload blocking call to thread
    result = await asyncio.to_thread(service.generate_export)
    return BaseResponse(data=result, metaData=MetadataSuccess(...))
```

```py
# ❌ Wrong — blocking call directly in async handler stalls the event loop
@router.get("/export")
async def export():
    result = service.generate_export()   # blocks the loop if synchronous
    return BaseResponse(...)
```

---

## CPU-Bound Operations

Do not run long CPU-bound loops inside request handlers (sync or async). Options:

1. Offload to `asyncio.to_thread(...)` for short CPU work.
2. Use a background task queue (Kafka, Celery) for heavy computation.
3. Return a job ID immediately and let the client poll or receive a webhook.

---

## No Blocking Sleep

```py
# ❌ Wrong
import time
time.sleep(5)

# ✅ Correct inside async context
import asyncio
await asyncio.sleep(5)
```

---

## Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| Long synchronous loop inside `async def` handler | Blocks the event loop; all other requests stall |
| `time.sleep()` inside an async handler | Use `asyncio.sleep()` |
| Creating new DB connections per request | Connections are pooled via `Services.*`; do not bypass |
| CPU-bound computation in a request handler without offloading | Degrades throughput; use task queues for heavy work |
