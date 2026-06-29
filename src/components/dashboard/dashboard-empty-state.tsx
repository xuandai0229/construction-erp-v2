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
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center", className)}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm leading-6 text-slate-600">{description}</p>}
    </div>
  );
}
