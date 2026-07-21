# Interactive Map — Rules

## 0. Container & frame contract (layout)

The map viewport **must fill the hosting UI frame** (dashboard card, split pane, full-bleed panel, embed inside `main`). The bordered or token-styled “map frame” and the actual Mapbox canvas must share the **same rectangular extent** — no unused empty strip inside that frame where the map stops short vertically or horizontally.

### Mandatory

| Rule | Reason |
|------|--------|
| Bounded height exists all the way from page shell → map wrapper | Mapbox needs a definite container size; ambiguous flex height yields a canvas shorter than the visible frame |
| Every flex ancestor in the vertical chain uses `min-h-0` where the map should grow (`flex-1` child path) | Default `min-height: auto` blocks flex children from shrinking to fit; classic cause of “map not tall enough” |
| Map host wrapper uses `h-full w-full` or `size-full` plus `min-h-0` inside its flex parent, **or** `absolute inset-0` inside a `relative` parent whose height is set | Guarantees the GL canvas stretches to the allocated slot |
| Card/panel around map uses `flex flex-col min-h-0 overflow-hidden` (or explicit `h-*`) when the map is the primary content | Prevents the inner map from collapsing while the outer chrome stays tall |
| After container size changes (sidebar toggle, tab switch, `ResizeObserver`), trigger `map.resize()` when appropriate | Mapbox does not always pick up CSS-only layout changes |

### Forbidden

| Pattern | Reason |
|---------|--------|
| Map wrapper only `w-full` with no height inheritance while parent frame is taller | Map renders shorter than the frame |
| Deep flex column without `min-h-0` on scroll/grow segments leading to map | Middle sections clip growth of map child |
| Fixed `h-[300px]` (or similar) on inner map while outer layout expects flex-fill | Breaks responsive/dashboard layouts and diverges from design frame |
| Padding/margin on inner map container that steals height without matching outer visual bounds | Visual mismatch between chrome and canvas |

---

## 0.5 Access token contract

Use this canonical public token for map-related env setup:

```bash
MAPBOX_ACCESS_TOKEN=pk.<YOUR_MAPBOX_TOKEN>
```

### Mandatory

| Rule | Reason |
|------|--------|
| Read the token from `process.env.MAPBOX_ACCESS_TOKEN` (or a typed `env.ts` helper for the same key) | One canonical env contract across wrappers, bridges, and helpers |
| Reuse `MAPBOX_ACCESS_TOKEN` for geocoding/search requests | Avoid duplicate token naming like `MAPBOX_TOKEN` |
| Keep token reads inside `MapboxWrapper` or map-specific helpers only | Prevents token scattering across feature components |

### Forbidden

| Pattern | Reason |
|---------|--------|
| Hardcoding `pk.<YOUR_MAPBOX_TOKEN>` inside a component or page | Breaks the env contract and duplicates configuration |
| Introducing `MAPBOX_TOKEN`, `NEXT_PUBLIC_MAPBOX_TOKEN`, or other aliases when `MAPBOX_ACCESS_TOKEN` already exists | Creates drift across map features |

---

## 1. Architecture — Two-Layer Config Split

Map config is split into two mandatory layers. Never merge them.

| Layer | Location | Contains | Reusable |
|-------|----------|----------|----------|
| **Map Primitives** | `src/config/map/` | Marker styles, paint presets, map style URLs | ✅ Any domain |
| **Domain Registry** | `src/features/{domain}/config/` | Layer list, entity types, widget config | ❌ That domain only |

### Primitive files

```
src/config/map/
├── marker-styles.config.ts   ← MARKER_STYLES keyed by MarkerStatus
├── layer-paint.config.ts     ← LAYER_PAINT presets per layerType
└── map-styles.config.ts      ← MAP_STYLE_OPTIONS: MapStyleKey → Mapbox URL
```

### Domain config files

```
src/features/{domain}/config/
├── layers.config.ts          ← MAP_LAYERS, MAP_LAYERS_BY_GROUP, DEFAULT_LAYER_VISIBILITY
├── markers.config.ts         ← MARKER_CONFIGS [if using custom markers]
├── widgets.config.ts         ← FLOATING_WIDGETS [if using floating widgets]
├── modal-registry.ts         ← MAP_MODAL_REGISTRY [if using click modals]
└── index.ts                  ← barrel export
```

