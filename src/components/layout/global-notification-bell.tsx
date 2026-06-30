"use client";

import { useState } from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, Receipt, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type NotificationItem = {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string | null;
  projectName: string | null;
  createdAt: Date;
  href: string | null;
  isRead: boolean;
};

export function GlobalNotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        aria-label="Thông báo"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white border-2 border-white leading-none shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg sm:w-96">
            <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Thông báo</h3>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  Bạn không có thông báo nào.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.slice(0, 5).map((notif) => (
                    <Link
                      key={notif.id}
                      href={notif.href || '#'}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50",
                        !notif.isRead && "bg-slate-50/50"
                      )}
                    >
                      <NotificationIcon type={notif.type} severity={notif.severity} />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-slate-900 line-clamp-1">{notif.title}</p>
                        <p className="text-[13px] text-slate-500 line-clamp-1">{notif.message}</p>
                        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                          {notif.projectName && <span>{notif.projectName}</span>}
                          {notif.projectName && <span>•</span>}
                          <span>
                            {notif.type === 'REPORT' ? 'Cập nhật' : 'Tạo lúc'} {notif.createdAt.toLocaleDateString('vi-VN')} {notif.createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationIcon({ type, severity }: { type: string; severity: string }) {
  const isHigh = severity === 'HIGH';
  const colorClass = isHigh ? 'text-rose-600 bg-rose-100/50' : 'text-amber-600 bg-amber-100/50';

  if (type === 'APPROVAL') {
    return <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", colorClass)}><CheckCircle className="h-4 w-4" /></div>;
  }
  if (type === 'PAYMENT') {
    return <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", colorClass)}><Receipt className="h-4 w-4" /></div>;
  }
  if (type === 'REPORT') {
    return <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", colorClass)}><FileText className="h-4 w-4" /></div>;
  }
  if (type === 'PROJECT') {
    return <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", colorClass)}><AlertTriangle className="h-4 w-4" /></div>;
  }
  return <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 bg-slate-100")}><Info className="h-4 w-4" /></div>;
}
