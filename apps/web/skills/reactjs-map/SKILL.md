---
name: reactjs-map
description: Implementation guide for any Mapbox GL JS map analytics interface. Covers the canonical `MAPBOX_ACCESS_TOKEN` env contract, layer system (all types + hover/click/legend), marker system (icon + custom), store architecture, MapBridge pattern, LayerPanel with legend, map style switcher, geo search, floating widgets with dynamic-widget integration, and layer↔widget interactions. For layout shell, read `skills/app-layout/SKILL.md`.
---

# Skill — Interactive Map (Generic)

Read `references/map-rules.md` before writing any map code.

> Domain-specific overrides: `skills/reactjs-tactical-map/SKILL.md`

---

## Access Token Contract

For any map-related env setup, use this canonical public token:

```bash
MAPBOX_ACCESS_TOKEN=pk.<YOUR_MAPBOX_TOKEN>
```

Rules:

1. Read the token from `process.env.MAPBOX_ACCESS_TOKEN` (or a typed `env.ts` helper that resolves the same env key).
2. Keep token reads inside `MapboxWrapper` or map-specific helpers only.
3. Reuse the same `MAPBOX_ACCESS_TOKEN` for geocoding/search calls. Do not introduce alternate names like `MAPBOX_TOKEN`.

---

## Layout — Map must fill its host container / frame

The Mapbox canvas must **match the allocated layout region**: same width **and** height as the card, panel, dashboard slot, or `main` area that is supposed to hold the map. A shorter map inside a taller frame is a **layout bug**.

**Rules (see `references/map-rules.md` § Container & frame contract for detail):**

1. **Establish height on the chain** — Flex parents along the path to the map must allow the child to consume remaining space: use `flex-1 min-h-0` (and `overflow-hidden` or `overflow-auto` on scroll siblings as appropriate). Without `min-h-0`, flex children often refuse to shrink and the map gets an implicit height smaller than the visual frame.
2. **Map slot wrapper** — Wrap `MapboxWrapper` / map root in a box that fills that slot: e.g. `relative min-h-0 flex-1` on the flex child, with an inner `h-full w-full min-h-0` **or** `absolute inset-0` inside a `relative` parent whose height is fully defined.
3. **Do not** rely on Mapbox’s internal default sizing alone when the parent is a flex/grid cell — always tie the map container to `100%` / `size-full` of the bounded parent.
4. **After layout changes** (sidebar collapse, tabs, split pane resize), call `map.resize()` once the container dimensions have updated so the canvas matches the frame.

Verify in DevTools: the map container element’s **computed height** should equal the frame’s content box height (no large empty band below the canvas inside the same bordered region).

---

## File Reference

```
src/
├── types/map.d.ts
├── config/map/
│   ├── marker-styles.config.ts       ← MARKER_STYLES keyed by MarkerStatus
│   ├── layer-paint.config.ts         ← LAYER_PAINT presets per layerType
│   └── map-styles.config.ts          ← MAP_STYLE_OPTIONS (style key → URL)
└── features/{domain}/
    ├── index.ts                      ← barrel export
    ├── config/
    │   ├── layers.config.ts          ← MAP_LAYERS, BY_GROUP, DEFAULT_VISIBILITY
    │   ├── markers.config.ts         ← MARKER_CONFIGS [if using custom markers]
    │   └── widgets.config.ts         ← FLOATING_WIDGETS [if using floating widgets]
    ├── stores/
    │   ├── useMapStore.ts            ← map interaction state (hover, modal, style, search, zoom)
    │   ├── useLayerStore.ts          ← layer visibility + filters
    │   └── useEntityStore.ts         ← entities/markers + selectedId [optional]
    ├── sources/
    │   ├── rest.source.ts
    │   ├── websocket.source.ts
    │   ├── mvt.source.ts
    │   └── index.ts
    ├── hooks/
    │   └── useMapDataSources.ts      ← orchestrator
    └── types/
        └── {domain}.types.ts
```

---

## 1. Layer System

### Layer Config Schema

Every layer in `MAP_LAYERS` must declare this shape:

```ts
// layers.config.ts
export type TMapLayerConfig = {
  id: string                  // app-level unique key
  label: string               // display label in LayerPanel
  group: string               // group key
  icon?: string               // Phosphor icon name (for LayerPanel)
  defaultVisible: boolean
  mapLayerId: string          // globally unique Mapbox GL layer ID
  mapSourceId?: string        // defaults to mapLayerId if omitted
  layerType: TMapLayerType    // see below
  sourceType: 'geojson' | 'vector' | 'raster'
  paint?: object              // from LAYER_PAINT[preset] — never inline
  layout?: object             // Mapbox layout properties (symbol, text, etc.)
  hover?: TLayerHoverConfig   // optional — declare to enable hover popup
  click?: TLayerClickConfig   // optional — declare to enable click modal
  legend?: TLayerLegend       // optional — shown in LayerPanel
  dataSource?: TLayerDataSource
}

export type TMapLayerType = 'fill' | 'circle' | 'line' | 'symbol' | 'heatmap' | 'fill-extrusion' | 'raster'
```

