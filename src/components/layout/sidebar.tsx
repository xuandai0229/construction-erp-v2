"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FolderOpen,
  ClipboardCheck,
  Package,
  CheckSquare,
  Settings,
  UserCog,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";
import styles from "./sidebar.module.css";
import { canViewNavigationItem, projectNavName } from "@/lib/navigation-permissions";
import {
  canAccessExecutiveDashboard,
  getDefaultNavigationHrefForRole,
  getDefaultRouteForRole,
} from "@/lib/roles/role-workspace-policy";

const navigationSections = [
  {
    label: null,
    items: [{ name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "NHÂN SỰ",
    items: [
      { name: "Quản lý nhân sự", href: "/hr", icon: Users },
    ],
  },
  {
    label: "QUẢN LÝ",
    items: [
      { name: "Công trình", href: "/projects", icon: Building2 },
      { name: "Tài liệu", href: "/documents", icon: FolderOpen },
      { name: "Báo cáo", href: "/reports", icon: ClipboardCheck },
      { name: "Vật tư", href: "/materials", icon: Package },
    ],
  },
  {
    label: "ĐIỀU HÀNH",
    items: [
      { name: "Phê duyệt", href: "/approvals", icon: CheckSquare },
    ],
  },
  {
    label: "HỆ THỐNG",
    items: [
      { name: "Tài khoản", href: "/users", icon: UserCog },
      { name: "Cài đặt", href: "/settings", icon: Settings },
    ],
  },
];

function getFilteredSections(role: UserRole, canAccessHr: boolean) {
  const sections = navigationSections
    .map((section) => {
      const items = section.items
        .filter((item) => (item.href !== "/hr" || canAccessHr) && canViewNavigationItem(role, item.href))
        .map((item) => ({ ...item, name: projectNavName(role, item.href, item.name) }));
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);

  if (canAccessExecutiveDashboard(role)) return sections;

  const defaultHref = getDefaultNavigationHrefForRole(role);
  return sections
    .map((section) => ({
      ...section,
      items: section.items.toSorted((left, right) => {
        return Number(right.href === defaultHref) - Number(left.href === defaultHref);
      }),
    }))
    .toSorted((left, right) => {
      const leftIsDefault = left.items.some((item) => item.href === defaultHref);
      const rightIsDefault = right.items.some((item) => item.href === defaultHref);
      return Number(rightIsDefault) - Number(leftIsDefault);
    });
}

export function Sidebar({ userRole, canAccessHr }: { userRole: UserRole; canAccessHr: boolean }) {
  const pathname = usePathname();
  const filteredSections = getFilteredSections(userRole, canAccessHr);
  const homeHref = getDefaultRouteForRole(userRole);

  return (
    <div className={styles.sidebarRoot}>
      <div className={styles.brand}>
        <Link href={homeHref} className={styles.brandLink}>
          <div className={styles.brandIcon}>
            <svg width="24" height="28" viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 16H8V32H4V16Z" fill="#ffffff" fillOpacity="0.7" />
              <path d="M12 4H16V32H12V4Z" fill="#ffffff" fillOpacity="0.9" />
              <path d="M20 10H24V32H20V10Z" fill="#ffffff" />
            </svg>
          </div>
          <span className={styles.brandName}>ERP Công trình</span>
        </Link>
      </div>

      <div className={styles.navContainer}>
        <nav className={styles.nav}>
          {filteredSections.map((section) => (
            <div key={section.label || "top"} className={styles.section}>
              {section.label && <div className={styles.sectionLabel}>{section.label}</div>}
              <div className={styles.sectionItems}>
                {section.items.map((item) => {
                  const isActive = item.href === "/reports"
                    ? pathname.startsWith("/reports") || pathname.startsWith("/supervision/weekly")
                    : (pathname.startsWith(item.href) || (pathname === "/" && item.href === "/dashboard"));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(styles.navItem, isActive && styles.navItemActive)}
                    >
                      <div className={cn(styles.indicator, isActive && styles.indicatorActive)} />
                      <item.icon
                        className={cn(styles.navIcon, isActive && styles.navIconActive)}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        aria-hidden="true"
                      />
                      <span className={styles.navLabel}>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

    </div>
  );
}
