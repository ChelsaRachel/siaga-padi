'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <i className="ph ph-check-circle text-[16px]" aria-hidden="true" />,
        info: <i className="ph ph-info text-[16px]" aria-hidden="true" />,
        warning: <i className="ph ph-warning text-[16px]" aria-hidden="true" />,
        error: <i className="ph ph-x-octagon text-[16px]" aria-hidden="true" />,
        loading: <i className="ph ph-spinner text-[16px] animate-spin" aria-hidden="true" />,
      }}
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
