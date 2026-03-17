import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-[color,box-shadow] placeholder:text-muted-foreground/70 outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
