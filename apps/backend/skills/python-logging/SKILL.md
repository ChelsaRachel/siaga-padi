---
name: python-logging
description: "Logging and observability rules for Python/FastAPI. Load when adding logs, debugging, or instrumenting services."
---

# Logging & Observability

---

## Use `loguru.logger` Only

All logging must use `loguru.logger`. Never use `print()`.

```py
from loguru import logger

# ✅ Correct
logger.info("Processing product add request")
logger.error(f"Failed to insert product: {str(error)}")
logger.warning("Rate limit approaching for user {user_id}")

# ❌ Wrong
print("Processing product add request")
```

---

## Structured Logging Patterns

For complex query services (like config handlers), follow the existing patterns:

```py
from service import logger_config_handler

logger_config_handler.info("Query executed", collection="products", duration_ms=42)
```

Use `logger_success` and `logger_error` helpers where they exist in the service layer.

---

## What to Log

| Level | When to Use |
|-------|-------------|
| `logger.info(...)` | Normal flow — request received, operation completed |
| `logger.warning(...)` | Unexpected but recoverable — missing optional field, slow query |
| `logger.error(...)` | Failures that affect the response — DB errors, service exceptions |
| `logger.debug(...)` | Detailed trace data — only in development |

---

## What NOT to Log

- **Secrets:** tokens, passwords, API keys, connection strings.
- **PII without masking:** email addresses must use `util.helper.censor_email(email)`; passwords must never appear.

```py
# ✅ Correct
logger.info(f"Login attempt: {censor_email(dto.email)}")

# ❌ Wrong — leaks PII and credentials
logger.info(f"Login: email={dto.email}, password={dto.password}")
```

---

## Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| `print(...)` for any logging | Not captured by the log aggregator; disappears in production |
| Logging raw `dto.password` or token values | Secret/credential leakage |
| Logging unmasked email addresses | PII exposure |
| Using Python's built-in `logging` module | Project standard is `loguru`; avoid mixing loggers |
