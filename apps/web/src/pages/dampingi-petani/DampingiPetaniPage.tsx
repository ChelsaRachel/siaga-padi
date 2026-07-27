import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AssistedSearchDialog } from '@/features/penyuluh/assisted'
import { selectAssistedSubject, selectIsAssistedActive, useAssistedStore } from '@/stores/useAssistedStore'

/**
 * Penyuluh entry point for assisted mode. Opens the search modal; while a
 * session is active the persistent shell banner (visible on every screen)
 * carries the "atas nama" state and the exit action.
 */
function DampingiPetaniPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const isActive = useAssistedStore(selectIsAssistedActive)
  const subject = useAssistedStore(selectAssistedSubject)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-h4 font-bold text-font-primary">Dampingi Petani</h1>
        <p className="mt-1 text-body-md text-font-secondary">
          Bantu petani binaan Anda memeriksa tanaman dengan bertindak atas nama mereka.
        </p>
      </div>

      {isActive && subject ? (
        <Card className="rounded-2xl border-secondary-soft bg-secondary-light">
          <CardContent className="flex flex-col gap-2 py-5">
            <p className="flex items-center gap-2 text-body-lg font-semibold text-font-primary">
              <i className="ph-fill ph-handshake text-h5 text-secondary-bold" aria-hidden="true" />
              Sedang mendampingi: {subject.displayName}
            </p>
            <p className="text-body-md text-font-secondary">
              Semua tindakan Anda tercatat atas nama petani ini. Gunakan tombol
              &ldquo;Akhiri Mode&rdquo; pada banner di atas untuk mengakhiri sesi.
            </p>
            <Button asChild size="lg" className="mt-1 w-full rounded-xl font-semibold sm:w-auto">
              <Link to="/periksa-tanaman">
                <i className="ph ph-camera text-h6" aria-hidden="true" />
                Periksa Tanaman atas nama {subject.displayName}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-start gap-4 py-6">
            <p className="text-body-md text-font-secondary">
              Cari petani di wilayah binaan Anda, atau buat profil minimal bila petani belum
              terdaftar. Setiap sesi pendampingan dicatat beserta metode persetujuannya.
            </p>
            <Button size="lg" onClick={() => setIsDialogOpen(true)} className="rounded-xl font-semibold">
              <i className="ph ph-magnifying-glass text-h6" aria-hidden="true" />
              Cari Petani Binaan
            </Button>
          </CardContent>
        </Card>
      )}

      <AssistedSearchDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  )
}

export default DampingiPetaniPage
