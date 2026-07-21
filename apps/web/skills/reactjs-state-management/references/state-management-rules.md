# State Management — Rules & Constraints

## Allowed

### Zustand Stores

| # | Rule |
|---|------|
| ✅ | Create stores with `create<T>()` and explicitly type the interface |
| ✅ | Use `persist` middleware for state that must survive a page refresh (auth, theme) |
| ✅ | Use `partialize` inside `persist` to limit what gets written to storage |
| ✅ | Use `onRehydrateStorage` when a DOM side effect must run right after hydration |
| ✅ | Access store outside React via `store.getState()` (e.g. Axios interceptors) |
| ✅ | Subscribe to specific slices: `useStore((state) => state.value)` to minimize re-renders |
| ✅ | Co-locate action definitions inside the `create` call, not in separate files |
| ✅ | Place store files under `src/stores/` and name them `use<Name>Store.ts` |

### React Hook Form

| # | Rule |
|---|------|
| ✅ | Use `useForm<T>()` with an explicit generic type for form values |
| ✅ | Pass `defaultValues` to avoid uncontrolled-to-controlled warnings |
| ✅ | Use the shadcn `<Form>` / `<FormField>` / `<FormItem>` wrapper for all forms in the UI |
| ✅ | Access field state from `formState` (`errors`, `isSubmitting`, `isDirty`) |
| ✅ | Use `register` for simple inputs and `Controller` / `render` for custom components |

### Context API

| # | Rule |
|---|------|
| ✅ | Use Context API only for scoped metadata within a tightly coupled component family |
| ✅ | Always provide a null-safe default and throw a descriptive error inside the consumer hook |
| ✅ | Name context files after the component family they serve (e.g. `form.tsx` hosts `FormFieldContext`) |

### Local State (`useState` / `useEffect`)

| # | Rule |
|---|------|
| ✅ | Use `useState` for purely local, non-shared UI state (visibility, input buffer, toggle) |
| ✅ | Encapsulate stateful logic with side effects into a named custom hook under `src/hooks/` |
| ✅ | Clean up `useEffect` subscriptions and event listeners in the return function |
| ✅ | Name custom hooks `use<Descriptive>.ts` (e.g. `useIsMobile`, `useToast`) |

### Toast / In-Memory Pub-Sub

| # | Rule |
|---|------|
| ✅ | Use the module-level `toast()` function to trigger notifications from any context |
| ✅ | Clean up listeners in the `useEffect` return of `useToast` |
| ✅ | Always generate a unique id per toast (e.g. `String(Date.now())`) |

---

## Forbidden

### Global State

| # | Rule |
|---|------|
| ❌ | Do not use `localStorage` or `sessionStorage` directly in components — use the `persist` middleware instead |
| ❌ | Do not store sensitive data (tokens, passwords) in Zustand state — use HTTP-Only cookies |
| ❌ | Do not put derived values in the store — compute them at the call site or with a selector |
| ❌ | Do not create a store per component — stores are singletons shared across the app |
| ❌ | Do not import one store inside another store's `create` call |
| ❌ | Do not use `useEffect` to sync two Zustand stores — derive the value in one place |
| ❌ | Do not introduce Redux, Recoil, or Jotai — the template has chosen Zustand |

### React Hook Form

| # | Rule |
|---|------|
| ❌ | Do not manage form field values with `useState` alongside `useForm` — let RHF own field state |
| ❌ | Do not use uncontrolled refs directly on inputs that are registered with `register` |
| ❌ | Do not mutate `formState` fields manually |
| ❌ | Do not skip `handleSubmit` — always wrap the `onSubmit` handler with it for validation |

### Context API

| # | Rule |
|---|------|
| ❌ | Do not use Context API as a replacement for Zustand for general global state |
| ❌ | Do not put rapidly-changing values in context (causes full subtree re-renders) |
| ❌ | Do not create a context without a companion consumer hook (e.g. `useFormField`) |

### Local State

| # | Rule |
|---|------|
| ❌ | Do not lift state into a parent component just to pass it back down more than two levels — use a store |
| ❌ | Do not use `useReducer` for simple toggling or counter state — `useState` is sufficient |
| ❌ | Do not leave dangling `useEffect` subscriptions without a cleanup return |

### General

| # | Rule |
|---|------|
| ❌ | Do not mix server state (API responses) with client state in the same store slice |
| ❌ | Do not store entire API responses in Zustand — cache them at the service layer or a future React Query integration |
| ❌ | Do not add new state management libraries without updating this rule file and `SKILL.md` |

---

## Verification

Code is considered complete when **all** of the following are true:

### Zustand Store

- [ ] The store interface is explicitly typed (no implicit `any`)
- [ ] `persist` is used for state that must survive refresh; raw `create` for transient state
- [ ] `partialize` is specified so only necessary fields are written to storage
- [ ] Sensitive data (tokens, secrets) is absent from the store
- [ ] The store file is located at `src/stores/use<Name>Store.ts`
- [ ] Actions are co-located inside the `create` call
- [ ] Components subscribe to specific slices, not the whole store object

### React Hook Form

- [ ] `useForm` is typed with a form value interface
- [ ] `defaultValues` is provided for all fields
- [ ] All submissions go through `handleSubmit`
- [ ] Error messages are displayed using `formState.errors` or `<FormMessage />`
- [ ] No `useState` is used to shadow any field managed by RHF

### Context API

- [ ] Context is scoped to a component family, not the whole app
- [ ] A consumer hook is exported alongside the context (e.g. `useFormField`)
- [ ] The consumer hook throws a clear error when used outside its provider

### Local Hooks

- [ ] The hook is named `use<Descriptive>.ts` and lives under `src/hooks/`
- [ ] All `useEffect` subscriptions return a cleanup function
- [ ] State is not shared across unrelated components — use a store if needed

### General

- [ ] No direct `localStorage` / `sessionStorage` calls exist in components
- [ ] No new state management library was added outside the approved list (Zustand, React Hook Form)
- [ ] TypeScript reports zero errors in state-related files (`tsc --noEmit`)
