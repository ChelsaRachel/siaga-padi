# API Spec — Siaga Padi (Sprint 01: Auth & Roles)

Source of truth for the FE ↔ BE contract of Sprint 01. Backend implements these
routes in `apps/backend` (FastAPI boilerplate conventions); frontend consumes them
via `src/services/` only.

## Transport

- Backend runs at `http://localhost:8020` (boilerplate default, `python api.py`).
- FE dev proxy: `/api/v1/apps/*` → backend root (see `proxy.config.json`,
  `pathRewrite` strips `/api/v1/apps`). FE endpoint constants therefore start with
  `apps/` and the axios `baseURL` is `/api/v1`.
- Auth: `Authorization: Bearer <accessToken>` header (boilerplate `JWTBearer`).
  Tokens are returned in the response body — no cookies.

## Response envelope (all endpoints)

Success (HTTP 200):

```json
{
  "metaData": {
    "pagination": { "totalPage": 0, "totalItem": 0, "currentPage": 0, "itemPerPage": 0 },
    "status": true,
    "executionTime": 12,
    "responseCode": 200,
    "message": "Success"
  },
  "data": {},
  "additionalInfo": null,
  "copyright": "..."
}
```

Failure (HTTP 4xx/5xx): same envelope with `metaData.status = false`,
`metaData.responseCode` mirroring the HTTP status, `metaData.message` a
user-presentable Indonesian string, and optional `additionalInfo`.

## Shared types

`SiagaProfile` (camelCase, FE-facing):

```ts
type SiagaRole = 'petani' | 'penyuluh' | 'admin' | 'domain_reviewer';
type AccountStatus = 'mandiri' | 'didampingi' | 'locked' | 'inactive';
type ConsentMethod = 'lisan' | 'tertulis' | 'in_app';

interface SiagaProfile {
  profileId: string;
  userId: string;
  displayName: string;
  role: SiagaRole;
  areaKabupaten: string | null;
  areaKecamatan: string | null;
  accountStatus: AccountStatus;
  researchConsent: boolean;
  locationConsent: boolean;
  assignmentAreas: string[] | null; // kecamatan list; non-null only for penyuluh
  createdAt: string;                // ISO 8601
  updatedAt: string;
}

interface SiagaSession {
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
  expiresIn: number; // seconds
}
```

## Endpoints

### POST `apps/siaga/auth/login` (public)

Body: `{ "email": string, "password": string }`

- `200` → `data: { session: SiagaSession, profile: SiagaProfile }`
- `401` → generic failure, `metaData.message` **identical whether or not the
  account exists** (e.g. `"Email atau kata sandi tidak cocok."`). Never reveal
  account existence.
- `423` → account/email temporarily locked after **5 failed attempts within a
  15-minute window**. `additionalInfo: { retryAfterSeconds: number, lockedUntil: string }`.
  Message tells the user when to retry, still without revealing account existence.
- Lockout is keyed by the submitted email (whether or not it matches an account),
  so timing/shape never leaks existence.

### POST `apps/siaga/auth/refresh` (public)

Body: `{ "refreshToken": string }`

- `200` → `data: { session: SiagaSession }`
- `401` → invalid/expired refresh token.

### GET `apps/siaga/auth/me` (Bearer)

- `200` → `data: SiagaProfile` (with `assignmentAreas` populated for penyuluh)
- `401` → missing/invalid token.

### POST `apps/assisted/search` (Bearer, penyuluh only)

Body: `{ "query": string }` — name search, **always restricted to the caller's
assignment kecamatan**; never global.

- `200` → `data: Array<{ profileId, displayName, areaKabupaten, areaKecamatan, accountStatus }>`
- `403` → caller is not penyuluh.

### POST `apps/assisted/start` (Bearer, penyuluh only)

Body — exactly one of `subjectProfileId` | `newProfile`:

```json
{
  "subjectProfileId": "…",
  "newProfile": { "displayName": "…", "areaKabupaten": "…", "areaKecamatan": "…" },
  "consentMethod": "lisan" | "tertulis" | "in_app"
}
```

- `newProfile` creates a minimal profile with `accountStatus: "didampingi"`
  (no credentials, no national-ID field).
- `200` → `data: { sessionId, subjectProfileId, subjectDisplayName, actorUserId, consentMethod, startedAt }`
- `403` → subject outside the penyuluh's assignment areas, or caller not penyuluh.
- `400` → both or neither of `subjectProfileId`/`newProfile` provided.

### POST `apps/assisted/end` (Bearer, penyuluh only)

Body: `{ "sessionId": string }`

- `200` → `data: { sessionId, endedAt }`
- `403` → session not owned by the caller (or already ended → `400`).

Every assisted action is stamped server-side with actor + subject + consent
method + timestamp (audit; `assisted_sessions` row).

## Roles → FE behavior

| Role | Home | Menu config |
|---|---|---|
| `petani` | Periksa Tanaman + Riwayat tiles | `PETANI_MENU` |
| `penyuluh` | Antrean review + Dampingi Petani | `PENYULUH_MENU` |
| `admin` | Kelola pengguna/konfigurasi tiles | `ADMIN_MENU` |
| `domain_reviewer` | Kelola pengetahuan tiles | `DOMAIN_REVIEWER_MENU` |

Wrong-role navigation → redirect to own home (no error page).
