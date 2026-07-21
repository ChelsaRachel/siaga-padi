---
name: reactjs-state-management
description: Covers all state management patterns: Zustand global stores, local component state via custom hooks, custom reducer with pub-sub, Context API for form fields, React Hook Form for form state, and direct store access outside React components.
---

# State Management

## Skill: State Management

### Overview

The React template uses a layered state management approach — each layer serves a specific scope and lifetime. The general rule is: keep state as local as possible, and elevate it only when multiple components need to share it.

| Layer | Tool | Scope |
|-------|------|-------|
| Global persistent state | Zustand + `persist` middleware | App-wide, survives refresh |
| Global transient state | Zustand (no persist) | App-wide, resets on refresh |
| Form state | React Hook Form | Form component tree |
| Form field metadata | Context API | `<Form>` component tree |
| Component-level state | `useState` + `useEffect` | Single component or hook |
| Notification queue | Custom reducer + pub-sub | In-memory, app-wide |
| Non-React access | `store.getState()` | Outside component tree (e.g. API client) |

---

### Decision Tree

```
Is the state shared across 2+ pages?
  Yes → Zustand store in src/stores/
  No  → Is it form state?
    Yes → React Hook Form
    No  → Is it tightly scoped to a component family?
      Yes → Context API
      No  → useState / useReducer locally
```

**When to use `persist`:** state that must survive a page refresh (auth, theme, user preferences) — always combine with `partialize` to exclude transient fields and sensitive data.

**When NOT to use `persist`:** ephemeral UI state (open modals, active filters, pagination cursors) should reset on refresh.

---

### When to Use

| Situation | Use |
|-----------|-----|
| User authentication, role, and session data that must survive page refresh | Zustand + `persist` |
| UI preferences (theme, language, sidebar state) that must persist | Zustand + `persist` |
| Global UI state that resets on refresh (modal visibility, loading flags) | Zustand (no persist) |
| Login, registration, settings, or any form with validation | React Hook Form |
| Derived field state inside a custom `<Form>` component system | Context API (`createContext`) |
| Responsive breakpoint detection tied to a single hook | `useState` + `useEffect` |
| Toast / snackbar notifications shared across the app without a provider | Custom reducer + pub-sub |
| Interceptors or service files that need store state without `useHook` | `store.getState()` |

---

### How to Use

#### 1. Zustand — Global Persistent Store

Use this for state that must survive a page refresh (auth session, theme preference).

**Create the store** — `src/stores/useAuthStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setAuth: (user) => set({ user, isAuthenticated: true, isLoading: false }),
      clearAuth: () => set({ user: null, isAuthenticated: false, isLoading: false }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      // Only persist what is safe and necessary
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

**Consume in a component**

```typescript
import { useAuthStore } from '@/stores/useAuthStore';

function ProfileBadge() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) return null;

  return <span>{user.username}</span>;
}
```

**Trigger an action**

```typescript
import { useAuthStore } from '@/stores/useAuthStore';

function LoginButton() {
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async () => {
    const user = await loginApi();
    setAuth(user);
  };

  return <button onClick={handleLogin}>Login</button>;
}
```

---

#### 2. Zustand — Global Persistent Store with `onRehydrateStorage`

Use this when a side effect must run immediately after the store is rehydrated from storage (e.g. applying a saved theme to the DOM before first render).

**Create the store** — `src/stores/useThemeStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const MOBILE_BREAKPOINT = 768;

function updateDocumentTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', isDark);
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        updateDocumentTheme(theme);
      },
    }),
    {
      name: 'theme-storage',
      // Run side effect immediately after store is rehydrated from localStorage
      onRehydrateStorage: () => (state) => {
        if (state) updateDocumentTheme(state.theme);
      },
    }
  )
);
```

**Consume in a component**

```typescript
import { useThemeStore } from '@/stores/useThemeStore';

function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
```

---

#### 3. Zustand — Direct Store Access (Outside React Components)

Use `store.getState()` when you need store values inside non-component code such as Axios interceptors, utility functions, or service files where React hooks are not callable.

**Usage in API client** — `src/services/api-client.ts`

```typescript
import axios from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';

const apiClient = axios.create({ baseURL: '/api' });

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Access store state directly — no hook needed here
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

#### 4. React Hook Form — Form State

