import React from "react";
import { HrWorkspaceShell } from "./hr-workspace-shell";
import { HrWorkspaceTabs } from "./hr-workspace-tabs";

export function AppContentLoading() {
  return (
    <div className="w-full space-y-4 p-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-slate-200/80" />
      <div className="h-24 w-full rounded-xl border border-slate-200 bg-slate-100/60" />
      <div className="h-64 w-full rounded-xl border border-slate-200 bg-slate-100/60" />
    </div>
  );
}

export function HrWorkspaceContentLoading() {
  return (
    <HrWorkspaceShell>
      <div className="animate-pulse space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-7 w-56 rounded-md bg-slate-200/80" />
            <div className="h-4 w-96 rounded-md bg-slate-100 border border-slate-200/50" />
          </div>
          <div className="h-9 w-36 rounded-lg bg-slate-200/80" />
        </div>

        {/* Tabs Persistent */}
        <HrWorkspaceTabs />

        {/* Dynamic Inner Content Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="h-4 w-24 rounded bg-slate-200/70" />
                <div className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200" />
              </div>
              <div className="h-7 w-16 rounded bg-slate-200/90" />
            </div>
          ))}
        </div>

        <div className="h-64 rounded-xl border border-slate-200 bg-white p-6 shadow-xs" />
      </div>
    </HrWorkspaceShell>
  );
}

export function EmployeeListLoading() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Filter panel skeleton */}
      <div className="h-16 rounded-xl border border-slate-200 bg-white p-4 shadow-xs" />
      {/* Table skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="h-10 w-full rounded-lg bg-slate-100" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 w-full rounded-lg bg-slate-50 border border-slate-100" />
        ))}
      </div>
    </div>
  );
}

export function OrganizationTreeLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex justify-between items-center h-10 border-b border-slate-100 pb-3">
        <div className="h-6 w-48 rounded bg-slate-200/80" />
        <div className="h-8 w-32 rounded-lg bg-slate-100 border border-slate-200" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-slate-50 border border-slate-100" />
          ))}
        </div>
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="h-6 w-36 rounded bg-slate-200/80" />
          <div className="h-32 rounded-lg bg-slate-50 border border-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function PositionListLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-12 rounded-xl border border-slate-200 bg-white p-3 shadow-xs" />
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 w-full rounded-lg bg-slate-50 border border-slate-100" />
        ))}
      </div>
    </div>
  );
}

export function EmployeeDetailSectionLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-32 rounded-xl border border-slate-200 bg-white p-6 shadow-xs" />
      <div className="h-64 rounded-xl border border-slate-200 bg-white p-6 shadow-xs" />
    </div>
  );
}
