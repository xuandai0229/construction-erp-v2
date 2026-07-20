"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, ClipboardCheck, Package, Menu, X, FolderOpen, CheckSquare, Settings, UserCog, LogOut, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import type { UserRole } from "@prisma/client";
import { canViewNavigationItem } from "@/lib/navigation-permissions";
import { useRouter } from "next/navigation";

export function MobileBottomNav({ userRole }: { userRole: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const navItems = [
    { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
    { name: "Công trình", href: "/projects", icon: Building2 },
    { name: "Báo cáo", href: "/reports", icon: ClipboardCheck },
    { name: "Vật tư", href: "/materials", icon: Package },
  ];

  const moreItems = [
    { name: 'Tài liệu', href: '/documents', icon: FolderOpen },

    { name: 'Phê duyệt', href: '/approvals', icon: CheckSquare },
    { name: 'Tài khoản', href: '/users', icon: UserCog },
    { name: 'Cài đặt', href: '/settings', icon: Settings },
  ].filter(item => canViewNavigationItem(userRole, item.href));

  // Close more menu when route changes
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-[calc(56px+env(safe-area-inset-bottom))] items-start justify-between border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md px-2 lg:hidden">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 h-14",
                isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] font-medium tracking-wide">{item.name}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setIsMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 h-14 text-slate-500 hover:text-slate-900"
        >
          <Menu className="h-5 w-5 stroke-2" />
          <span className="text-[10px] font-medium tracking-wide">Thêm</span>
        </button>
      </nav>

      {/* More Bottom Sheet */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMoreOpen(false)}
          />
          <div className="relative bg-white rounded-t-2xl shadow-xl w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-full duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Tính năng khác</h3>
              <button 
                onClick={() => setIsMoreOpen(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-2 overflow-y-auto custom-scrollbar pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="grid grid-cols-4 gap-2 p-2">
                {moreItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-colors",
                        isActive ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <item.icon className={cn("h-6 w-6", isActive ? "stroke-[2.5]" : "stroke-2")} />
                      <span className="text-[11px] font-medium text-center leading-tight">{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-4 px-4 pt-4 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 p-3 rounded-xl text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
