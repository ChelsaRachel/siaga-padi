# Authentication & Security — Detailed Rules (be-python)

> Comprehensive reference for JWT dependencies, password handling, session management, security middleware, and forbidden patterns.
> Loaded by [skills/python-auth/SKILL.md](../SKILL.md).

---

## JWT Dependency Selection

Pick the correct dependency based on what the endpoint needs:

| Dependency | Use When |
|------------|----------|
| `JWTBearer()` | Simple authentication — verify the token is valid |
| `JWTChangeUserId()` | Endpoint needs the authenticated user/permissions injected into headers or body |
| `JWTRefresh()` | Refresh-token routes only |

All are importable from `auth`:

```python
from auth import JWTBearer, JWTChangeUserId, JWTRefresh

# Simple auth check
@router.get("/get-all", dependencies=[Depends(JWTBearer())])
def get_all(): ...

# Needs user identity injected
@router.post("/add", dependencies=[Depends(JWTChangeUserId())])
def add(dto: FeatureDTO): ...
```

---

## Default Auth via Router

Set default auth for all endpoints in a router via `router_param_builder`:

```python
# JWT-protected router (default)
router = APIRouter(**router_param_builder(tag, jwt=True))
deps   = router.dependencies

# Public router (login, register, health check)
router = APIRouter(**router_param_builder(tag, jwt=False))
```

`router_param_builder` reads `settings.JWT_ACTIVE` — if `False`, no JWT dependencies are injected regardless of the `jwt=True` flag.

Set `jwt=False` only for intentionally public routers (e.g., login, register, health check).

---

## Endpoint-Level Overrides

Override auth at the endpoint level when needed:

```python
# Add extra dependency on top of router defaults
@router.post("/admin", dependencies=[*deps, Depends(JWTChangeUserId())])
def admin_endpoint(dto: FeatureDTO): ...

# Make one endpoint public while the rest of the router is protected
@router.post("/login", dependencies=[], include_in_schema=is_include_schema(tag, "login"))
def login(dto: LoginDTO): ...
```

---

## Authentication Flow

Login endpoint pattern (`router/auth.py`):

```python
@router.post("/login", dependencies=[], include_in_schema=is_include_schema(tag, "login"))
def login(dto: LoginDTO):
    start_time = time()
    try:
        data = service.login(dto)       # validate credentials, return token + user
        return BaseResponse(
            data=data,
            metaData=MetadataSuccess(executionTime=get_execution_time(start_time)),
        )
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=BaseResponseFailed(
            metaData=MetadataFailed(executionTime=get_execution_time(start_time), message=str(error))
        ).dict())
```

Service-level (`service/auth.py`):
1. Look up user by email/username.
2. Verify password with `bcrypt.checkpw()`.
3. Sign JWT via `auth_handler.sign_jwt(user_id)`.
4. Return token + user object.

---

## Password Handling

```python
from util.helper import encrypt

# Hash password before storing
hashed = encrypt(plain_password)   # bcrypt with 10 rounds

# Verify
import bcrypt
is_valid = bcrypt.checkpw(
    plain_password.encode("utf-8"),
    stored_hash.encode("utf-8"),
)
```

- **Never** store raw passwords.
- **Never** log passwords — not even in debug.
- **Never** return passwords in any response.

---

## Session Management

When `settings.JWT_ACTIVE` is `True`, the `JWTBearer` middleware validates the Bearer token on every protected request.

Single-login enforcement (optional): store session token in Redis under `session:{user_id}`. On login, overwrite the key — old tokens become invalid.

```python
redis = Services.redis()
redis.setex(f"session:{user_id}", settings.JWT_EXPIRED, new_token)
```

### Multi-Login vs Single-Login

JWT payload includes `multiLogin`.