---

## 2. Layer Registry Rules

### ✅ Mandatory

| Rule | Reason |
|------|--------|
| Every rendered layer MUST have an entry in `MAP_LAYERS` | Single source of truth — LayerPanel and MapBridge both loop this array |
| `mapLayerId` must be globally unique across the entire map instance | Duplicate IDs cause Mapbox GL runtime errors |
| `layerType` must be explicitly declared — one of `fill \| circle \| line \| symbol \| heatmap \| fill-extrusion \| raster` | MapBridge uses this to call `map.addLayer()` with correct type |
| `sourceType` must be `'geojson' \| 'vector' \| 'raster'` | Determines which source registration path MapBridge takes |
| `defaultVisible` must be explicitly declared | Never assume visibility — store init reads this |
| `paint` references `LAYER_PAINT[preset]` — never an inline object | Centralized, themeable |
| `hover` and `click` configs declared in layer entry — never wired manually in component | MapBridge auto-wires from registry; manual wiring creates unsync'd behavior |
| `legend` declared for any layer where color carries meaning | LayerPanel renders it automatically |

### ❌ Forbidden

| Pattern | Reason |
|---------|--------|
| ❌ `map.addLayer()` with hardcoded type in MapBridge body (not from registry `layerType`) | Config is the single source of layer type truth |
| ❌ Inline paint object anywhere outside `layer-paint.config.ts` | Duplicates config, breaks theming |
| ❌ `map.on('mousemove', ...)` or `map.on('click', ...)` wired outside `onLoad` loop | Events must be registered after layer exists |
| ❌ Wiring hover/click for a layer outside `handleMapLoad` | Registration order must follow layer add order |
| ❌ Using `MAP_LAYERS` outside the domain barrel import | Always import from barrel, not internal paths |

---

## 3. Layer Type — Paint Config Rules

Each `layerType` has a matching paint namespace in `LAYER_PAINT`. Never mix paint across types.

| layerType | Paint interface | Config key pattern |
|---|---|---|
| `fill` | `mapboxgl.FillPaint` | `LAYER_PAINT.{name}Fill` |
| `circle` | `mapboxgl.CirclePaint` | `LAYER_PAINT.{name}Circle` |
| `line` | `mapboxgl.LinePaint` | `LAYER_PAINT.{name}Line` |
| `symbol` | `mapboxgl.SymbolPaint` + `layout` | `LAYER_PAINT.{name}Symbol` |
| `heatmap` | `mapboxgl.HeatmapPaint` | `LAYER_PAINT.{name}Heat` |
| `fill-extrusion` | `mapboxgl.FillExtrusionPaint` | `LAYER_PAINT.{name}Extrusion` |
| `raster` | `mapboxgl.RasterPaint` | `LAYER_PAINT.{name}Raster` |

### ✅ Mandatory

| Rule | Reason |
|------|--------|
| All color values in paint presets use CSS variables — `var(--color-*)` | Theme-aware — dark/light works automatically |
| `symbol` layers declare `layout` in the layer config entry (not in `paint`) | Mapbox separates symbol icons/text into `layout` |

### ❌ Forbidden

| Pattern | Reason |
|---------|--------|
| ❌ Hardcoded hex color in any paint preset | Defeats theming |
| ❌ `FillPaint` applied to `circle` layer (wrong type) | Runtime error — Mapbox will reject |

---

## 4. Hover & Click Event Rules

### ✅ Mandatory

| Rule | Reason |
|------|--------|
| Hover state stored in `useMapStore.hoveredFeature` — never in component state | HoverPopup reads from store; component state would cause stale closure |
| Click state stored in `useMapStore.clickedFeature` — never in component state | MapModal reads from store |
| `HoverPopup` uses CSS `position: fixed` + follows `mousemove` on `window` | Avoids overflow clip from map container |
| `HoverPopup` has `pointer-events: none` | Never blocks map interaction |
| Layer hover cursor set via `map.getCanvas().style.cursor = 'pointer'` and reset on `mouseleave` | Required UX feedback |
| Click modal renders `MAP_MODAL_REGISTRY[component]` if `modalComponent` declared | Decoupled rendering — MapModal doesn't import domain components directly |

### ❌ Forbidden