### All Layer Types with Examples

**fill — polygon area**
```ts
{
  id: 'ZONE_FILL',
  label: 'Zone Area',
  group: 'ZONES',
  icon: 'polygon',
  defaultVisible: true,
  mapLayerId: 'layer-zone-fill',
  layerType: 'fill',
  sourceType: 'geojson',
  paint: LAYER_PAINT.zoneFill.paint,
  hover: { enabled: true, popupFields: ['name', 'area_km2'] },
  click: { enabled: true, action: 'modal' },
  legend: { type: 'exact', items: [{ color: 'var(--color-warning-400)', label: 'Restricted' }] },
},
```

**circle — point data**
```ts
{
  id: 'POINT_CIRCLE',
  label: 'Data Points',
  group: 'POINTS',
  icon: 'circle',
  defaultVisible: true,
  mapLayerId: 'layer-point-circle',
  layerType: 'circle',
  sourceType: 'geojson',
  paint: LAYER_PAINT.dataPoint.paint,
  hover: { enabled: true, popupFields: ['id', 'value', 'status'] },
},
```

**line — route / boundary**
```ts
{
  id: 'ROUTE_LINE',
  label: 'Routes',
  group: 'ROUTES',
  icon: 'path',
  defaultVisible: true,
  mapLayerId: 'layer-route-line',
  layerType: 'line',
  sourceType: 'geojson',
  paint: LAYER_PAINT.routeLine.paint,
  legend: { type: 'exact', items: [{ color: 'var(--color-info-400)', label: 'Active Route' }] },
},
```

**symbol — icon/text label**
```ts
{
  id: 'LABEL_SYMBOL',
  label: 'Labels',
  group: 'LABELS',
  icon: 'text-t',
  defaultVisible: false,
  mapLayerId: 'layer-label-symbol',
  layerType: 'symbol',
  sourceType: 'geojson',
  layout: {
    'text-field': ['get', 'name'],
    'text-size': 12,
    'icon-image': ['get', 'icon'],
    'icon-size': 0.8,
  },
  paint: { 'text-color': 'var(--color-text-primary)', 'text-halo-color': 'var(--color-surface-base)', 'text-halo-width': 1 },
},
```

**heatmap**
```ts
{
  id: 'DENSITY_HEATMAP',
  label: 'Density Heat',
  group: 'ANALYTICS',
  icon: 'fire',
  defaultVisible: false,
  mapLayerId: 'layer-density-heatmap',
  layerType: 'heatmap',
  sourceType: 'geojson',
  paint: LAYER_PAINT.densityHeat.paint,
  legend: {
    type: 'range',
    min: 0,
    max: 100,
    colorStops: [
      { value: 0, color: 'rgba(0,0,255,0)' },
      { value: 0.5, color: 'rgba(255,165,0,0.8)' },
      { value: 1, color: 'rgba(255,0,0,1)' },
    ],
  },
},
```

**fill-extrusion — 3D buildings / volumes**
```ts
{
  id: 'BUILDING_3D',
  label: '3D Buildings',
  group: 'INFRASTRUCTURE',
  icon: 'buildings',
  defaultVisible: false,
  mapLayerId: 'layer-building-3d',
  layerType: 'fill-extrusion',
  sourceType: 'vector',
  paint: LAYER_PAINT.building3d.paint,
},
```

### Hover Config

```ts
export type TLayerHoverConfig = {
  enabled: boolean
  popupFields?: string[]    // feature.properties keys to render in hover tooltip
  popupComponent?: string   // custom component name if fields not enough
}
```

MapBridge wires hover automatically when `layer.hover?.enabled === true`.  
Hover state stored in `useMapStore.hoveredFeature` — `HoverPopup` component renders it.

### Click Config

```ts
export type TLayerClickConfig = {
  enabled: boolean
  action: 'modal' | 'flyTo' | 'custom'
  modalComponent?: string   // component name registered in MAP_MODAL_REGISTRY
}
```

Click state stored in `useMapStore.clickedFeature` — `MapModal` reads and renders it.

### Legend Config

```ts
export type TLayerLegend =
  | {
      type: 'exact'
      items: { color: string; label: string; icon?: string }[]
    }
  | {
      type: 'range'
      min: number
      max: number
      unit?: string
      colorStops: { value: number; color: string }[]  // value 0–1 normalized
    }
```

