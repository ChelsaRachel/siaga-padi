---
name: reactjs-tactical-map
description: Tactical command center map — domain override on top of the generic map skill. Covers tactical-specific layer groups, incident types, sensor stores, and the TacticalMap bridge. Read `skills/reactjs-map/SKILL.md` first for the base pattern.
---

# Skill — Tactical Map (Domain Override)

**Base skill:** `skills/reactjs-map/SKILL.md` — read this first. This file only documents what is different for the tactical domain.

**Layout:** Tactical maps follow the same **container / frame** rules as the generic map skill — the map canvas must fill the hosting panel (flex `min-h-0` chain, full-size wrapper). See `skills/reactjs-map/SKILL.md` § Layout and `references/map-rules.md` § Container & frame contract.

**Access token:** Tactical maps inherit the same canonical env contract from `skills/reactjs-map/SKILL.md` — use `MAPBOX_ACCESS_TOKEN=pk.<YOUR_MAPBOX_TOKEN>`.

---

## Tactical Domain Terminology Mapping

| Generic term          | Tactical name                                                        |
| --------------------- | -------------------------------------------------------------------- |
| `{domain}`            | `tactical`                                                           |
| `{Entity}`            | `Incident`                                                           |
| `{Feed}`              | `SensorReading`                                                      |
| `MAP_LAYERS`          | `TACTICAL_LAYERS`                                                    |
| `ENTITY_TYPES`        | `INCIDENT_TYPES`                                                     |
| `MapBridge`           | `TacticalMap`                                                        |
| `useEntityStore`      | `useIncidentStore`                                                   |
| `useFeedStore`        | `useSensorStore`                                                     |
| `LayerGroup` values   | `'INSIDEN' \| 'ANALISIS' \| 'RESPONS' \| 'INFRASTRUKTUR' \| 'COMMS'` |
| `MarkerStatus` values | `'critical' \| 'alert' \| 'normal' \| 'info' \| 'offline'`           |

---

## File Reference (Tactical)

```
src/
├── types/map.d.ts
├── config/map/
│   ├── marker-styles.config.ts
│   └── layer-paint.config.ts
└── features/tactical/
    ├── index.ts
    ├── config/
    │   ├── layers.config.ts           ← TACTICAL_LAYERS, BY_GROUP, DEFAULT_VISIBILITY
    │   └── incident-types.config.ts   ← INCIDENT_TYPES
    └── types/
        └── tactical.types.ts
```

---

## Tactical-Specific: Layer Groups

```ts
// tactical.types.ts
export type LayerGroup =
  | "INSIDEN"
  | "ANALISIS"
  | "RESPONS"
  | "INFRASTRUKTUR"
  | "COMMS";
```

Panel render order:

```ts
const GROUP_ORDER: LayerGroup[] = [
  "INSIDEN",
  "ANALISIS",
  "RESPONS",
  "INFRASTRUKTUR",
  "COMMS",
];
```

---

## Tactical-Specific: Adding a Layer

Follow the generic pattern in `skills/reactjs-map/SKILL.md` §1, substituting tactical names.

Example for a radiation zone layer:

```ts
// layer-paint.config.ts
radiationZone: {
  type: 'fill' as const,
  paint: {
    'fill-color': 'var(--color-error-500)',
    'fill-opacity': 0.18,
    'fill-outline-color': 'var(--color-error-500)',
  },
},
```

```ts
// layers.config.ts — inside TACTICAL_LAYERS array
{
  id: 'RADIATION_ZONE',
  label: 'Zona Radiasi',
  group: 'ANALISIS' as LayerGroup,
  icon: 'radioactive',
  defaultVisible: false,
  mapLayerId: 'layer-radiation-zone',
  paint: LAYER_PAINT.radiationZone.paint,
  isGeoJson: true,
},
```

```ts
// tactical.types.ts
export type LayerId =
  | "INCIDENT_MARKERS"
  | "RADIATION_ZONE" // ← add here
  | (string & {});
```

---

## Tactical-Specific: Adding an Incident Type

Follow the generic pattern in `skills/reactjs-map/SKILL.md` §2, substituting tactical names.

```ts
// tactical.types.ts
export type IncidentType = "CHEMICAL_LEAK" | "FLOOD_CONTAMINATION"; // ← add here
```

```ts
// incident-types.config.ts
FLOOD_CONTAMINATION: {
  label: 'Kontaminasi Banjir',
  markerStyle: MARKER_STYLES.alert,
  severity: 'alert',
  icon: 'drop-half-fill',
},
```

---

## Tactical-Specific: Store Names

Apply the generic store patterns from `skills/reactjs-map/SKILL.md` §3 with these names:

- `useEntityStore` → `useIncidentStore` — owns `incidents[]` and `selectedId`
- `useFeedStore` → `useSensorStore` — owns `readings[]`, `feed[]`, `overallStatus`
- `useLayerStore` — unchanged

`useSensorStore` sensor classification:

```ts
function deriveStatus(readings: TSensorReading[]): SensorStatus {
  if (readings.some((r) => r.status === "CRITICAL")) return "CRITICAL";
  if (readings.some((r) => r.status === "ALERT")) return "ALERT";
  if (readings.every((r) => r.status === "OFFLINE")) return "OFFLINE";
  return "NORMAL";
}
```

---

## Tactical-Specific: Design Tokens

Tactical UI uses `design/web/tactical/` tokens — dark-first, semi-transparent panels:

```
var(--color-surface-overlay)   ← panel backgrounds (semi-transparent)
var(--color-error-500)         ← critical severity
var(--color-warning-400)       ← alert severity
```

Rules:

- Never use `fusion` theme tokens inside tactical components
- Monospace font for sensor readings and coordinates
- Panel text opacity minimum 0.7

---

## Tactical TacticalMap — Bridge Component

Named `TacticalMap.tsx` in this domain. Follows all `MapBridge` rules from `skills/reactjs-map/references/map-rules.md` §7.

Additional tactical rule: the data source orchestrator is named `useTacticalDataSources` (not `useMapDataSources`).

```tsx
import { useTacticalDataSources, registerMvtSource } from "@/features/tactical";
// ...same pattern as MapBridge in skills/reactjs-map/SKILL.md §8
```

---

## Definition of Done

Same checklist as `skills/reactjs-map/SKILL.md`, plus:

- [ ] `TacticalMap` named component exported from the correct page parts folder
- [ ] `useTacticalDataSources(mapRef)` called once in `TacticalMap`
- [ ] All incident types in `INCIDENT_TYPES` config
- [ ] `useSensorStore.overallStatus` derived via `deriveStatus()` — never set manually
- [ ] Feed capped at 100 entries in `appendFeed`
- [ ] No `fusion` theme tokens used in any tactical component

> Detailed rules: [references/tactical-map-rules.md](references/tactical-map-rules.md)
> Base pattern: [../reactjs-map/SKILL.md](../reactjs-map/SKILL.md)
