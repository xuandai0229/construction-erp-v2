"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Network, Building2, UserCheck, ShieldCheck } from "lucide-react";

export function OrganizationSubTabs() {
  const pathname = usePathname();
  const activeTabRef = useRef<HTMLAnchorElement>(null);

  const tabs = [
    {
      id: "hr-tab-organization-tree",
      label: "Đơn vị / phòng ban",
      href: "/hr/organization",
      exact: true,
      icon: Building2,
    },
    {
      id: "hr-tab-positions",
      label: "Danh mục chức danh",
      href: "/hr/organization/positions",
      icon: ShieldCheck,
    },
    {
      id: "hr-tab-unit-managers",
      label: "Người quản lý đơn vị",
      href: "/hr/organization/managers",
      icon: UserCheck,
    },
    {
      id: "hr-tab-org-chart",
      label: "Sơ đồ tổ chức",
      href: "/hr/organization/chart",
      icon: Network,
    },
  ];

  const isActive = (tab: (typeof tabs)[0]) => {
    if (tab.exact) {
      return pathname === "/hr/organization" || pathname === "/hr/organization/units";
    }
    return pathname.startsWith(tab.href);
  };

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
    <nav className="flex items-center gap-1 border-b border-slate-200 bg-slate-50/50 p-1.5 rounded-xl mb-4 overflow-x-auto hide-scrollbar scroll-smooth">
      {tabs.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            id={tab.id}
            ref={active ? activeTabRef : null}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            onFocus={(e) => {
              e.currentTarget.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "nearest",
              });
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap scroll-mx-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
              active
                ? "bg-white text-blue-700 shadow-xs border border-slate-200 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${active ? "text-blue-600" : "text-slate-400"}`} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
