# API Spec — Siaga Padi (Sprint 02: Case Management)

Source of truth for the Sprint 02 FE ↔ BE contract (cases, lahan, profile,
deletion requests). Transport, auth (Bearer), and the `BaseResponse` envelope
are identical to Sprint 01 — see `api-spec.md`. All failure responses use the
top-level failure envelope with Indonesian `metaData.message`.

## Status model (IMPORTANT)

- `status` carries the **canonical FRD §6.5 value** (English, uppercase):
  `DRAFT | CAPTURED | QUALITY_REJECTED | QUEUED | PROCESSING_CV | NEEDS_CONTEXT |
  GENERATING_RECOMMENDATION | AUTO_TRIAGE_READY | NEEDS_REVIEW | REVISION_REQUIRED |
  REVIEWED | CLOSED | FAILED | ARCHIVED | CANCELLED`.
- `displayStage` carries the petani-facing Indonesian stage derived server-side:
  `draf | difoto | diproses | hasil_siap | direview | revisi | selesai | dibatalkan`.
- FE renders `displayStage` (labels/filters); `status` drives the staged-progress
  view and is what Sprint 03/05/06 will extend. Transitions follow FRD §6.5–6.6
  strictly — enforced by DB trigger + `models/siaga_case.py` (BE single source).

## Shared types

```ts
type GrowthStage = 'SEEDLING' | 'VEGETATIVE' | 'REPRODUCTIVE' | 'RIPENING' | 'UNKNOWN';
type LocationMode = 'EXACT_GPS' | 'AREA_ONLY' | 'NONE';
type DisplayStage = 'draf' | 'difoto' | 'diproses' | 'hasil_siap' | 'direview' | 'revisi' | 'selesai' | 'dibatalkan';

interface FieldOut {
  fieldId: string;
  ownerProfileId: string;
  name: string;                    // 2–100 chars, free naming
  areaKabupaten: string | null;
  areaKecamatan: string | null;
  coords: { lat: number; lng: number } | null;  // opt-in only
  lastGrowthStage: GrowthStage | null;          // gallery card extra
  caseCount: number | null;                     // gallery card extra
  createdAt: string; updatedAt: string;
}

interface CaseOut {
  caseId: string;
  caseCode: string;                // 'KS-YYYY-NNNNNN'
  ownerProfileId: string;
  ownerDisplayName: string | null;
  createdByProfileId: string;      // ≠ owner when assisted
  createdByDisplayName: string | null;
  assistedSessionId: string | null;
  fieldId: string | null;          // null on "belum tahu" cases
  fieldName: string | null;
  growthStage: GrowthStage;
  locationMode: LocationMode;
  areaKabupaten: string | null;
  areaKecamatan: string | null;
  status: string;                  // canonical FRD value
  displayStage: DisplayStage;
  notes: string | null;            // ≤500 chars
  observedAt: string;              // ISO 8601, not far-future
  createdAt: string; updatedAt: string;
}

interface CaseEventOut {
  eventId: string;
  caseId: string;
  fromStatus: string | null;       // null = creation event
  toStatus: string;
  toDisplayStage: DisplayStage;
  actorProfileId: string | null;
  actorDisplayName: string | null;
  note: string | null;
  createdAt: string;
}

interface DeletionRequestOut {
  requestId: string;
  profileId: string;
  reason: string | null;
  status: 'tercatat' | 'diproses' | 'selesai' | 'ditolak';
  requestedAt: string;
  processedAt: string | null;
}
```

## Case endpoints (`router/cases.py` → prefix `/cases`, FE `apps/cases/*`)

### POST `apps/cases` (Bearer; petani, or penyuluh in assisted mode — enforced)

Role rule is enforced server-side: a petani creates their own case; a penyuluh
may create ONLY with a valid open `assistedSessionId`; any other role (or a
penyuluh without a session) → **403**. Cases always belong to a farmer.

**Header `Idempotency-Key: <uuid>` is REQUIRED.** Replaying the same key
returns the SAME case (HTTP 200, `replayed: true`) — never a duplicate
(FR-002 ERR-003). Missing header → 400.

Body (camelCase):

```json
{
  "fieldId": "…",                          // pick existing lahan …
  "newField": { "name": "…", "areaKabupaten": "…", "areaKecamatan": "…" },  // … OR create inline
  "locationMode": "EXACT_GPS" | "AREA_ONLY" | "NONE",
  "coords": { "lat": -6.2, "lng": 107.1 },  // only with EXACT_GPS (opt-in)
  "areaKabupaten": "…", "areaKecamatan": "…",  // required for AREA_ONLY; optional otherwise
  "growthStage": "VEGETATIVE",
  "observedAt": "2026-07-26T08:40:00+07:00",
  "notes": "…",                             // optional, ≤500
  "assistedSessionId": "…"                  // penyuluh assisted mode only
}
```

