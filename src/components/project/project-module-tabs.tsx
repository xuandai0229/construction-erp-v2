"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Table, Calendar, BarChart2, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProjectModuleTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  const tabs = [
    {
      href: `/projects/${projectId}/field-progress`,
      exact: true,
      icon: Table,
      labelDesktop: "Bảng khối lượng gốc",
      labelMobile: "Bảng gốc",
    },
    {
      href: `/projects/${projectId}/field-progress/daily`,
      exact: false,
      icon: Calendar,
      labelDesktop: "Nhập khối lượng theo ngày",
      labelMobile: "Theo ngày",
    },
    {
      href: `/projects/${projectId}/field-progress/summary`,
      exact: false,
      icon: BarChart2,
      labelDesktop: "Tổng hợp khối lượng",
      labelMobile: "Tổng hợp",
    },
    {
      href: `/projects/${projectId}/material-requests`,
      exact: false,
      icon: Package,
      labelDesktop: "Đề xuất vật tư",
      labelMobile: "Vật tư",
    },
  ];

  return (
    <div className="w-full">
      {/* Mobile view (< 640px): 2x2 grid */}
      <div className="grid grid-cols-2 gap-2 sm:hidden w-full">
        {tabs.map((tab) => {
          const isActive = tab.exact 
            ? pathname === tab.href 
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "h-10 px-2 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 ease-out min-w-0 w-full",
                isActive
                  ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100"
              )}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.labelMobile}</span>
            </Link>
          );
        })}
      </div>

      {/* Desktop view (>= 640px): Horizontal tabs */}
      <div className="hidden sm:flex flex-row items-center gap-2 w-full overflow-x-auto pb-1 -mb-1 hide-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.exact 
            ? pathname === tab.href 
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "h-10 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 ease-out whitespace-nowrap shrink-0",
                isActive
                  ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100"
              )}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              <span>{tab.labelDesktop}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
