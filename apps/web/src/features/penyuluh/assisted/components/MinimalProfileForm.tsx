import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { minimalProfileSchema, type TMinimalProfileFormValues } from '../assisted.schema'
import { ConsentMethodField } from './ConsentMethodField'

interface MinimalProfileFormProps {
  onSubmit: (values: TMinimalProfileFormValues) => Promise<void> | void
  isSubmitting: boolean
}

const INPUT_CLASSES =
  'h-12 rounded-md border-border-primary bg-background-primary text-body-lg text-font-primary placeholder:text-font-placeholder focus-visible:ring-1 focus-visible:ring-primary-base'

/**
 * Minimal-profile form: nama panggilan + kabupaten/kecamatan + consent.
 * NO national-ID field — privacy by design (contract: assisted/start
 * creates `accountStatus: "didampingi"` without credentials).
 */
export function MinimalProfileForm({ onSubmit, isSubmitting }: MinimalProfileFormProps) {
  const form = useForm<TMinimalProfileFormValues>({
    resolver: yupResolver(minimalProfileSchema),
    defaultValues: {
      displayName: '',
      areaKabupaten: '',
      areaKecamatan: '',
      consentMethod: undefined,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onSubmit(values))} noValidate className="space-y-4">
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

        <ConsentMethodField control={form.control} name="consentMethod" />

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="w-full rounded-xl text-body-lg font-semibold"
        >
          {isSubmitting ? (
            <>
              <i className="ph ph-circle-notch animate-spin text-h6" aria-hidden="true" />
              Memproses…
            </>
          ) : (
            'Buat Profil & Mulai Dampingi'
          )}
        </Button>
      </form>
    </Form>
  )
}
