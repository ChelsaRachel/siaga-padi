# Configuration, Environment & Execution — Detailed Rules (be-python)

> Comprehensive reference for settings, environment variables, deployment flags, execution, virtual environment, and dependency constraints.
> Loaded by [skills/python-config/SKILL.md](../SKILL.md).

---

## Settings — Always Use `settings`

Always import from `config.base` — never call `os.getenv()` directly in application code.

```python
# ✅ Correct
from config.base import settings

supabase_url = settings.SUPABASE_URL
if settings.JWT_ACTIVE:
    ...

# ❌ Wrong
import os
supabase_url = os.getenv("SUPABASE_URL")
```

`settings` is a Pydantic `BaseSettings` instance that:
- Reads values from the `.env` file loaded by `python-dotenv`
- Accepts CLI overrides via `--update_env` flag
- Provides type validation and defaults

---

## Adding New Environment Variables

1. Add to `config/base.py` with type annotation and default:

```python
class Settings(BaseSettings):
    FEATURE_X_ENABLED: bool = False
    MAX_UPLOAD_SIZE_MB: int = 10
    EXTERNAL_API_KEY: str = ""
```

2. Add to `.env.example` (never put real values there):

```
FEATURE_X_ENABLED=
MAX_UPLOAD_SIZE_MB=
EXTERNAL_API_KEY=
```

3. Add to your actual `.env` file (not committed to source control).

4. Access from anywhere in the application:

```python
from config.base import settings

my_setting = settings.FEATURE_X_ENABLED
```

---

## Key Deployment Flags

| Flag | Default | Effect |
|------|---------|--------|
| `JWT_ACTIVE` | `True` | Enables JWT enforcement on all protected routers. Set to `False` to disable auth globally (dev only). |
| `ENC_ACTIVE` | `False` | Enables AES-256 request body decryption and response encryption via `DecryptPayload` middleware. |
| `IS_FUSION_APP` | `False` | Enables endpoint disabling via `DisabledEndpointMiddleware` and `router.EXLUDE_ENDPOINT`. |
| `ENABLED_ROUTERS` | `""` (all) | Comma-separated list of router names to load. Empty string = load all routers in `ROUTER_MODULES`. |
| `MAX_THREADS_WORKERS` | `4` | Threadpool max workers for sync `def` endpoint execution. |

Do not check these flags inside endpoint logic — handled at middleware/router-builder level.

---

## Running the API

**Always use `python api.py`** — never the `uvicorn` CLI tool.

```bash
# Basic
python api.py

# Custom port
python api.py --port 8080

# Multiple workers (disables auto-reload)
python api.py --worker 4

# Load specific routers only
python api.py --routers auth,user

# Endpoint filtering with bracket syntax
python api.py --routers auth[login:refresh],user[get-all:get-one] --port 8020

# Custom .env file
python api.py --file_env .env.staging

# Inject environment overrides
python api.py --update_env "JWT_ACTIVE=False,ENC_ACTIVE=True"
```

### Why not `uvicorn` CLI?

`api.py` parses CLI arguments at import time with `argparse`. As a result, using the standard `uvicorn` CLI will often fail with "unrecognized arguments" errors. Running via `python api.py` ensures that all argparse and dynamic configurations are correctly initialized before the ASGI server starts.

```bash
# FORBIDDEN
uvicorn api:app --reload
```

---

## Application Startup

The `api.py` file controls the entire application lifecycle.

- **Programmatic Uvicorn**: The template runs `uvicorn` programmatically via `uvicorn.run(app, ...)` instead of using the `uvicorn` CLI. This allows for more control over the startup process, including parsing custom CLI arguments before the app starts.
- **Dynamic Router Loading**: Routers are not hardcoded. `api.py` imports a list of router modules (`ROUTER_MODULES`) and includes them in the FastAPI app dynamically.

---

## Router Loading

Routers are dynamically loaded in `api.py`:

```python
ROUTER_MODULES = {
    "auth":       "auth",
    "user":       "user",
    "group":      "group",
    "permission": "permission",
    # add new feature here
}
```

A router is loaded when **both** conditions are met:
1. Its name is in `settings.ENABLED_ROUTERS` (or `ENABLED_ROUTERS` is empty)
2. Its name is in `args.routers` (or `--routers` CLI flag is not set)

### Two router-enablement knobs

1. `--routers` CLI arg (comma-separated)
   - Enables a subset of routers.
   - Supports endpoint filtering using bracket syntax, e.g. `user[add:get-all]`.

2. `ENABLED_ROUTERS` env (comma-separated)
   - Allowlist of routers to include.
   - If empty, all routers in `ROUTER_MODULES` are enabled.

This dynamic loading is handled by the `is_include_schema` function, which checks if a given router or endpoint should be included based on the current configuration.

---

## Middleware Stack (order matters)

Middleware is applied bottom-up in FastAPI (last added = outermost):

```python
# In api.py — applied in reverse order
app.add_middleware(DecryptPayload)          # innermost — runs last
app.add_middleware(SessionMiddleware, ...)  # middle
app.add_middleware(CORSMiddleware, ...)     # outermost — runs first
```