Legend renders at the bottom of each layer item in `LayerPanel`.

---

## 2. Marker System

Markers are for custom HTML/icon elements positioned by coordinate — distinct from GeoJSON layers.

### Marker Config Schema

```ts
// markers.config.ts
export type TMarkerConfig = {
  id: string
  lngLat: [number, number]
  iconName: string               // Phosphor icon name
  status?: MarkerStatus          // drives color from MARKER_STYLES
  customStyle?: Partial<TMarkerStyle>
  hover?: { enabled: boolean; popupFields?: string[] }
  click?: { enabled: boolean; action: 'modal' | 'flyTo' | 'custom' }
  data?: Record<string, unknown>
}
```

### Rendering Markers in MapBridge

```tsx
// one useEffect per concern — see MapBridge section
useEffect(() => {
  const map = mapRef.current?.getMap()
  if (!map) return

  markersRef.current.forEach((m) => m.remove())
  markersRef.current = []

  entities.forEach((entity) => {
    const style = MARKER_STYLES[entity.status ?? 'normal']
    const el = document.createElement('div')
    const root = createRoot(el)

    root.render(
      <div
        className={`map-marker map-marker--${entity.status}`}
        style={{ color: style.color, width: style.size, height: style.size }}
      >
        <i className={`ph-fill ph-${entity.iconName}`} />
        {style.pulse && <span className="map-marker__pulse" />}
      </div>
    )

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat(entity.lngLat)
      .addTo(map)

    // Hover
    if (entity.hover?.enabled) {
      el.addEventListener('mouseenter', () =>
        setHoveredFeature({ type: 'marker', id: entity.id, lngLat: entity.lngLat, data: entity.data ?? {} })
      )
      el.addEventListener('mouseleave', () => setHoveredFeature(null))
    }

    // Click
    if (entity.click?.enabled) {
      el.addEventListener('click', () =>
        openModal({ type: 'marker', id: entity.id, data: entity.data ?? {} })
      )
    }

    markersRef.current.push(marker)
  })

  return () => { markersRef.current.forEach((m) => m.remove()) }
}, [entities])
```

---

## 3. Store Architecture

### `useMapStore.ts` — central map interaction state

```ts
// src/features/{domain}/stores/useMapStore.ts
import { create } from 'zustand'
import type { MapStyleKey, TMapHoverState, TMapClickState, TGeoSearchResult } from '@/types/map'

type TMapStore = {
  // Map style
  activeStyle: MapStyleKey
  setActiveStyle: (key: MapStyleKey) => void

  // Panel
  layerPanelOpen: boolean
  toggleLayerPanel: () => void

  // Hover popup
  hoveredFeature: TMapHoverState | null
  setHoveredFeature: (state: TMapHoverState | null) => void

  // Click modal
  clickedFeature: TMapClickState | null
  openModal: (state: TMapClickState) => void
  closeModal: () => void

  // Geo search
  searchResult: TGeoSearchResult | null
  setSearchResult: (result: TGeoSearchResult | null) => void

  // Zoom target — set by widgets or external code, consumed by MapBridge
  zoomTarget: { lngLat: [number, number]; zoom?: number } | null
  setZoomTarget: (target: { lngLat: [number, number]; zoom?: number } | null) => void
}

export const useMapStore = create<TMapStore>((set) => ({
  activeStyle: 'dark',
  setActiveStyle: (key) => set({ activeStyle: key }),

  layerPanelOpen: true,
  toggleLayerPanel: () => set((s) => ({ layerPanelOpen: !s.layerPanelOpen })),

  hoveredFeature: null,
  setHoveredFeature: (state) => set({ hoveredFeature: state }),

  clickedFeature: null,
  openModal: (state) => set({ clickedFeature: state }),
  closeModal: () => set({ clickedFeature: null }),

  searchResult: null,
  setSearchResult: (result) => set({ searchResult: result }),

  zoomTarget: null,
  setZoomTarget: (target) => set({ zoomTarget: target }),
}))
```

### `useLayerStore.ts` — visibility + filters

