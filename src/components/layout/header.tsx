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

const navigation = [
  { name: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Công trình', href: '/projects', icon: Building2 },
  { name: 'Tài liệu', href: '/documents', icon: FolderOpen },
  // { name: 'Báo cáo hiện trường', href: '/reports', icon: ClipboardCheck }, // Đang thiết kế lại
  // { name: 'Hợp đồng', href: '/contracts', icon: FileText }, // Placeholder
  // { name: 'Nhà cung cấp', href: '/suppliers', icon: UsersIcon }, // Placeholder
  // { name: 'Vật tư', href: '/materials', icon: Package }, // Placeholder
  // { name: 'Thanh toán', href: '/accounting', icon: CreditCard }, // Placeholder
  // { name: 'Phê duyệt', href: '/approvals', icon: CheckSquare }, // Placeholder
  // { name: 'Nhật ký hệ thống', href: '/audit', icon: History }, // Placeholder
  { name: 'Quản lý tài khoản', href: '/users', icon: UserCog },
  { name: 'Cài đặt', href: '/settings', icon: Settings },
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

function getFilteredNavigation(role: UserRole) {
  if (role === 'CHIEF_COMMANDER') {
    return navigation.filter(item => !HIDDEN_FOR_COMMANDER.includes(item.href))
      .map(item => {
        if (item.href === '/projects') {
          return { ...item, name: 'Công trình của tôi' };
        }
        return item;
      });
  }
  return navigation;
}

export function Header({ userName, userRole, userRoleRaw }: { userName?: string, userRole?: string, userRoleRaw?: UserRole }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const filteredNav = getFilteredNavigation(userRoleRaw || 'STAFF');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
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

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <p className="font-medium text-slate-900">{userName || 'Tài khoản'}</p>
              <p className="text-xs text-slate-500">{userRole || 'Nhân viên'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-700 p-2"
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 transition-opacity" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex w-[85vw] max-w-sm flex-1 flex-col bg-white">
            <div className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6 border-b border-slate-200">
              <span className="text-lg sm:text-xl font-bold text-blue-600">ERP Công trình</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-500 hover:text-slate-700 p-2"
                aria-label="Đóng menu"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto pt-4 pb-4">
              <nav className="flex-1 space-y-1 px-3">
                {filteredNav.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
                        'group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors'
                      )}
                    >
                      <item.icon
                        className={cn(
                          isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500',
                          'mr-3 h-5 w-5 flex-shrink-0'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
