/** Suspense fallback for lazily-loaded route pages. */
export function RouteFallback() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center gap-2 p-10 text-font-secondary">
      <i className="ph ph-circle-notch animate-spin text-h5" aria-hidden="true" />
      <span className="text-body-md">Memuat…</span>
    </div>
  )
}
