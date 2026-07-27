import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FieldCard, FieldFormDialog, useFieldsStore } from '@/features/case/fields'
import { selectProfile, useAuthStore } from '@/stores/useAuthStore'
import type { SiagaField } from '@/types/siaga-case'
import { DeletionRequestSection } from './parts/DeletionRequestSection'
import { ProfileCard } from './parts/ProfileCard'
import { ProfileEditDialog } from './parts/ProfileEditDialog'

/**
 * Profil & Lahan — profile card (consent indicators), lahan gallery
 * (tambah/ubah; open lahan → riwayat kasus lahan itu via ?fieldId= preset),
 * and the honest deletion-request flow. NO national-ID field anywhere.
 */
function ProfilePage() {
  const profile = useAuthStore(selectProfile)
  const { fields, isLoading, error, fetchFields } = useFieldsStore()
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [isFieldFormOpen, setIsFieldFormOpen] = useState(false)
  const [fieldBeingEdited, setFieldBeingEdited] = useState<SiagaField | null>(null)

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  const openAddField = () => {
    setFieldBeingEdited(null)
    setIsFieldFormOpen(true)
  }

  const openEditField = (field: SiagaField) => {
    setFieldBeingEdited(field)
    setIsFieldFormOpen(true)
  }

  if (!profile) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Profil tidak ditemukan. Silakan masuk ulang.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-h4 font-bold text-font-primary">Profil</h1>
        <p className="mt-1 text-body-md text-font-secondary">
          Data diri, izin, dan daftar lahan Anda.
        </p>
      </div>

      <ProfileCard profile={profile} onEdit={() => setIsEditProfileOpen(true)} />

      <section aria-label="Daftar lahan" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-h6 font-bold text-font-primary">Lahan Saya</h2>
          <Button type="button" size="md" className="rounded-xl font-semibold" onClick={openAddField}>
            <i className="ph ph-plus text-h6" aria-hidden="true" />
            Tambah Lahan
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col items-start gap-2">
              {error}
              <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={fetchFields}>
                Coba lagi
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Memuat daftar lahan">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : fields.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <FieldCard key={field.fieldId} field={field} onEdit={openEditField} />
            ))}
          </div>
        ) : (
          !error && (
            <p className="rounded-2xl border border-dashed border-border-secondary bg-background-secondary p-5 text-center text-body-md text-font-secondary">
              Belum ada lahan tersimpan. Tambahkan lahan pertama Anda.
            </p>
          )
        )}
      </section>

      <DeletionRequestSection />

      <ProfileEditDialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen} profile={profile} />
      <FieldFormDialog open={isFieldFormOpen} onOpenChange={setIsFieldFormOpen} field={fieldBeingEdited} />
    </div>
  )
}

export default ProfilePage
