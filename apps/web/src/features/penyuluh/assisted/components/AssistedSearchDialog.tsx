import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { IAssistedSearchResult } from '@/services/assisted.service'
import { SEARCH_SCOPE_NOTE } from '../assisted.constants'
import { consentSchema, type TConsentFormValues, type TMinimalProfileFormValues } from '../assisted.schema'
import { useAssistedSearch } from '../hooks/useAssistedSearch'
import { useAssistedSession } from '../hooks/useAssistedSession'
import { ConsentMethodField } from './ConsentMethodField'
import { MinimalProfileForm } from './MinimalProfileForm'

type TDialogStep = 'search' | 'consent' | 'create'

interface AssistedSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SearchResultButtonProps {
  result: IAssistedSearchResult
  onSelect: (result: IAssistedSearchResult) => void
}

function SearchResultButton({ result, onSelect }: SearchResultButtonProps) {
  const area = [result.areaKecamatan, result.areaKabupaten].filter(Boolean).join(', ')
  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-border-primary bg-background-primary px-3 py-2.5 text-left transition-colors hover:border-primary-soft hover:bg-accent"
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-body-md font-semibold text-font-primary">{result.displayName}</span>
        {area && <span className="truncate text-body-sm text-font-secondary">{area}</span>}
      </span>
      <i className="ph ph-caret-right shrink-0 text-font-secondary" aria-hidden="true" />
    </button>
  )
}

/**
 * "Dampingi Petani" flow: search petani binaan → pick (or create a minimal
 * profile) → record consent method → start the audited assisted session.
 */
export function AssistedSearchDialog({ open, onOpenChange }: AssistedSearchDialogProps) {
  const [step, setStep] = useState<TDialogStep>('search')
  const [query, setQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<IAssistedSearchResult | null>(null)
  const searchState = useAssistedSearch()
  const { startSession, isStarting, error: sessionError } = useAssistedSession()

  const consentForm = useForm<TConsentFormValues>({
    resolver: yupResolver(consentSchema),
    defaultValues: { consentMethod: undefined },
  })

  const resetAndClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep('search')
      setQuery('')
      setSelectedSubject(null)
      searchState.reset()
      consentForm.reset()
    }
    onOpenChange(nextOpen)
  }

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedQuery = query.trim()
    if (trimmedQuery.length >= 2) {
      void searchState.search(trimmedQuery)
    }
  }

  const handleSelectSubject = (result: IAssistedSearchResult) => {
    setSelectedSubject(result)
    setStep('consent')
  }

  const handleStartExisting = async (values: TConsentFormValues) => {
    if (!selectedSubject) return
    const isStarted = await startSession({
      subjectProfileId: selectedSubject.profileId,
      consentMethod: values.consentMethod,
    })
    if (isStarted) resetAndClose(false)
  }

  const handleStartWithNewProfile = async (values: TMinimalProfileFormValues) => {
    const isStarted = await startSession({
      newProfile: {
        displayName: values.displayName,
        areaKabupaten: values.areaKabupaten,
        areaKecamatan: values.areaKecamatan,
      },
      consentMethod: values.consentMethod,
    })
    if (isStarted) resetAndClose(false)
  }

  const hasSearched = searchState.status === 'success'
  const isSearchEmpty = hasSearched && searchState.results.length === 0

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-h-[90svh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-h5 text-font-primary">
            {step === 'search' && 'Dampingi Petani'}
            {step === 'consent' && 'Persetujuan Petani'}
            {step === 'create' && 'Buat Profil Minimal'}
          </DialogTitle>
          <DialogDescription className="text-body-md text-font-secondary">
            {step === 'search' && SEARCH_SCOPE_NOTE}
            {step === 'consent' && `Mulai sesi pendampingan atas nama ${selectedSubject?.displayName ?? 'petani'}.`}
            {step === 'create' && 'Profil sederhana tanpa kredensial — cukup nama panggilan dan wilayah. Tanpa NIK.'}
          </DialogDescription>
        </DialogHeader>

        {sessionError && (
          <Alert variant="destructive" className="rounded-lg">
            <AlertDescription>{sessionError}</AlertDescription>
          </Alert>
        )}

        {step === 'search' && (
          <div className="space-y-4">
            <form onSubmit={handleSearchSubmit} noValidate className="flex gap-2">
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama petani…"
                aria-label="Cari nama petani"
                className="h-12 rounded-md border-border-primary bg-background-primary text-body-lg placeholder:text-font-placeholder focus-visible:ring-1 focus-visible:ring-primary-base"
              />
              <Button
                type="submit"
                size="lg"
                disabled={searchState.status === 'loading' || query.trim().length < 2}
                className="rounded-xl px-4"
              >
                {searchState.status === 'loading' ? (
                  <i className="ph ph-circle-notch animate-spin text-h6" aria-hidden="true" />
                ) : (
                  <i className="ph ph-magnifying-glass text-h6" aria-hidden="true" />
                )}
                Cari
              </Button>
            </form>

            {searchState.status === 'error' && searchState.error && (
              <Alert variant="destructive" className="rounded-lg">
                <AlertDescription>{searchState.error}</AlertDescription>
              </Alert>
            )}

            {searchState.status === 'loading' && (
              <p className="py-2 text-center text-body-md text-font-secondary">Mencari petani…</p>
            )}

            {hasSearched && searchState.results.length > 0 && (
              <div className="flex flex-col gap-2">
                {searchState.results.map((result) => (
                  <SearchResultButton key={result.profileId} result={result} onSelect={handleSelectSubject} />
                ))}
              </div>
            )}

            {isSearchEmpty && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-secondary bg-background-secondary p-6 text-center">
                <i className="ph ph-magnifying-glass text-h3 text-font-placeholder" aria-hidden="true" />
                <p className="text-body-md text-font-secondary">
                  Tidak ada petani dengan nama itu di wilayah binaan Anda.
                </p>
                <Button type="button" variant="outline" size="md" onClick={() => setStep('create')} className="rounded-xl">
                  <i className="ph ph-user-plus text-h6" aria-hidden="true" />
                  Buat profil minimal
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'consent' && selectedSubject && (
          <Form {...consentForm}>
            <form onSubmit={consentForm.handleSubmit(handleStartExisting)} noValidate className="space-y-4">
              <div className="rounded-xl bg-background-secondary p-3 text-body-md text-font-primary">
                <span className="font-semibold">{selectedSubject.displayName}</span>
                <span className="block text-body-sm text-font-secondary">
                  {[selectedSubject.areaKecamatan, selectedSubject.areaKabupaten].filter(Boolean).join(', ')}
                </span>
              </div>
              <ConsentMethodField control={consentForm.control} name="consentMethod" />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" size="md" onClick={() => setStep('search')} className="rounded-xl">
                  Kembali
                </Button>
                <Button type="submit" size="lg" disabled={isStarting} className="rounded-xl font-semibold">
                  {isStarting ? (
                    <>
                      <i className="ph ph-circle-notch animate-spin text-h6" aria-hidden="true" />
                      Memulai…
                    </>
                  ) : (
                    'Mulai Dampingi'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === 'create' && (
          <div className="space-y-3">
            <MinimalProfileForm onSubmit={handleStartWithNewProfile} isSubmitting={isStarting} />
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setStep('search')}
              className="w-full rounded-xl text-font-secondary"
            >
              Kembali ke pencarian
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
