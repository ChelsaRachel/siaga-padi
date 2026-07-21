# Form — Rules & Constraints

## Form Framework & Library

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Use **React Hook Form** for all form state management | Performant, minimal re-renders, and integrates cleanly with Yup and shadcn/ui |
| Use **Yup** exclusively for validation schema | Project standard; mixing libraries causes inconsistency and increases bundle size |
| Use **shadcn/ui `<Form />`** component to wrap all form fields | Provides standardized structure, accessibility, and error display out of the box |
| Always set `noValidate` on the `<form>` element | Disables browser-native HTML5 validation that conflicts with Yup |
| Always define `defaultValues` for every field in `useForm()` | Prevents uncontrolled → controlled input warnings and ensures predictable initial state |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Using Zod, Valibot, or any other validation library | Project standardizes on **Yup** only; mixing libraries causes inconsistency |
| ❌ Using `register()` manually without shadcn/ui `<Form />` | Bypasses the standardized form structure and error display |
| ❌ Managing form state with `useState` | React Hook Form handles this more efficiently; `useState` causes unnecessary re-renders |
| ❌ Omitting `defaultValues` | Fields without default values cause uncontrolled → controlled input warnings and unpredictable behavior |
| ❌ Removing `noValidate` from `<form>` | HTML5 native validation conflicts with Yup and shows inconsistent browser-native UI |

---

## Form Layout — Tailwind Grid (Mandatory)

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Use **Tailwind grid** (`grid grid-cols-* gap-*`) for all multi-field form layouts | Grid handles responsive columns declaratively — no manual flex stacking needed |
| Default single-column layout: `grid grid-cols-1 gap-4` | Consistent baseline for all forms |
| Two-column responsive: `grid grid-cols-1 sm:grid-cols-2 gap-4` | Auto-responsive without extra media query logic |
| Three-column responsive: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` | For dense data-entry forms |
| Span full width when needed: `sm:col-span-2` | Useful for textarea, notes, or description fields |
| Use `gap-4` or `gap-6` as the standard column and row gap | Keeps visual rhythm consistent across all forms |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Using `flex flex-col` manually to stack multi-column form fields | Cannot handle multi-column layouts without nested flex — use `grid` instead |
| ❌ Defining individual widths (e.g. `w-1/2`, `w-full`) per field for layout | Creates fragile layouts that break at edge cases; let the grid column manage width |
| ❌ Hardcoded `margin` or `padding` between fields instead of `gap-*` | Gap utilities are context-aware; manual margins create double-spacing issues |
| ❌ Leaving a multi-field form with no layout wrapper | Fields stack with zero spacing — always wrap in a `grid` container |

### Example — Complete form with responsive grid

```tsx
// src/pages/user/parts/UserForm.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { userSchema, type TUserFormValues } from '../user.schema'
import { userService } from '@/services/modules/user.service'

