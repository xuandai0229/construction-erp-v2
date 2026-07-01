"use client";

import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, Receipt, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { markGlobalNotificationRead } from '@/app/actions/notifications';
import type { NotificationTargetType } from '@/lib/notifications/notification-routing';

type NotificationItem = {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string | null;
  projectName: string | null;
  projectId?: string | null;
  createdAt: Date;
  href: string | null;
  actionUrl?: string | null;
  targetType?: NotificationTargetType;
  targetId?: string | null;
  isRead: boolean;
};

export function GlobalNotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [optimisticReadIds, setOptimisticReadIds] = useState<Set<string>>(() => new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  const closePopover = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    closePopover();
  }, [pathname, searchParamsKey, closePopover]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePopover();
      }
    };

    const handleOutsideClick = (event: Event) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      closePopover();
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen, closePopover]);

  const computedNotifications = useMemo(
    () => notifications.map((notification) => ({
      ...notification,
      isRead: notification.isRead || optimisticReadIds.has(notification.id),
    })),
    [notifications, optimisticReadIds],
  );

  const visibleNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return computedNotifications.filter(n => !n.isRead);
    }
    return computedNotifications;
  }, [computedNotifications, activeTab]);

  const unreadCount = computedNotifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (
    event: MouseEvent<HTMLAnchorElement>,
    notification: NotificationItem,
  ) => {
    const href = notification.actionUrl || notification.href;
    if (!href || href === '#') {
      event.preventDefault();
      closePopover();
      return;
    }

    event.preventDefault();
    closePopover();
    setOptimisticReadIds((current) => new Set(current).add(notification.id));

    try {
      await markGlobalNotificationRead({
        id: notification.id,
        type: notification.type,
        severity: notification.severity,
        title: notification.title,
        message: notification.message,
        projectId: notification.projectId ?? null,
        href,
      });
    } catch (error) {
      console.error("Failed to mark notification as read", error);
      setOptimisticReadIds((current) => {
        const next = new Set(current);
        next.delete(notification.id);
        return next;
      });
    } finally {
      router.push(href);
    }
  };

  return (
    <div className="relative">
      <button 
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative flex items-center justify-center h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Thông báo"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white border-2 border-white leading-none shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
          <div
            ref={panelRef}
            className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-96 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl sm:w-96"
            role="dialog"
            aria-label="Thông báo"
          >
            <div className="border-b border-slate-100 px-4 pt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">Thông báo</h3>
              </div>
              <div className="flex items-center gap-4 -mb-px">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={cn(
                    "px-1 pb-2 text-sm font-medium transition-colors border-b-2",
                    activeTab === 'all' 
                      ? "border-blue-600 text-blue-600" 
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('unread')}
                  className={cn(
                    "px-1 pb-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5",
                    activeTab === 'unread' 
                      ? "border-blue-600 text-blue-600" 
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  Chưa đọc
                  {unreadCount > 0 && (
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                      activeTab === 'unread' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            <div className="max-h-[28rem] overflow-y-auto">
              {visibleNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  {activeTab === 'unread' ? 'Bạn không có thông báo nào chưa đọc.' : 'Bạn không có thông báo nào.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {visibleNotifications.map((notif) => (
                    <Link
                      key={notif.id}
                      href={notif.actionUrl || notif.href || '#'}
                      onClick={(event) => handleNotificationClick(event, notif)}
                      className={cn(
                        "relative flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none",
                        !notif.isRead ? "bg-blue-50/30" : "bg-white"
                      )}
                    >
                      <NotificationIcon type={notif.type} severity={notif.severity} />
                      <div className="flex-1 space-y-1 overflow-hidden pr-2">
                        <p className={cn(
                          "text-sm line-clamp-2 leading-snug",
                          !notif.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                        )}>
                          {notif.title}
                        </p>
                        <p className={cn(
                          "text-[13px] line-clamp-1",
                          !notif.isRead ? "text-slate-600" : "text-slate-500"
                        )}>
                          {notif.message}
                        </p>
                        <div className={cn(
                          "flex items-center gap-2 text-[11px] uppercase tracking-wide mt-1.5",
                          !notif.isRead ? "font-semibold text-blue-600/80" : "font-medium text-slate-400"
                        )}>
                          {notif.projectName && <span className="line-clamp-1 max-w-[120px]">{notif.projectName}</span>}
                          {notif.projectName && <span>•</span>}
                          <span>
                            {notif.type === 'REPORT' ? 'Cập nhật' : 'Tạo lúc'} {notif.createdAt.toLocaleDateString('vi-VN')} {notif.createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      {!notif.isRead && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
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
