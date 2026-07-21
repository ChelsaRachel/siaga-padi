---
name: python-auth
description: "be-python JWT auth: bearer/cookie tokens, session management (Redis-backed single-login), password hashing, and FastAPI dependencies for ownership/scoping. Use for login, registration, token refresh, route protection, or RBAC."
---

# auth — Authentication & Authorization (be-python)

## Use this skill when

- Implementing login, registration, or token refresh
- Protecting an endpoint or making a public route inside a JWT-protected router
- Injecting current-user context (`JWTChangeUserId`, `JWTChangeCreatedBy`)
- Scoping list endpoints to current user/org (`JWTFilterUserIdBody`, `JWTFilterOrganizationIdBody`)
- Configuring single-login vs. multi-login behavior
- Hashing or verifying passwords

## Patterns (do this)

| Pattern | Example |
| --- | --- |
| Default-protect a router | `router = APIRouter(**router_param_builder(tag, jwt=True))` |
| Public router (login, register, health) | `router = APIRouter(**router_param_builder(tag, jwt=False))` |
| Public endpoint inside protected router | `@router.post("/login", dependencies=[], include_in_schema=...)` |
| Verify token only | `Depends(JWTBearer())` |
| Inject user identity into body | `Depends(JWTChangeUserId)` for `add`/`update` |
| Scope list query to current user | `Depends(JWTFilterUserIdBody)` then read `request.state.find_dto` |
| Hash password before storing | `util.helper.encrypt(plain)` (bcrypt 10 rounds) |
| Mask PII in logs | `logger.info(f"login: {censor_email(dto.email)}")` |
| Single-login enforcement | `redis.setex(f"session:{user_id}", JWT_EXPIRED, token)` |
| Source secrets from settings | `settings.JWT_SECRET`, `settings.JWT_EXPIRED` |

## Anti-patterns (don't do this)

| Anti-pattern | Use instead |
| --- | --- |
| `request.headers.get("Authorization")` parsing manually | `JWTBearer()` / `JWTChangeUserId()` |
| Rolling your own JWT validation | The `auth/` module only |
| Public route without explicit `jwt=False` or `dependencies=[]` | All routes JWT-protected by default |
| Storing raw passwords | `util.helper.encrypt()` (bcrypt) |
| Hardcoded `JWT_SECRET` | `settings.JWT_SECRET` from env |
| Logging `dto.password` or token values | Never — even at DEBUG |
| Logging unmasked emails | `censor_email(email)` first |
| Returning password hashes in any response | Strip before returning |
| Checking `settings.JWT_ACTIVE` in endpoint logic | Handled by `router_param_builder` |
| Trusting client-provided `userId` | `JWTChangeUserId` injects from token |

---

## Overview

This skill covers the authentication and authorization mechanisms within the be-python FastAPI template. It details how JSON Web Tokens (JWTs) are issued, validated, and used to manage user sessions, as well as how to protect endpoints and implement role-based access control (RBAC).

## Key Files and Components

- **`auth/auth_handler.py`**: Core JWT logic. Contains `sign_jwt`, `decode_jwt`, and password hashing functions (`get_password_hash`, `verify_password`).
- **`auth/auth_bearer.py`**: Defines the `JWTBearer` dependency class, which enforces JWT validation on protected routes. It handles token extraction from both `Authorization` headers and cookies.
- **`router/auth.py`**: The authentication router. Implements public endpoints like `/login`, `/register`, and `/refresh_token`. It uses the `AuthService` to validate credentials and issues tokens.
- **`service/auth.py`**: The `AuthService` class. Contains the business logic for user authentication, such as verifying user credentials against the database.
- **`dto/auth.py`**: Pydantic DTOs for authentication endpoints, such as `AuthDTO` (for login) and `RegisterDTO`. These models handle input validation.
- **`config/base.py`**: The `Setting` object, which holds JWT-related configurations like `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, and `JWT_ACTIVE`.

## Authentication Flow (Login)

1.  **Request**: The client sends a `POST` request to `/auth/login` with credentials (e.g., email and password) in the request body, matching the `AuthDTO`.
2.  **Router**: The `login` endpoint in `router/auth.py` receives the request.
3.  **Service**: It calls the `AuthService` to verify the credentials. The service fetches the user from the database and uses `verify_password` to check the provided password against the stored hash.
4.  **Token Creation**: If credentials are valid, the router calls `auth_handler.sign_jwt` to create access and refresh tokens. The JWT payload includes the `user_id`, `email`, and `multiLogin` status.
5.  **Response**: The tokens are returned to the client. The template is configured to set them as HttpOnly cookies and also return them in the response body for flexibility.

## Protecting Endpoints

To protect an endpoint, add the `JWTBearer` dependency to it. The `router_param_builder` function in `util/helper.py` does this by default for all routers unless `jwt=False` is specified.

```python
# In router/user.py
# This router is protected by default
router = APIRouter(**router_param_builder(tag))

@router.get("/get-one", response_model=BaseResponse)
async def get_one(id: str, current_user: dict = Depends(JWTBearer())):
    # The code here will only execute if the token is valid.
    # current_user will contain the decoded JWT payload.
    ...
```

The `JWTBearer` dependency automatically:
- Extracts the token from the `Authorization: Bearer <token>` header or cookies.
- Decodes and validates the token's signature and expiration.
- If `multiLogin` is false, it checks the token against the active session stored in Redis to enforce single-login.
- Raises a 401 or 403 `HTTPException` if the token is invalid, expired, or doesn't match the active session.

## Session Management: Single-Login vs. Multi-Login

The session behavior is controlled by the `multiLogin` flag in the JWT payload, which is typically set during login based on user or system settings.

- **`multiLogin: true`**: The user can be logged in from multiple devices/browsers simultaneously. `JWTBearer` only validates the token itself.
- **`multiLogin: false`**: The user can only have one active session at a time.
    - When a user logs in, the access token is stored in Redis under a key like `session:{user_id}`.
    - `JWTBearer` retrieves this stored token and compares it with the one presented by the client.
    - If they don't match, it means a newer session has been initiated elsewhere, and the current token is considered invalid. This effectively logs the user out of the older session.

## Role-Based Access Control (RBAC)

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

## Checklist: Adding a New Protected Endpoint

1.  Place the endpoint in a router that is initialized with `router_param_builder(tag, jwt=True)` (the default).
2.  If you need access to the current user's data, add the `current_user: dict = Depends(JWTBearer())` dependency to your endpoint function.
3.  For `add`/`update` endpoints where you need to enforce ownership, use `Depends(JWTChangeUserId)` or `Depends(JWTChangeCreatedBy)`.
4.  For `get-all` endpoints that should be scoped to the current user, use `Depends(JWTFilterUserIdBody)`.
5.  Ensure that sensitive user data (like password hashes) is never included in the JWT payload or returned in API responses.

---

> Detailed rules, full forbidden-pattern matrix, password handling, session management, RBAC dependencies, and security middleware flags: [references/auth-rules.md](references/auth-rules.md)
