import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import type { TriageRecommendation, TriageSuggestion } from '@/types/siaga-triage'
import { FARMER_SECTIONS, ORIGIN_LABELS } from '../triage-labels'

interface FarmerActionCardsProps {
  recommendation: TriageRecommendation
  onOpenReferences: (refCodes: string[]) => void
}

interface SuggestionListProps {
  items: TriageSuggestion[]
  numbered: boolean
  onOpenReferences: (refCodes: string[]) => void
}

function SuggestionList({ items, numbered, onOpenReferences }: SuggestionListProps) {
  const ListTag = numbered ? 'ol' : 'ul'
  return (
    <ListTag className="flex flex-col gap-2.5">
      {items.map((item, index) => (
        <li key={`${item.text}-${index}`} className="flex items-start gap-2.5">
          <span
            className={cn(
              'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-body-sm font-bold',
              numbered
                ? 'bg-primary-base text-primary-foreground'
                : 'bg-background-secondary text-font-secondary'
            )}
            aria-hidden="true"
          >
            {numbered ? index + 1 : '•'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body-md text-font-primary">{item.text}</p>
            {item.refCodes.length > 0 && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-body-sm font-medium"
                onClick={() => onOpenReferences(item.refCodes)}
                data-testid="suggestion-refs"
              >
                <i className="ph ph-book-open-text" aria-hidden="true" />
                Lihat sumber ({item.refCodes.length})
              </Button>
            )}
          </div>
        </li>
      ))}
    </ListTag>
  )
}

/**
 * Kartu aksi petani — indikasi, lakukan sekarang (numbered), pantau, hindari,
 * and when to call a penyuluh.
 *
 * Every line carries its own "Lihat sumber" link rather than one bibliography
 * at the bottom: traceability is per-suggestion in FR-007, and a farmer asking
 * "why should I do this?" should not have to match footnote numbers.
 *
 * There is no dosage or brand rendering path here at all — the server strips
 * that content before it is stored, and the card has no field that could
 * display it even if it slipped through.
 */
export function FarmerActionCards({
  recommendation,
  onOpenReferences,
}: FarmerActionCardsProps) {
  const { farmerView, origin } = recommendation
  const originLabel = ORIGIN_LABELS[origin]
  const hasNoActions = FARMER_SECTIONS.every(
    (section) => farmerView[section.key].length === 0
  )

  return (
    <div className="flex flex-col gap-4" data-testid="farmer-cards" data-origin={origin}>
      <section className="flex flex-col gap-2 rounded-3xl border border-border-primary bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-body-lg font-bold text-font-primary">Indikasi</h2>
          {originLabel && (
            <span
              className="shrink-0 rounded-full border border-warning-soft bg-warning-light px-2.5 py-1 text-body-sm font-semibold text-warning-deep"
              data-testid="origin-badge"
            >
              {originLabel}
            </span>
          )}
        </div>
        <p className="text-body-md text-font-primary">{farmerView.indikasi}</p>
      </section>

      {hasNoActions && (
        <Alert
          className="rounded-2xl border-warning-soft bg-warning-light"
          data-testid="no-actions-notice"
        >
          <AlertDescription className="text-body-md text-font-primary">
            Belum ada saran tindakan yang bisa diberikan dengan aman. Tunggu
            penyuluh memeriksa kasus Anda.
          </AlertDescription>
        </Alert>
      )}

      {FARMER_SECTIONS.map((section) => {
        const items = farmerView[section.key]
        if (items.length === 0) return null
        return (
          <section
            key={section.key}
            className="flex flex-col gap-3 rounded-3xl border border-border-primary bg-card p-5"
            data-testid={`farmer-section-${section.key}`}
          >
            <h2 className="flex items-center gap-2 text-body-lg font-bold text-font-primary">
              <i
                className={cn('ph-fill text-h6 text-primary-bold', section.icon)}
                aria-hidden="true"
              />
              {section.title}
            </h2>
            <SuggestionList
              items={items}
              numbered={section.numbered}
              onOpenReferences={onOpenReferences}
            />
          </section>
        )
      })}

      <section
        className="flex flex-col gap-2 rounded-3xl border border-secondary-soft bg-secondary-light p-5"
        data-testid="farmer-section-eskalasi"
      >
        <h2 className="flex items-center gap-2 text-body-lg font-bold text-font-primary">
          <i
            className="ph-fill ph-phone-call text-h6 text-secondary-bold"
            aria-hidden="true"
          />
          Kapan hubungi penyuluh
        </h2>
        <p className="text-body-md text-font-primary">{farmerView.eskalasi}</p>
      </section>
    </div>
  )
}

export default FarmerActionCards
