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
    <div className={cn("flex min-h-[280px] flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--input-border)] bg-[var(--surface)] px-5 py-10 text-center sm:min-h-[340px] sm:p-8", className)}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] shadow-[var(--shadow-card)]">
        {icon || <FolderOpen className="h-6 w-6 text-[var(--muted-foreground)]" />}
      </div>
      <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      {description && <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
