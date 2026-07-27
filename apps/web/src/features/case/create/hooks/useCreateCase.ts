import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { casesService } from '@/services/cases.service'
import { useAssistedStore } from '@/stores/useAssistedStore'
import { GENERIC_ERROR_MESSAGE, parseApiError } from '@/utils/parse-api-error'
import { useCaseWizardStore } from '../store/useCaseWizardStore'
import { buildCaseCreatePayload } from '../utils/build-case-payload'

export type TCaseSubmitOutcome = 'created' | 'queued' | 'error'

/**
 * Submit lifecycle for the case wizard.
 *
 * Three outcomes, all honest to the user:
 * - `created` — the server accepted the case; navigate to the photo flow.
 * - `queued` — offline (or the service was unreachable) and the FR-014 service
 *   worker stored the draft locally (HTTP 202). The case is NOT created yet but
 *   WILL be sent by background sync, so this must never be reported as a
 *   failure. The wizard resets and mints a new key so the user cannot edit and
 *   resubmit under the already-queued key (which would silently discard the
 *   edits via idempotent replay).
 * - `error` — real failure: every input stays in the wizard store and a retry
 *   reuses the SAME idempotency key (replay returns the same case, never a
 *   duplicate).
 */
export function useCreateCase() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isQueued, setIsQueued] = useState(false)

  const submit = async (): Promise<TCaseSubmitOutcome> => {
    const { draft, idempotencyKey, resetAfterSuccess, markQueued } =
      useCaseWizardStore.getState()
    const assistedSessionId = useAssistedStore.getState().sessionId

    setIsSubmitting(true)
    setError(null)
    try {
      const payload = buildCaseCreatePayload(draft, assistedSessionId)
      const response = await casesService.create(payload, idempotencyKey)

      // Service-worker queue acknowledgement (202): draft stored on device.
      // Mark in the store first — resetAfterSuccess returns the wizard to step
      // 1, unmounting this hook's consumer.
      if (response?.data?.queued === true) {
        markQueued()
        setIsQueued(true)
        resetAfterSuccess()
        return 'queued'
      }

      const created = response?.data?.case
      if (!created?.caseId) {
        setError(GENERIC_ERROR_MESSAGE)
        return 'error'
      }
      resetAfterSuccess()
      navigate(`/kasus/${created.caseId}/foto`, { state: { caseCode: created.caseCode } })
      return 'created'
    } catch (submitError: unknown) {
      setError(parseApiError(submitError).message)
      return 'error'
    } finally {
      setIsSubmitting(false)
    }
  }

  return { submit, isSubmitting, error, isQueued }
}
