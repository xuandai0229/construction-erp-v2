import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardEmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-4 py-8 text-center", className)}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)]">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>}
    </div>
  );
}