```ts
// src/features/{domain}/stores/useLayerStore.ts
import { create } from 'zustand'
import { DEFAULT_LAYER_VISIBILITY } from '@/features/{domain}'
import type { LayerId } from '@/features/{domain}'

type TLayerStore = {
  layers: Record<LayerId, boolean>
  toggleLayer: (id: LayerId) => void
  setLayer: (id: LayerId, visible: boolean) => void
  toggleGroup: (ids: LayerId[]) => void        // check/uncheck all in group
  resetLayers: () => void
  // For widget → layer filter interaction
  layerFilters: Partial<Record<LayerId, unknown[]>>
  setLayerFilter: (id: LayerId, filter: unknown[] | null) => void
}

export const useLayerStore = create<TLayerStore>((set) => ({
  layers: { ...DEFAULT_LAYER_VISIBILITY },
  layerFilters: {},

  toggleLayer: (id) =>
    set((s) => ({ layers: { ...s.layers, [id]: !s.layers[id] } })),

  setLayer: (id, visible) =>
    set((s) => ({ layers: { ...s.layers, [id]: visible } })),

  toggleGroup: (ids) =>
    set((s) => {
      const anyVisible = ids.some((id) => s.layers[id])
      const next = { ...s.layers }
      ids.forEach((id) => { next[id] = !anyVisible })
      return { layers: next }
    }),

  resetLayers: () =>
    set({ layers: { ...DEFAULT_LAYER_VISIBILITY } }),

  setLayerFilter: (id, filter) =>
    set((s) => ({
      layerFilters: { ...s.layerFilters, [id]: filter ?? undefined },
    })),
}))
```

### `useEntityStore.ts` — entities on map [optional]

```ts
// src/features/{domain}/stores/useEntityStore.ts
import { create } from 'zustand'
import type { TEntity } from '@/features/{domain}'

type TEntityStore = {
  entities: TEntity[]
  selectedId: string | null
  setEntities: (data: TEntity[]) => void
  select: (id: string | null) => void
}

export const useEntityStore = create<TEntityStore>((set) => ({
  entities: [],
  selectedId: null,
  setEntities: (data) => set({ entities: data }),
  select: (id) => set({ selectedId: id }),
}))
```

---

## 4. MapBridge — The Bridge Component

The only component allowed to import both Zustand stores and `mapbox-gl`.

