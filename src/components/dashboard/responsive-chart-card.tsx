import type { HTMLAttributes, ReactNode } from "react";
import { ContentCard } from "@/components/ui/enterprise";
import { cn } from "@/lib/utils";

type ResponsiveChartCardProps = {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "title" | "children">;

export function ResponsiveChartCard({
  title,
  description,
  action,
  children,
  className,
  ...cardProps
}: ResponsiveChartCardProps) {
  return (
    <ContentCard className={cn("grid min-w-0 grid-rows-[auto_minmax(0,1fr)]", className)} {...cardProps}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="min-w-0">
          <h3 className="text-sm font-bold tracking-tight text-slate-950 sm:text-base">{title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </ContentCard>
  );
}
