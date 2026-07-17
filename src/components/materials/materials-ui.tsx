"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentCard, FilterBar, KpiCard, EnterpriseTable, SectionHeader } from "@/components/ui/enterprise";
import { InteractiveKpiCard } from "@/components/ui/interactive-kpi-card";

export type MaterialKpiItem = {
  key: string;
  label: React.ReactNode;
  value: React.ReactNode;
  helper?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "blue" | "emerald" | "amber" | "rose" | "slate" | "indigo";
  active?: boolean;
  onClick?: () => void;
  title?: string;
};

export function MaterialToolbar({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return <SectionHeader title={title} description={description} action={action} className={className} />;
}

export function MaterialKpiRibbon({
  items,
  className,
}: {
  items: MaterialKpiItem[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4", className)}>
      {items.map((item) => {
        const cardClassName = cn(
          "min-h-[88px] p-3 [&>div:first-child>div:first-child]:truncate [&>div:first-child>div:first-child]:whitespace-nowrap [&_.text-2xl]:truncate [&_.text-2xl]:text-xl",
          item.active && "border-blue-300 bg-blue-50 ring-2 ring-blue-500/30",
        );

        return item.onClick ? (
          <InteractiveKpiCard
            key={item.key}
            label={item.label}
            value={item.value}
            helper={item.helper}
            icon={item.icon}
            tone={item.tone || "slate"}
            onClick={item.onClick}
            className={cardClassName}
          />
        ) : (
          <KpiCard
            key={item.key}
            label={item.label}
            value={item.value}
            helper={item.helper}
            icon={item.icon}
            tone={item.tone || "slate"}
            className={cardClassName}
          />
        );
      })}
    </div>
  );
}

export function MaterialFilterBar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <FilterBar className={cn("flex flex-col gap-3 lg:flex-row lg:items-center", className)} {...props} />;
}

export function MaterialDataTable({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <EnterpriseTable className={className}>{children}</EnterpriseTable>;
}

export function MaterialDrawerSection({
  title,
  description,
  children,
  className,
}: React.PropsWithChildren<{
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}>) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function MaterialEmptyState({
  icon,
  title,
  description,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <ContentCard className={cn("p-8 text-center", className)}>
      {icon ? <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--surface-subtle)] text-[var(--muted-foreground)] opacity-70">{icon}</div> : null}
      <div className="font-semibold text-[var(--foreground)]">{title}</div>
      {description ? <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p> : null}
    </ContentCard>
  );
}

export type MaterialActionItem = {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

export function MaterialRowActionMenu({
  actions,
}: {
  actions: MaterialActionItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null);

  const updatePanelPosition = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const safePadding = 12;
    const width = 224;
    const estimatedHeight = Math.min(actions.length * 40 + 12, 320);
    const spaceBelow = window.innerHeight - rect.bottom - safePadding;
    const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;
    setPanelStyle({
      position: "fixed",
      width,
      left: Math.max(safePadding, Math.min(rect.right - width, window.innerWidth - width - safePadding)),
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      zIndex: 110,
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      updatePanelPosition();
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", updatePanelPosition);
      window.addEventListener("scroll", updatePanelPosition, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isOpen, actions.length]);

  if (!actions.length) return null;

  const panel = isOpen ? (
    <div
      ref={panelRef}
      style={panelStyle || undefined}
      className="max-h-[min(320px,calc(100dvh-24px))] overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-elevated)] ring-1 ring-black/5 focus:outline-none"
      role="menu"
    >
      {actions.map((action, idx) => (
        <div key={idx} title={action.disabledReason}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!action.disabled) {
                setIsOpen(false);
                action.onClick();
              }
            }}
            disabled={action.disabled}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-[var(--radius-lg)] px-2.5 py-2 text-left text-sm font-medium transition-colors",
              action.disabled
                ? "cursor-not-allowed opacity-50 text-[var(--muted-foreground)] opacity-70"
                : action.danger
                ? "text-rose-600 hover:bg-rose-50"
                : "text-[var(--foreground)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
            )}
            role="menuitem"
          >
            {action.icon && <span className="shrink-0">{action.icon}</span>}
            <span className="truncate">{action.label}</span>
          </button>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)] border transition-colors focus:outline-none ${
          isOpen ? "border-[var(--border)] bg-[var(--border)] text-[var(--foreground)] shadow-[var(--shadow-card)]" : "border-transparent text-[var(--muted-foreground)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
        }`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Mo menu thao tac"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
