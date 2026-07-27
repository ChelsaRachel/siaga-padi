import { useCallback, useState } from 'react'
import type { SiagaCoords } from '@/types/siaga-case'

export type TGeolocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'

const GPS_TIMEOUT_MS = 15000
const GPS_MAX_AGE_MS = 60000

interface UseGeolocationOptions {
  onGranted: (coords: SiagaCoords) => void
  /** Denied OR unavailable — the wizard falls back to manual area input. */
  onRefused: (status: 'denied' | 'unavailable') => void
}

/**
 * Explicit-tap-only GPS request (privacy by design — never on mount).
 * Denied/unavailable both funnel to the AREA_ONLY manual fallback; refusal
 * NEVER blocks case creation (contract rule).
 */
export function useGeolocation({ onGranted, onRefused }: UseGeolocationOptions) {
  const [status, setStatus] = useState<TGeolocationStatus>('idle')

  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation?.getCurrentPosition) {
      setStatus('unavailable')
      onRefused('unavailable')
      return
    }

    setStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus('granted')
        onGranted({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      (error) => {
        const refusal = error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'
        setStatus(refusal)
        onRefused(refusal)
      },
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: GPS_MAX_AGE_MS }
    )
  }, [onGranted, onRefused])

  return { status, requestLocation }
}
