import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { casesService } from '@/services/cases.service'
import { parseApiError } from '@/utils/parse-api-error'

interface PhotoRouteState {
  caseCode?: string
}

/**
 * Photo-flow placeholder (route owned by Sprint 03). The wizard lands here
 * carrying the created case id; the caseCode arrives via route state or, on
 * a direct open/reload, is fetched from the case detail endpoint.
 */
function CasePhotoPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const location = useLocation()
  const stateCaseCode = (location.state as PhotoRouteState | null)?.caseCode ?? null

  const [caseCode, setCaseCode] = useState<string | null>(stateCaseCode)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (stateCaseCode || !caseId) {
      return
    }
    let isActive = true
    const fetchCaseCode = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await casesService.getOne(caseId)
        if (isActive) {
          setCaseCode(response?.data?.caseCode ?? null)
        }
      } catch (fetchError: unknown) {
        if (isActive) {
          setError(parseApiError(fetchError).message)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }
    fetchCaseCode()
    return () => {
      isActive = false
    }
  }, [caseId, stateCaseCode])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-3xl border border-dashed border-border-secondary bg-background-secondary px-6 py-14 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <i className="ph ph-camera text-h3" aria-hidden="true" />
      </span>

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-h5 font-bold text-font-primary">Alur Foto</h1>
        {isLoading && <Skeleton className="h-6 w-40 rounded-lg" data-testid="case-code-loading" />}
        {caseCode && (
          <Badge
            data-testid="case-code-badge"
            className="rounded-lg border-primary-soft bg-primary-light px-3 py-1 text-body-md font-semibold text-primary-deep"
          >
            Kasus {caseCode} tersimpan sebagai draf
          </Badge>
        )}
        {error && (
          <Alert variant="destructive" className="text-left">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="text-body-md text-font-secondary">
          Pengambilan foto tanaman hadir di Sprint 03. Draf kasus Anda sudah aman dan bisa dilihat
          kapan saja di Riwayat.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {caseId && (
          <Link
            to={`/kasus/${caseId}`}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-base px-5 py-2.5 text-body-md font-semibold text-font-on-accent transition-colors hover:bg-primary-bold"
          >
            <i className="ph ph-file-text" aria-hidden="true" />
            Lihat Detail Kasus
          </Link>
        )}
        <Link
          to="/"
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-primary bg-background-primary px-5 py-2.5 text-body-md font-semibold text-font-primary transition-colors hover:bg-muted"
        >
          <i className="ph ph-house" aria-hidden="true" />
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  )
}

export default CasePhotoPage
