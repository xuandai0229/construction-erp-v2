"use client";

import { LogOut, User, Menu, X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, Building2, FolderOpen, ClipboardCheck, 
  Package,
  CheckSquare, Settings, UserCog, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@prisma/client';
import styles from './sidebar.module.css';
import { GlobalProjectContextSwitcher } from './global-project-context-switcher';
import { GlobalNotificationBell } from './global-notification-bell';
import { GlobalSearchCommand } from './global-search-command';
import type { GlobalProjectContext } from '@/lib/project-context';
import { canViewNavigationItem, projectNavName } from '@/lib/navigation-permissions';

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
    ],
  },
  {
    label: 'ĐIỀU HÀNH',
    items: [
      { name: 'Phê duyệt', href: '/approvals', icon: CheckSquare },
    ],
  },
  {
    label: 'HỆ THỐNG',
    items: [
      { name: 'Tài khoản', href: '/users', icon: UserCog },
      { name: 'Cài đặt', href: '/settings', icon: Settings },
    ],
  },
];

function getFilteredMobileSections(role: UserRole) {
  return mobileNavSections
    .map(section => {
      const items = section.items
        .filter(item => canViewNavigationItem(role, item.href))
        .map(item => ({ ...item, name: projectNavName(role, item.href, item.name) }));
      return { ...section, items };
    })
    .filter(section => section.items.length > 0);

  return mobileNavSections
    .map(section => {
      let items = section.items;
      if (false) {
        items = items
          .filter(item => !([] as string[]).includes(item.href))
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

export function Header({ userName, userRole, userRoleRaw, globalContext }: { userName?: string, userRole?: string, userRoleRaw?: UserRole, globalContext?: GlobalProjectContext }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const filteredSections = getFilteredMobileSections(userRoleRaw || 'STAFF');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex h-[52px] lg:h-16 shrink-0 items-center justify-between border-b border-[var(--border)] bg-white/90 px-3 shadow-[var(--shadow-card)] backdrop-blur-md md:px-6">
        <div className="flex items-center">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Trang chủ">
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-blue-600 text-white shadow-sm">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline-flex text-[17px] font-black text-[var(--foreground)] tracking-tight">CT2</span>
          </Link>
        </div>
        
        {/* Mobile Page Title (Middle) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:hidden pointer-events-none">
          <span className="text-[15px] font-bold text-slate-900">
            {pathname.startsWith('/projects') ? 'Công trình' :
             pathname.startsWith('/documents') ? 'Tài liệu' :
             pathname.startsWith('/reports') ? 'Báo cáo' :
             pathname.startsWith('/materials') ? 'Vật tư' :
             pathname.startsWith('/approvals') ? 'Phê duyệt' :
             pathname.startsWith('/users') ? 'Tài khoản' :
             pathname.startsWith('/settings') ? 'Cài đặt' :
             'Tổng quan'}
          </span>
        </div>
        
        {/* Desktop Project Switcher */}
        <div className="hidden lg:flex flex-1 justify-start pl-6">
          {globalContext && (
            <GlobalProjectContextSwitcher 
              projects={globalContext.accessibleProjects} 
              selectedProjectId={globalContext.selectedProjectId}
              overviewData={globalContext.overviewData}
            />
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Search */}
          <GlobalSearchCommand globalContext={globalContext} />
          
          {/* Notification Bell */}
          {globalContext ? (
            <GlobalNotificationBell notifications={globalContext.notifications} />
          ) : (
            <button className="relative flex items-center justify-center h-10 w-10 sm:h-9 sm:w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors" aria-label="Thông báo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </button>
          )}

          {/* Help Icon (Desktop Only) */}
          <div className="relative hidden lg:block">
            <button 
              onClick={() => setIsHelpOpen(!isHelpOpen)}
              className="flex items-center justify-center h-10 w-10 sm:h-9 sm:w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors" 
              aria-label="Trợ giúp"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
            </button>
            
            {isHelpOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsHelpOpen(false)} />
                <div className="fixed inset-x-2 sm:inset-x-auto sm:absolute sm:right-0 top-14 sm:top-full sm:mt-2 w-[calc(100vw-16px)] sm:w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg z-50">
                  <h4 className="font-bold text-slate-900 mb-3">Hướng dẫn nhanh</h4>
                  <ol className="space-y-2 text-[13px] text-slate-600 list-decimal pl-4">
                    <li>Chọn công trình trên thanh trên để lọc dữ liệu Dashboard và các phân hệ theo công trình.</li>
                    <li>Chuông thông báo hiển thị các cảnh báo thật theo công trình đang chọn.</li>
                    <li>Bấm từng thông báo để mở đúng báo cáo, hồ sơ hoặc mục cần xử lý.</li>
                    <li>Nếu chọn Toàn hệ thống, các KPI là tổng hợp toàn bộ công trình trong phạm vi quyền.</li>
                    <li>Nếu số liệu điều hành trống, hãy kiểm tra phạm vi công trình, tiến độ và báo cáo hiện trường.</li>
                  </ol>
                </div>
              </>
            )}
          </div>

          <div className="h-6 w-[1px] bg-slate-200 mx-1 block"></div>

          {/* User Profile */}
          <div className="flex items-center gap-3 group cursor-pointer pr-1">
            <div className="flex h-10 w-10 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-blue-100/70 to-blue-50/50 border border-blue-200/50 shadow-sm ring-2 ring-transparent group-hover:ring-blue-100/50 transition-all">
               {userName ? (
                 <span className="font-bold text-blue-700 text-[14px]">
                   {userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                 </span>
               ) : (
                 <User className="h-5 w-5 text-blue-600" />
               )}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <div className="flex items-center gap-1.5">
                <span className="max-w-[140px] truncate font-bold text-[var(--foreground)] text-[13px] leading-tight group-hover:text-blue-600 transition-colors">
                  {userName || userRole}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <span className="max-w-[140px] truncate text-[11px] font-medium text-[var(--muted-foreground)] leading-tight mt-0.5">
                {userRole || 'Chưa xác định vai trò'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="hidden lg:flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full text-slate-500 hover:text-rose-600 hover:bg-rose-50/80 transition-colors"
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut className="h-5 w-5 sm:h-[18px] sm:w-[18px]" />
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
