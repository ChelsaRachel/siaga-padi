import { useRef, useEffect, useImperativeHandle, forwardRef, type CSSProperties, type ReactNode } from 'react'
import mapboxgl from 'mapbox-gl'

// Token from env — never hardcode
mapboxgl.accessToken = process.env.REACT_MAPBOX_TOKEN ?? ''

// Fusion Design System — neutral tokens for map UI chrome
const CHROME = {
  light: {
    background: '#ffffff',
    text: '#050505',
    textSecondary: '#5b5d63',
    border: '#e6e9f0',
    shadow: '0 2px 8px rgba(51,51,51,0.10)',
  },
  dark: {
    background: '#101014',
    text: '#f5f7fa',
    textSecondary: '#b7babd',
    border: '#5b5d63',
    shadow: '0 2px 8px rgba(0,0,0,0.32)',
  },
} as const

export type MapMode = 'light' | 'dark'

export type MapStyle = 'streets' | 'satellite' | 'satellite-streets' | 'outdoors' | 'light' | 'dark' | (string & {})

const STYLE_MAP: Record<string, string> = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  'satellite-streets': 'mapbox://styles/mapbox/satellite-streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
}

function resolveStyle(style: MapStyle, mode: MapMode): string {
  if (style in STYLE_MAP) return STYLE_MAP[style]
  // auto-resolve based on mode when caller passes 'light' | 'dark' implicitly
  if (style === 'auto') return mode === 'dark' ? STYLE_MAP.dark : STYLE_MAP.light
  return style // treat as raw mapbox style URL
}

export interface MapboxWrapperRef {
  getMap: () => mapboxgl.Map | null
}

export interface MarkerConfig {
  lngLat: [number, number]
  color?: string
  popup?: string
}

export interface MapboxWrapperProps {
  mode?: MapMode
  mapStyle?: MapStyle
  center?: [number, number]
  zoom?: number
  minZoom?: number
  maxZoom?: number
  bearing?: number
  pitch?: number
  interactive?: boolean
  markers?: MarkerConfig[]
  height?: number | string
  width?: number | string
  className?: string
  style?: CSSProperties
  children?: ReactNode
  onLoad?: (map: mapboxgl.Map) => void
  onClick?: (e: mapboxgl.MapMouseEvent) => void
  onMoveEnd?: (map: mapboxgl.Map) => void
}

export const MapboxWrapper = forwardRef<MapboxWrapperRef, MapboxWrapperProps>(function MapboxWrapper(
  {
    mode = 'light',
    mapStyle = 'streets',
    center = [106.827_153, -6.175_392], // Jakarta default
    zoom = 11,
    minZoom = 0,
    maxZoom = 22,
    bearing = 0,
    pitch = 0,
    interactive = true,
    markers = [],
    height = 480,
    width = '100%',
    className,
    style,
    children,
    onLoad,
    onClick,
    onMoveEnd,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const chrome = CHROME[mode]

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
  }))

  // init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: resolveStyle(mapStyle, mode),
      center,
      zoom,
      minZoom,
      maxZoom,
      bearing,
      pitch,
      interactive,
      attributionControl: false,
    })

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right')

    map.on('load', () => onLoad?.(map))
    map.on('click', (e) => onClick?.(e))
    map.on('moveend', () => onMoveEnd?.(map))

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // sync style when mode or mapStyle changes
  useEffect(() => {
    mapRef.current?.setStyle(resolveStyle(mapStyle, mode))
  }, [mapStyle, mode])

  // sync markers
  useEffect(() => {
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    markers.forEach(({ lngLat, color, popup }) => {
      const marker = new mapboxgl.Marker({ color: color ?? chrome.text }).setLngLat(lngLat)

      if (popup) {
        marker.setPopup(
          new mapboxgl.Popup({
            offset: 25,
            className: `mapbox-popup--${mode}`,
          }).setHTML(`<span style="color:${chrome.text};font-family:Inter,sans-serif;font-size:13px">${popup}</span>`),
        )
      }

      marker.addTo(mapRef.current!)
      markersRef.current.push(marker)
    })
  }, [markers, mode, chrome])

  return (
    <div style={{ position: 'relative', width, height, ...style }} className={className}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* popup chrome overrides via inline style tag — keeps token values in JS */}
      <style>{`
          .mapboxgl-popup-content {
            background: ${chrome.background};
            border: 1px solid ${chrome.border};
            box-shadow: ${chrome.shadow};
            border-radius: 6px;
            padding: 12px 16px;
          }
          .mapboxgl-popup-tip {
            border-top-color: ${chrome.background};
            border-bottom-color: ${chrome.background};
          }
          .mapboxgl-ctrl-group {
            background: ${chrome.background};
            border: 1px solid ${chrome.border} !important;
            box-shadow: ${chrome.shadow};
          }
          .mapboxgl-ctrl-group button {
            background: ${chrome.background};
            color: ${chrome.text};
          }
          .mapboxgl-ctrl-group button:hover {
            background: ${chrome.border};
          }
          .mapboxgl-ctrl-attrib {
            background: ${chrome.background}cc;
            color: ${chrome.textSecondary};
          }
          .mapboxgl-ctrl-scale {
            background: ${chrome.background}cc;
            color: ${chrome.textSecondary};
            border-color: ${chrome.border};
            font-family: Inter, sans-serif;
            font-size: 11px;
          }
        `}</style>

      {children}
    </div>
  )
})
