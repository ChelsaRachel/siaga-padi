import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ChunkPreviewCard } from '@/features/knowledge/review'
import { kbService } from '@/services/kb.service'
import type { SiagaKbChunk } from '@/types/siaga-kb'
import { parseApiError } from '@/utils/parse-api-error'

/**
 * Read-only reference preview, addressed by the STABLE ref code — the
 * shareable route a recommendation card links to (brief 06 §3.1).
 *
 * Open to every signed-in role and to historical versions on purpose: a
 * penyuluh reopening a months-old case must still see the exact text that was
 * cited then, with the "versi lama" label the preview card renders from
 * `isCurrent`.
 */
function KbChunkPreviewPage() {
  const { refCode = '' } = useParams()
  const [searchParams] = useSearchParams()
  const versionParam = searchParams.get('version')
  const version = versionParam ? Number(versionParam) : undefined

  const [chunk, setChunk] = useState<SiagaKbChunk | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    setIsLoading(true)
    setError(null)
    kbService
      .getChunkByRef(refCode, Number.isFinite(version) ? version : undefined)
      .then((response) => {
        if (isActive) {
          setChunk(response?.data ?? null)
        }
      })
      .catch((fetchError: unknown) => {
        if (isActive) {
          setError(parseApiError(fetchError).message)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })
    return () => {
      isActive = false
    }
  }, [refCode, version])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-h4 font-bold text-font-primary">Rujukan {refCode}</h1>
        <p className="mt-1 text-body-md text-font-secondary">
          Pratinjau baca-saja dari basis pengetahuan.
        </p>
      </div>

      {isLoading && (
        <Skeleton className="h-48 rounded-2xl" data-testid="kb-preview-loading" />
      )}

      {error && (
        <Alert variant="destructive" data-testid="kb-preview-error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && chunk && <ChunkPreviewCard chunk={chunk} isReadOnly />}
    </div>
  )
}

export default KbChunkPreviewPage
