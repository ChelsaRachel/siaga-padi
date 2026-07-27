import { useEffect, useState } from 'react'
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { farmerProfileService } from '@/services/farmer-profile.service'
import { useAuthStore } from '@/stores/useAuthStore'
import type { SiagaProfile } from '@/types/siaga-auth'
import { GENERIC_ERROR_MESSAGE, parseApiError } from '@/utils/parse-api-error'
import { profileSchema, type TProfileFormValues } from '../profile.schema'

interface ProfileEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: SiagaProfile
}

const INPUT_CLASSES =
  'h-12 rounded-xl border-border-primary bg-background-primary text-body-lg text-font-primary placeholder:text-font-placeholder focus-visible:ring-1 focus-visible:ring-primary-base'

function toFormValues(profile: SiagaProfile): TProfileFormValues {
  return {
    displayName: profile.displayName,
    areaKabupaten: profile.areaKabupaten ?? '',
    areaKecamatan: profile.areaKecamatan ?? '',
    locationConsent: profile.locationConsent,
    researchConsent: profile.researchConsent,
  }
}

/** Edit profil sendiri (PUT apps/farmer/profile) — tanpa field NIK/KTP apa pun. */
export function ProfileEditDialog({ open, onOpenChange, profile }: ProfileEditDialogProps) {
  const setProfile = useAuthStore((state) => state.setProfile)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<TProfileFormValues>({
    resolver: yupResolver(profileSchema),
    defaultValues: toFormValues(profile),
  })

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(profile))
      setServerError(null)
    }
  }, [open, profile, form])

  const onSubmit = async (values: TProfileFormValues) => {
    setServerError(null)
    try {
      const response = await farmerProfileService.updateProfile({
        displayName: values.displayName,
        areaKabupaten: values.areaKabupaten,
        areaKecamatan: values.areaKecamatan,
        locationConsent: values.locationConsent,
        researchConsent: values.researchConsent,
      })
      const updated = response?.data
      if (!updated?.profileId) {
        setServerError(GENERIC_ERROR_MESSAGE)
        return
      }
      setProfile(updated)
      onOpenChange(false)
    } catch (updateError: unknown) {
      setServerError(parseApiError(updateError).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-h6 font-bold text-font-primary">Ubah Profil</DialogTitle>
          <DialogDescription className="text-body-md text-font-secondary">
            Nama panggilan dan area domisili. Izin dapat diubah kapan saja.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            {serverError && (
              <Alert variant="destructive" data-testid="profile-form-error">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-label-md font-medium text-font-primary">Nama panggilan</FormLabel>
                  <FormControl>
                    <Input placeholder="cth. Pak Budi" className={INPUT_CLASSES} {...field} />
                  </FormControl>
                  <FormMessage className="text-body-sm text-error-base" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="areaKabupaten"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-label-md font-medium text-font-primary">Kabupaten</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Karawang" className={INPUT_CLASSES} {...field} />
                    </FormControl>
                    <FormMessage className="text-body-sm text-error-base" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="areaKecamatan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-label-md font-medium text-font-primary">Kecamatan</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Rengasdengklok" className={INPUT_CLASSES} {...field} />
                    </FormControl>
                    <FormMessage className="text-body-sm text-error-base" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="locationConsent"
              render={({ field }) => (
                <FormItem className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border-primary p-3">
                  <FormLabel className="text-body-md font-medium text-font-primary">
                    Izin berbagi lokasi
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Izin berbagi lokasi"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="researchConsent"
              render={({ field }) => (
                <FormItem className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border-primary p-3">
                  <FormLabel className="text-body-md font-medium text-font-primary">
                    Izin data untuk riset
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Izin data untuk riset"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              size="lg"
              disabled={form.formState.isSubmitting}
              className="w-full rounded-xl text-body-lg font-semibold"
            >
              {form.formState.isSubmitting ? (
                <>
                  <i className="ph ph-circle-notch animate-spin text-h6" aria-hidden="true" />
                  Menyimpan…
                </>
              ) : (
                'Simpan Profil'
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
