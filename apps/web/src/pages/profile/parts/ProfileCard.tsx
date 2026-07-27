import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { AccountStatus, SiagaProfile } from '@/types/siaga-auth'
import { ConsentIndicator } from './ConsentIndicator'

const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  mandiri: 'Mandiri',
  didampingi: 'Didampingi',
  locked: 'Terkunci',
  inactive: 'Nonaktif',
}

interface ProfileCardProps {
  profile: SiagaProfile
  onEdit: () => void
}

/** Profil ringkas: nama panggilan, area domisili, status akun, indikator consent. */
export function ProfileCard({ profile, onEdit }: ProfileCardProps) {
  const areaLabel =
    [profile.areaKecamatan, profile.areaKabupaten].filter(Boolean).join(', ') || 'Area belum diisi'

  return (
    <Card className="rounded-3xl border-border-primary" data-testid="profile-card">
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary-deep">
            <i className="ph-fill ph-user text-h4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-h6 font-bold text-font-primary">{profile.displayName}</p>
            <p className="flex items-center gap-1 text-body-md text-font-secondary">
              <i className="ph ph-map-pin" aria-hidden="true" />
              {areaLabel}
            </p>
            <Badge
              data-testid="account-status-badge"
              className="mt-2 rounded-lg border-neutral-soft bg-neutral-light text-label-sm font-medium text-font-primary"
            >
              Akun {ACCOUNT_STATUS_LABELS[profile.accountStatus]}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ConsentIndicator
            label="Izin berbagi lokasi"
            isGranted={profile.locationConsent}
            testId="consent-location"
          />
          <ConsentIndicator
            label="Izin data untuk riset"
            isGranted={profile.researchConsent}
            testId="consent-research"
          />
        </div>

        <Button type="button" variant="outline" size="lg" className="w-full rounded-xl font-semibold" onClick={onEdit}>
          <i className="ph ph-pencil-simple text-h6" aria-hidden="true" />
          Ubah Profil
        </Button>
      </CardContent>
    </Card>
  )
}
