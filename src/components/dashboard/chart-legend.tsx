import { cn } from "@/lib/utils";

export type ChartLegendItem = {
  id: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
};

export function ChartLegend({ items, className }: { items: ChartLegendItem[]; className?: string }) {
  return (
    <ul className={cn("grid min-w-0 grid-cols-1 gap-2", className)} aria-label="Chú thích biểu đồ">
      {items.map((item) => (
        <li key={item.id} className="flex min-w-0 items-start gap-2 rounded-lg border border-slate-200/80 bg-white px-2.5 py-2">
          <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
          <span className="min-w-0 flex-1 text-xs font-semibold leading-4 text-slate-700">{item.label}</span>
          <span className="shrink-0 text-right text-xs font-bold tabular-nums text-slate-950">
            {item.count} <span className="font-medium text-slate-500">({item.percentage}%)</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
