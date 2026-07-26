import { Link } from 'react-router-dom'

interface ComingSoonPageProps {
  title: string
  icon?: string
  /** e.g. "Sprint 02" — shown in the empty-state copy. */
  sprintLabel?: string
}

/**
 * Empty state for routes-to-be: menu/tiles may point here until the owning
 * sprint ships the real page.
 */
function ComingSoonPage({ title, icon = 'rocket-launch', sprintLabel = 'sprint berikutnya' }: ComingSoonPageProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border-secondary bg-background-secondary px-6 py-14 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <i className={`ph ph-${icon} text-h3`} aria-hidden="true" />
      </span>
      <div>
        <h1 className="text-h5 font-bold text-font-primary">{title}</h1>
        <p className="mt-1 text-body-md text-font-secondary">
          Fitur ini hadir di {sprintLabel}. Terima kasih sudah menunggu.
        </p>
      </div>
      <Link
        to="/"
        className="flex min-h-11 items-center gap-2 rounded-xl bg-primary-base px-5 py-2.5 text-body-md font-semibold text-font-on-accent transition-colors hover:bg-primary-bold"
      >
        <i className="ph ph-house" aria-hidden="true" />
        Kembali ke Beranda
      </Link>
    </div>
  )
}

export default ComingSoonPage
