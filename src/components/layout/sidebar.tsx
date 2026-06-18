"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  History, 
  Settings,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@prisma/client';

const navigation = [
  { name: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Công trình', href: '/projects', icon: Building2 },
  { name: 'Tài liệu', href: '/documents', icon: FolderOpen },
  { name: 'Báo cáo hiện trường', href: '/reports', icon: ClipboardCheck },
  { name: 'Hợp đồng', href: '/contracts', icon: FileText },
  { name: 'Nhà cung cấp', href: '/suppliers', icon: Users },
  { name: 'Vật tư', href: '/materials', icon: Package },
  { name: 'Thanh toán', href: '/accounting', icon: CreditCard },
  { name: 'Phê duyệt', href: '/approvals', icon: CheckSquare },
  { name: 'Nhật ký hệ thống', href: '/audit', icon: History },
  { name: 'Quản lý tài khoản', href: '/users', icon: UserCog },
  { name: 'Cài đặt', href: '/settings', icon: Settings },
];

// Items hidden for CHIEF_COMMANDER
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
        // Rename "Công trình" to "Công trình của tôi" for commanders
        if (item.href === '/projects') {
          return { ...item, name: 'Công trình của tôi' };
        }
        return item;
      });
  }
  return navigation;
}

export function Sidebar({ userRole }: { userRole: UserRole }) {
  const pathname = usePathname();
  const filteredNav = getFilteredNavigation(userRole);

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-slate-200">
        <span className="text-xl font-bold text-blue-600">ERP Công trình</span>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto pt-4">
        <nav className="flex-1 space-y-1 px-3">
          {filteredNav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm border-r-2 border-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-700',
                  'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors'
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
  );
}
