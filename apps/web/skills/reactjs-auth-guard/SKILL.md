---
name: auth-guard
description: How to enable, disable, or configure AuthGuard and RoleGuard in routes. Covers enabling auth, removing guard for apps without login, and role-based access control setup.
---

# Auth Guard Skill (React / TypeScript)

> How to enable, disable, or configure AuthGuard in routes.

---



## Scenario A — Remove Guard (App Has No Login Yet)

1. Open `src/routes/main.routes.tsx`
2. Remove all `<AuthGuard>` and `<RoleGuard>` wrappers
3. Keep the route element clean — just `<AppLayout>` + page component

```tsx
// Before
{ path: '/tasks', element: <AuthGuard><AppLayout title="Task List"><TaskListPage /></AppLayout></AuthGuard> }

// After
{ path: '/tasks', element: <AppLayout title="Task List"><TaskListPage /></AppLayout> }
```

4. Check `src/routes/auth.routes.tsx` — no change needed, auth routes can stay for future use
5. No changes to `AuthGuard.tsx` itself — just stop using it in routes

---

## Scenario B — Enable Guard (Auth is Implemented)

1. Verify `src/routes/guards/AuthGuard.tsx` reads token from `useAuthStore`
2. Verify `/auth/login` route exists in `src/routes/auth.routes.tsx`
3. Wrap ALL protected routes in `main.routes.tsx` with `<AuthGuard>`

```tsx
const mainRoutes: RouteObject[] = [
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppLayout title="Dashboard"><Dashboard /></AppLayout>
      </AuthGuard>
    ),
  },
  // ... all other protected routes
];
```

4. Public routes (already in `auth.routes.tsx`) need NO guard

---

## Scenario C — Role-Based Guard

Nest `<RoleGuard>` inside `<AuthGuard>`:

```tsx
{
  path: '/admin',
  element: (
    <AuthGuard>
      <RoleGuard allowedRoles={['admin']}>
        <AppLayout title="Admin"><AdminPage /></AppLayout>
      </RoleGuard>
    </AuthGuard>
  ),
}
```

---

## Guard File Reference

```tsx
// src/routes/guards/AuthGuard.tsx
import { useAuthStore } from '@/stores/useAuthStore';
import { Navigate } from 'react-router-dom';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}
```

---

## Rules & Constraints

### When to Use Auth Guard

| Condition | Action |
|-----------|--------|
| App **has** a login/auth feature | Wrap protected routes with `<AuthGuard>` |
| App **does NOT** have login yet (in progress or deferred) | Remove `<AuthGuard>` from all routes until auth is implemented |
| Route is public (landing, login, register, OAuth callback) | Never wrap with `<AuthGuard>` |
| Role-based access needed | Use `<RoleGuard allowedRoles={[...]} />` inside `<AuthGuard>` |

### Removing Guard for Apps Without Login

When the application does not yet implement authentication, **all** `<AuthGuard>` and `<RoleGuard>` wrappers must be removed from route definitions.

#### ❌ Wrong — guard present but no auth implementation

```tsx
// ❌ AuthGuard redirects to /auth/login which doesn't exist yet
{
  path: '/tasks',
  element: (
    <AuthGuard>
      <AppLayout title="Task List"><TaskListPage /></AppLayout>
    </AuthGuard>
  ),
}
```

### Re-enabling Guards

When auth is ready to implement:

1. Verify `src/routes/guards/AuthGuard.tsx` reads token from `useAuthStore`
2. Verify `/auth/login` route exists in `src/routes/auth.routes.tsx`
3. Wrap ALL protected routes in `main.routes.tsx` with `<AuthGuard>`
4. Add `/auth/login` and `/auth/register` routes BEFORE re-enabling guards

### Guard File Locations

```
src/routes/guards/
├── AuthGuard.tsx    ← checks JWT token, redirects to /auth/login if missing
└── RoleGuard.tsx    ← checks user roles, redirects to /forbidden if unauthorized
```

---

## Pre-Submission Checklist

- [ ] If app has no login → zero `<AuthGuard>` in routes
- [ ] If app has login → every non-public route is wrapped with `<AuthGuard>`
- [ ] `/auth/login` route exists before any `<AuthGuard>` is active
- [ ] `<RoleGuard>` is always nested inside `<AuthGuard>`, never standalone