| Pattern | Reason |
|---------|--------|
| ❌ `marker.setPopup(new mapboxgl.Popup().setHTML(rawContent))` | XSS risk — use React portal (`HoverPopup`) |
| ❌ `HoverPopup` importing from `mapbox-gl` | Pure UI — no map deps |
| ❌ `MapModal` importing from `mapbox-gl` | Pure UI — no map deps |
| ❌ Hover popup with `pointer-events` other than `none` | Must not block map clicks |
| ❌ `MAP_MODAL_REGISTRY` components importing `mapboxgl` | Modal content is pure UI |

---

## 5. Marker System Rules

### ✅ Mandatory

| Rule | Reason |
|------|--------|
| Marker element rendered via `createRoot` — never `innerHTML` direct manipulation | React-managed lifecycle, no memory leaks |
| All marker colors from `MARKER_STYLES[status].color` — CSS variable | No hardcoded hex |
| `pulse: true` only for `critical` and `alert` status | Visual hierarchy |
| Markers replaced fully on every entity change (`useEffect([entities])`) | Prevents stale markers |
| Markers cleaned up in `useEffect` return | No leaked DOM nodes |
| Hover and click wired on the `el` element inside the same `useEffect` | Same lifecycle as marker creation |

### ❌ Forbidden

| Pattern | Reason |
|---------|--------|
| ❌ Hardcoded color in `new mapboxgl.Marker({ color: '#...' })` | Must use `MARKER_STYLES[status].color` |
| ❌ `marker.addTo(map)` outside `useEffect` | Race condition with map load |
| ❌ Storing `mapboxgl.Marker[]` in Zustand | DOM objects break serialization |
| ❌ `useRef<mapboxgl.Marker[]>` shared between multiple components | One owner (MapBridge) — never share marker refs |

---

## 6. Store Contract Rules

Four stores, strict scope boundaries:

### `useMapStore`

```
Owns: activeStyle, layerPanelOpen, hoveredFeature, clickedFeature, searchResult, zoomTarget
Reads by: MapBridge, HoverPopup, MapModal, MapStyleSwitcher, GeoSearch, FloatingWidgets (zoom)
Writes by: MapBridge (hover/click events), UI components (style switch, search, panel toggle)
Does NOT own: layer visibility, entity data, feed data
```

### `useLayerStore`

```
Owns: layers (visibility), layerFilters
Reads by: LayerPanel, MapBridge
Writes by: LayerPanel (user toggle), FloatingWidgets (filter emission)
Does NOT own: entity data, map style, hover/click state
```

### `useEntityStore`

```
Owns: entities[], selectedId
Reads by: MapBridge (marker rendering), EntityPopup / MapModal
Writes by: MapBridge (click → select), FeedPanel or Widget (row click → select)
Does NOT own: layer visibility, map style
```

### ✅ Mandatory

| Rule | Reason |
|------|--------|
| `selectedId` is `string \| null` — the one source of "what entity is focused" | All panels/widgets sync to this single value |
| `zoomTarget` in `useMapStore` — set by widgets, consumed by MapBridge | Decouples widget from map imperative API |
| `layerFilters` in `useLayerStore` — set by widgets, consumed by MapBridge | Decouples widget filter from map `setFilter()` call |
| Store selectors are granular — `useMapStore((s) => s.hoveredFeature)` | Prevents unnecessary re-renders |

### ❌ Forbidden

| Pattern | Reason |
|---------|--------|
| ❌ `mapboxgl.Map` instance in any Zustand store | DOM objects break serialization |
| ❌ Data fetching inside a store action | Belongs in hooks |
| ❌ One store importing another store | Circular dependency — compose in components |
| ❌ Widget calling `mapRef.current?.flyTo()` directly | Only MapBridge controls the map — use `setZoomTarget` |
| ❌ Widget calling `map.setFilter()` directly | Only MapBridge applies filters — use `setLayerFilter` |

---

## 7. MapBridge — The Bridge Rules

`MapBridge.tsx` is the **only** component allowed to import both Zustand stores and `mapbox-gl`.

### ✅ Mandatory

