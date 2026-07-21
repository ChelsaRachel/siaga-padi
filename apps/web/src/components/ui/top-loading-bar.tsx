import { useEffect, useState } from 'react'

/**
 * TopLoadingBar - Indikator loading berupa progress bar di atas layar.
 * Digunakan sebagai fallback Suspense selama lazy loading / routing.
 */
export function TopLoadingBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let timer: NodeJS.Timeout

    // Simulasi progress yang berhenti di ~90% sampai komponen asli di-mount
    const increment = () => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        const jump = Math.random() * 10 + 5
        return prev + jump
      })
      timer = setTimeout(increment, Math.random() * 300 + 100)
    }

    timer = setTimeout(increment, 100)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed left-0 right-0 top-0 z-[9999] h-1 bg-transparent">
      <div
        className="h-full bg-[var(--cds-accent,#3b82f6)] transition-all duration-300 ease-out shadow-[0_0_10px_var(--cds-accent,#3b82f6)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
