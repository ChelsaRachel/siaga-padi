---
name: reactjs-service
description: Use when calling API, fetching data, submitting forms to backend, or creating CRUD services. Covers createResourceService factory, custom service objects, and the api.service.ts dynamic helper.
---

# Skill: Calling CRUD Services

Decide quickly which path to take, then write the minimum code.

---



## Decision Tree

```
Does the backend module follow this exact contract?
  POST {base}/add        — create with JSON body
  POST {base}/get-all    — list with JSON body
  GET  {base}/get-one    — read one via query params
  PUT  {base}/update     — update with JSON body
  DELETE {base}/delete   — delete via query params

YES → Use `createResourceService` (one-liner)

NO → Is it a single ad-hoc call or custom action (not a full module)?
     YES → Use `request()` from `api.service.ts`
     NO  → Write a custom service object (each method explicit)

Is it a file upload?
  → Use `uploadRequest()` from `api.service.ts`
```

---

## Step 1 — Add the endpoint constant

Edit `src/services/api-endpoints.ts`:

```ts
export const API_ENDPOINTS = {
  // ...existing
  PRODUCT: {
    BASE: '/products',
  },
} as const;
```

> Use `BASE` for CRUD modules. The factory appends `/add`, `/get-all`, etc.

---

## Step 2a — CRUD module (factory path)

Create `src/services/{module}.service.ts`:

```ts
import { createResourceService } from './resource.service';
import { API_ENDPOINTS } from './api-endpoints';
import type { IProduct } from '@/types/models';

export interface IProductCreatePayload {
  name: string;
  price: number;
}

export interface IProductUpdatePayload {
  id: string;
  name?: string;
  price?: number;
}

export const productsService = createResourceService<
  IProduct,
  IProductCreatePayload,
  IProductUpdatePayload
>(API_ENDPOINTS.PRODUCT.BASE);
```

Now consumers can call:

```ts
await productsService.add({ name, price });
await productsService.getAll({ page: 1, size: 20, search: 'foo' });
await productsService.getOne({ id });
await productsService.update({ id, name });
await productsService.delete({ id });
```

---

## Step 2b — Custom module (non-CRUD shape)

Create `src/services/{module}.service.ts` directly:

```ts
import apiClient from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import type { ApiResponse } from '@/types/api';

export interface IExecuteWidgetPayload {
  widgetId: string;
  filters: Record<string, unknown>;
}

export const widgetService = {
  execute: (data: IExecuteWidgetPayload): Promise<ApiResponse<unknown>> =>
    apiClient.post(API_ENDPOINTS.WIDGET.EXECUTE, data),
};
```

## Step 2c — Ad-hoc / dynamic call (no module service file needed)

Use `request()` from `api.service.ts` directly in a hook or component when the call is a one-off or custom action:

```ts
import { request } from '@/services/api.service';
import { API_ENDPOINTS } from '@/services/api-endpoints';

// Custom action — non-CRUD, no full module service file warranted
const result = await request<ISkillResult>({
  path: API_ENDPOINTS.AGENT.UPDATE_SKILL,
  method: 'post',
  data: { skillId, level },
});

// GET with query params
const stats = await request<IThreadPool>({
  path: API_ENDPOINTS.MONITORING.THREADPOOL,
  method: 'get',
  params: { workspaceId },
});
```

> Always add the path to `api-endpoints.ts` first — never use a raw string literal.

## Step 2d — File upload

```ts
import { uploadRequest } from '@/services/api.service';
import { API_ENDPOINTS } from '@/services/api-endpoints';

const formData = new FormData();
formData.append('file', file);

const result = await uploadRequest<IUploadedFile>(
  API_ENDPOINTS.FILES.UPLOAD,
  formData,
  (percent) => setUploadProgress(percent)
);
```

---

## ✅ Do