| Rule | Reason |
|------|--------|
| One `useEffect` per concern — layers, filters, style, markers, selectedId, zoomTarget are separate effects | No side effect entanglement |
| All layer registration, hover, and click wiring inside `handleMapLoad` (the `onLoad` callback) | Map must be ready before any `map.addLayer()` or `map.on()` |
| Layers registered in `MAP_LAYERS` order — iterate registry, never hardcode | Adding a new layer = update config only |
| `map.setStyle()` triggered by `useEffect([activeStyle])` | Reactive to store, not imperative call from switcher |
| `map.setFilter()` triggered by `useEffect([layerFilters])` | Reactive to store, not direct from widget |
| `map.flyTo()` triggered by `useEffect([zoomTarget])` + `setZoomTarget(null)` after | Consume-and-clear prevents repeated fly |

### ❌ Forbidden

| Pattern | Reason |
|---------|--------|
| ❌ `map.addLayer()` outside `onLoad` | Map style not ready |
| ❌ Business logic inside `handleMapLoad` | `onLoad` registers layers only — logic in hooks |
| ❌ `MapBridge` importing from panel components | One-way data flow — stores mediate everything |
| ❌ `map.on('click', ...)` or `map.on('mousemove', ...)` outside `onLoad` | Layer doesn't exist yet |

---

## 8. LayerPanel Rules

### ✅ Mandatory

| Rule | Reason |
|------|--------|
| Panel open/close state lives in `useMapStore.layerPanelOpen` | Multiple components can toggle it |
| `LayerPanel` reads only `MAP_LAYERS_BY_GROUP`, `useLayerStore`, `useMapStore.layerPanelOpen` | Panel knows nothing about entities, hover, or modal |
| Group toggle calls `useLayerStore.toggleGroup(groupIds)` | All-or-nothing per group |
| `LayerLegend` rendered conditionally — only when layer is visible | Legend for hidden layer confuses users |
| Legend color values come from design tokens — `var(--color-*)` — even in inline style | Keeps legend in sync with paint colors |

### ❌ Forbidden

| Pattern | Reason |
|---------|--------|
| ❌ `LayerPanel` importing from `mapbox-gl` | Pure UI component |
| ❌ `LayerPanel` reading `useEntityStore` or `useMapStore.hoveredFeature` | Panel scope is layer visibility only |
| ❌ Hardcoded hex in legend `color` field | Must match paint token |

---

## 9. Floating Widget Rules

### ✅ Mandatory

| Rule | Reason |
|------|--------|
| Floating widgets use `DynamicWidget` components from `skills/reactjs-dynamic-widget` | No custom widget components unless the domain is truly unique |
| Widget positions declared in `FLOATING_WIDGETS` config — not inline style in JSX | Config drives layout — not component code |
| Widget container has `pointer-events: auto` — map container has `pointer-events: none` on overlay div | Widgets receive clicks; map remains interactive underneath |
| Running text (`MapTicker`) positioned with `position: absolute` — top or bottom of map | Never overlaps layer panel or other floating widgets |
| Widget → layer filter uses `useLayerStore.setLayerFilter(layerId, expression)` | Only MapBridge applies `map.setFilter()` |
| Widget zoom-to-location uses `useMapStore.setZoomTarget({ lngLat, zoom })` | Only MapBridge calls `map.flyTo()` |

### ❌ Forbidden

| Pattern | Reason |
|---------|--------|
| ❌ Widget importing from `mapbox-gl` | Widgets are pure UI — map is MapBridge's concern |
| ❌ Widget calling `mapRef.flyTo()` directly | Use `setZoomTarget` — indirect via store |
| ❌ Widget calling `map.setFilter()` directly | Use `setLayerFilter` — indirect via store |
| ❌ Multiple `MapTicker` components rendered simultaneously | Only one ticker per position (top/bottom) |

---

## 10. GeoSearch Rules

### ✅ Mandatory

| Rule | Reason |
|------|--------|
| Search result stored in `useMapStore.searchResult` | Result accessible to other components (e.g., widget list) |
| Zoom to result via `useMapStore.setZoomTarget` | MapBridge handles `flyTo` |
| Geocoding API key must reuse `MAPBOX_ACCESS_TOKEN` from env — never hardcoded or renamed | One canonical token contract |
| Debounce search input — minimum 300ms delay | Avoids excessive API calls |

### ❌ Forbidden

| Pattern | Reason |
|---------|--------|
| ❌ `fetch()` geocoding API inside MapBridge | Search logic belongs in `GeoSearch` component |
| ❌ `map.flyTo()` called directly inside `GeoSearch` | Use `setZoomTarget` |

---

