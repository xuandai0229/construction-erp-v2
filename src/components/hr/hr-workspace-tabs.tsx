"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Network,
  Briefcase,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EnterpriseTabs, type TabItem } from "@/components/ui/enterprise";

const HR_TABS: Array<TabItem & { href: string }> = [
  { id: "overview", label: "Tổng quan", href: "/hr", icon: LayoutDashboard },
  { id: "employees", label: "Nhân sự", href: "/hr/employees", icon: Users },
  { id: "organization", label: "Phòng ban & Chức danh", href: "/hr/organization", icon: Network },
  { id: "assignments", label: "Điều động công trình", href: "/hr/project-assignments", icon: Briefcase },
  { id: "reports", label: "Báo cáo", href: "/hr/reports", icon: BarChart3 },
];

type HrWorkspaceTabsProps = {
  /** A page-level action belongs to the contextual right side of the HR workspace navigation. */
  rightContent?: React.ReactNode;
  className?: string;
};

export function HrWorkspaceTabs({ rightContent, className }: HrWorkspaceTabsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = HR_TABS.find((tab) =>
    tab.href === "/hr" ? pathname === "/hr" : pathname.startsWith(tab.href),
  )?.id ?? "overview";

  return (
    <EnterpriseTabs
      tabs={HR_TABS}
      activeTab={activeTab}
      onChange={(tabId) => {
        const target = HR_TABS.find((tab) => tab.id === tabId);
        if (target && target.href !== pathname) router.push(target.href);
      }}
      rightContent={rightContent}
      className={cn("mb-6", className)}
    />
  );
}
