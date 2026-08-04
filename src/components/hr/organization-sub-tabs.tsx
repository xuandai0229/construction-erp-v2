"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Network, Building2, UserCheck, ShieldCheck } from "lucide-react";

export function OrganizationSubTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      id: "units",
      label: "Cơ cấu tổ chức và phòng ban",
      href: "/hr/organization",
      exact: true,
      icon: Building2,
    },
    {
      id: "positions",
      label: "Danh mục chức danh",
      href: "/hr/organization/positions",
      icon: ShieldCheck,
    },
    {
      id: "managers",
      label: "Người quản lý đơn vị",
      href: "/hr/organization/managers",
      icon: UserCheck,
    },
    {
      id: "chart",
      label: "Sơ đồ tổ chức trực quan",
      href: "/hr/organization/chart",
      icon: Network,
    },
  ];

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.exact) {
      return pathname === "/hr/organization" || pathname === "/hr/organization/units";
    }
    return pathname.startsWith(tab.href);
  };

  return (
    <nav className="flex items-center gap-1 border-b border-slate-200 bg-slate-50/50 p-1.5 rounded-xl mb-4 overflow-x-auto">
      {tabs.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              active
                ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Icon className={`w-4 h-4 ${active ? "text-blue-600" : "text-slate-400"}`} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
