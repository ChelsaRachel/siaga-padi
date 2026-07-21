---
name: error-handling
description: Apply mandatory error handling standards across all 8 layers: exception, validation, state, UI, business rule, security, concurrency, and cleanup. Use before writing async functions, API calls, useEffect hooks, or any code that can fail.
---

# Error Handling Skill

Before writing any async operation, side effect, or user interaction, consult this skill. Error handling is required at every layer, not just API calls.

## The 8 Layers at a Glance

| # | Layer | Covers |
|---|-------|--------|
| 1 | [Exception Handling](#1-exception-handling) | try-catch, async errors, ErrorBoundary |
| 2 | [Validation Handling](#2-validation-handling) | form validation, API shape validation, sanitization |
| 3 | [State Handling](#3-state-handling) | loading/error/empty states, optimistic updates |
| 4 | [UI Handling](#4-ui-handling) | error display, empty states, loading indicators |
| 5 | [Business Rule Handling](#5-business-rule-handling) | guard clauses, domain invariants, custom errors |
| 6 | [Security Handling](#6-security-handling) | 401/403, token cleanup, route guards |
| 7 | [Concurrency Handling](#7-concurrency-handling) | race conditions, debounce, AbortController |
| 8 | [Cleanup Handling](#8-cleanup-handling) | useEffect teardown, timers, subscriptions |

---

## 1. Exception Handling

**Every async operation needs a try-catch. No exceptions.**

```typescript
// ✅ Mandatory pattern for every async function
import { captureException } from '@/utils/monitoring';
import { handleApiError } from '@/utils/handle-api-error';

const fetchUser = async (id: string): Promise<TUser> => {
  try {
    const res = await api.get<IApiResponse<TUser>>(`/users/${id}`);
    return res.data.data;
  } catch (error) {
    captureException(error);        // always log to monitoring
    throw handleApiError(error);    // normalize and rethrow — never swallow
  }
};
```

**Rules:**
- ✅ `catch` block is never empty
- ✅ `error` typed as `unknown`, narrowed before use — never `any`
- ✅ Always send to monitoring (Sentry or equivalent)
- ✅ Service functions rethrow — they do not swallow errors
- ✅ Route-level and critical components wrapped in `<ErrorBoundary>`
- ❌ Never `catch (error: any)`
- ❌ Never access `error.message` without checking `error instanceof Error` first

### Centralized error normalizer (create once in `src/utils/`)

```typescript
// src/utils/handle-api-error.ts
import { AxiosError } from 'axios';

export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
}

export const handleApiError = (error: unknown): AppError => {
  if (error instanceof AxiosError) {
    return {
      message: error.response?.data?.message ?? 'An unexpected error occurred.',
      code: error.response?.data?.code,
      statusCode: error.response?.status,
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'An unexpected error occurred.' };
};
```

---

## 2. Validation Handling

**Validate at the boundary. Never trust incoming data.**

```typescript
// ✅ Validate API response shape before using
import * as yup from 'yup';

const userSchema = yup.object({
  id: yup.string().required(),
  profile: yup.object({ name: yup.string().required() }).required(),
}).required();

const user = await userSchema.validate(response.data); // throws if shape is wrong
```

**Rules:**
- ✅ All form inputs validated via Yup schema before submission
- ✅ API responses validated against a schema before data is used
- ✅ All user input sanitized before rendering — never `dangerouslySetInnerHTML`
- ✅ Use type guards to narrow `unknown` types before property access
- ❌ Never `const user = response.data as TUser` without runtime validation
- ❌ Never run validation logic inside JSX render

---

## 3. State Handling

**Model async state explicitly. Never use `null` for two different meanings.**

```typescript
// ✅ Explicit 4-state model
type TAsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

const [state, setState] = useState<TAsyncState<TUser>>({ status: 'idle' });

// On fetch start:
setState({ status: 'loading' });

// On success:
setState({ status: 'success', data: user });

// On failure:
setState({ status: 'error', message: err.message });

// On retry — reset error first:
setState({ status: 'loading' });
```

**Rules:**
- ✅ Four explicit statuses: `idle | loading | success | error`
- ✅ Error state carries the message string, not just a boolean
- ✅ Reset error state before retrying
- ✅ Server state → React Query / SWR; client UI state → Zustand
- ❌ Never `const [isError, setIsError] = useState(false)` without storing the message
- ❌ Never treat `data === null` as both "loading" and "empty"
- ❌ Never apply optimistic updates without a rollback strategy

---

## 4. UI Handling

**Every async operation has 4 possible UI states. Handle all of them.**

```tsx
// ✅ All states handled explicitly
const UserList = () => {
  const { data, isLoading, isError, error, refetch } = useQuery(...);

  if (isLoading) return <Skeleton />;

  if (isError) return (
    <Alert variant="destructive">
      <AlertDescription>{error.message}</AlertDescription>
      <Button variant="outline" size="sm" onClick={() => refetch()}>
        Retry
      </Button>
    </Alert>
  );

  if (!data || data.length === 0) return (
    <EmptyState message="No users found." />
  );

  return <ul>{data.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
};
```

**Error display placement:**

| Error type | Where to show | Component |
|------------|---------------|-----------|
| Server / API error | Top of form or section | `<Alert variant="destructive" />` |
| Field validation error | Inline below the field | `<FormMessage />` |
| Critical global error | Full page | `<ErrorBoundary>` fallback |
| Transient success feedback | Toast (auto-dismiss) | `<Toast />` |

**Rules:**
- ✅ Every list/data view has an empty state UI
- ✅ Every async op shows a loading indicator (skeleton or spinner)
- ✅ Error states include a retry action where possible
- ❌ Never show raw technical messages to users → `AxiosError: Network Error`
- ❌ Never show critical errors as toasts (toasts auto-dismiss)
- ❌ Never show error and success states simultaneously
- ❌ Never leave the UI blank on empty or error states

---

## 5. Business Rule Handling

**Enforce rules early. Disable before allowing. Throw custom errors.**

```typescript
// ✅ Custom error class
class InsufficientPermissionsError extends Error {
  constructor() {
    super('You do not have permission to perform this action.');
    this.name = 'InsufficientPermissionsError';
  }
}

// ✅ Guard clauses + custom error in hook
const usePublishPost = (post: TPost, user: TUser) => {
  const handlePublish = () => {
    if (post.status !== 'draft') return;              // guard clause
    if (!user.isAdmin) throw new InsufficientPermissionsError();
    postService.publish(post.id);
  };
  return { handlePublish };
};
```

**Rules:**
- ✅ Guard clauses (early returns) over deeply nested conditionals
- ✅ Forbidden actions are disabled/hidden in the UI — not allowed then rejected
- ✅ Custom error classes for domain violations, not `new Error('Something went wrong')`
- ❌ Never mix business rule checks inside JSX render logic
- ❌ Never rely solely on the server to enforce business rules

---

## 6. Security Handling

**Handle 401/403 centrally. Never expose sensitive data.**

```typescript
// ✅ Centralized auth error handling — src/services/api-client.ts
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearSession();  // clear tokens + state
      window.location.href = '/auth/login';
    }
    if (error.response?.status === 403) {
      window.location.href = '/forbidden';
    }
    return Promise.reject(error);
  }
);
```

**Rules:**
- ✅ `401` / `403` handled in the Axios interceptor — never per-component
- ✅ Tokens and sensitive state cleared on logout and session expiry
- ✅ Routes protected by `<AuthGuard>` and `<RoleGuard>` at router level
- ✅ Permission checks at both UI layer (hide/disable) AND service layer (guard before API call)
- ❌ Never log tokens, passwords, or PII to `console.log`
- ❌ Never show stack traces or SQL errors in the UI
- ❌ Never rely solely on UI guards — always enforce at the service layer too

---

## 7. Concurrency Handling

**Cancel on unmount. Debounce inputs. Prevent duplicate submissions.**

```typescript
// ✅ AbortController — cancel on unmount
useEffect(() => {
  const controller = new AbortController();

  const load = async () => {
    try {
      const res = await api.get('/data', { signal: controller.signal });
      setData(res.data);
    } catch (error) {
      if (axios.isCancel(error)) return; // ignore intentional abort
      setError(handleApiError(error));
    }
  };

  load();
  return () => controller.abort();
}, []);

// ✅ Debounced search — prevent per-keystroke requests
const debouncedSearch = useMemo(
  () => debounce((q: string) => searchService.search(q), 300),
  []
);
```

**Rules:**
- ✅ `AbortController` for all cancellable requests
- ✅ Debounce all high-frequency user interactions (300ms default)
- ✅ Disable interactive elements during in-flight requests
- ❌ Never assume async responses arrive in the order requests were made
- ❌ Never fire API calls on every keystroke without debouncing

---

## 8. Cleanup Handling

**Every useEffect with a side effect needs a cleanup return.**

```typescript
// ✅ Full cleanup template
useEffect(() => {
  // setup
  window.addEventListener('resize', handleResize);
  const timer = setInterval(fetchUpdates, 5000);
  const subscription = store.subscribe(handleChange);

  // cleanup — everything registered above must be torn down
  return () => {
    window.removeEventListener('resize', handleResize);
    clearInterval(timer);
    subscription.unsubscribe();
  };
}, []);
```

**Cleanup checklist for every useEffect:**

| Side effect registered | Cleanup required |
|------------------------|-----------------|
| `addEventListener` | `removeEventListener` |
| `setInterval` | `clearInterval` |
| `setTimeout` | `clearTimeout` |
| `AbortController` | `controller.abort()` |
| Store subscription | `subscription.unsubscribe()` |
| WebSocket | `ws.close()` |

**Rules:**
- ✅ Every `useEffect` with a side effect returns a cleanup function
- ✅ Sensitive data cleared from state on logout
- ❌ Never add event listeners in `useEffect` without removing them
- ❌ Never start `setInterval` without clearing it in cleanup

---

## Quick Decision Guide

```
Writing an async function?          → try-catch + log + rethrow       [Layer 1]
Using data from outside?            → validate shape before use        [Layer 2]
Fetching data in a component?       → idle/loading/success/error       [Layer 3]
Rendering async data in JSX?        → loading + error + empty states   [Layer 4]
Checking if action is allowed?      → guard clause + custom error      [Layer 5]
Handling 401/403 or auth?           → Axios interceptor                [Layer 6]
User typing or rapid interaction?   → debounce + AbortController       [Layer 7]
Registering listeners in useEffect? → always return cleanup function   [Layer 8]
```

> Detailed rules and validation checklist: [references/error-handling-rules.md](references/error-handling-rules.md)
