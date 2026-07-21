# Error Handling — Rules & Constraints

## Table of Contents

1. [Exception Handling](#1-exception-handling)
2. [Validation Handling](#2-validation-handling)
3. [State Handling](#3-state-handling)
4. [UI Handling](#4-ui-handling)
5. [Business Rule Handling](#5-business-rule-handling)
6. [Security Handling](#6-security-handling)
7. [Concurrency Handling](#7-concurrency-handling)
8. [Cleanup Handling](#8-cleanup-handling)
9. [Additional Notes](#9-additional-notes)
10. [Pre-Submission Verification Checklist](#pre-submission-verification-checklist)

---

## 1. Exception Handling

> Covers: try-catch blocks, async errors, unhandled rejections, error boundaries.

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Always wrap async operations in `try-catch` | Unhandled promise rejections crash the app silently |
| Use typed error handling: check `error instanceof AxiosError` or custom error classes before accessing properties | Accessing `.message` on an unknown error type causes runtime errors |
| Create a centralized `handleApiError(error)` utility in `src/utils/` | Avoids duplicate error parsing logic scattered across services |
| Use React `<ErrorBoundary>` to wrap route-level and critical components | Catches render-time errors and prevents the entire app from crashing |
| Always log errors to a monitoring service (e.g. Sentry) in the catch block | Silent failures are invisible; logging enables diagnosis in production |
| Rethrow errors that the current layer cannot handle | Each layer should only handle what it owns; propagate the rest upward |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Empty catch block → `catch { }` | Silently swallows errors; bugs become completely invisible |
| ❌ Catching `error` as `any` → `catch (error: any)` | Loses type safety; use `unknown` and narrow the type before accessing properties |
| ❌ Accessing `error.message` directly without type checking | `error` in a catch block is `unknown`; it may not have a `.message` property |
| ❌ Using `console.error` as the only error handling strategy | `console.error` does not reach monitoring tools; it is only acceptable during local development |
| ❌ No `<ErrorBoundary>` wrapping critical or route-level components | A render error in one component crashes the entire app for the user |
| ❌ Swallowing errors in service files without rethrowing | The UI layer never learns the request failed; it shows stale or incorrect data |

### Example

```typescript
// ❌ BAD
const fetchUser = async (id: string) => {
  try {
    const res = await api.get(`/users/${id}`);
    return res.data;
  } catch { } // silent failure
};

// ✅ GOOD
import { AxiosError } from 'axios';
import { captureException } from '@/utils/monitoring';

const fetchUser = async (id: string): Promise<TUser> => {
  try {
    const res = await api.get<IApiResponse<TUser>>(`/users/${id}`);
    return res.data.data;
  } catch (error) {
    captureException(error); // log to Sentry or equivalent
    throw handleApiError(error); // normalize and rethrow
  }
};
```

```tsx
// ✅ GOOD — Error Boundary wrapping a route
<ErrorBoundary fallback={<ErrorPage />}>
  <UserDashboard />
</ErrorBoundary>
```

---

## 2. Validation Handling

> Covers: form validation, input sanitization, API response shape validation, runtime type checking.

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Validate all form inputs using **Yup** schema before submission | Catches invalid data client-side before it reaches the server |
| Validate API response shapes using a schema (Yup/Zod) before using the data | API contracts can change; blind trust causes unexpected runtime crashes |
| Sanitize all user input before rendering it to the DOM | Prevents XSS attacks from user-supplied content |
| Use type guards to narrow `unknown` types before use | TypeScript cannot verify runtime shapes; type guards bridge compile-time and runtime safety |
| Show field-level validation errors inline, adjacent to the relevant input | Inline errors give users immediate, contextual feedback |
| Validate at the boundary (entry point) — not deep inside business logic | Validating early prevents invalid data from propagating through the system |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Trusting API responses without validating their shape | Backend bugs or contract changes silently corrupt the UI state |
| ❌ Using `as SomeType` to cast an unvalidated API response | Type assertion without runtime validation is a lie to the compiler |
| ❌ Rendering raw user input directly into the DOM via `dangerouslySetInnerHTML` | Direct DOM injection of user content is an XSS vulnerability |
| ❌ Validating only on the server and skipping client-side validation | Client-side validation improves UX by catching errors before a network round-trip |
| ❌ Running complex validation logic inside render functions | Validation is a business concern; move it to schema files or utility functions |

### Example

```typescript
// ❌ BAD — trusting the API blindly
const user = response.data as TUser;
console.log(user.profile.name); // crashes if shape is wrong

// ✅ GOOD — validate the shape at the boundary
import * as yup from 'yup';

const userSchema = yup.object({
  id: yup.string().required(),
  profile: yup.object({
    name: yup.string().required(),
  }).required(),
}).required();

const user = await userSchema.validate(response.data);
console.log(user.profile.name); // safe
```

---

## 3. State Handling

> Covers: loading states, error states, empty states, stale data, optimistic updates.

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Model async state with three explicit states: `idle`, `loading`, `success`, `error` | Prevents ambiguous states where `data === null` could mean "not loaded" or "empty" |
| Store error messages in state alongside the error flag: `{ error: string \| null }` | The UI needs the message to display; a bare boolean tells the user nothing |
| Reset error state before retrying an operation | Stale errors mislead users who have already corrected the input |
| Use optimistic updates only when a reliable rollback strategy exists | Optimistic updates without rollback leave the UI in a broken state on failure |
| Treat every piece of async state as potentially `null` or `undefined` until confirmed | Prevents null reference crashes when data has not yet loaded |
| Separate server state (React Query / SWR) from client UI state (Zustand) | Mixing them causes unnecessary re-fetches and complex invalidation logic |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Using a boolean `isError` without storing the error message | The UI has no message to show; user sees a blank or broken state |
| ❌ Leaving stale error state visible after a successful retry | Users see a success result alongside a previous error message |
| ❌ Treating `data === null` as both "loading" and "empty" | These are different states; model them separately to avoid incorrect UI rendering |
| ❌ Applying optimistic updates without a rollback on failure | On failure, the UI shows data that does not reflect the actual server state |
| ❌ Storing server-fetched data in Zustand manually instead of using React Query/SWR | Duplicates caching logic that React Query already handles; leads to stale data bugs |

### Example

```typescript
// ❌ BAD — ambiguous state shape
const [data, setData] = useState(null);
const [isError, setIsError] = useState(false);

// ✅ GOOD — explicit, unambiguous state
type TAsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

const [state, setState] = useState<TAsyncState<TUser>>({ status: 'idle' });
```

---

## 4. UI Handling

> Covers: error display, empty states, fallback UI, toast notifications, loading indicators.

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Display server/global errors at the **top of the relevant section** using `<Alert variant="destructive" />` | Global errors are not field-specific; placing them at the top keeps context clear |
| Display field-level errors **inline** directly below the relevant input | Inline errors are contextual; users know exactly which field failed |
| Always provide an **empty state** UI when a list or data set has zero items | A blank screen gives no signal to the user; empty states guide next actions |
| Use **toast notifications** only for transient, non-critical feedback (e.g. "Saved successfully") | Toasts auto-dismiss; they are inappropriate for errors that require user action |
| Show a **loading skeleton** or spinner during async operations | Users need visual feedback that the app is working, not frozen |
| Provide a **retry action** on error states wherever possible | Empowers the user to recover without a full page reload |
| Use `<ErrorBoundary>` with a meaningful fallback UI, not a blank screen | A blank screen is indistinguishable from a crash; a fallback guides the user |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Showing a blank screen when data is empty or fails to load | Blank screens are indistinguishable from crashes; always show a meaningful state |
| ❌ Using toast notifications for critical errors that require user action | Toasts disappear; critical errors must remain visible until the user acknowledges them |
| ❌ Displaying raw technical error messages to the user → `AxiosError: Network Error` | Technical messages are meaningless and alarming to users; show a human-readable message |
| ❌ Showing the same error message for every type of failure | Tailor messages to the error: network failure ≠ unauthorized ≠ server error |
| ❌ Displaying error and success states simultaneously | These are mutually exclusive states; rendering both at once confuses the user |
| ❌ No loading indicator during async operations | User cannot tell if the app is working or frozen |

### Example

```tsx
// ❌ BAD — no empty state, no error state, no loading state
const UserList = () => {
  const { data } = useQuery(...);
  return <ul>{data?.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
};

// ✅ GOOD — all states handled explicitly
const UserList = () => {
  const { data, isLoading, isError, error, refetch } = useQuery(...);

  if (isLoading) return <Skeleton />;

  if (isError) return (
    <Alert variant="destructive">
      <AlertDescription>{error.message}</AlertDescription>
      <Button onClick={() => refetch()}>Retry</Button>
    </Alert>
  );

  if (!data || data.length === 0) return (
    <EmptyState message="No users found." />
  );

  return <ul>{data.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
};
```

---

## 5. Business Rule Handling

> Covers: domain invariants, forbidden operations, guard clauses, rule violations.

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Enforce business rules as **early as possible** — at the UI layer before calling the service | Prevents invalid API calls and gives immediate user feedback |
| Use **guard clauses** (early returns) rather than deeply nested conditionals | Guard clauses are easier to read and reduce cognitive complexity |
| Throw descriptive custom error classes for business rule violations → `throw new InsufficientPermissionsError()` | Custom errors are identifiable by type and carry domain-meaningful messages |
| Disable UI actions that violate business rules rather than allowing them and then showing an error | Preventing invalid actions is clearer UX than allowing and then rejecting |
| Separate business rule logic from UI rendering logic | Business rules change independently of the UI; mixing them creates tight coupling |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Relying solely on the server to enforce business rules | Server-only enforcement causes wasted round-trips and poor UX |
| ❌ Throwing generic `new Error('Something went wrong')` for business violations | Generic errors are unidentifiable; use specific custom error classes |
| ❌ Mixing business rule checks inside JSX render logic | JSX should only describe the UI; logic belongs in hooks or utility functions |
| ❌ Allowing users to trigger forbidden actions and showing an error after the fact | Disable or hide forbidden actions proactively; don't let users reach a dead end |

### Example

```typescript
// ❌ BAD — generic error, logic mixed into component
const handlePublish = () => {
  if (post.status === 'draft' && !user.isAdmin) {
    setError('Something went wrong'); // meaningless
  }
};

// ✅ GOOD — descriptive custom error, guard clause, logic in hook
class InsufficientPermissionsError extends Error {
  constructor() {
    super('You do not have permission to publish this post.');
    this.name = 'InsufficientPermissionsError';
  }
}

// In hook
const handlePublish = () => {
  if (post.status !== 'draft') return; // guard clause
  if (!user.isAdmin) throw new InsufficientPermissionsError();
  publishService.publish(post.id);
};
```

---

## 6. Security Handling

> Covers: unauthorized access, token expiry, forbidden routes, sensitive data exposure.

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Handle `401 Unauthorized` globally in the Axios interceptor by redirecting to the login page | A single interceptor catches all unauthorized responses without repeating the logic per request |
| Handle `403 Forbidden` by redirecting to a dedicated "Access Denied" page | A 403 is not a login issue; it means the user is authenticated but lacks permission |
| Clear all auth tokens and sensitive state from memory/storage on logout or session expiry | Stale tokens left in storage can be exploited after session ends |
| Never log or expose sensitive data (tokens, passwords, PII) in `console.log` or error messages | Console output is visible in DevTools and can be captured by browser extensions |
| Protect routes using `<AuthGuard>` and `<RoleGuard>` at the router level | Component-level guards are easy to forget; router-level guards apply universally |
| Validate permissions both at the UI layer (hide/disable) and at the service layer (guard before API call) | UI-only checks are easily bypassed; always enforce at the service layer as well |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Handling `401`/`403` errors individually inside each component or service | Duplicates logic and is easy to miss; use a centralized Axios interceptor |
| ❌ Storing tokens or sensitive data in `localStorage` without security consideration | `localStorage` is accessible to any JavaScript on the page, including XSS payloads |
| ❌ Logging tokens, passwords, or PII to the console | These appear in DevTools and can be captured by monitoring tools or browser extensions |
| ❌ Showing detailed server error messages (stack traces, SQL errors) in the UI | Exposes implementation details that can be exploited by attackers |
| ❌ Relying solely on UI route guards without service-layer permission checks | UI guards can be bypassed by calling the service directly; always enforce at both layers |

### Example

```typescript
// ✅ GOOD — centralized auth error handling in Axios interceptor
// src/services/api-client.ts
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      authStore.getState().clearSession();
      window.location.href = '/auth/login';
    }
    if (error.response?.status === 403) {
      window.location.href = '/forbidden';
    }
    return Promise.reject(error);
  }
);
```

---

## 7. Concurrency Handling

> Covers: race conditions, stale closures, duplicate requests, abort controllers.

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Use `AbortController` to cancel in-flight requests when a component unmounts | Prevents state updates on unmounted components and stale response processing |
| Debounce search inputs and other high-frequency user interactions before triggering API calls | Prevents flooding the server with a request on every keystroke |
| Use React Query's `enabled` flag to conditionally prevent requests from firing | Stops unnecessary requests before required data (e.g. an ID) is available |
| Guard against race conditions in sequential async operations using request IDs or flags | Ensures the last triggered request wins, not the last one to respond |
| Disable interactive elements during in-flight requests to prevent duplicate submissions | Prevents the user from triggering the same operation multiple times concurrently |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Firing API requests on every keystroke without debouncing | Floods the server and creates race conditions where responses arrive out of order |
| ❌ Ignoring component unmount during async operations | Causes "Can't perform a state update on an unmounted component" warnings and memory leaks |
| ❌ No protection against duplicate form submissions | A slow network allows the user to submit twice; both requests may succeed |
| ❌ Assuming async operations resolve in the order they were triggered | Network responses arrive in unpredictable order; the last response may not be the latest request |

### Example

```typescript
// ✅ GOOD — abort on unmount
useEffect(() => {
  const controller = new AbortController();

  const fetchData = async () => {
    try {
      const res = await api.get('/data', { signal: controller.signal });
      setData(res.data);
    } catch (error) {
      if (axios.isCancel(error)) return; // ignore intentional cancellation
      setError(handleApiError(error));
    }
  };

  fetchData();
  return () => controller.abort(); // cancel on unmount
}, []);
```

```typescript
// ✅ GOOD — debounced search input
const debouncedSearch = useMemo(
  () => debounce((query: string) => searchService.search(query), 300),
  []
);
```

---

## 8. Cleanup Handling

> Covers: event listener cleanup, timer cleanup, subscription cleanup, side effect teardown.

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Always return a cleanup function from `useEffect` when registering event listeners, timers, or subscriptions | Not cleaning up causes memory leaks and stale callbacks after the component unmounts |
| Cancel pending async operations in the `useEffect` cleanup function | Prevents state updates on unmounted components |
| Clear `setInterval` and `setTimeout` IDs in the cleanup function | Timers continue running after unmount without cleanup, causing unexpected behavior |
| Unsubscribe from external data sources (WebSocket, EventEmitter, store subscriptions) on unmount | Active subscriptions after unmount waste resources and may cause stale state updates |
| Clear sensitive data from memory (tokens, user data) when the session ends | Sensitive data left in memory is a security risk |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Adding event listeners in `useEffect` without removing them in the cleanup | Stacks duplicate listeners on every re-render; causes bugs and memory leaks |
| ❌ Starting `setInterval` without clearing it in the cleanup | The interval keeps running after the component unmounts, causing errors and wasted CPU |
| ❌ No cleanup for WebSocket or EventEmitter subscriptions | Accumulates connections and callbacks that fire on a component that no longer exists |
| ❌ Leaving sensitive user data in state or memory after logout | Creates a security risk where stale PII is accessible until the next garbage collection |

### Example

```typescript
// ❌ BAD — no cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize);
  const timer = setInterval(fetchUpdates, 5000);
}, []);

// ✅ GOOD — full cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize);
  const timer = setInterval(fetchUpdates, 5000);

  return () => {
    window.removeEventListener('resize', handleResize);
    clearInterval(timer);
  };
}, []);
```

---

## 9. Additional Notes

- **Centralize error normalization** → Create a single `handleApiError(error: unknown): AppError` utility in `src/utils/` that normalizes all error types (AxiosError, ValidationError, unknown) into a consistent `AppError` shape used throughout the app.
- **Define a shared `AppError` type** → Store it in `src/types/` so every layer speaks the same error language: `{ message: string; code?: string; statusCode?: number }`.
- **Never hide errors from the monitoring service** → Even if the error is handled gracefully in the UI, always send it to Sentry (or equivalent) so the team can track frequency and patterns.
- **Error boundaries are not a substitute for error handling** → `<ErrorBoundary>` catches render-time errors only. Async errors (API calls, event handlers) must be handled explicitly with try-catch.
- **Follow the principle of least surprise** → Error messages shown to users must describe what happened and, where possible, what the user can do next. Avoid messages like "An error occurred."

---

## Pre-Submission Verification Checklist

> Run through this checklist on every feature or component before submitting a Pull Request. All items must be checked. Unchecked items will be flagged during code review.

### Exception Handling

- [ ] Every `async` function or Promise is wrapped in a `try-catch` block
- [ ] `catch` blocks are never empty — error is always logged and/or rethrown
- [ ] `error` in catch blocks is typed as `unknown`, not `any`, and narrowed before use
- [ ] Errors are sent to the monitoring service (e.g. Sentry) in the catch block
- [ ] Critical and route-level components are wrapped in an `<ErrorBoundary>`
- [ ] Service functions rethrow errors after handling — they do not swallow them silently

### Validation Handling

- [ ] All form inputs are validated using a Yup schema before submission
- [ ] API responses are validated against a schema before the data is used
- [ ] No raw user input is rendered via `dangerouslySetInnerHTML`
- [ ] `unknown` types are narrowed using type guards before property access
- [ ] Validation runs at the boundary (entry point), not deep inside business logic

### State Handling

- [ ] Async state uses four explicit statuses: `idle`, `loading`, `success`, `error`
- [ ] Error state stores the error message string, not just a boolean flag
- [ ] Error state is reset before retrying an operation
- [ ] Optimistic updates have a rollback strategy on failure
- [ ] Server state is managed by React Query / SWR, not manually stored in Zustand

### UI Handling

- [ ] Global/server errors are shown at the top of the relevant section using `<Alert />`
- [ ] Field errors are shown inline using `<FormMessage />`
- [ ] Every list or data view has an explicit empty state UI
- [ ] Critical errors are not shown as toast notifications
- [ ] Raw technical error messages are never shown to the user
- [ ] A loading indicator is shown during every async operation
- [ ] Error states include a retry action where applicable

### Business Rule Handling

- [ ] Business rules are enforced at the UI layer before any service call
- [ ] Guard clauses (early returns) are used instead of deeply nested conditionals
- [ ] Business rule violations throw specific custom error classes, not generic `Error`
- [ ] Forbidden UI actions are disabled or hidden, not allowed and then rejected

### Security Handling

- [ ] `401` and `403` responses are handled in the centralized Axios interceptor
- [ ] Auth tokens and session data are cleared on logout and session expiry
- [ ] No tokens, passwords, or PII appear in `console.log` or error messages shown to users
- [ ] Routes are protected by `<AuthGuard>` and `<RoleGuard>` at the router level
- [ ] Permission checks exist at both the UI layer and the service layer

### Concurrency Handling

- [ ] `AbortController` is used for requests that can be cancelled on unmount
- [ ] Search inputs and high-frequency interactions are debounced before triggering API calls
- [ ] Interactive elements are disabled during in-flight requests to prevent duplicate submissions
- [ ] No assumption is made that async operations resolve in the order they were triggered

### Cleanup Handling

- [ ] Every `useEffect` that registers event listeners returns a cleanup function that removes them
- [ ] Every `setInterval` or `setTimeout` is cleared in the `useEffect` cleanup
- [ ] WebSocket and subscription connections are closed on component unmount
- [ ] Sensitive data is cleared from state and memory when the session ends
