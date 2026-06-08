import React from 'react'
import { FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, className }: EmptyStateProps) {
  return (
    <div className={cn("flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center", className)}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
        {icon || <FolderOpen className="h-6 w-6 text-slate-500" />}
      </div>
      <h3 className="mt-2 text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">{description}</p>}
    </div>
  )
}
