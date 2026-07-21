import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center text-label-sm font-medium px-1.5 py-0.5 transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-font-on-accent',
        secondary: 'bg-secondary-light text-secondary-bold',
        destructive: 'bg-error-light text-error-bold',
        outline: 'border border-border-primary text-font-secondary',
        success: 'bg-success-light text-success',
        warning: 'bg-warning-light text-warning',
        info: 'bg-info-light text-info',
        neutral: 'bg-neutral-soft text-font-secondary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
