import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface ResumePhotoCardProps {
  caseId: string
  /** Earlier photos exist and were sent back — retake copy instead of resume. */
  isRetake: boolean
}

/**
 * Jalan masuk kembali ke alur foto. Tanpa ini kasus yang ditinggal di tengah
 * pengambilan foto tidak punya rute lanjut: alur foto hanya terbuka sekali,
 * tepat setelah kasus dibuat.
 */
export function ResumePhotoCard({ caseId, isRetake }: ResumePhotoCardProps) {
  const title = isRetake ? 'Perlu Foto Ulang' : 'Foto Belum Lengkap'
  const description = isRetake
    ? 'Foto sebelumnya belum bisa dipakai. Ambil foto baru mengikuti panduan di layar kamera.'
    : 'Kasus ini butuh minimal 2 foto daun yang layak agar bisa diperiksa.'
  const actionLabel = isRetake ? 'Foto Ulang' : 'Lanjutkan Foto'

  return (
    <section
      className="flex flex-col gap-3 rounded-3xl border border-primary-soft bg-primary-light px-5 py-5"
      aria-label={title}
      data-testid="resume-photo-card"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-base text-font-on-accent">
          <i className="ph ph-camera text-h5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-body-lg font-semibold text-primary-deep">{title}</h2>
          <p className="mt-1 text-body-md text-font-secondary">{description}</p>
        </div>
      </div>

      <Button asChild size="lg" className="w-full rounded-xl font-semibold sm:w-auto sm:self-start">
        <Link to={`/kasus/${caseId}/foto`}>
          <i className="ph ph-camera text-h6" aria-hidden="true" />
          {actionLabel}
        </Link>
      </Button>
    </section>
  )
}
