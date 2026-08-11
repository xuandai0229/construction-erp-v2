"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentCard, FilterBar, KpiCard, EnterpriseTable, SectionHeader } from "@/components/ui/enterprise";
import { InteractiveKpiCard } from "@/components/ui/interactive-kpi-card";
import { UnifiedActionMenu, ActionMenuItem } from "@/components/ui/unified-action-menu";

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
  onOpenChange,
}: {
  actions: MaterialActionItem[];
  onOpenChange?: (isOpen: boolean) => void;
}) {
  if (!actions.length) return null;

  return (
    <UnifiedActionMenu
      align="right"
      menuWidth="w-52"
      showPointer={true}
      onOpenChange={onOpenChange}
      trigger={({ toggle, isOpen }) => (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors shadow-2xs ${
            isOpen
              ? "border-blue-300 bg-blue-100/80 text-blue-700"
              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }`}
          aria-label="Thao tác"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    >
      {actions.map((action, idx) => {
        const isSeparatorBefore = action.danger && idx > 0 && !actions[idx - 1].danger;

        return (
          <React.Fragment key={idx}>
            {isSeparatorBefore && <div className="my-1 border-t border-slate-100" />}
            <ActionMenuItem
              disabled={action.disabled}
              destructive={action.danger}
              icon={action.icon}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!action.disabled) {
                  action.onClick();
                }
              }}
            >
              {action.label}
            </ActionMenuItem>
          </React.Fragment>
        );
      })}
    </UnifiedActionMenu>
  );
}
