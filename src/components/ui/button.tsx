import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  asChild?: boolean;
  isLoading?: boolean;
}

function Slot({ children, className, ...props }: React.PropsWithChildren<{ className?: string } & Record<string, unknown>>) {
  if (React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: cn(className, (children.props as Record<string, unknown>).className as string | undefined),
      ...props,
    } as React.HTMLAttributes<HTMLElement>);
  }
  return children;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, isLoading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px disabled:pointer-events-none disabled:opacity-55 disabled:active:translate-y-0",
          {
            'bg-blue-600 text-white shadow-sm shadow-blue-950/10 hover:bg-blue-700': variant === 'default' || variant === 'primary',
            'bg-slate-100 text-slate-900 shadow-sm shadow-slate-950/5 hover:bg-slate-200': variant === 'secondary',
            'border border-slate-300 bg-white text-slate-700 shadow-sm shadow-slate-950/5 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950': variant === 'outline',
            'text-slate-600 hover:bg-slate-100 hover:text-slate-950': variant === 'ghost',
            'bg-rose-600 text-white shadow-sm shadow-rose-950/10 hover:bg-rose-700': variant === 'destructive',
            'bg-emerald-600 text-white shadow-sm shadow-emerald-950/10 hover:bg-emerald-700': variant === 'success',
            'bg-amber-500 text-white shadow-sm shadow-amber-950/10 hover:bg-amber-600': variant === 'warning',
            'h-9 px-3 text-xs': size === 'sm',
            'h-10 px-4 py-2': size === 'default',
            'h-11 px-5 text-base': size === 'lg',
            'h-10 w-10 p-0': size === 'icon',
          },
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && !asChild ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
        ) : null}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button }