```tsx
// src/pages/{page}/parts/MapBridge.tsx
import { useRef, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { MapboxWrapper } from '@/components/wrappers/MapboxWrapper'
import type { MapboxWrapperRef } from '@/components/wrappers/MapboxWrapper'
import { MAP_LAYERS } from '@/features/{domain}'
import { MARKER_STYLES } from '@/config/map/marker-styles.config'
import { useLayerStore } from '@/features/{domain}/stores/useLayerStore'
import { useEntityStore } from '@/features/{domain}/stores/useEntityStore'
import { useMapStore } from '@/features/{domain}/stores/useMapStore'
import { useMapDataSources } from '@/features/{domain}/hooks/useMapDataSources'
import { registerMvtSource } from '@/features/{domain}/sources'
import { isMvtSource } from '@/types/map'
import mapboxgl from 'mapbox-gl'

export function MapBridge() {
  const mapRef = useRef<MapboxWrapperRef>(null)

  const layers = useLayerStore((s) => s.layers)
  const layerFilters = useLayerStore((s) => s.layerFilters)
  const entities = useEntityStore((s) => s.entities)
  const selectedId = useEntityStore((s) => s.selectedId)
  const select = useEntityStore((s) => s.select)
  const { activeStyle, setHoveredFeature, openModal, zoomTarget, setZoomTarget } = useMapStore()
  const markersRef = useRef<mapboxgl.Marker[]>([])

  useMapDataSources(mapRef)

  // ── Layer visibility ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map?.isStyleLoaded()) return
    MAP_LAYERS.forEach(({ mapLayerId }) => {
      map.setLayoutProperty(mapLayerId, 'visibility', layers[mapLayerId as keyof typeof layers] !== false ? 'visible' : 'none')
    })
  }, [layers])

  // ── Layer filters (from widgets) ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map?.isStyleLoaded()) return
    Object.entries(layerFilters).forEach(([layerId, filter]) => {
      if (map.getLayer(layerId)) {
        map.setFilter(layerId, filter ?? null)
      }
    })
  }, [layerFilters])

  // ── Map style change ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    const styleUrl = MAP_STYLE_OPTIONS[activeStyle]
    map.setStyle(styleUrl)
  }, [activeStyle])

  // ── Entity markers ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    entities.forEach((entity) => {
      const style = MARKER_STYLES[entity.status ?? 'normal']
      const el = document.createElement('div')
      const root = createRoot(el)
      root.render(
        <div className={`map-marker map-marker--${entity.status}`} style={{ color: style.color, width: style.size, height: style.size }}>
          <i className={`ph-fill ph-${entity.iconName ?? 'map-pin'}`} />
          {style.pulse && <span className="map-marker__pulse" />}
        </div>
      )
      const marker = new mapboxgl.Marker({ element: el }).setLngLat(entity.lngLat).addTo(map)
      if (entity.hover?.enabled) {
        el.addEventListener('mouseenter', () => setHoveredFeature({ type: 'marker', id: entity.id, lngLat: entity.lngLat, data: entity.data ?? {} }))
        el.addEventListener('mouseleave', () => setHoveredFeature(null))
      }
      if (entity.click?.enabled) {
        el.addEventListener('click', () => openModal({ type: 'marker', id: entity.id, data: entity.data ?? {} }))
      } else {
        el.addEventListener('click', () => select(entity.id))
      }
      markersRef.current.push(marker)
    })
    return () => { markersRef.current.forEach((m) => m.remove()) }
  }, [entities])

  // ── Zoom to selected entity ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap()
    const entity = entities.find((e) => e.id === selectedId)
    if (!map || !entity) return
    map.flyTo({ center: entity.lngLat, zoom: 15, duration: 1200 })
  }, [selectedId, entities])

  // ── Zoom target from widgets ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !zoomTarget) return
    map.flyTo({ center: zoomTarget.lngLat, zoom: zoomTarget.zoom ?? 14, duration: 1200 })
    setZoomTarget(null)
  }, [zoomTarget])

  // ── Register layers on map load ────────────────────────────────────────────
  function handleMapLoad(map: mapboxgl.Map) {
    MAP_LAYERS.forEach((layer) => {
      if (layer.sourceType === 'geojson' && layer.dataSource?.type !== 'mvt') {
        if (!map.getSource(layer.mapSourceId ?? layer.mapLayerId)) {
          map.addSource(layer.mapSourceId ?? layer.mapLayerId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        }
        if (!map.getLayer(layer.mapLayerId)) {
          map.addLayer({
            id: layer.mapLayerId,
            type: layer.layerType,
            source: layer.mapSourceId ?? layer.mapLayerId,
            paint: (layer.paint ?? {}) as mapboxgl.AnyPaint,
            layout: (layer.layout ?? {}) as mapboxgl.AnyLayout,
          })
        }
      }
      if (layer.dataSource && isMvtSource(layer.dataSource)) {
        registerMvtSource(map, layer.mapLayerId, layer.dataSource, layer.paint ?? {}, layer.layerType)
      }

      // Wire hover
      if (layer.hover?.enabled) {
        map.on('mousemove', layer.mapLayerId, (e) => {
          if (!e.features?.length) return
          const feat = e.features[0]
          const data = layer.hover!.popupFields
            ? Object.fromEntries((layer.hover!.popupFields).map((f) => [f, feat.properties?.[f]]))
            : feat.properties ?? {}
          setHoveredFeature({ type: 'layer', id: layer.id, lngLat: [e.lngLat.lng, e.lngLat.lat], data })
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', layer.mapLayerId, () => {
          setHoveredFeature(null)
          map.getCanvas().style.cursor = ''
        })
      }

      // Wire click
      if (layer.click?.enabled) {
        map.on('click', layer.mapLayerId, (e) => {
          if (!e.features?.length) return
          const feat = e.features[0]
          openModal({
            type: 'layer',
            id: layer.id,
            layerId: layer.mapLayerId,
            modalComponent: layer.click!.modalComponent,
            data: feat.properties ?? {},
            lngLat: [e.lngLat.lng, e.lngLat.lat],
          })
        })
      }
    })
  }

  return (
    <MapboxWrapper
      ref={mapRef}
      mapStyle={MAP_STYLE_OPTIONS[activeStyle]}
      height="100%"
      width="100%"
      onLoad={handleMapLoad}
    />
  )
}
```

---

## 5. LayerPanel [optional]

Floating panel — top-left by default.

