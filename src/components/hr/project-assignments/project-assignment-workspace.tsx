"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  HrWorkspaceShell,
  HrPageHeader,
} from "@/components/hr/hr-workspace-shell";
import { HrWorkspaceTabs } from "@/components/hr/hr-workspace-tabs";
import { ProjectAssignmentDTO } from "@/lib/hr/project-assignment-dto";
import {
  AssignmentFormOptionEmployee,
  AssignmentFormOptionProject,
  AssignmentFormOptionRole,
  AssignmentUserCapabilities,
} from "@/app/hr/project-assignments/actions/project-assignment-actions";
import { ProjectAssignmentToolbar } from "./project-assignment-toolbar";
import { ProjectAssignmentTable } from "./project-assignment-table";
import { CreateAssignmentDialog } from "./create-assignment-dialog";
import { TransferAssignmentDialog } from "./transfer-assignment-dialog";
import { ExtendAssignmentDialog } from "./extend-assignment-dialog";
import { ReleaseAssignmentDialog } from "./release-assignment-dialog";
import { CancelAssignmentDialog } from "./cancel-assignment-dialog";
import { AssignmentDetailsDrawer } from "./assignment-details-drawer";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface ProjectAssignmentWorkspaceProps {
  initialItems: ProjectAssignmentDTO[];
  total: number;
  currentPage: number;
  pageSize: number;
  employees: AssignmentFormOptionEmployee[];
  projects: AssignmentFormOptionProject[];
  roles: AssignmentFormOptionRole[];
  capabilities: AssignmentUserCapabilities;
}

export function ProjectAssignmentWorkspace({
  initialItems,
  total,
  currentPage,
  pageSize,
  employees,
  projects,
  roles,
  capabilities,
}: ProjectAssignmentWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Selected item for dialogs
  const [selectedItem, setSelectedItem] = useState<ProjectAssignmentDTO | null>(null);

  // Dialog Controls
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isReleaseOpen, setIsReleaseOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Toast Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  // Client-side filtering on current items
  const filteredItems = initialItems.filter((item) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.employeeName.toLowerCase().includes(q);
      const matchCode = item.employeeCode.toLowerCase().includes(q);
      const matchDecision = item.decisionNumber?.toLowerCase().includes(q) || false;
      if (!matchName && !matchCode && !matchDecision) return false;
    }

    // Project
    if (selectedProjectId && item.projectId !== selectedProjectId) {
      return false;
    }

    // Status
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedStatus === "ACTIVE") {
      if (item.status !== "ACTIVE" || item.startDate > todayStr) return false;
    } else if (selectedStatus === "PLANNED") {
      if (item.status !== "ACTIVE" || item.startDate <= todayStr) return false;
    } else if (selectedStatus !== "ALL" && item.status !== selectedStatus) {
      return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <HrWorkspaceShell>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top-2 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Workspace Tabs */}
      <HrWorkspaceTabs />

      {/* Header */}
      <HrPageHeader
        title="Quản lý Điều động Nhân sự Công trình"
        description="Theo dõi kế hoạch phân bổ, điều chuyển vai trò và lịch sử công tác nhân sự tại các dự án."
      />

      {/* Toolbar & Filters */}
      <ProjectAssignmentToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        projects={projects}
        onResetFilters={() => {
          setSearchQuery("");
          setSelectedProjectId("");
          setSelectedStatus("ALL");
        }}
        onCreateClick={() => setIsCreateOpen(true)}
        canCreate={capabilities.canCreate}
        totalRecords={filteredItems.length}
      />

      {/* Data Table */}
      <ProjectAssignmentTable
        assignments={filteredItems}
        capabilities={capabilities}
        isLoading={isPending}
        onViewDetails={(item) => {
          setSelectedItem(item);
          setIsDetailsOpen(true);
        }}
        onTransfer={(item) => {
          setSelectedItem(item);
          setIsTransferOpen(true);
        }}
        onExtend={(item) => {
          setSelectedItem(item);
          setIsExtendOpen(true);
        }}
        onRelease={(item) => {
          setSelectedItem(item);
          setIsReleaseOpen(true);
        }}
        onCancel={(item) => {
          setSelectedItem(item);
          setIsCancelOpen(true);
        }}
      />

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-slate-200 px-4 py-3 rounded-xl text-xs text-slate-600">
          <div>
            Trang <strong className="text-slate-900">{currentPage}</strong> / {totalPages} (Tổng {total} bản ghi)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1 || isPending}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", String(currentPage - 1));
                router.push(`?${params.toString()}`);
              }}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={currentPage >= totalPages || isPending}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", String(currentPage + 1));
                router.push(`?${params.toString()}`);
              }}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <CreateAssignmentDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          showToast("Tạo đợt điều động nhân sự mới thành công");
          handleRefresh();
        }}
        employees={employees}
        projects={projects}
        roles={roles}
        canOverride={capabilities.canOverride}
      />

      {/* Transfer Dialog */}
      <TransferAssignmentDialog
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onSuccess={() => {
          showToast("Cập nhật / chuyển đổi vai trò phân công thành công");
          handleRefresh();
        }}
        assignment={selectedItem}
        roles={roles}
        canOverride={capabilities.canOverride}
      />

      {/* Extend Dialog */}
      <ExtendAssignmentDialog
        isOpen={isExtendOpen}
        onClose={() => setIsExtendOpen(false)}
        onSuccess={() => {
          showToast("Gia hạn đợt công tác công trình thành công");
          handleRefresh();
        }}
        assignment={selectedItem}
      />

      {/* Release Dialog */}
      <ReleaseAssignmentDialog
        isOpen={isReleaseOpen}
        onClose={() => setIsReleaseOpen(false)}
        onSuccess={() => {
          showToast("Rút nhân sự khỏi công trình thành công");
          handleRefresh();
        }}
        assignment={selectedItem}
      />

      {/* Cancel Dialog */}
      <CancelAssignmentDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onSuccess={() => {
          showToast("Hủy bỏ đợt phân công kế hoạch thành công");
          handleRefresh();
        }}
        assignment={selectedItem}
      />

      {/* Details Drawer */}
      <AssignmentDetailsDrawer
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        assignment={selectedItem}
      />
    </HrWorkspaceShell>
  );
}
