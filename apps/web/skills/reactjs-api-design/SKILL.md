---
name: api-design
description: API design reference for React/TypeScript. Covers endpoint constants, request payload DTOs, and response envelope types. Primary reference is fusion-openapi.json. Load when writing service files, defining API_ENDPOINTS, or typing request/response payloads.
---

# API Design (React / TypeScript)

> **Primary reference: `fusion-openapi.json`** at the project root.
> All endpoint paths, payload types, and response shapes must match that file exactly.

---

## 1. Endpoint Constants (`api-endpoints.ts`)

All API path constants live in **one file**:

```
src/services/api-endpoints.ts
```

Structure mirrors `fusion-openapi.json` paths exactly, grouped by module:

```ts
// src/services/api-endpoints.ts
export const API_ENDPOINTS = {
  FEATURE: {
    ADD:     '/feature/add',
    UPDATE:  '/feature/update',
    DELETE:  '/feature/delete',      // id via ?id= at call time
    GET_ALL: '/feature/get-all',     // POST — carries FindDto body
    GET_ONE: '/feature/get-one',     // id via ?id= at call time
  },
  AI_API: {
    ADD:     '/ai/api/add',
    UPDATE:  '/ai/api/update',
    DELETE:  '/ai/api/delete',
    GET_ALL: '/ai/api/get-all',
    GET_ONE: '/ai/api/get-one',
  },
};
```

**Key naming rules:**
- Group keys: `UPPER_SNAKE_CASE`
- Path constant keys: `UPPER_SNAKE_CASE`
- Path values: match `fusion-openapi.json` verbatim (no `/api/v1/` prefix)

---

## 2. Standard CRUD Paths

From `fusion-openapi.json`:

| Action        | Method   | Path                | `id` location           |
| ------------- | -------- | ------------------- | ----------------------- |
| Create        | `POST`   | `/<module>/add`     | Request body            |
| Update        | `PUT`    | `/<module>/update`  | Request body field `id` |
| Delete        | `DELETE` | `/<module>/delete`  | Query param `?id=`      |
| List / Filter | `POST`   | `/<module>/get-all` | — (body = FindDto)      |
| Get single    | `GET`    | `/<module>/get-one` | Query param `?id=`      |

> `get-all` is **POST** — it sends a `FindDto` body for filtering and pagination.
> `delete` and `get-one` append `?id=<id>` to the URL.

---

## 3. Service File Pattern

```ts
// src/services/feature.service.ts
import { apiClient } from '@/services/api-client';
import { API_ENDPOINTS } from '@/services/api-endpoints';
import type {
  TFeature,
  TCreateFeatureDto,
  TUpdateFeatureDto,
  TFindFeatureDto,
  TServiceResponse,
} from '@/types/feature.types';

export async function addFeature(dto: TCreateFeatureDto): Promise<TServiceResponse<TFeature>> {
  try {
    const res = await apiClient.post(API_ENDPOINTS.FEATURE.ADD, dto);
    return { loading: false, data: res.data, error: null, message: 'Success' };
  } catch (err) {
    return { loading: false, data: null, error: (err as Error).message, message: null };
  }
}

export async function updateFeature(dto: TUpdateFeatureDto): Promise<TServiceResponse<TFeature>> {
  // dto already contains the `id` field — no path param needed
  try {
    const res = await apiClient.put(API_ENDPOINTS.FEATURE.UPDATE, dto);
    return { loading: false, data: res.data, error: null, message: 'Updated' };
  } catch (err) {
    return { loading: false, data: null, error: (err as Error).message, message: null };
  }
}

export async function deleteFeature(id: string): Promise<TServiceResponse<null>> {
  try {
    await apiClient.delete(API_ENDPOINTS.FEATURE.DELETE, { params: { id } });
    return { loading: false, data: null, error: null, message: 'Deleted' };
  } catch (err) {
    return { loading: false, data: null, error: (err as Error).message, message: null };
  }
}

export async function getAllFeatures(dto: TFindFeatureDto): Promise<TServiceResponse<TFeature[]>> {
  // POST — body carries filters + pagination
  try {
    const res = await apiClient.post(API_ENDPOINTS.FEATURE.GET_ALL, dto);
    return { loading: false, data: res.data, error: null, message: 'Success' };
  } catch (err) {
    return { loading: false, data: null, error: (err as Error).message, message: null };
  }
}

export async function getOneFeature(id: string): Promise<TServiceResponse<TFeature>> {
  try {
    const res = await apiClient.get(API_ENDPOINTS.FEATURE.GET_ONE, { params: { id } });
    return { loading: false, data: res.data, error: null, message: 'Success' };
  } catch (err) {
    return { loading: false, data: null, error: (err as Error).message, message: null };
  }
}
```