```tsx
// src/pages/{page}/parts/LayerPanel.tsx
import { MAP_LAYERS_BY_GROUP } from '@/features/{domain}'
import type { LayerGroup } from '@/features/{domain}'
import { useLayerStore } from '@/features/{domain}/stores/useLayerStore'
import { useMapStore } from '@/features/{domain}/stores/useMapStore'
import { LayerLegend } from './LayerLegend'

const GROUP_ORDER: LayerGroup[] = ['GROUP_A', 'GROUP_B']  // define per domain

export function LayerPanel() {
  const layerPanelOpen = useMapStore((s) => s.layerPanelOpen)
  const toggleLayerPanel = useMapStore((s) => s.toggleLayerPanel)
  const layers = useLayerStore((s) => s.layers)
  const { toggleLayer, toggleGroup } = useLayerStore()

  return (
    <div className="map-layer-panel">
      {/* Toggle button — always visible */}
      <button className="map-layer-panel__toggle" onClick={toggleLayerPanel} aria-label="Toggle layer panel">
        <i className={`ph ph-${layerPanelOpen ? 'caret-left' : 'stack'}`} />
      </button>

      {layerPanelOpen && (
        <div className="map-layer-panel__body">
          {GROUP_ORDER.map((group) => {
            const items = MAP_LAYERS_BY_GROUP[group]
            if (!items?.length) return null
            const groupIds = items.map((l) => l.id as LayerId)
            const allVisible = groupIds.every((id) => layers[id] !== false)
            const groupConfig = MAP_GROUP_CONFIG[group]

            return (
              <section key={group} className="map-layer-panel__group">
                {/* Group header — icon, label, group toggle */}
                <div className="map-layer-panel__group-header">
                  {groupConfig?.icon && <i className={`ph ph-${groupConfig.icon}`} />}
                  <span className="map-layer-panel__group-label">{groupConfig?.label ?? group}</span>
                  <input
                    type="checkbox"
                    checked={allVisible}
                    onChange={() => toggleGroup(groupIds)}
                    aria-label={`Toggle all ${group} layers`}
                  />
                </div>

                {/* Layer items */}
                {items.map((layer) => (
                  <div key={layer.id} className="map-layer-panel__item">
                    <label className="map-layer-panel__row">
                      <input
                        type="checkbox"
                        checked={layers[layer.id as LayerId] !== false}
                        onChange={() => toggleLayer(layer.id as LayerId)}
                      />
                      {layer.icon && <i className={`ph ph-${layer.icon}`} aria-hidden="true" />}
                      <span>{layer.label}</span>
                    </label>
                    {/* Legend */}
                    {layer.legend && layers[layer.id as LayerId] !== false && (
                      <LayerLegend legend={layer.legend} />
                    )}
                  </div>
                ))}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

### LayerLegend — exact vs range

```tsx
// src/pages/{page}/parts/LayerLegend.tsx
import type { TLayerLegend } from '@/features/{domain}'

