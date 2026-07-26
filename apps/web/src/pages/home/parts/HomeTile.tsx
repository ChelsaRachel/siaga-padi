import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

interface HomeTileProps {
  to: string
  icon: string
  title: string
  description: string
  /** Primary tiles get the leaf-green emphasis (main action of the role). */
  isPrimary?: boolean
}

/** Large touch-friendly card tile linking to a role feature (or route-to-be). */
export function HomeTile({ to, icon, title, description, isPrimary = false }: HomeTileProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex min-h-28 flex-col justify-between gap-3 rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-lg',
        isPrimary
          ? 'border-primary-soft bg-primary-base text-font-on-accent'
          : 'border-border-primary bg-card text-font-primary',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl',
            isPrimary ? 'bg-background-primary/20' : 'bg-accent text-accent-foreground',
          )}
        >
          <i className={`ph-fill ph-${icon} text-h5`} aria-hidden="true" />
        </span>
        <span className="text-body-lg font-semibold">{title}</span>
      </div>
      <p className={cn('text-body-md', isPrimary ? 'text-font-on-accent/90' : 'text-font-secondary')}>
        {description}
      </p>
    </Link>
  )
}
