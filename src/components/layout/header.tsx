"use client";

import { LogOut, User, Menu, X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, Building2, FolderOpen, ClipboardCheck, 
  FileText, Users as UsersIcon, Package, CreditCard, 
  CheckSquare, History, Settings, UserCog
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@prisma/client';
import styles from './sidebar.module.css';

const mobileNavSections = [
  {
    label: null,
    items: [
      { name: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'QUẢN LÝ',
    items: [
      { name: 'Công trình', href: '/projects', icon: Building2 },
      { name: 'Tài liệu', href: '/documents', icon: FolderOpen },
      { name: 'Báo cáo hiện trường', href: '/reports', icon: ClipboardCheck },
      { name: 'Vật tư', href: '/materials', icon: Package },
      { name: 'Nhà cung cấp', href: '/suppliers', icon: UsersIcon },
    ],
  },
  {
    label: 'TÀI CHÍNH',
    items: [
      { name: 'Hợp đồng', href: '/contracts', icon: FileText },
      { name: 'Thanh toán', href: '/accounting', icon: CreditCard },
      { name: 'Phê duyệt', href: '/approvals', icon: CheckSquare },
    ],
  },
  {
    label: 'HỆ THỐNG',
    items: [
      { name: 'Nhật ký', href: '/audit', icon: History },
      { name: 'Tài khoản', href: '/users', icon: UserCog },
      { name: 'Cài đặt', href: '/settings', icon: Settings },
    ],
  },
];

const HIDDEN_FOR_COMMANDER = [
  '/accounting',
  '/approvals',
  '/audit',
  '/settings',
  '/users',
  '/contracts',
  '/suppliers',
];

function getFilteredMobileSections(role: UserRole) {
  return mobileNavSections
    .map(section => {
      let items = section.items;
      if (role === 'CHIEF_COMMANDER') {
        items = items
          .filter(item => !HIDDEN_FOR_COMMANDER.includes(item.href))
          .map(item => {
            if (item.href === '/projects') {
              return { ...item, name: 'Công trình của tôi' };
            }
            return item;
          });
      }
      return { ...section, items };
    })
    .filter(section => section.items.length > 0);
}

export function Header({ userName, userRole, userRoleRaw }: { userName?: string, userRole?: string, userRoleRaw?: UserRole }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const filteredSections = getFilteredMobileSections(userRoleRaw || 'STAFF');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 shadow-sm">
        <div className="flex items-center lg:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="text-slate-500 hover:text-slate-700 p-2"
            aria-label="Mở menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="ml-2 text-lg font-bold text-blue-600">ERP</span>
        </div>
        
        <div className="hidden lg:block"></div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 text-sm text-right">
            <div className="hidden sm:block">
              <p className="font-bold text-slate-900 text-[14px]">Quản trị viên</p>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">Quản trị hệ thống</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold text-sm shrink-0 border border-blue-100">
              <User className="h-4 w-4" />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </header>

      {/* Mobile Menu - Premium Dark Theme */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          <div className={styles.mobileDrawer}>
            {/* Drawer Header */}
            <div className={styles.drawerHeader}>
              <div className={styles.drawerBrand}>
                <div className={styles.drawerBrandIcon}>
                  <svg width="20" height="22" viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 16H8V32H4V16Z" fill="#ffffff" fillOpacity="0.7"/>
                    <path d="M12 4H16V32H12V4Z" fill="#ffffff" fillOpacity="0.9"/>
                    <path d="M20 10H24V32H20V10Z" fill="#ffffff"/>
                  </svg>
                </div>
                <div>
                  <span className={styles.drawerBrandName}>CT2 Hà Nội</span>
                  <span className={styles.drawerBrandSub}>ERP CÔNG TRÌNH</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className={styles.closeBtn}
                aria-label="Đóng menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Nav */}
            <div className={styles.drawerNav}>
              <nav>
                {filteredSections.map((section) => (
                  <div key={section.label || 'top'} className={styles.mobileSection}>
                    {section.label && (
                      <div className={styles.mobileSectionLabel}>{section.label}</div>
                    )}
                    {section.items.map((item) => {
                      const isActive = pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            styles.mobileNavItem,
                            isActive && styles.mobileNavItemActive
                          )}
                        >
                          <item.icon
                            className={cn(
                              styles.mobileNavIcon,
                              isActive && styles.mobileNavIconActive
                            )}
                            strokeWidth={isActive ? 2.2 : 1.8}
                            aria-hidden="true"
                          />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>

            {/* Drawer Footer */}
            <div className={styles.drawerFooter}>
              <button onClick={handleLogout} className={styles.logoutBtn}>
                <LogOut className="h-4 w-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