- **`multiLogin: true`**: The user can be logged in from multiple devices/browsers simultaneously. `JWTBearer` only validates the token itself.
- **`multiLogin: false`**: The user can only have one active session at a time.
    - When a user logs in, the access token is stored in Redis under a key like `session:{user_id}`.
    - `JWTBearer` retrieves this stored token and compares it with the one presented by the client.
    - If they don't match, it means a newer session has been initiated elsewhere, and the current token is considered invalid. This effectively logs the user out of the older session.

---

## Token Sources

Auth dependencies support both:

- `Authorization: Bearer <token>`
- Cookies (`token` and `refresh_token`) set by the auth router

---

## Secret & Token Handling

```python
# ✅ Correct — mask PII before logging
from util.helper import censor_email
logger.info(f"Login attempt: {censor_email(dto.email)}")

# ❌ Wrong — leaks PII and credentials
logger.info(f"Login: email={dto.email}, password={dto.password}")
```

Rules:
- Never log tokens, passwords, refresh tokens, or credentials.
- Do not expose token values in response payloads.
- Do not hardcode secrets — all secrets come from `settings.*`.
- Follow existing masking helpers: `util.helper.censor_email(email)`, password placeholders.
- Do not store raw passwords anywhere — hash before persisting.

---

## Security Middleware Flags

| Flag | Effect |
|------|--------|
| `settings.JWT_ACTIVE` | Enables/disables JWT enforcement on all routers |
| `settings.ENC_ACTIVE` | Enables AES request decryption + response encryption |
| `settings.IS_FUSION_APP` | Enables endpoint disabling via `middleware.DisabledEndpointMiddleware` |

Do not check these flags inside endpoint logic — they are handled at middleware/router-builder level.

---

## CORS

CORS is configured in `api.py` with `allow_origins=["*"]`. Restrict to specific origins in production by setting `ALLOWED_ORIGINS` in config:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # e.g. ["https://app.example.com"]
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Rate Limiting

`middleware/rate_limiter.py` provides `RateLimitMiddleware`. Configure limits in `config/base.py`. Applied globally via `api.py`.

---

## RBAC via Dependencies

The template provides dependencies to inject user context and filter data based on ownership or organization, which is a form of RBAC.

- **`JWTChangeUserId` / `JWTChangeCreatedBy`**: These dependencies are used for `add` or `update` endpoints. They automatically inject the `user_id` from the token into the request body as `userId` or `createdBy`. This prevents a user from creating or updating resources on behalf of another user.
- **`JWTFilterUserIdBody` / `JWTFilterOrganizationIdBody`**: Used for `get-all` endpoints. They modify the `FindDTO` by adding a filter to scope the query to the current user's ID or organization ID. This ensures users can only list resources they are permitted to see.

### Example: Using `JWTFilterUserIdBody`

```python
# In router/some_resource.py
@router.post(
    "/get-all",
    response_model=BaseResponse,
    dependencies=[Depends(JWTFilterUserIdBody)], # Apply the filter
)
async def get_all(request: Request, find_dto: FindDTO):
    # request.state.find_dto is now guaranteed to have a filter for the current user
    modified_dto = request.state.find_dto
    data, count = await some_service.get_all(modified_dto)
    # ... return response
```

Prefer these dependencies for "current user" or "scoped list" endpoints instead of trusting client-provided IDs.

---

## Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| Manual token parsing in an endpoint (`request.headers.get("Authorization")`) | Use `JWTBearer` / `JWTChangeUserId` — they handle extraction and validation |
| Logging `dto.password` or token values | Secret/credential leakage |
| Logging unmasked email addresses | PII exposure — use `util.helper.censor_email(email)` |
| Public route without explicit `jwt=False` in `router_param_builder` | All routes are authenticated by default |
| Rolling your own JWT validation | Use `auth/` module only |
| Storing raw passwords | Always hash with `util.helper.encrypt()` (bcrypt) |
| Hardcoded `JWT_SECRET` or any secret | Must come from `settings.*` via env |
| Checking `settings.JWT_ACTIVE` inside endpoint logic | Handled by `router_param_builder` — do not duplicate |
