'use client'

import * as React from 'react'
import * as TogglePrimitive from '@radix-ui/react-toggle'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/utils/cn'

const toggleVariants = cva(
  'inline-flex items-center justify-center text-label-md font-medium transition-colors hover:bg-muted hover:text-font-primary focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-primary data-[state=on]:text-font-on-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 gap-2',
  {
    variants: {
      variant: {
        default: 'bg-transparent text-font-secondary',
        outline: 'border border-border-primary bg-transparent text-font-primary hover:bg-muted',
      },
      size: {
        default: 'h-10 px-3 min-w-10',
        sm: 'h-9 px-2.5 min-w-9',
        lg: 'h-11 px-5 min-w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ variant, size, className }))} {...props} />)

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }
