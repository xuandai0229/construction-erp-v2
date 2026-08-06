"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Network,
  Briefcase,
  FileText,
  Award,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HR_TABS = [
  { id: "overview", label: "Tổng quan nhân sự", href: "/hr", icon: LayoutDashboard, implemented: true },
  { id: "employees", label: "Hồ sơ nhân viên", href: "/hr/employees", icon: Users, implemented: true },
  { id: "organization", label: "Cơ cấu tổ chức và phòng ban", href: "/hr/organization", icon: Network, implemented: true },
  { id: "assignments", label: "Điều động công trình", href: "/hr/project-assignments", icon: Briefcase, implemented: true },
  { id: "contracts", label: "Hợp đồng", href: "/hr/contracts", icon: FileText, implemented: false },
  { id: "certificates", label: "Chứng chỉ và bằng cấp", href: "/hr/certificates", icon: Award, implemented: false },
  { id: "alerts", label: "Cảnh báo", href: "/hr/alerts", icon: AlertTriangle, implemented: false },
];

export function HrWorkspaceTabs() {
  const pathname = usePathname();
  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [pathname]);

  return (
    <div className="relative mb-6 rounded-xl border border-slate-200 bg-white shadow-xs">
      <div
        ref={containerRef}
        className="hide-scrollbar flex w-full min-w-0 items-center gap-1 overflow-x-auto p-1.5 pr-6 scroll-smooth"
      >
        {HR_TABS.map((tab) => {
          const isActive = tab.href === "/hr" ? pathname === "/hr" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.id}
              id={`hr-tab-${tab.id}`}
              ref={isActive ? activeTabRef : null}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              onFocus={(e) => {

                e.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "nearest",
                });
              }}

              className={cn(
                "flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap scroll-mx-2 transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500",
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <tab.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
              <span>{tab.label}</span>
              {!tab.implemented && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600 shrink-0">
                  Sắp có
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
