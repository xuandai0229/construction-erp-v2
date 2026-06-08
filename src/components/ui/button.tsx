import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2",
          {
            'bg-blue-600 text-white hover:bg-blue-700': variant === 'default',
            'border border-slate-300 bg-transparent hover:bg-slate-100 text-slate-900': variant === 'outline',
            'hover:bg-slate-100 hover:text-slate-900 text-slate-700': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700': variant === 'destructive',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