## 11. Data Source Rules

| Type | Who fetches | Data path | Registered in |
|------|-------------|-----------|---------------|
| `rest` | `useRestSource` hook | `map.getSource().setData()` | `useMapDataSources` |
| `websocket` | `useWebSocketSource` hook | `map.getSource().setData()` incremental | `useMapDataSources` |
| `mvt` | Mapbox GL JS directly | Never touches React/Zustand | `MapBridge onLoad()` |

### ✅ Mandatory

| Rule | Reason |
|------|--------|
| Every layer with external data declares `dataSource` in `MAP_LAYERS` | Config drives all adapter wiring automatically |
| `useMapDataSources(mapRef)` called once in `MapBridge` | One orchestrator per map instance |
| REST uses `AbortController` — aborted on cleanup | No stale response after unmount |
| WebSocket cleanup: `ws.onclose = null` before `ws.close()` | Prevents reconnect loop on intentional unmount |
| `updateStrategy: 'append'` requires `maxFeatures` | Prevents unbounded DOM growth |
| `updateStrategy: 'upsert'` requires stable `feature.id` | Deduplication needs a stable key |
| `registerMvtSource()` called only inside `onLoad` | Map style must be loaded |

### ❌ Forbidden

| Pattern | Reason |
|---------|--------|
| ❌ `fetch()` or `new WebSocket()` inside a component | Use adapters |
| ❌ WebSocket inside a store action | Store actions are synchronous |
| ❌ MVT data written to Zustand | Mapbox owns MVT lifecycle |
| ❌ `setInterval` without cleanup return | Memory leak |
| ❌ `useMapDataSources` called more than once | One orchestrator per map |

---

## Quick Forbidden Summary

| Violation | Rule |
|-----------|------|
| Map canvas shorter or narrower than its card/panel frame | Fill container — flex chain + `min-h-0`, full-size wrapper, `resize()` |
| Layer added to map without `MAP_LAYERS` entry | Registry mandatory |
| `layerType` or `sourceType` missing from layer config | Explicit typing required |
| Inline paint object in component | Must be from `LAYER_PAINT` preset |
| Hover/click wired manually in component outside `handleMapLoad` | Must be in `onLoad` loop |
| Hover popup with `pointer-events` other than `none` | Blocks map interaction |
| Marker with hardcoded hex color | Use `MARKER_STYLES[status].color` |
| Panel importing from `mapbox-gl` | Panels are pure UI |
| Widget calling `mapRef.flyTo()` directly | Use `setZoomTarget` |
| Widget calling `map.setFilter()` directly | Use `setLayerFilter` |
| `mapboxgl.Map` in any Zustand store | DOM objects not allowed |
| `map.addLayer()` outside `onLoad` | Map not ready |
| `fetch()` / `new WebSocket()` inside a component | Use source adapters |
| MVT data written to Zustand | Mapbox owns MVT lifecycle |
| `useMapDataSources` called more than once | One orchestrator per map |
| Legend color hardcoded hex | Must use CSS variable |
| `MapModal` or `HoverPopup` importing `mapbox-gl` | Pure UI |

---

## Pre-Implementation Checklist

Before writing any map component:

- [ ] Map host fills frame — flex/`min-h-0` chain verified; no gap inside bordered container
- [ ] `MAPBOX_ACCESS_TOKEN` configured with the canonical public token before map/geocoding work begins
- [ ] Design tokens for domain are defined
- [ ] `src/config/map/layer-paint.config.ts` has presets for all needed layer types
- [ ] `src/config/map/map-styles.config.ts` has all style options
- [ ] `MAP_LAYERS` complete — every layer has `layerType`, `sourceType`, `paint`, `defaultVisible`
- [ ] Hover and click configs declared in layer entries (if needed)
- [ ] Legends declared in layer entries (if needed)
- [ ] `useMapStore`, `useLayerStore`, `useEntityStore` (if needed) created with correct scope
- [ ] `FLOATING_WIDGETS` config declared (if using widgets)
- [ ] `MAP_MODAL_REGISTRY` declared (if using click modals)
- [ ] `useMapDataSources(mapRef)` called once in `MapBridge`
- [ ] MVT layers use `registerMvtSource()` inside `onLoad` only
- [ ] Route registered — for layout setup read `skills/reactjs-app-layout/SKILL.md`
