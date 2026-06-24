import React from 'react'
import { FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex min-h-[280px] flex-col items-center justify-center rounded-[14px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center sm:min-h-[340px] sm:p-8", className)}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm shadow-slate-950/[0.03]">
        {icon || <FolderOpen className="h-6 w-6 text-slate-500" />}
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-slate-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
