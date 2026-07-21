---
name: form
description: Build forms following mandatory standards: React Hook Form + Yup + shadcn/ui Form behavior/accessibility, with active DESIGN.md token/variant overrides and responsive Tailwind CSS grid layout. Use when creating a form, adding validation, or handling form submission.
---

# Form Skill

Every form in this project follows one standard anatomy. Read this skill completely before writing any form-related code.

## Stack

| Layer | Library |
|-------|---------|
| Form state | `react-hook-form` |
| Validation | `yup` + `@hookform/resolvers/yup` |
| UI components | `shadcn/ui` — `<Form />`, `<FormField />`, `<FormItem />`, `<FormLabel />`, `<FormControl />`, `<FormMessage />` |
| Layout | Tailwind CSS grid system (see [Responsive Layout](#responsive-layout)) |

---

## Design-System Rule

Use shadcn Form primitives for behavior/accessibility and React Hook Form integration. Override visual classes so inputs, labels, helper text, focus rings, and action buttons follow the active `DESIGN.md`.

Follow the active `DESIGN.md` form contract. Example when the active design is Tactical:

- Input/select/textarea: `rounded-none border border-border-primary bg-background-primary`
- Placeholder: `placeholder:text-font-placeholder`
- Focus: `focus-visible:ring-1 focus-visible:ring-primary-500`
- Error border: `border-error-500`
- Error text: `text-error-500 text-p12`
- Primary submit: `bg-primary-500 text-font-on-accent`
- Avoid final `bg-muted`, `text-muted-foreground`, `rounded-md`, and soft shadcn defaults on Tactical surfaces.

---

## Step 1 — Schema File

Create the schema **outside the component** in a `.schema.ts` file.

**Location rules:**
- Used by 1 page only → `src/pages/{page}/{name}.schema.ts`
- Shared across pages → `src/schemas/{name}.schema.ts`

```typescript
// src/pages/profile/profile.schema.ts
import * as yup from 'yup';

export const profileSchema = yup
  .object({
    fullName: yup
      .string()
      .min(3, 'Full name must be at least 3 characters')
      .required('Full name is required'),
    email: yup
      .string()
      .email('Must be a valid email address')
      .required('Email is required'),
    phone: yup
      .string()
      .matches(/^[0-9+\-\s]+$/, 'Phone number format is invalid')
      .optional(),
    role: yup
      .string()
      .oneOf(['admin', 'user', 'viewer'], 'Please select a valid role')
      .required('Role is required'),
  })
  .required();

// Always infer the type from the schema — never write it manually
export type TProfileFormValues = yup.InferType<typeof profileSchema>;
```

**Rules:**
- ✅ Always close with `.required()`
- ✅ Always export `yup.InferType<typeof schema>` as the form type
- ✅ Every validation rule must have a specific, descriptive message
- ❌ Never define schema inside the component body
- ❌ Never write `type TFormValues = { ... }` manually — infer from schema

---

## Step 2 — useForm Setup

```typescript
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { profileSchema, type TProfileFormValues } from './profile.schema';

const form = useForm<TProfileFormValues>({
  resolver: yupResolver(profileSchema),
  defaultValues: {
    fullName: '',
    email: '',
    phone: '',
    role: '',
  },
});
```

**Rules:**
- ✅ Always pass `yupResolver(schema)` as the resolver
- ✅ Always define `defaultValues` for every field
- ❌ Never use `useState` to manage form field values
- ❌ Never call Yup `.validate()` manually — the resolver handles this

---

## Step 3 — Responsive Layout

All forms use Tailwind CSS grid. Choose the column structure based on form complexity.

### Grid Presets

```tsx
// Single column — simple forms (login, register, short settings)
<div className="grid grid-cols-1 gap-4">

// Two columns — medium forms (profile, address, user edit)
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

// Three columns — dense forms (admin tables, filter panels)
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

// Mixed — some fields span full width inside a multi-column grid
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
  <FormField ... />               {/* col 1 */}
  <FormField ... />               {/* col 2 */}
  <div className="sm:col-span-2"> {/* full width */}
    <FormField ... />
  </div>
</div>
```

### Responsive Breakpoints

| Breakpoint | Class prefix | Viewport |
|------------|-------------|---------|
| Mobile (default) | _(none)_ | 0px+ |
| Small | `sm:` | 640px+ |
| Medium | `md:` | 768px+ |
| Large | `lg:` | 1024px+ |

### Field Spanning Rules

| Field Type | Span Behavior |
|------------|---------------|
| Short fields (name, email, phone, date) | 1 column |
| Medium fields (address line, city) | 1 column |
| Long fields (full address, description) | Full width (`col-span-full` or `sm:col-span-2`) |
| Textarea | Always full width |
| Submit button row | Always full width, right-aligned |
| Server error `<Alert />` | Always full width, placed above the grid |

---

## Step 4 — Complete Form Anatomy

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { profileSchema, type TProfileFormValues } from './profile.schema';
import { profileService } from '@/services/modules/profile.service';
import { ERROR_MESSAGES } from '@/config/constants';

const ProfileForm = () => {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<TProfileFormValues>({
    resolver: yupResolver(profileSchema),
    defaultValues: { fullName: '', email: '', phone: '', role: '' },
  });

  const onSubmit = async (values: TProfileFormValues) => {
    setServerError(null);
    try {
      await profileService.update(values);
    } catch (error) {
      const message = error?.response?.data?.message ?? ERROR_MESSAGES.GENERIC;
      setServerError(message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">

        {/* Server error — always full width, always above fields */}
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {/* Responsive grid — 1 col mobile, 2 col sm+ */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    className="rounded-none border-border-primary bg-background-primary text-p14 text-font-primary placeholder:text-font-placeholder focus-visible:ring-1 focus-visible:ring-primary-500"
                    {...field}
                  />
                </FormControl>
                <FormMessage /> {/* inline field error */}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-p14 font-medium text-font-primary">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    className="rounded-none border-border-primary bg-background-primary text-p14 text-font-primary placeholder:text-font-placeholder focus-visible:ring-1 focus-visible:ring-primary-500"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-p14 font-medium text-font-primary">
                  Phone <span className="text-p12 text-font-secondary">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="+62 812 3456 7890" {...field} />
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
                <FormControl>
                  <Input placeholder="Select role" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        </div>

        {/* Submit row — always full width */}
        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <><Spinner className="mr-2 h-4 w-4" />Saving...</>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>

      </form>
    </Form>
  );
};
```

---

## Step 5 — Common Field Patterns

### Textarea (always full width)
```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
  {/* other fields ... */}
  <div className="col-span-full">
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Description</FormLabel>
          <FormControl>
            <Textarea rows={4} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
</div>
```

### Select field
```tsx
<FormField
  control={form.control}
  name="status"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Status</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Checkbox
```tsx
<FormField
  control={form.control}
  name="acceptTerms"
  render={({ field }) => (
    <FormItem className="flex items-start space-x-3 space-y-0">
      <FormControl>
        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
      <FormLabel className="font-normal">I accept the terms and conditions</FormLabel>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## Quick Rules Reference

| Rule | Value |
|------|-------|
| Form library | `react-hook-form` only |
| Validation library | `yup` only |
| UI wrapper | `shadcn/ui <Form />` always for behavior/accessibility |
| `noValidate` on `<form>` | Required |
| `defaultValues` | Required for every field |
| Schema location | Outside component, `.schema.ts` file |
| Form type | `yup.InferType<typeof schema>` always |
| Loading state | `form.formState.isSubmitting` only |
| Server error | `<Alert />` at top of form |
| Field error | `<FormMessage />` inline |
| Layout | Tailwind grid, responsive breakpoints |
| Mobile layout | `grid-cols-1` always |
| Textarea / long fields | `col-span-full` always |
| Submit row | `flex justify-end`, full width |
| Visual styling | Active `DESIGN.md` token classes, not raw shadcn defaults |

> Detailed rules and validation checklist: [references/form-rules.md](references/form-rules.md)
