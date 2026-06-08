"use client";

import { LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Header({ userName, userRole }: { userName?: string, userRole?: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-6">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden md:block">
            <p className="font-medium text-slate-900">{userName || 'Tài khoản Dev'}</p>
            <p className="text-xs text-slate-500">{userRole || 'Admin'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-500 hover:text-slate-700 p-2"
          title="Đăng xuất"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
