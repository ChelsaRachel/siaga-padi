---
name: python-config
description: "be-python settings, environment variables, app startup, router enablement, and middleware. Use when adding env vars, changing startup behavior, enabling/disabling routers, or creating new middleware."
---

# config — Configuration & Middleware (be-python)

## Use this skill when

- Adding or modifying environment variables (`config/base.py` + `.env.example`)
- Changing application startup or `api.py` arguments
- Enabling/disabling routers or endpoints (`ENABLED_ROUTERS`, `--routers`)
- Creating new middleware (rate limiter, auth, decryption, logging, etc.)
- Setting up a virtual environment or pinning a new dependency

## Patterns (do this)

| Pattern | Example |
| --- | --- |
| Read config via `settings` | `from config.base import settings; settings.SUPABASE_URL` |
| Add env var with type + default | `FEATURE_X_ENABLED: bool = False` in `BaseSetting` |
| Mirror new env var in `.env.example` | Empty value, no real secret |
| Run server via `python api.py` | Never `uvicorn` CLI — argparse fires at import |
| Override env at runtime | `python api.py --update_env "JWT_ACTIVE=False"` |
| Load alternate env file | `python api.py --file_env .env.staging` |
| Subset routers | `python api.py --routers auth,user[get-all:get-one]` |
| Add middleware in `api.py` | `app.add_middleware(LoggingMiddleware)` |
| Custom middleware extends `BaseHTTPMiddleware` | Implement `async def dispatch(self, request, call_next)` |
| Always activate venv before `pip install` | `python -m venv venv && source venv/bin/activate` |
| Pin every new dep in `requirements.txt` | New feature deps only; never for boilerplate work |

## Anti-patterns (don't do this)

| Anti-pattern | Use instead |
| --- | --- |
| `os.getenv("VAR")` in app code | `settings.VAR` |
| Hardcoded secrets, URIs, or feature flags | `settings.*` from env |
| `uvicorn api:app --reload` | `python api.py` |
| `if True:` toggles | `settings.<FLAG>` |
| `settings.JWT_ACTIVE` check inside endpoints | Handled by `router_param_builder` |
| New env var without `.env.example` entry | Always document |
| Installing deps globally (no venv) | Isolated `venv/` |
| `pip install <pkg>` for boilerplate work | Use existing deps; only add for genuinely new features, then pin |
| New env var without type annotation | Pydantic needs typed fields for validation |

---

## Overview

This skill covers the configuration, startup process, and middleware implementation in the be-python FastAPI template. It explains how settings are managed using Pydantic's `BaseSettings`, how the FastAPI application is initialized, how routers are dynamically loaded, and how to create and apply middleware.

## Key Files and Components

- **`config/base.py`**: The heart of the configuration system. It defines the `BaseSetting` and `Setting` classes using `pydantic.v1.BaseSettings`, which automatically loads configuration from environment variables and `.env` files.
- **`api.py`**: The main entry point of the application. It initializes the `Setting` object, creates the `FastAPI` app instance, includes the routers, adds middleware, and programmatically runs `uvicorn`.
- **`.env` / `.env.example`**: Files for defining environment variables for local development.
- **`middleware/`**: A directory for custom middleware implementations. For example, `rate_limiter.py`.
- **`router/middleware.py`**: Contains middleware that might be more closely tied to the routing logic, such as the optional payload decryption middleware.

## Configuration Management with `Setting`

The `Setting` class in `config/base.py` is a singleton that holds all configuration for the application.

- **Loading**: It automatically reads variables from the environment. For local development, it loads from an `.env` file in the project root.
- **Type Hinting**: Pydantic validates the types of the environment variables (e.g., converting a string to an integer).
- **Defaults**: You can provide default values for settings directly in the class definition.
- **CLI Overrides**: The `api.py` script is set up to allow overriding settings via command-line arguments (e.g., `--port 8080`).

### Adding a New Configuration Variable

1.  **Add to `.env.example`**: Add the new variable with a default or example value.
    ```env
    # .env.example
    NEW_SETTING=default_value
    ```
2.  **Add to `config/base.py`**: Add the new variable as an attribute to the `BaseSetting` class, with a type hint and a default value if applicable.
    ```python
    # config/base.py
    class BaseSetting(pydantic.v1.BaseSettings):
        # ... existing settings
        NEW_SETTING: str = "default_value"

        class Config:
            env_file = ".env"
    ```
3.  **Access it**: You can now access this setting from the `Setting` singleton anywhere in the application.
    ```python
    from config import Setting

    my_setting = Setting.NEW_SETTING
    ```

## Application Startup and Router Loading

The `api.py` file controls the entire application lifecycle.

- **Programmatic Uvicorn**: The template runs `uvicorn` programmatically via `uvicorn.run(app, ...)` instead of using the `uvicorn` CLI. This allows for more control over the startup process, including parsing custom CLI arguments before the app starts.
- **Dynamic Router Loading**: Routers are not hardcoded. `api.py` imports a list of router modules (`ROUTER_MODULES`) and includes them in the FastAPI app dynamically.
- **Router Enablement**: You can control which routers (and even which endpoints within a router) are active using:
    - **`--routers` CLI argument**: A comma-separated list of routers to enable. Supports filtering endpoints with bracket syntax, e.g., `user[add:get-all]`.
    - **`ENABLED_ROUTERS` environment variable**: A comma-separated allowlist of routers. If empty, all routers are enabled.

This dynamic loading is handled by the `is_include_schema` function, which checks if a given router or endpoint should be included based on the current configuration.

## Middleware

Middleware are functions that process every request before it reaches the endpoint and every response before it is sent to the client.

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

To create custom middleware, you can define a class that follows the ASGI middleware interface.

- **Structure**: The middleware class should have an `__init__` method that takes the `app` and any options, and an `async def __call__` method that processes the `request`, `scope`, and `send` arguments.
- **Logic**: Inside `__call__`, you can execute code before and after the request is handled by the route.

### Example: A Simple Logging Middleware

1.  **Create the file `middleware/logging.py`**:
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
2.  **Add it in `api.py`**:
    ```python
    # In api.py
    from middleware.logging import LoggingMiddleware

    # ... create app instance ...

    app.add_middleware(LoggingMiddleware)
    ```

## Checklist: Adding New Middleware

1.  Create a new Python file in the `middleware/` directory.
2.  Define a middleware class, typically inheriting from `BaseHTTPMiddleware`, or create a function-based middleware using the `@app.middleware("http")` decorator.
3.  Implement the logic to inspect/modify the request or response.
4.  Import and add the middleware to the FastAPI app instance in `api.py` using `app.add_middleware()`.
5.  If the middleware requires configuration, add the necessary variables to `config/base.py` and the `.env` file.

---

> Detailed rules, full forbidden-pattern matrix, deployment flags, execution rules, virtual environment, dependency constraints, and middleware stack ordering: [references/config-rules.md](references/config-rules.md)