Rules:
- `fieldId` and `newField` are mutually exclusive; BOTH absent is allowed only
  with `locationMode: "NONE"` ("belum tahu" — case carries area/none, no lahan)
  or `"AREA_ONLY"` with area fields. GPS refusal NEVER blocks creation.
- `coords` must be finite and within lat ±90 / lng ±180 → else 400.
- Minimum valid case: owner (from token / assisted subject) + (field OR area OR
  mode NONE) + `growthStage` + `observedAt` (≤ now + 10 min skew).
- Assisted: `assistedSessionId` must be an OPEN session owned by the calling
  penyuluh; case `owner = session subject`, `createdBy = penyuluh profile`.
  Invalid/closed/foreign session → 403.
- Created case: `status: "DRAFT"`, one creation event in the timeline
  (`fromStatus: null → "DRAFT"`, actor = creator).

Responses: `200` → `data: { case: CaseOut, replayed: boolean }` · `400`
validation (incl. an Idempotency-Key already used by a DIFFERENT creator —
generic message, never confirms the other case) · `403` role/assisted scope.

**Offline (FR-014):** this endpoint carries the service-worker queue marker.
When the device is offline (or the API is unreachable) the worker stores the
draft and answers **HTTP 202** with `data: { queued: true, idempotencyKey }` —
no case exists yet, and the FE must present this as "draft tersimpan, terkirim
saat online", never as a failure. Queued replays are re-signed with a fresh
bearer token at delivery time (tokens are never persisted in the queue).

### POST `apps/cases/get-all` (Bearer)

Boilerplate list convention (POST + FindDTO, never GET):

```json
{ "page": 1, "limit": 10,
  "filters": { "fieldId": "…", "displayStage": "diproses", "status": "QUEUED",
               "dateFrom": "2026-07-01", "dateTo": "2026-07-26" } }
```

- All filters optional; `displayStage` expands server-side to its status set.
- Petani sees ONLY own cases (incl. assisted-created for them). Penyuluh sees
  binaan-area cases. Admin/domain_reviewer see all. Scoping is server-side.
- `200` → `data: CaseOut[]`, `metaData.pagination` filled with the boilerplate
  shape `{ size, totalElements, totalPages, scrollId }` (matches the FE
  `ApiPagination` type).

### GET `apps/cases/{id}` (Bearer)

`200` → `data: CaseOut`. Case not visible to the caller → **404** (identical
body whether the case exists or not — no enumeration).

### GET `apps/cases/{id}/timeline` (Bearer)

`200` → `data: CaseEventOut[]` ascending by `createdAt`. Same 404 rule.

## Profile & lahan endpoints (`router/farmer_profile.py` → prefix `/farmer/profile`, FE `apps/farmer/profile/*`)

### PUT `apps/farmer/profile` (Bearer)

Update OWN profile: `{ displayName?, areaKabupaten?, areaKecamatan?,
researchConsent?, locationConsent? }` → `200` `data: SiagaProfile` (Sprint 01
type). No role/account-status changes here (admin territory, Sprint 08).

### POST `apps/farmer/profile/fields` (Bearer)

Create lahan: `{ name, areaKabupaten?, areaKecamatan?, coords?,
assistedSessionId? }` → `200` `data: FieldOut`. With `assistedSessionId`
(penyuluh): owner = session subject; else owner = caller. Name 2–100 chars.

### PUT `apps/farmer/profile/fields` (Bearer)

Update own lahan (or subject's, assisted): `{ fieldId, name?, areaKabupaten?,
areaKecamatan?, coords? }` → `200` `data: FieldOut` · `404` not owner (same
no-enumeration rule). No lahan delete in MVP (brief: tambah/ubah only).

### POST `apps/farmer/profile/fields/get-all` (Bearer)

`{ page?, limit? }` → `200` `data: FieldOut[]` (own lahan; each card carries
`lastGrowthStage` + `caseCount`), `metaData.pagination` filled.

### POST `apps/farmer/profile/deletion-request` (Bearer)

`{ reason? }` → `200` `data: DeletionRequestOut` with `status: "tercatat"`.
Recorded per retention policy — NOT an instant wipe; copy must say so honestly.

### GET `apps/farmer/profile/deletion-request` (Bearer)

Latest own request → `200` `data: DeletionRequestOut | null`.

## Staged progress (FE, brief §10.2)

Driven by canonical `status`, refreshed on open:

| Stage label (ID) | Done when status ≥ | Running when status = |
|---|---|---|
| Foto diterima | CAPTURED passed | CAPTURED/QUALITY_REJECTED |
| Analisis gambar | NEEDS_CONTEXT reached | QUEUED/PROCESSING_CV |
| Pertanyaan lanjutan | GENERATING_RECOMMENDATION reached | NEEDS_CONTEXT |
| Rekomendasi | AUTO_TRIAGE_READY/NEEDS_REVIEW reached | GENERATING_RECOMMENDATION |

`FAILED` shows an honest "sedang diproses ulang" note, never an endless spinner.