export function UserForm() {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<TUserFormValues>({
    resolver: yupResolver(userSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      notes: '',
    },
  })

  const onSubmit = async (values: TUserFormValues) => {
    setServerError(null)
    try {
      await userService.create(values)
    } catch (error: any) {
      setServerError(error?.response?.data?.message ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Add any notes here..." rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" size="md" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  )
}
```

---

## Label & Input Spacing (shadcn `<FormItem>`)

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Always use shadcn `<FormLabel>` — never plain `<label>` | `FormLabel` is wired to the field's `id` and error state automatically; turns red on validation error |
| `<FormItem>` already defaults to `space-y-2` — do not reduce it | The built-in default gives 8px between label and input; fight the urge to override it tighter |
| Override to `space-y-1.5` only for compact/dense forms (e.g. inline filters) | Below `space-y-1.5` label and input visually merge — avoid it |
| Override to `space-y-0` only on `flex flex-row` fields (Checkbox, Switch) | Horizontal layout does not use vertical spacing; the flex row provides alignment instead |
| Place `<FormMessage />` immediately after `<FormControl>` inside `<FormItem>` | Keeps error message co-located with the field it describes |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Using plain `<label>` instead of `<FormLabel>` | Bypasses shadcn Form wiring; `htmlFor` and error colour are lost |
| ❌ Reducing `FormItem` spacing below `space-y-1.5` on vertical fields | Label and input visually collide; accessibility suffers |
| ❌ Adding manual `mb-*` or `mt-*` on `<FormLabel>` to control spacing | Breaks the spacing contract; use `space-y-*` on `<FormItem>` as the single source of truth |

### Examples

**Standard text field — default `space-y-2` (no override needed):**
```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input type="email" placeholder="john@example.com" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Checkbox field — `space-y-0` override required (horizontal layout):**
```tsx
import { Checkbox } from '@/components/ui/checkbox'

<FormField
  control={form.control}
  name="acceptTerms"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
      <FormControl>
        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
      <FormLabel className="font-normal leading-snug">
        I accept the terms and conditions
      </FormLabel>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## Schema Definition

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Define schema **outside the component**, in a dedicated `.schema.ts` file | Schema defined inside a component is recreated on every render, degrading performance |
| If only used by one page → place in `src/pages/{page}/{name}.schema.ts` | Keeps schema co-located with the page that owns it |
| If shared across multiple pages → place in `src/schemas/{name}.schema.ts` | Centralized location for reusable schemas, easy to find and update |
| Always close the schema with `.required()` | Ensures proper TypeScript type inference via `yup.InferType<>` |
| Always infer the form type from the schema: `type TFormValues = yup.InferType<typeof schema>` | Keeps types and schema in sync automatically; eliminates manual type duplication |
| Field names in schema must exactly match the `name` attribute of each input | Mismatched names cause silent validation failures |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Defining schema inside the component body | Schema is recreated on every render, causing performance degradation and resolver instability |
| ❌ Defining form types manually instead of inferring from schema | Type can go out of sync with the schema; always use `yup.InferType<>` |
| ❌ Placing schema files inside `utils/` or `types/` | Schemas are not pure helpers nor type definitions; they belong in `schemas/` |
| ❌ Sharing one schema across forms with very different fields | Create separate schemas per form to keep validation rules explicit and isolated |

### Example

```typescript
// src/pages/user/user.schema.ts
import * as yup from 'yup'

// Global Yup locale is already configured in main.tsx:
//   required → 'This is required'
//   notType  → 'Invalid data'
//   string.min → 'Min ${min} character'
// Only override the message when the default is not descriptive enough.

export const userSchema = yup
  .object({
    firstName: yup.string().min(2, 'First name must be at least 2 characters').required(),
    lastName: yup.string().min(2, 'Last name must be at least 2 characters').required(),
    email: yup.string().email('Must be a valid email address').required(),
    role: yup.string().required(),
    notes: yup.string().optional(),
  })
  .required()

export type TUserFormValues = yup.InferType<typeof userSchema>
```

```typescript
// src/schemas/auth.schema.ts  ← shared across login + register pages
import * as yup from 'yup'

export const loginSchema = yup
  .object({
    email: yup.string().email('Must be a valid email address').required(),
    password: yup.string().min(8, 'Password must be at least 8 characters').required(),
  })
  .required()

export type TLoginFormValues = yup.InferType<typeof loginSchema>
```

---

## Field Validation Messages

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Write a **specific, descriptive** error message for every validation rule | Users need to know exactly what is wrong and how to fix it |
| Include the limit value in length messages → `'Must be at least 8 characters'` | Generic "too short" gives no actionable guidance |
| Describe the expected format → `'Must be a valid email address'` | Helps the user understand what input is accepted |
| Name the field in required messages → `'Password is required'` | Clearer than a floating "Required" with no context |
| Store repeated messages in a shared constants file | Avoids duplication; changing a message in one place updates all forms |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Generic messages → `'Invalid input'`, `'Error'`, `'Required'` | Too vague; user cannot understand what needs to be corrected |
| ❌ Hardcoding the same message strings in multiple schema files | Creates duplication; use a shared constants file instead |
| ❌ Exposing technical messages to the user → `'yup validation failed'` | Messages must be human-readable and user-friendly |

### Example

```typescript
// src/schemas/auth.schema.ts
import * as yup from 'yup'

// ✅ Format-specific rules carry their own message.
// ✅ .required() uses the global locale ('This is required') — no need to repeat it per field.
export const registerSchema = yup
  .object({
    fullName: yup.string().min(3, 'Full name must be at least 3 characters').required(),
    email: yup.string().email('Must be a valid email address').required(),
    password: yup.string().min(8, 'Password must be at least 8 characters').required(),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password')], 'Passwords do not match')
      .required(),
  })
  .required()
```

---

## Error Handling

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Always wrap the submission handler in a `try-catch` block | Unhandled rejections crash the UI silently with no user feedback |
| Display server/API errors at the **top of the form** using `<Alert />` | Server errors are global, not field-specific; placing them at the top keeps UX clear |
| Display field-level errors **inline** using `<FormMessage />` from shadcn/ui | Inline errors are contextual; users see exactly which field failed |
| Use the error message from the API response; fallback to a constant if unavailable | Shows the most relevant message; avoids hardcoded catch-all strings |
| Clear the server error state when the user starts editing the form again | Stale error messages confuse users who have already made corrections |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ No `try-catch` on form submission | Unhandled promise rejections will crash the UI silently |
| ❌ Displaying server errors inside individual field `<FormMessage />` | Server errors are global, not field-specific; they belong at the top of the form |
| ❌ Hardcoding error messages in the catch block → `catch { setError('Something went wrong') }` | Use the actual API response message; fallback to a constant if unavailable |
| ❌ Empty catch block → `catch { }` | Always handle the error; at minimum show a generic fallback alert to the user |

### Example

```tsx
// src/pages/profile/parts/ProfileForm.tsx
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Form } from '@/components/ui/form'

const [serverError, setServerError] = useState<string | null>(null)

const onSubmit = async (values: TProfileFormValues) => {
  setServerError(null)
  try {
    await profileService.update(values)
  } catch (error: any) {
    setServerError(error?.response?.data?.message ?? 'Something went wrong. Please try again.')
  }
}

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      {/* FormField blocks go here */}
    </form>
  </Form>
)
```

---

## Submit Handling

### ✅ ALLOWED

| Rule | Reason |
|------|--------|
| Always use `form.handleSubmit(onSubmit)` on the `<form>` `onSubmit` prop | Runs Yup validation before calling `onSubmit`; prevents submission of invalid data |
| Use `form.formState.isSubmitting` to track loading state | React Hook Form manages this internally; no need for a separate `isLoading` state |
| Disable the submit button while `isSubmitting` is `true` | Prevents duplicate submissions and race conditions |
| Show a visible loading indicator (spinner or text change) on the submit button | Gives the user clear feedback that the action is in progress |
| Disable all interactive elements during submission | Prevents the user from modifying data mid-submission |

### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Calling `onSubmit` directly without `form.handleSubmit()` | Bypasses React Hook Form validation; the form can submit with invalid data |
| ❌ Using a separate `isLoading` state instead of `form.formState.isSubmitting` | Causes state duplication; React Hook Form already manages this internally |
| ❌ Submit button remains active during submission | Allows duplicate submissions and race conditions |
| ❌ No loading indicator on the submit button | User has no feedback that the action is in progress |

### Example

```tsx
// src/pages/profile/parts/ProfileForm.tsx
import { Button } from '@/components/ui/button'

