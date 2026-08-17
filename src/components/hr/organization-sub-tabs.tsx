"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Network, Building2, ShieldCheck } from "lucide-react";

export function OrganizationSubTabs() {
  const searchParams = useSearchParams();
  const activeTabRef = useRef<HTMLAnchorElement>(null);

  const activeTab = searchParams.get("tab") || "chart";

  const tabs = [
    {
      id: "hr-tab-org-chart",
      label: "Sơ đồ tổ chức",
      href: "/hr/organization?tab=chart",
      tabKey: "chart",
      icon: Network,
    },
    {
      id: "hr-tab-units",
      label: "Phòng ban",
      href: "/hr/organization?tab=units",
      tabKey: "units",
      icon: Building2,
    },
    {
      id: "hr-tab-positions",
      label: "Chức danh",
      href: "/hr/organization?tab=positions",
      tabKey: "positions",
      icon: ShieldCheck,
    },
  ];

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeTab]);

  return (
    <nav className="flex items-center gap-1 border-b border-slate-200 bg-slate-50/50 p-1.5 rounded-xl mb-4 overflow-x-auto hide-scrollbar scroll-smooth">
      {tabs.map((tab) => {
        const active = activeTab === tab.tabKey;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            id={tab.id}
            ref={active ? activeTabRef : null}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap scroll-mx-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
              active
                ? "bg-white text-blue-700 shadow-xs border border-slate-200"
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