- ✅ Use `createResourceService` whenever the 5-endpoint contract matches.
- ✅ Use `request()` from `api.service.ts` for ad-hoc or custom action calls.
- ✅ Use `uploadRequest()` from `api.service.ts` for file uploads.
- ✅ Define payload types **next to the service**, not in `src/types/`.
- ✅ Use `I` prefix for payload interfaces (`IProductCreatePayload`).
- ✅ Reference paths from `API_ENDPOINTS.*` — never raw string literals.
- ✅ Let errors bubble — they are normalized by `api-client.ts` interceptor.

## ❌ Don't

- ❌ Don't reimplement the 5 CRUD methods by hand when the contract matches.
- ❌ Don't `import axios` or call `fetch()` — always go through `apiClient`.
- ❌ Don't import `apiClient` directly for a one-off call — use `request()` instead.
- ❌ Don't wrap calls in `try/catch` inside the service.
- ❌ Don't put module payloads in `src/types/`. Keep them co-located.
- ❌ Don't recreate `services/modules/` subfolder.
- ❌ Don't bend the factory for non-standard endpoints — use `request()` or a custom object instead.
- ❌ Don't pass raw URL strings to `request()` — define them in `api-endpoints.ts` first.

---

## Verification Checklist

- [ ] Endpoint added to `api-endpoints.ts` (`BASE` for CRUD modules, named key for custom actions)
- [ ] Service file is at `src/services/{module}.service.ts` (flat)
- [ ] Factory used for standard CRUD; `request()` for ad-hoc calls; custom object for full non-CRUD modules
- [ ] File uploads use `uploadRequest()` with progress callback if needed
- [ ] Payload types use `I` prefix and live in the service file
- [ ] No `try/catch`, no direct `axios`, no inline URL strings

---

## Rules & Constraints

### File Structure (flat — no `modules/` subfolder)

```
src/services/
├── api-client.ts          ← Axios instance + interceptors (do not edit per-feature)
├── api-endpoints.ts       ← All API path constants
├── resource.service.ts    ← Generic `createResourceService` factory
├── api.service.ts         ← Dynamic `request()` + `uploadRequest()` for non-CRUD & custom actions
├── auth.service.ts        ← Custom service (non-CRUD shape)
└── {module}.service.ts    ← One file per domain resource
```

> ❗ Never recreate `src/services/modules/`. The flat structure is intentional — keeps imports short and prevents over-nesting.

### Endpoint Contract (CRUD)

Every CRUD module **must** follow this exact shape on the backend:

| Operation | Method   | Path              | Param Location |
|-----------|----------|-------------------|----------------|
| Create    | `POST`   | `{base}/add`      | request body (JSON) |
| List      | `POST`   | `{base}/get-all`  | request body (JSON) |
| Read one  | `GET`    | `{base}/get-one`  | query params |
| Update    | `PUT`    | `{base}/update`   | request body (JSON, includes `id`) |
| Delete    | `DELETE` | `{base}/delete`   | query params |

`get-all` is `POST` (not `GET`) because list filters are JSON arrays/objects.

### `apiClient` Behavior

- Base URL: `process.env.API_BASE_URL`
- Timeout: 30 000 ms
- `withCredentials: true` — browser attaches HTTP-Only cookies automatically
- Response interceptor unwraps `response.data`
- 401 interceptor: attempts token refresh via `AUTH.REFRESH`, queues concurrent requests, retries after success, clears auth on failure

### Definition of Done

- [ ] File lives in `src/services/{module}.service.ts` (flat — never `modules/`)
- [ ] Base path is referenced from `api-endpoints.ts`, not hardcoded
- [ ] CRUD modules use `createResourceService<T, TCreate, TUpdate>` — no manual reimplementation
- [ ] Custom (non-CRUD) module services import only from `./api-client` and `./api-endpoints`
- [ ] Ad-hoc / custom action calls use `request()` or `uploadRequest()` from `./api.service`
- [ ] All paths passed to `request()` come from `api-endpoints.ts` — no raw string literals
- [ ] Payload interfaces are defined in the same file with `I` prefix
- [ ] No `axios`/`fetch` import outside `api-client.ts`
- [ ] No `try/catch` wrapping inside the service — errors bubble to the consumer
