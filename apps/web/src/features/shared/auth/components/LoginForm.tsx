import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { siagaAuthService } from '@/services/siaga-auth.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { loginSchema, type TLoginFormValues } from '../auth.schema'
import { buildLoginErrorMessage, LOGIN_FAILED_MESSAGE } from '../utils/login-error'

interface LoginFormProps {
  /** Called after the store is populated — the caller decides where to navigate. */
  onSuccess?: () => void
  submitLabel?: string
}

const INPUT_CLASSES =
  'h-12 rounded-md border-border-primary bg-background-primary text-body-lg text-font-primary placeholder:text-font-placeholder focus-visible:ring-1 focus-visible:ring-primary-base'

/**
 * Credential form shared by the login page and the session-expired re-login
 * modal. Large touch targets (≥44px) — primary users are petani on phones.
 */
export function LoginForm({ onSuccess, submitLabel = 'Masuk' }: LoginFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const setAuth = useAuthStore((state) => state.setAuth)

  const form = useForm<TLoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: TLoginFormValues) => {
    setServerError(null)
    try {
      const response = await siagaAuthService.login(values)
      const result = response?.data
      if (!result?.session?.accessToken || !result?.profile) {
        setServerError(LOGIN_FAILED_MESSAGE)
        return
      }
      setAuth({ session: result.session, profile: result.profile })
      onSuccess?.()
    } catch (error: unknown) {
      setServerError(buildLoginErrorMessage(error))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
        {serverError && (
          <Alert variant="destructive" className="rounded-lg">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-label-md font-medium text-font-primary">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="nama@contoh.id"
                    className={INPUT_CLASSES}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-body-sm text-error-base" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-label-md font-medium text-font-primary">Kata Sandi</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={isPasswordVisible ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Kata sandi Anda"
                      className={`${INPUT_CLASSES} pr-12`}
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible((visible) => !visible)}
                      aria-label={isPasswordVisible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-font-secondary hover:text-font-primary"
                    >
                      <i className={`ph ${isPasswordVisible ? 'ph-eye-slash' : 'ph-eye'} text-h6`} aria-hidden="true" />
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-body-sm text-error-base" />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={form.formState.isSubmitting}
          className="w-full rounded-xl text-body-lg font-semibold"
        >
          {form.formState.isSubmitting ? (
            <>
              <i className="ph ph-circle-notch animate-spin text-h6" aria-hidden="true" />
              Memproses…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </Form>
  )
}
