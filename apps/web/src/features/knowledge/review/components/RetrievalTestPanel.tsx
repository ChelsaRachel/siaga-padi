import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { KbAudience } from '@/types/siaga-kb'
import {
  AUDIENCE_LABELS,
  DISEASE_LABELS,
  DISEASE_ORDER,
  PHASE_LABELS,
  PHASE_ORDER,
} from '../../kb-labels'
import { useKbReviewStore } from '../store/useKbReviewStore'

const ANY_VALUE = 'semua'

const SELECT_CLASSES =
  'h-11 rounded-xl border border-border-primary bg-background-primary px-3 text-body-md text-font-primary'

/**
 * Retrieval test (brief 06 §2.3) — "Blas Daun fase anakan → rujukan apa yang
 * terambil?" run BEFORE a version is activated.
 *
 * Results show the ref code, the rank score and the narration verdict, because
 * that trio is exactly what the reviewer must be able to defend later: which
 * reference was picked, why it outranked the rest, and whether a petani may
 * ever hear it read out.
 */
export function RetrievalTestPanel() {
  const { retrieval, isTesting, runRetrievalTest } = useKbReviewStore()
  const [disease, setDisease] = useState<string>('blas_daun')
  const [phase, setPhase] = useState<string>('vegetatif')
  const [audience, setAudience] = useState<string>(ANY_VALUE)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    runRetrievalTest({
      disease: disease === ANY_VALUE ? undefined : disease,
      phase: phase === ANY_VALUE ? undefined : phase,
      audience: audience === ANY_VALUE ? undefined : (audience as KbAudience),
    })
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-border-primary bg-card p-4"
      aria-label="Uji pengambilan rujukan"
      data-testid="kb-retrieval-panel"
    >
      <div>
        <h2 className="text-h6 font-bold text-font-primary">Uji pengambilan</h2>
        <p className="text-body-sm text-font-secondary">
          Periksa potongan mana yang akan terambil sebelum versi diaktifkan.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-md font-medium text-font-primary">Penyakit</span>
          <select
            className={SELECT_CLASSES}
            value={disease}
            onChange={(event) => setDisease(event.target.value)}
            data-testid="kb-retrieval-disease"
            id="kb-retrieval-disease"
            name="disease"
          >
            <option value={ANY_VALUE}>Semua penyakit</option>
            {DISEASE_ORDER.map((tag) => (
              <option key={tag} value={tag}>
                {DISEASE_LABELS[tag]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-md font-medium text-font-primary">Fase</span>
          <select
            className={SELECT_CLASSES}
            value={phase}
            onChange={(event) => setPhase(event.target.value)}
            data-testid="kb-retrieval-phase"
            id="kb-retrieval-phase"
            name="phase"
          >
            <option value={ANY_VALUE}>Semua fase</option>
            {PHASE_ORDER.map((tag) => (
              <option key={tag} value={tag}>
                {PHASE_LABELS[tag]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-md font-medium text-font-primary">Audiens</span>
          <select
            className={SELECT_CLASSES}
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            data-testid="kb-retrieval-audience"
            id="kb-retrieval-audience"
            name="audience"
          >
            <option value={ANY_VALUE}>Semua audiens</option>
            {(Object.keys(AUDIENCE_LABELS) as KbAudience[]).map((option) => (
              <option key={option} value={option}>
                {AUDIENCE_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="submit"
          className="h-11 rounded-xl font-semibold"
          disabled={isTesting}
          data-testid="kb-retrieval-run"
        >
          {isTesting ? 'Menguji…' : 'Jalankan uji'}
        </Button>
      </form>

      {retrieval && (
        <div className="flex flex-col gap-2" data-testid="kb-retrieval-results">
          <p className="text-body-sm text-font-secondary">
            {retrieval.totalCount} potongan cocok — {retrieval.hits.length} teratas
            ditampilkan.
          </p>
          {retrieval.hits.length === 0 ? (
            <Alert data-testid="kb-retrieval-empty">
              <AlertDescription>
                Tidak ada potongan aktif untuk kombinasi ini. Setujui potongan yang
                relevan lebih dulu.
              </AlertDescription>
            </Alert>
          ) : (
            <ol className="flex flex-col gap-2">
              {retrieval.hits.map((hit) => (
                <li
                  key={hit.chunkId}
                  className="rounded-xl border border-border-secondary bg-background-primary p-3"
                  data-testid={`kb-retrieval-hit-${hit.refCode}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/pengetahuan/rujukan/${hit.refCode}`}
                      className="text-body-md font-semibold text-primary-bold underline-offset-2 hover:underline"
                    >
                      {hit.refCode}
                    </Link>
                    <span className="text-label-sm text-font-secondary">
                      skor {hit.score}
                      {hit.location ? ` · ${hit.location}` : ''}
                    </span>
                    {!hit.narratable && (
                      <Badge className="rounded-lg border border-error-base bg-error-light text-label-sm text-error-deep">
                        Tidak untuk dinarasikan
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-body-sm text-font-secondary">{hit.content}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  )
}
