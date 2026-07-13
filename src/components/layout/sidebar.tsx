"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FolderOpen,
  ClipboardCheck,
  FileText,
  Users,
  Package,
  CreditCard,
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
    items: [{ name: "Tong quan", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "QUAN LY",
    items: [
      { name: "Cong trinh", href: "/projects", icon: Building2 },
      { name: "Tai lieu", href: "/documents", icon: FolderOpen },
      { name: "Bao cao hien truong", href: "/reports", icon: ClipboardCheck },
      { name: "Vat tu", href: "/materials", icon: Package },
      { name: "Nha cung cap", href: "/suppliers", icon: Users },
    ],
  },
  {
    label: "TAI CHINH",
    items: [
      { name: "Hop dong", href: "/contracts", icon: FileText },
      { name: "Thanh toan", href: "/accounting", icon: CreditCard },
      { name: "Phe duyet", href: "/approvals", icon: CheckSquare },
    ],
  },
  {
    label: "HE THONG",
    items: [
      { name: "Tai khoan", href: "/users", icon: UserCog },
      { name: "Cai dat", href: "/settings", icon: Settings },
    ],
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
          <div className="flex flex-col">
            <span className={styles.brandName}>CT2 Ha Noi</span>
            <span className={styles.brandSub}>ERP CONG TRINH</span>
          </div>
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

      <div className={styles.footer}>
        <div className={styles.footerBadge}>v2.0 Noi bo</div>
      </div>
    </div>
  );
}
