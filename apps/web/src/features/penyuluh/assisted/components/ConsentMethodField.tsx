import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CONSENT_METHOD_OPTIONS } from '../assisted.constants'

interface ConsentMethodFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
}

/** Radio picker (lisan / tertulis / in-app) with ≥44px touch targets. */
export function ConsentMethodField<TFieldValues extends FieldValues>({
  control,
  name,
}: ConsentMethodFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-label-md font-medium text-font-primary">
            Metode persetujuan petani
          </FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              value={typeof field.value === 'string' ? field.value : ''}
              className="gap-2"
            >
              {CONSENT_METHOD_OPTIONS.map((option) => (
                <Label
                  key={option.value}
                  htmlFor={`consent-${option.value}`}
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border-primary bg-background-primary p-3 transition-colors hover:bg-muted has-[[data-state=checked]]:border-primary-base has-[[data-state=checked]]:bg-accent"
                >
                  <RadioGroupItem
                    id={`consent-${option.value}`}
                    value={option.value}
                    className="mt-0.5 size-5 shrink-0 rounded-full"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-body-md font-semibold text-font-primary">{option.label}</span>
                    <span className="text-body-sm font-normal text-font-secondary">{option.description}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage className="text-body-sm text-error-base" />
        </FormItem>
      )}
    />
  )
}