export function LayerLegend({ legend }: { legend: TLayerLegend }) {
  if (legend.type === 'exact') {
    return (
      <ul className="map-legend map-legend--exact">
        {legend.items.map((item) => (
          <li key={item.label} className="map-legend__item">
            {item.icon
              ? <i className={`ph ph-${item.icon}`} style={{ color: item.color }} />
              : <span className="map-legend__dot" style={{ background: item.color }} />
            }
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    )
  }

  // range — gradient bar
  const gradient = legend.colorStops
    .map((s) => `${s.color} ${s.value * 100}%`)
    .join(', ')
  return (
    <div className="map-legend map-legend--range">
      <div className="map-legend__bar" style={{ background: `linear-gradient(to right, ${gradient})` }} />
      <div className="map-legend__labels">
        <span>{legend.min}{legend.unit}</span>
        <span>{legend.max}{legend.unit}</span>
      </div>
    </div>
  )
}
```

---

## 6. HoverPopup [optional]

Renders when `useMapStore.hoveredFeature` is non-null. Positioned at cursor.

```tsx
// src/pages/{page}/parts/HoverPopup.tsx
import { useMapStore } from '@/features/{domain}/stores/useMapStore'
import { useEffect, useRef } from 'react'

export function HoverPopup() {
  const hovered = useMapStore((s) => s.hoveredFeature)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hovered || !ref.current) return
    const onMove = (e: MouseEvent) => {
      if (!ref.current) return
      ref.current.style.left = `${e.clientX + 12}px`
      ref.current.style.top = `${e.clientY + 12}px`
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [hovered])

  if (!hovered) return null

  return (
    <div ref={ref} className="map-hover-popup" style={{ position: 'fixed', pointerEvents: 'none', zIndex: 1000 }}>
      {Object.entries(hovered.data).map(([key, val]) => (
        <div key={key} className="map-hover-popup__row">
          <span className="map-hover-popup__key">{key}</span>
          <span className="map-hover-popup__val">{String(val)}</span>
        </div>
      ))}
    </div>
  )
}
```

---

## 7. MapModal [optional]

Renders when `useMapStore.clickedFeature` is non-null.

```tsx
// src/pages/{page}/parts/MapModal.tsx
import { useMapStore } from '@/features/{domain}/stores/useMapStore'
import { MAP_MODAL_REGISTRY } from '@/features/{domain}/config/modal-registry'

export function MapModal() {
  const clicked = useMapStore((s) => s.clickedFeature)
  const closeModal = useMapStore((s) => s.closeModal)

  if (!clicked) return null

  const ModalContent = clicked.modalComponent
    ? MAP_MODAL_REGISTRY[clicked.modalComponent]
    : null

  return (
    <div className="map-modal-overlay" onClick={closeModal}>
      <div className="map-modal" onClick={(e) => e.stopPropagation()}>
        <button className="map-modal__close" onClick={closeModal}><i className="ph ph-x" /></button>
        {ModalContent
          ? <ModalContent data={clicked.data} lngLat={clicked.lngLat} />
          : (
            <dl className="map-modal__data">
              {Object.entries(clicked.data).map(([k, v]) => (
                <>
                  <dt key={`dt-${k}`}>{k}</dt>
                  <dd key={`dd-${k}`}>{String(v)}</dd>
                </>
              ))}
            </dl>
          )
        }
      </div>
    </div>
  )
}
```

`MAP_MODAL_REGISTRY` maps component name strings to React components — registered once per domain.

---

## 8. MapStyleSwitcher [optional]

```tsx
// src/pages/{page}/parts/MapStyleSwitcher.tsx
import { MAP_STYLE_OPTIONS } from '@/config/map/map-styles.config'
import { useMapStore } from '@/features/{domain}/stores/useMapStore'

export function MapStyleSwitcher() {
  const activeStyle = useMapStore((s) => s.activeStyle)
  const setActiveStyle = useMapStore((s) => s.setActiveStyle)

  return (
    <div className="map-style-switcher">
      {Object.keys(MAP_STYLE_OPTIONS).map((key) => (
        <button
          key={key}
          className={`map-style-switcher__btn ${activeStyle === key ? 'map-style-switcher__btn--active' : ''}`}
          onClick={() => setActiveStyle(key as MapStyleKey)}
        >
          {key}
        </button>
      ))}
    </div>
  )
}
```

`map-styles.config.ts`:

```ts
export type MapStyleKey = 'dark' | 'light' | 'satellite' | 'streets' | 'outdoors'

export const MAP_STYLE_OPTIONS: Record<MapStyleKey, string> = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
}
```

---

## 9. GeoSearch [optional]

```tsx
// src/pages/{page}/parts/GeoSearch.tsx
import { useState } from 'react'
import { useMapStore } from '@/features/{domain}/stores/useMapStore'

export function GeoSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TGeoSearchResult[]>([])
  const setSearchResult = useMapStore((s) => s.setSearchResult)
  const setZoomTarget = useMapStore((s) => s.setZoomTarget)
  const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN

  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error('Missing MAPBOX_ACCESS_TOKEN')
  }

  async function search(q: string) {
    if (!q.trim()) return
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5`
    )
    const json = await res.json()
    setResults(json.features.map((f: any) => ({
      id: f.id,
      label: f.place_name,
      lngLat: f.geometry.coordinates as [number, number],
    })))
  }

  function select(result: TGeoSearchResult) {
    setSearchResult(result)
    setZoomTarget({ lngLat: result.lngLat, zoom: 14 })
    setResults([])
    setQuery(result.label)
  }

  return (
    <div className="map-geo-search">
      <div className="map-geo-search__input-wrap">
        <i className="ph ph-magnifying-glass" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value) }}
          placeholder="Search location..."
          className="map-geo-search__input"
        />
      </div>
      {results.length > 0 && (
        <ul className="map-geo-search__results">
          {results.map((r) => (
            <li key={r.id} className="map-geo-search__result" onClick={() => select(r)}>
              {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## 10. Floating Widgets [optional]

Floating widgets use the existing `dynamic-widget` skill components. They are positioned freely over the map.

### Widget Config

```ts
// widgets.config.ts
export type TFloatingWidgetConfig = {
  id: string
  position: { top?: string; bottom?: string; left?: string; right?: string }
  layout: 'flat' | 'tabs'   // flat = stacked list, tabs = grouped tabs
  widgets: TDynamicWidgetConfig[]  // same schema as dynamic-widget skill
}

export const FLOATING_WIDGETS: TFloatingWidgetConfig[] = [
  {
    id: 'top-stats',
    position: { top: '16px', right: '16px' },
    layout: 'flat',
    widgets: [
      { id: 'total-count', type: 'stat', title: 'Total', ... },
      { id: 'status-list', type: 'list', title: 'Status', ... },
    ],
  },
]
```

### FloatingWidgetContainer

```tsx
// src/pages/{page}/parts/FloatingWidgetContainer.tsx
import { FLOATING_WIDGETS } from '@/features/{domain}/config/widgets.config'
import { DynamicWidget } from '@/modules/dynamic-widget'

export function FloatingWidgetContainer() {
  return (
    <>
      {FLOATING_WIDGETS.map((container) => (
        <div
          key={container.id}
          className="map-float-widget"
          style={{ position: 'absolute', ...container.position, zIndex: 10, pointerEvents: 'auto' }}
        >
          {container.layout === 'tabs' ? (
            <FloatingTabsWidget config={container} />
          ) : (
            <div className="map-float-widget__flat">
              {container.widgets.map((w) => (
                <DynamicWidget key={w.id} config={w} />
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  )
}
```

### Running Text Ticker [optional]

```tsx
// src/pages/{page}/parts/MapTicker.tsx
type TTickerProps = {
  items: string[]
  position?: 'top' | 'bottom'
  speed?: number  // px/s, default 60
}

export function MapTicker({ items, position = 'bottom', speed = 60 }: TTickerProps) {
  return (
    <div className={`map-ticker map-ticker--${position}`}>
      <div
        className="map-ticker__track"
        style={{ '--ticker-speed': `${speed}px` } as React.CSSProperties}
      >
        {[...items, ...items].map((item, i) => (
          <span key={i} className="map-ticker__item">{item}</span>
        ))}
      </div>
    </div>
  )
}
```

### Widget → Layer Filter Interaction

Widget emits a filter value → `useLayerStore.setLayerFilter` → MapBridge applies `map.setFilter()`.

```tsx
// Inside a widget component
const setLayerFilter = useLayerStore((s) => s.setLayerFilter)

function onFilterChange(value: string) {
  // Mapbox filter expression
  setLayerFilter('ZONE_FILL', ['==', ['get', 'status'], value])
}
```

### Layer → Widget Filter Interaction

User clicks a map feature → `useMapStore.clickedFeature` → widget reads and filters its data.

```tsx
// Inside a widget component
const clicked = useMapStore((s) => s.clickedFeature)

const filteredData = useMemo(
  () => clicked ? data.filter((d) => d.zoneId === clicked.data.id) : data,
  [data, clicked]
)
```

### Zoom to Location from Widget

```tsx
// Inside a widget component
const setZoomTarget = useMapStore((s) => s.setZoomTarget)

function onRowClick(lngLat: [number, number]) {
  setZoomTarget({ lngLat, zoom: 15 })
}
```

MapBridge `useEffect([zoomTarget])` picks this up and calls `map.flyTo()`.

---

## 11. Data Sources

### REST — one-shot or polling

```ts
dataSource: {
  type: 'rest',
  url: '/api/zones/geojson',
  pollingInterval: 30_000,     // omit for one-shot
  transform: (raw) => raw as GeoJSON.FeatureCollection,
},
```

### WebSocket — real-time

```ts
dataSource: {
  type: 'websocket',
  url: 'wss://api.example.com/ws/positions',
  updateStrategy: 'upsert',    // 'replace' | 'append' | 'upsert'
  reconnect: 'exponential',
  maxFeatures: 500,            // required when updateStrategy is 'append'
  transform: (raw) => { /* raw → GeoJSON.Feature */ },
},
```

### MVT — vector tiles

```ts
dataSource: {
  type: 'mvt',
  tiles: ['https://tiles.example.com/data/{z}/{x}/{y}.pbf'],
  sourceLayer: 'data',
  minzoom: 8,
  maxzoom: 18,
},
```

---

## Definition of Done

- [ ] All layers registered in `MAP_LAYERS` with explicit `layerType` and `sourceType`
- [ ] `paint` references `LAYER_PAINT[preset]` — no inline paint objects
- [ ] Hover and click config declared in layer entry — not wired manually in component
- [ ] Legend declared in layer entry for any layer with color meaning
- [ ] `useMapStore` created with all required fields
- [ ] `useLayerStore` includes `toggleGroup` and `setLayerFilter`
- [ ] `MapBridge` has one `useEffect` per concern
- [ ] `LayerPanel` reads only `MAP_LAYERS_BY_GROUP` and `useLayerStore` + `useMapStore.layerPanelOpen`
- [ ] `HoverPopup` imports zero `mapbox-gl` — reads `useMapStore.hoveredFeature` only
- [ ] `MapModal` imports zero `mapbox-gl` — reads `useMapStore.clickedFeature` only
- [ ] Floating widgets use `DynamicWidget` — no custom widget components unless necessary
- [ ] Widget→layer filter goes through `useLayerStore.setLayerFilter`
- [ ] Layer→widget interaction goes through `useMapStore.clickedFeature`
- [ ] Zoom-to-location goes through `useMapStore.setZoomTarget`
- [ ] No `mapbox-gl` imports outside `MapBridge`
- [ ] All markers cleaned up in `useEffect` return

> Layout shell: `skills/reactjs-app-layout/SKILL.md`
> Dynamic widgets: `skills/reactjs-dynamic-widget/SKILL.md`
> Detailed rules: [references/map-rules.md](references/map-rules.md)
> Tactical domain override: [../reactjs-tactical-map/SKILL.md](../reactjs-tactical-map/SKILL.md)
