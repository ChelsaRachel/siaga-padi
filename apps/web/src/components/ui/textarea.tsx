import * as React from 'react'

import { cn } from '@/utils/cn'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full border border-border-primary bg-background-secondary px-3 py-2.5 font-sans text-body-lg font-regular text-font-primary placeholder:text-font-placeholder focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }
