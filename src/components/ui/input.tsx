import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-[hsl(var(--border))] bg-white/90 dark:bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]/50 focus:border-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