**Middleware in this boilerplate:**

| Middleware | File | Purpose |
|------------|------|---------|
| `CORSMiddleware` | `api.py` | Cross-origin request headers |
| `SessionMiddleware` | `api.py` | HTTP session support (required for OAuth flows) |
| `DecryptPayload` | `router/middleware.py` | AES decryption of request bodies when `ENC_ACTIVE=True` |
| `RateLimitMiddleware` | `middleware/rate_limiter.py` | Per-IP rate limiting |

### Adding Middleware

Middleware is added to the FastAPI app instance in `api.py` using `app.add_middleware()`.

```python
# In api.py
from fastapi.middleware.cors import CORSMiddleware
from middleware.rate_limiter import RateLimiterMiddleware

# ... create app instance ...

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimiterMiddleware)
```

### Creating Custom Middleware

To create custom middleware, define a class that follows the ASGI middleware interface.

- **Structure**: The middleware class should have an `__init__` method that takes the `app` and any options, and an `async def __call__` method that processes the `request`, `scope`, and `send` arguments.
- **Logic**: Inside `__call__` (or `dispatch` if extending `BaseHTTPMiddleware`), you can execute code before and after the request is handled by the route.

#### Example: Logging Middleware

1. Create the file `middleware/logging.py`:
    ```python
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.requests import Request
    import time

    class LoggingMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            start_time = time.time()

            # Code to be executed before the request
            print(f"Request received: {request.method} {request.url.path}")

            response = await call_next(request)

            # Code to be executed after the request
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            print(f"Response sent with status: {response.status_code}")

            return response
    ```
2. Add it in `api.py`:
    ```python
    from middleware.logging import LoggingMiddleware
    app.add_middleware(LoggingMiddleware)
    ```

### Checklist: Adding New Middleware

1. Create a new Python file in the `middleware/` directory.
2. Define a middleware class, typically inheriting from `BaseHTTPMiddleware`, or create a function-based middleware using the `@app.middleware("http")` decorator.
3. Implement the logic to inspect/modify the request or response.
4. Import and add the middleware to the FastAPI app instance in `api.py` using `app.add_middleware()`.
5. If the middleware requires configuration, add the necessary variables to `config/base.py` and the `.env` file.

---

## Encrypted Payloads

When `settings.ENC_ACTIVE == True`:
- Incoming request bodies are decrypted by `DecryptPayload` middleware using `settings.ENC_SECRET`.
- Responses are encrypted when `BaseResponse.dict()` is called (handled automatically).
- Do not return raw dicts to bypass this — it breaks the encryption contract.

Encryption uses AES-256-ECB via `util/aes_encryption.py`.

---

## Virtual Environment

Always create and activate a virtual environment before installing dependencies:

```bash
# Create
python -m venv venv

# Activate (Linux / macOS)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Virtual Environment Rules

- **Create Virtual Environment**: When setting up a new project or installing external Python libraries, you MUST create a new virtual environment. Use standard tools such as `python -m venv venv` or `python3 -m venv venv` at the root of the project directory.
- **Activate Before Installation**: Before executing any package manager commands like `pip install`, ensure that the newly created virtual environment is activated.
- **Strict Isolation**: Do not install dependencies globally. All project-specific libraries must reside within the isolated virtual environment to prevent conflicts.
- **Version Control Exclusions**: Ensure that the virtual environment directory (e.g., `venv/`, `.venv/`) is ignored in version control by verifying or adding it to the project's `.gitignore` file.

Add `venv/` to `.gitignore` — never commit the virtual environment.

---

## Dependency Constraints

- **No Additional Installations for Boilerplate Code**: When implementing, copying, or utilizing code from the `be-python` boilerplate, **DO NOT** install any additional external libraries or dependencies that are not already present in the project's existing dependency configuration.
- The provided boilerplate code is designed to run with the standard library and the core dependencies already defined for the project (such as those in `requirements.txt`).
- If a boilerplate implementation seems to require a new library, adjust the implementation to use existing tools, standard libraries, or already installed dependencies. Do not run `pip install`, `poetry add`, or any other package manager commands to add new dependencies for boilerplate code.
- **New Features Allowed**: You may add new dependencies if they are strictly required for a completely new feature (not derived from the provided boilerplate code). If you add a new dependency, you MUST document and append it to the project's `requirements.txt` file.

---

## Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| `os.getenv("VAR")` in application code | Use `settings.VAR` — bypasses type safety and validation |
| Hardcoded connection strings or secrets | Must come from environment via `settings` |
| Hardcoded feature flags (e.g. `if True:`) | Use `settings.*` flags for all toggleable behavior |
| Checking `settings.JWT_ACTIVE` inside endpoint logic | Handled by `router_param_builder` — do not duplicate |
| `uvicorn api:app --reload` to run the server | Use `python api.py` — argparse runs at import time |
| Installing new packages without updating `requirements.txt` | Dependencies must be pinned and committed |
| New env vars not added to `.env.example` | Others cannot configure the service without the template |
| Installing dependencies globally (no venv) | Must use isolated virtual environment |
