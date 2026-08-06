"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Network,
  Briefcase,
  FileText,
  Award,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HR_TABS = [
  { id: "overview", label: "Tổng quan nhân sự", href: "/hr", icon: LayoutDashboard, implemented: true },
  { id: "employees", label: "Hồ sơ nhân viên", href: "/hr/employees", icon: Users, implemented: true },
  { id: "organization", label: "Cơ cấu tổ chức và phòng ban", href: "/hr/organization", icon: Network, implemented: true },
  { id: "assignments", label: "Điều động công trình", href: "/hr/project-assignments", icon: Briefcase, implemented: true },
  { id: "reports", label: "Báo cáo và phân tích", href: "/hr/reports", icon: BarChart3, implemented: true },
  { id: "contracts", label: "Hợp đồng", href: "/hr/contracts", icon: FileText, implemented: false },
  { id: "certificates", label: "Chứng chỉ và bằng cấp", href: "/hr/certificates", icon: Award, implemented: false },
  { id: "alerts", label: "Cảnh báo", href: "/hr/alerts", icon: AlertTriangle, implemented: false },
];

export function HrWorkspaceTabs() {
  const pathname = usePathname();
  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    checkScroll();
    container.addEventListener("scroll", checkScroll, { passive: true });
    const observer = new ResizeObserver(checkScroll);
    observer.observe(container);
    return () => {
      container.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [pathname]);

  const scrollContainer = (direction: "left" | "right") => {
    const container = containerRef.current;
    if (!container) return;
    const scrollAmount = direction === "left" ? -220 : 220;
    container.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <div className="relative mb-6 min-w-0 rounded-xl border border-slate-200 bg-white shadow-xs">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollContainer("left")}
          aria-label="Cuộn sang trái"
          className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 p-1.5 text-slate-600 shadow-md backdrop-blur-xs hover:bg-slate-100 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Left Gradient Overlay */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white via-white/80 to-transparent rounded-l-xl" />
      )}

      {/* Main Tab List Container */}
      <div
        ref={containerRef}
        role="tablist"
        aria-label="Không gian làm việc Nhân sự"
        className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto p-1.5 px-3 scroll-smooth no-scrollbar [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {HR_TABS.map((tab) => {
          const isActive = tab.href === "/hr" ? pathname === "/hr" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.id}
              id={`hr-tab-${tab.id}`}
              role="tab"
              ref={isActive ? activeTabRef : null}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              onFocus={(e) => {
                e.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center",
                });
              }}
              className={cn(
                "flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs md:text-sm font-semibold whitespace-nowrap scroll-mx-4 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500",
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-2xs border border-blue-200"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              )}
            >
              <tab.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
              <span>{tab.label}</span>
              {!tab.implemented && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-2xs font-semibold text-slate-500 shrink-0">
                  Sắp có
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Right Gradient Overlay */}
      {canScrollRight && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white via-white/80 to-transparent rounded-r-xl" />
      )}

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollContainer("right")}
          aria-label="Cuộn sang phải"
          className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 p-1.5 text-slate-600 shadow-md backdrop-blur-xs hover:bg-slate-100 hover:text-slate-900"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
