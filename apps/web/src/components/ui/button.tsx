import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/utils/cn'
import { useButtonGroup } from '@/components/ui/button-group'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-font-on-accent hover:bg-primary-bold',
        destructive: 'bg-error text-font-primary hover:bg-error-bold',
        outline: 'bg-background-primary border border-border-primary text-font-primary hover:bg-muted',
        secondary: 'bg-background-secondary border border-border-primary text-font-primary hover:bg-muted',
        ghost: 'text-primary hover:bg-muted',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2.5 text-body-sm',
        xs:      'h-7 px-2.5 text-label-sm',
        sm:      'h-9 px-3 text-body-sm',
        md:      'h-11 px-5 text-body-sm',
        lg:      'h-12 px-6 text-body-sm',
        icon:    'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const group = useButtonGroup()
  const resolvedVariant = variant ?? group.variant
  const resolvedSize = size ?? group.size
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant: resolvedVariant, size: resolvedSize, className }))} ref={ref} {...props} />
})
Button.displayName = 'Button'

export { Button, buttonVariants }
