import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { KbAudience, KbPolicyFlag, SiagaKbChunk } from '@/types/siaga-kb'
import {
  AUDIENCE_LABELS,
  DISEASE_LABELS,
  DISEASE_ORDER,
  PHASE_LABELS,
  PHASE_ORDER,
  POLICY_FLAG_LABELS,
  POLICY_FLAG_ORDER,
} from '../../kb-labels'
import { useKbReviewStore } from '../store/useKbReviewStore'

interface ChunkDecisionBarProps {
  chunk: SiagaKbChunk
}

const NO_FLAG_VALUE = 'tidak_ada'
const REASON_REQUIRED_MESSAGE = 'Alasan penolakan wajib diisi.'
const POLICY_FLAG_PENDING_MESSAGE =
  'Potongan ini memuat dosis/merek — pilih penanda kebijakan dulu.'

function toggle(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

/**
 * Approve / reject bar with the tag editor.
 *
 * The reject reason is required client-side AND server-side: the button stays
 * disabled without one, and the API refuses anyway — a governance trail with
 * blank reasons is worthless. The policy-flag control is pre-selected from
 * `requiredPolicyFlag` so the common case is one click, while the API remains
 * the authority that refuses an unflagged dosage chunk.
 */
export function ChunkDecisionBar({ chunk }: ChunkDecisionBarProps) {
  const { isDeciding, decisionError, approveChunk, rejectChunk } = useKbReviewStore()

  const [policyFlag, setPolicyFlag] = useState<string>(NO_FLAG_VALUE)
  const [diseaseTags, setDiseaseTags] = useState<string[]>([])
  const [phaseTags, setPhaseTags] = useState<string[]>([])
  const [audience, setAudience] = useState<KbAudience>('penyuluh')
  const [reason, setReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  useEffect(() => {
    setPolicyFlag(chunk.policyFlag ?? chunk.requiredPolicyFlag ?? NO_FLAG_VALUE)
    setDiseaseTags(chunk.diseaseTags)
    setPhaseTags(chunk.phaseTags)
    setAudience(chunk.audience)
    setReason('')
    setIsRejecting(false)
  }, [chunk])

  const isPolicyFlagMissing =
    Boolean(chunk.requiredPolicyFlag) && policyFlag === NO_FLAG_VALUE
  const isReasonMissing = reason.trim().length === 0

  const handleApprove = () => {
    approveChunk(chunk.chunkId, {
      policyFlag:
        policyFlag === NO_FLAG_VALUE ? undefined : (policyFlag as KbPolicyFlag),
      diseaseTags,
      phaseTags,
      audience,
    })
  }

  const handleReject = () => {
    if (isReasonMissing) {
      return
    }
    rejectChunk(chunk.chunkId, reason.trim())
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-border-secondary bg-background-secondary p-4"
      aria-label="Keputusan potongan"
      data-testid="kb-decision-bar"
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-label-md font-medium text-font-primary">
          Penanda kebijakan
        </span>
        <select
          className="h-11 rounded-xl border border-border-primary bg-background-primary px-3 text-body-md text-font-primary"
          value={policyFlag}
          onChange={(event) => setPolicyFlag(event.target.value)}
          data-testid="kb-decision-policy-flag"
          id="kb-decision-policy-flag"
          name="policyFlag"
          aria-label="Penanda kebijakan"
        >
          <option value={NO_FLAG_VALUE}>Tidak ada penanda</option>
          {POLICY_FLAG_ORDER.map((flag) => (
            <option key={flag} value={flag}>
              {POLICY_FLAG_LABELS[flag]}
            </option>
          ))}
        </select>
        {isPolicyFlagMissing && (
          <p
            className="text-body-sm text-warning-deep"
            data-testid="kb-decision-flag-hint"
          >
            {POLICY_FLAG_PENDING_MESSAGE}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-label-md font-medium text-font-primary">Penyakit</legend>
        <div className="flex flex-wrap gap-2">
          {DISEASE_ORDER.map((tag) => (
            <Button
              key={tag}
              type="button"
              variant={diseaseTags.includes(tag) ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              aria-pressed={diseaseTags.includes(tag)}
              onClick={() => setDiseaseTags((current) => toggle(current, tag))}
              data-testid={`kb-decision-disease-${tag}`}
            >
              {DISEASE_LABELS[tag]}
            </Button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-label-md font-medium text-font-primary">Fase</legend>
        <div className="flex flex-wrap gap-2">
          {PHASE_ORDER.map((tag) => (
            <Button
              key={tag}
              type="button"
              variant={phaseTags.includes(tag) ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              aria-pressed={phaseTags.includes(tag)}
              onClick={() => setPhaseTags((current) => toggle(current, tag))}
              data-testid={`kb-decision-phase-${tag}`}
            >
              {PHASE_LABELS[tag]}
            </Button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <span className="text-label-md font-medium text-font-primary">Audiens</span>
        <select
          className="h-11 w-48 rounded-xl border border-border-primary bg-background-primary px-3 text-body-md text-font-primary"
          value={audience}
          onChange={(event) => setAudience(event.target.value as KbAudience)}
          data-testid="kb-decision-audience"
          id="kb-decision-audience"
          name="audience"
          aria-label="Audiens"
        >
          {(Object.keys(AUDIENCE_LABELS) as KbAudience[]).map((option) => (
            <option key={option} value={option}>
              {AUDIENCE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      {isRejecting && (
        <div className="flex flex-col gap-1.5">
          <span className="text-label-md font-medium text-font-primary">
            Alasan penolakan (wajib)
          </span>
          <Textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Memuat merek dagang"
            className="rounded-xl border-border-primary bg-background-primary text-body-md"
            data-testid="kb-decision-reason"
            aria-label="Alasan penolakan"
          />
          {isReasonMissing && (
            <p
              className="text-body-sm text-error-deep"
              data-testid="kb-decision-reason-hint"
            >
              {REASON_REQUIRED_MESSAGE}
            </p>
          )}
        </div>
      )}

      {decisionError && (
        <Alert variant="destructive" data-testid="kb-decision-error">
          <AlertDescription>{decisionError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="rounded-xl font-semibold"
          disabled={isDeciding}
          onClick={handleApprove}
          data-testid="kb-decision-approve"
        >
          {isDeciding ? 'Memproses…' : 'Setujui'}
        </Button>
        {isRejecting ? (
          <>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl font-semibold"
              disabled={isDeciding || isReasonMissing}
              onClick={handleReject}
              data-testid="kb-decision-reject-confirm"
            >
              Tolak potongan
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => setIsRejecting(false)}
            >
              Batal
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl font-semibold"
            disabled={isDeciding}
            onClick={() => setIsRejecting(true)}
            data-testid="kb-decision-reject"
          >
            Tolak…
          </Button>
        )}
      </div>
    </section>
  )
}