// Inside the JSX — Button uses isSubmitting from React Hook Form:
<form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
  {/* ...fields... */}
  <Button type="submit" size="md" disabled={form.formState.isSubmitting}>
    {form.formState.isSubmitting ? 'Saving...' : 'Save Profile'}
  </Button>
</form>
```

> `Button` from this template accepts `size` variants: `xs` · `sm` · `default` · `md` · `lg` · `icon`.
> Use `size="md"` (`h-11`) for primary form submit actions; `size="default"` (`h-9`) for compact forms.

---

## Additional Notes

- `yupResolver` from `@hookform/resolvers/yup` must always be passed to `useForm({ resolver: yupResolver(schema) })` — never wire Yup to the form manually.
- For multi-step forms, each step must have its own schema and its own `useForm()` instance.
- Never call `form.reset()` without passing the correct `defaultValues` — it will reset the form to empty/undefined values.

---

## Pre-Submission Verification Checklist

> Run through this checklist on every form before submitting a Pull Request. All items must be checked. Unchecked items will be flagged during code review.

### Framework & Setup

- [ ] Form is using **React Hook Form** via `useForm()`
- [ ] `yupResolver(schema)` is passed to `useForm({ resolver: ... })`
- [ ] All form fields are wrapped inside **shadcn/ui `<Form />`**
- [ ] `noValidate` is present on the `<form>` element
- [ ] `defaultValues` is defined for **every field** in `useForm()`

### Layout & Spacing

- [ ] All multi-field forms use **Tailwind `grid`** (`grid grid-cols-* gap-*`) — never bare `flex flex-col`
- [ ] Responsive columns are applied where appropriate (`sm:grid-cols-2`, `lg:grid-cols-3`)
- [ ] Standard gap is `gap-4` or `gap-6` — no manual `margin` between fields
- [ ] Every field is wrapped in `<FormItem className="space-y-2">` (minimum `space-y-1.5`)
- [ ] **`<FormLabel>` is used for every label** — no plain `<label>` elements
- [ ] `<FormMessage />` is placed immediately after `<FormControl>` inside each `<FormItem>`

### Schema

- [ ] Schema is defined **outside** the component in a `.schema.ts` file
- [ ] Schema file is placed in the correct location:
  - `src/pages/{page}/{name}.schema.ts` — if used by one page only
  - `src/schemas/{name}.schema.ts` — if shared across multiple pages
- [ ] Schema ends with `.required()`
- [ ] Form type is inferred from schema: `type TFormValues = yup.InferType<typeof schema>`
- [ ] Field names in schema match the `name` attribute of each input exactly

### Validation Messages

- [ ] Every validation rule has a **specific, descriptive** error message
- [ ] No generic messages like `'Required'`, `'Invalid'`, or `'Error'`
- [ ] Length-based messages include the limit value → `'Must be at least 8 characters'`
- [ ] Required messages name the field → `'Email is required'`
- [ ] Repeated messages are stored in a constants file, not hardcoded per schema

### Error Handling

- [ ] The `onSubmit` handler is wrapped in a `try-catch` block
- [ ] Server/API errors are displayed at the **top of the form** using `<Alert />`
- [ ] Field errors are displayed **inline** using `<FormMessage />`
- [ ] Error message comes from the API response with a constants fallback
- [ ] Server error state is cleared when the user starts editing again
- [ ] The `catch` block is **never empty**

### Submit Handling

- [ ] `form.handleSubmit(onSubmit)` is used on the `<form>` `onSubmit` prop
- [ ] `form.formState.isSubmitting` is used for the loading state (no separate `isLoading` state)
- [ ] Submit button is **disabled** while `isSubmitting` is `true`
- [ ] A **loading indicator** (spinner or text change) is shown on the submit button
- [ ] No interactive elements remain active during submission