Use for all forms. It handles field registration, validation, dirty/touched tracking, and submission without triggering unnecessary re-renders.

**Basic usage**

```typescript
import { useForm } from 'react-hook-form';

interface LoginFormValues {
  email: string;
  password: string;
}

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>();

  const onSubmit = async (data: LoginFormValues) => {
    await loginApi(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('email', { required: 'Email is required' })}
        type="email"
      />
      {errors.email && <p>{errors.email.message}</p>}

      <input
        {...register('password', { required: 'Password is required' })}
        type="password"
      />
      {errors.password && <p>{errors.password.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in…' : 'Login'}
      </button>
    </form>
  );
}
```

**With shadcn `<Form>` wrapper (recommended for UI consistency)**

```typescript
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function RegisterForm() {
  const form = useForm<{ username: string; email: string }>({
    defaultValues: { username: '', email: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => console.log(data))}>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="john_doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Register</Button>
      </form>
    </Form>
  );
}
```

---

#### 5. Context API — Form Field Metadata

Context API is used internally by the `<Form>` component system to pass field-level metadata (name, id, validation state) down to nested components without prop drilling.

**Defining the contexts** — `src/components/ui/form.tsx`

```typescript
import React from 'react';

interface FormFieldContextValue {
  name: string;
}

interface FormItemContextValue {
  id: string;
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);
const FormItemContext = React.createContext<FormItemContextValue | null>(null);

// Consumed by child components like <FormLabel>, <FormMessage>
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);

  if (!fieldContext) throw new Error('useFormField must be used inside <FormField>');

  return {
    name: fieldContext.name,
    id: itemContext?.id ?? fieldContext.name,
  };
};
```

> Do not reach for Context API for general global state. Use it only to share scoped metadata within a tightly coupled component family (like `<Form>` / `<FormField>` / `<FormItem>`).

---

#### 6. `useState` + `useEffect` — Local Component State

Use for component-scoped state that does not need to be shared: visibility toggles, window measurements, animation flags.

**Example — responsive breakpoint detection** — `src/hooks/use-mobile.tsx`

```typescript
import React from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}
```

**Usage**

```typescript
function Sidebar() {
  const isMobile = useIsMobile();

  return isMobile ? <DrawerNav /> : <SidebarNav />;
}
```

---

#### 7. Custom Reducer + Pub-Sub — In-Memory Notification State

Use for app-wide notifications (toast/snackbar) where you need multiple callers to push messages without a React context provider. The pattern uses a module-level `listeners` array and a `memoryState` variable to synchronize state across all hook instances.

**Core pattern** — `src/hooks/use-toast.ts`

```typescript
import React from 'react';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  duration?: number;
}

interface State {
  toasts: Toast[];
}

type Action =
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'DISMISS_TOAST'; toastId: string }
  | { type: 'REMOVE_TOAST'; toastId: string };

let memoryState: State = { toasts: [] };
const listeners: Array<(state: State) => void> = [];

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TOAST':
      return { toasts: [action.toast, ...state.toasts] };
    case 'DISMISS_TOAST':
      return {
        toasts: state.toasts.map((t) =>
          t.id === action.toastId ? { ...t, open: false } : t
        ),
      };
    case 'REMOVE_TOAST':
      return { toasts: state.toasts.filter((t) => t.id !== action.toastId) };
    default:
      return state;
  }
}

export function toast(props: Omit<Toast, 'id'>) {
  const id = String(Date.now());
  dispatch({ type: 'ADD_TOAST', toast: { id, ...props } });

  // Auto-dismiss
  setTimeout(() => {
    dispatch({ type: 'REMOVE_TOAST', toastId: id });
  }, props.duration ?? 5000);
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return { toasts: state.toasts, toast };
}
```

**Usage — triggering a toast from anywhere**

```typescript
import { toast } from '@/hooks/use-toast';

// Can be called from any component, service, or event handler
toast({ title: 'Saved', description: 'Your changes have been saved.' });
```

**Usage — rendering toasts**

```typescript
import { useToast } from '@/hooks/use-toast';

function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="rounded bg-white p-4 shadow">
          {t.title && <p className="font-semibold">{t.title}</p>}
          {t.description && <p>{t.description}</p>}
        </div>
      ))}
    </div>
  );
}
```

> Detailed rules and validation checklist: [references/state-management-rules.md](references/state-management-rules.md)
