import * as React from 'react'

import { cn } from '@/utils/cn'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full border border-border-primary bg-background-secondary px-3 py-2.5 font-sans text-body-lg font-regular text-font-primary placeholder:text-font-placeholder focus:border-primary focus:outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-font-primary disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
