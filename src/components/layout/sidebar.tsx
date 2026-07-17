"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FolderOpen,
  ClipboardCheck,
  ScanSearch,
  Package,
  ListTodo,
  CheckSquare,
  Settings,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";
import styles from "./sidebar.module.css";
import { canViewNavigationItem, projectNavName } from "@/lib/navigation-permissions";

const navigationSections = [
  {
    label: null,
    items: [{ name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "GIÁM SÁT",
    items: [
      { name: "Tổng quan giám sát", href: "/supervision", icon: ScanSearch },
      { name: "Nhật ký giám sát", href: "/supervision/journal", icon: ClipboardCheck },
      { name: "Tồn tại và khắc phục", href: "/supervision/findings", icon: CheckSquare },
      { name: "Báo cáo kết quả tuần", href: "/supervision/weekly-reports", icon: FolderOpen },
    ],
  },
  {
    label: "QUẢN LÝ",
    items: [
      { name: "Công trình", href: "/projects", icon: Building2 },
      { name: "Tài liệu", href: "/documents", icon: FolderOpen },
      { name: "Báo cáo hiện trường", href: "/reports", icon: ClipboardCheck },
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
  {
    label: "CÔNG VIỆC",
    items: [{ name: "Nhiệm vụ", href: "/tasks", icon: ListTodo }],
  },
];

function getFilteredSections(role: UserRole) {
  return navigationSections
    .map((section) => {
      const items = section.items
        .filter((item) => canViewNavigationItem(role, item.href))
        .map((item) => ({ ...item, name: projectNavName(role, item.href, item.name) }));
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
}

export function Sidebar({ userRole }: { userRole: UserRole }) {
  const pathname = usePathname();
  const filteredSections = getFilteredSections(userRole);

  return (
    <div className={styles.sidebarRoot}>
      <div className={styles.brand}>
        <Link href="/dashboard" className={styles.brandLink}>
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
                  const isActive = pathname.startsWith(item.href) || (pathname === "/" && item.href === "/dashboard");
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
