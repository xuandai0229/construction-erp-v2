"use client";

import { LogOut, User, Menu, X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, Building2, FolderOpen, ClipboardCheck, 
  FileText, Users as UsersIcon, Package, CreditCard, 
  CheckSquare, History, Settings, UserCog, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@prisma/client';
import styles from './sidebar.module.css';
import { GlobalProjectContextSwitcher } from './global-project-context-switcher';
import { GlobalNotificationBell } from './global-notification-bell';
import { GlobalSearchCommand } from './global-search-command';
import type { GlobalProjectContext } from '@/lib/project-context';
import { useToast } from '@/components/ui/toast-context';

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
      { name: 'Tài khoản', href: '/users', icon: UserCog },
      { name: 'Cài đặt', href: '/settings', icon: Settings },
    ],
  },
];

const HIDDEN_FOR_COMMANDER = [
  '/accounting',
  '/approvals',
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

export function Header({ userName, userRole, userRoleRaw, globalContext }: { userName?: string, userRole?: string, userRoleRaw?: UserRole, globalContext?: GlobalProjectContext }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
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
      <header className="sticky top-0 z-60 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center lg:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="icon-button"
            aria-label="Mở menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="ml-2 text-lg font-bold text-blue-600">ERP</span>
        </div>
        
        <div className="flex flex-1 justify-end lg:justify-start lg:pl-6 px-4">
          {globalContext && (
            <div className="hidden lg:flex">
              <GlobalProjectContextSwitcher 
                projects={globalContext.accessibleProjects} 
                selectedProjectId={globalContext.selectedProjectId}
                overviewData={globalContext.overviewData}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Global Search */}
          <GlobalSearchCommand globalContext={globalContext} />
          
          {/* Notification Bell */}
          {globalContext ? (
            <GlobalNotificationBell notifications={globalContext.notifications} />
          ) : (
            <button className="relative flex items-center justify-center h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors" aria-label="Thông báo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </button>
          )}

          {/* Help Icon */}
          <div className="relative">
            <button 
              onClick={() => setIsHelpOpen(!isHelpOpen)}
              className="flex items-center justify-center h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors" 
              aria-label="Trợ giúp"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
            </button>
            
            {isHelpOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsHelpOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg z-50">
                  <h4 className="font-bold text-slate-900 mb-3">Hướng dẫn nhanh</h4>
                  <ol className="space-y-2 text-[13px] text-slate-600 list-decimal pl-4">
                    <li>Chọn công trình trên thanh trên để lọc dữ liệu Dashboard và các phân hệ theo công trình.</li>
                    <li>Chuông thông báo hiển thị các cảnh báo thật theo công trình đang chọn.</li>
                    <li>Bấm từng thông báo để mở đúng báo cáo, hồ sơ hoặc mục cần xử lý.</li>
                    <li>Nếu chọn Toàn hệ thống, các KPI là tổng hợp toàn bộ công trình trong phạm vi quyền.</li>
                    <li>Nếu số tài chính trống, hãy kiểm tra công trình đang chọn có hợp đồng/hồ sơ thanh toán hay không.</li>
                  </ol>
                </div>
              </>
            )}
          </div>

          <div className="h-6 w-[1px] bg-slate-200 mx-1 block"></div>

          {/* User Profile */}
          <div className="flex items-center gap-3 group cursor-pointer pr-1">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200 shadow-sm ring-2 ring-transparent group-hover:ring-blue-100 transition-all">
               {userName ? (
                 <span className="font-bold text-blue-700 text-[13px] sm:text-sm">
                   {userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                 </span>
               ) : (
                 <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
               )}
            </div>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5">
                <span className="max-w-[140px] truncate font-bold text-slate-900 text-[13px] leading-tight group-hover:text-blue-600 transition-colors">
                  {userName || userRole}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <span className="max-w-[140px] truncate text-[11px] font-medium text-slate-500 leading-tight mt-0.5">
                {userRole === 'ADMIN' ? 'Giám đốc điều hành' : (userRole || 'Quản trị viên')}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="icon-button ml-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut className="h-[18px] w-[18px]" />
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