---

## 4. Request Payload Types

Derived from `fusion-openapi.json` schemas. Place in `src/types/<module>.types.ts`.

### 4a. Create DTO

```ts
// All fields camelCase — matches OpenAPI schema field names directly
export interface TCreateFeatureDto {
  name?:        string | null;
  description?: string | null;
  workspaceId?: string | null;
  config?:      Record<string, unknown> | null;
  tags?:        unknown[] | null;
  createdBy?:   string | null;
  updatedBy?:   string | null;
}
```

- **camelCase** fields — 97%+ of OpenAPI schemas use camelCase.
- All optional (`?`) unless the schema has an explicit `required` array.
- Nullable fields typed as `T | null`.

### 4b. Update DTO

```ts
export interface TUpdateFeatureDto {
  id?:          string | null;   // id of the record to update — in body, not URL
  name?:        string | null;
  description?: string | null;
  workspaceId?: string | null;
  updatedBy?:   string | null;
}
```

- Always has `id` field — sent in the request body.

### 4c. Find DTO (extends base FindDto)

```ts
export interface TFindFeatureDto {
  // --- base FindDto fields ---
  search?:              string;
  search_by?:           unknown[];      // snake_case — preserved from base schema
  operator?:            string;
  orderBy?:             string;         // default: "createdAt"
  order?:               'asc' | 'desc'; // default: "desc"
  page?:                number;         // default: 1
  size?:                number;         // default: 10
  searchIgnoreSpecial?: boolean;
  workspaceId?:         string;
  filters?:             unknown[];
  organizationId?:      string;
  // --- module-specific filters ---
  name?:                string | null;
  createdBy?:           string | null;
}
```

> `search_by` and `filters` stay snake_case — these are from the base FindDTO.

---

## 5. Response Types

The server always returns the Fusion response envelope:

```ts
// src/types/api.types.ts
export interface IApiResponse<T> {
  success:  boolean;
  data:     T | null;
  metaData: IMetaData;
}

export interface IMetaData {
  executionTime: number;
  pagination?:   IPagination;
  message?:      string;
}

export interface IPagination {
  page:      number;
  size:      number;
  totalPage: number;
  totalData: number;
}
```

**Service response wrapper** (what the store receives):

```ts
export interface TServiceResponse<T> {
  loading: boolean;
  data:    T | null;
  error:   string | null;
  message: string | null;
}
```

Access the envelope via `apiClient` interceptors — unwrap `data` before returning from service functions.

---

## 6. Extended Action Endpoints

Add to `API_ENDPOINTS` with the same naming convention:

```ts
FEATURE: {
  // ...
  UPDATE_STATUS:   '/feature/update-status',
  MULTI_UPDATE:    '/feature/multi-update',
  DUPLICATE:       '/feature/duplicate',
  GET_BY_PATTERN:  '/feature/get-by-pattern',
  UPLOAD_FILE:     '/feature/upload-file',
  CHECK_DUPLICATE: '/feature/check-duplicate',
  SYNC_TO_QDRANT:  '/feature/sync-to-qdrant',
}
```

Key naming: `UPPER_SNAKE_CASE` matching the kebab-case path verb.

---

## Forbidden Patterns

| Pattern                                                     | Reason                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| `apiClient.delete('/feature/delete/' + id)`                 | Standard is `?id=` query param                               |
| `apiClient.get('/feature/get-all')`                         | `get-all` must be POST with a body                           |
| Hardcoded URL strings in service files                      | Must reference `API_ENDPOINTS.*`                             |
| `import axios from 'axios'` or `fetch(...)`                 | Use `apiClient` from `api-client.ts` only                    |
| Inline interface inside a service                           | Types belong in `src/types/*.types.ts`                       |
| `any` type on DTO fields                                    | Use explicit types or `unknown`                              |
| `.then().catch()` chains                                    | Use `async/await` with `try/catch`                           |
| Path names not matching `fusion-openapi.json`               | Derive from the OpenAPI file, do not invent                  |
| `snake_case` DTO field names except `search_by` / `filters` | All other fields must be camelCase                           |
