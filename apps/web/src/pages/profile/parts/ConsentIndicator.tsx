import { cn } from '@/utils/cn'

interface ConsentIndicatorProps {
  label: string
  isGranted: boolean
  testId: string
}

/**
 * Consent status as ikon + teks — never color-only (Tani Ramah danger rule:
 * many petani are red-green colorblind; icon shape + label always present).
 */
export function ConsentIndicator({ label, isGranted, testId }: ConsentIndicatorProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2',
        isGranted ? 'border-primary-soft bg-primary-light' : 'border-neutral-soft bg-neutral-light'
      )}
    >
      <i
        className={cn(
          'text-h6',
          isGranted ? 'ph-fill ph-check-circle text-primary-deep' : 'ph ph-x-circle text-font-secondary'
        )}
        aria-hidden="true"
      />
      <span className="text-body-sm font-medium text-font-primary">
        {label}: {isGranted ? 'Aktif' : 'Nonaktif'}
      </span>
    </div>
  )
}
