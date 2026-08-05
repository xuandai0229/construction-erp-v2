"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  User,
  Building2,
  Briefcase,
  Shield,
  Eye,
  EyeOff,
  Edit,
  UserX,
  History,
  Link2,
  FileText,
  Award,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import { revealIdentityNumberAction, archiveEmployeeAction, linkUserAccountAction } from "@/app/hr/employees/actions/employee-actions";
import { EmployeeTransferDialog } from "@/components/hr/employee-transfer-dialog";
import { cn } from "@/lib/utils";
import { EmployeeStatus } from "@prisma/client";

export interface EmployeeDto {
  id: string;
  code: string;
  fullName: string;
  joinedDate: string | Date;
  status: EmployeeStatus | string;
  phoneNumber?: string | null;
  personalEmail?: string | null;
  address?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  maskedIdentityNumber?: string | null;
  identityNumberLastDigits?: string | null;
  resignedDate?: string | Date | null;
  notes?: string | null;
  user?: {
    id: string;
    name: string;
    email: string | null;
    username?: string | null;
    role: string;
  } | null;
}

export interface OrganizationAssignmentDto {
  id: string;
  organizationUnitId: string;
  positionId: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  isPrimary: boolean;
  decisionNo?: string | null;
  organizationUnit?: { id: string; code: string; name: string };
  position?: { id: string; code: string; title: string };
}

export interface ProjectAssignmentDto {
  id: string;
  projectId: string;
  projectPersonnelRoleId?: string;
  roleId?: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  allocationPercentage?: number;
  status: string;
  project?: { id: string; code: string; name: string };
  projectPersonnelRole?: { id: string; code: string; name: string };
  role?: { id: string; name: string };
}

export interface ChangeHistoryDto {
  id: string;
  changeType: string;
  createdAt: string | Date;
  effectiveDate?: string | Date;
  decisionNo?: string | null;
  reason?: string | null;
  performedBy?: { id?: string; name: string; email: string | null } | null;
}

interface EmployeeDetailViewProps {
  employee: EmployeeDto;
  organizationAssignments: OrganizationAssignmentDto[];
  projectAssignments: ProjectAssignmentDto[];
  changeHistory: ChangeHistoryDto[];
  unlinkedUsers: { id: string; name: string; email: string | null }[];
  allUnits?: { id: string; code: string; name: string }[];
  allPositions?: { id: string; code: string; title: string }[];
  canUpdate: boolean;
  canArchive: boolean;
  canReadSensitive: boolean;
}


const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  ACTIVE: { label: "Đang làm việc", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PROBATION: { label: "Đang thử việc", style: "bg-amber-50 text-amber-700 border-amber-200" },
  SUSPENDED: { label: "Tạm ngừng", style: "bg-orange-50 text-orange-700 border-orange-200" },
  RESIGNED: { label: "Đã nghỉ việc", style: "bg-rose-50 text-rose-700 border-rose-200" },
  RETIRED: { label: "Nghỉ hưu", style: "bg-slate-100 text-slate-700 border-slate-200" },
};

function getInitials(name: string): string {
  if (!name) return "NV";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function EmployeeDetailView({
  employee,
  organizationAssignments,
  projectAssignments,
  changeHistory,
  unlinkedUsers,
  allUnits = [],
  allPositions = [],
  canUpdate,
  canArchive,
  canReadSensitive,
}: EmployeeDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "info" | "org_history" | "projects" | "history" | "user_link" | "unimplemented"
  >("info");

  const [unimplementedTitle, setUnimplementedTitle] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Sensitive Identity reveal state
  const [revealedIdentity, setRevealedIdentity] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  // Archive / Resign Modal state
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveForm, setArchiveForm] = useState<{
    resignedDate: string;
    reason: string;
    status: EmployeeStatus;
  }>({
    resignedDate: new Date().toISOString().split("T")[0],
    reason: "",
    status: EmployeeStatus.RESIGNED,
  });
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Link User Modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const now = new Date();
  const primaryAssignment =
    organizationAssignments.find(
      (a) =>
        a.isPrimary &&
        new Date(a.startDate) <= now &&
        (!a.endDate || new Date(a.endDate) > now)
    ) || organizationAssignments[0];


  const handleRevealIdentity = async () => {
    if (revealedIdentity) {
      setRevealedIdentity(null);
      return;
    }
    setRevealing(true);
    setIdentityError(null);
    const res = await revealIdentityNumberAction(employee.id);
    setRevealing(false);
    if (res.success && res.identityNumber) {
      setRevealedIdentity(res.identityNumber);
    } else {
      setIdentityError(res.error || "Không thể xem thông tin CCCD");
    }
  };

  const handleArchiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setArchiving(true);
    setArchiveError(null);

    const res = await archiveEmployeeAction(
      employee.id,
      archiveForm.resignedDate,
      archiveForm.reason,
      archiveForm.status
    );

    setArchiving(false);
    if (!res.success) {
      setArchiveError(res.error || "Lỗi lưu trữ hồ sơ");
      return;
    }

    setShowArchiveModal(false);
    router.refresh();
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinking(true);
    setLinkError(null);

    const res = await linkUserAccountAction(employee.id, selectedUserId || null);
    setLinking(false);
    if (!res.success) {
      setLinkError(res.error || "Lỗi liên kết tài khoản");
      return;
    }

    setShowLinkModal(false);
    router.refresh();
  };

  const openUnimplementedTab = (title: string) => {
    setUnimplementedTitle(title);
    setActiveTab("unimplemented");
  };

  useEffect(() => {
    if (revealedIdentity) {
      const timer = setTimeout(() => {
        setRevealedIdentity(null);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [revealedIdentity]);

  useEffect(() => {
    setRevealedIdentity(null);
  }, [activeTab]);

  const mapChangeTypeToVietnamese = (type: string) => {
    const map: Record<string, string> = {
      EMPLOYEE_CREATED: "Tạo mới hồ sơ",
      EMPLOYEE_PROFILE_UPDATED: "Cập nhật hồ sơ",
      EMPLOYEE_ORGANIZATION_TRANSFERRED: "Điều chuyển phòng ban",
      EMPLOYEE_POSITION_CHANGED: "Thay đổi chức danh",
      EMPLOYEE_PROJECT_ASSIGNED: "Phân công dự án",
      EMPLOYEE_PROJECT_RELEASED: "Rút khỏi dự án",
      EMPLOYMENT_STATUS_CHANGED: "Thay đổi trạng thái làm việc",
      ACCESS_GRANTED: "Cấp quyền truy cập",
      ACCESS_REVOKED: "Thu hồi quyền truy cập",
    };
    return map[type] || type;
  };

  const mapRoleToVietnamese = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: "Quản trị viên hệ thống",
      DIRECTOR: "Giám đốc",
      DEPUTY_DIRECTOR: "Phó Giám đốc",
      CHIEF_COMMANDER: "Chỉ huy trưởng",
      MANAGER: "Trưởng phòng / Quản lý",
      ENGINEER: "Kỹ sư",
      STAFF: "Nhân viên",
      SUPERVISION_HEAD: "Trưởng đoàn giám sát",
      CONSTRUCTION_SUPERVISOR: "Giám sát viên",
    };
    return map[role] || role;
  };

  const statusCfg = STATUS_CONFIG[employee.status] || {
    label: employee.status,
    style: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xl flex items-center justify-center shrink-0 border-2 border-blue-200">
              {getInitials(employee.fullName)}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-extrabold text-slate-900">
                  {employee.fullName}
                </h1>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                  {employee.code}
                </span>
                <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", statusCfg.style)}>
                  {statusCfg.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{primaryAssignment?.organizationUnit?.name || "Chưa có phòng ban"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{primaryAssignment?.position?.title || "Chưa có chức danh"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Tài khoản: {employee.user?.name ? `${employee.user.name} (${employee.user.email || ""})` : "Chưa liên kết"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canUpdate && employee.status !== EmployeeStatus.RESIGNED && (
              <button
                type="button"
                onClick={() => setShowTransferModal(true)}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Điều chuyển công tác</span>
              </button>
            )}

            {canUpdate && employee.status !== EmployeeStatus.RESIGNED && (
              <Link
                href={`/hr/employees/${employee.id}/edit`}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Edit className="w-4 h-4" />
                <span>Chỉnh sửa hồ sơ</span>
              </Link>
            )}

            {canArchive && employee.status !== EmployeeStatus.RESIGNED && (
              <button
                type="button"
                onClick={() => setShowArchiveModal(true)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <UserX className="w-4 h-4" />
                <span>Nghỉ việc / Lưu trữ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Sub-navigation */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-2">
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("info")}
            className={cn(
              "px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2",
              activeTab === "info"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            )}
          >
            <User className="w-4 h-4" />
            <span>Thông tin chung</span>
          </button>

          <button
            onClick={() => setActiveTab("org_history")}
            className={cn(
              "px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2",
              activeTab === "org_history"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            )}
          >
            <Building2 className="w-4 h-4" />
            <span>Quá trình công tác ({organizationAssignments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("projects")}
            className={cn(
              "px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2",
              activeTab === "projects"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            )}
          >
            <Briefcase className="w-4 h-4" />
            <span>Phân công công trình ({projectAssignments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2",
              activeTab === "history"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            )}
          >
            <History className="w-4 h-4" />
            <span>Lịch sử thay đổi ({changeHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("user_link")}
            className={cn(
              "px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2",
              activeTab === "user_link"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            )}
          >
            <Link2 className="w-4 h-4" />
            <span>Tài khoản liên kết</span>
          </button>

          <button
            onClick={() => openUnimplementedTab("Hợp đồng lao động")}
            className="px-4 py-3 text-xs font-medium text-slate-400 hover:text-slate-600 whitespace-nowrap flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>Hợp đồng</span>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded">Sắp có</span>
          </button>

          <button
            onClick={() => openUnimplementedTab("Chứng chỉ và bằng cấp")}
            className="px-4 py-3 text-xs font-medium text-slate-400 hover:text-slate-600 whitespace-nowrap flex items-center gap-1.5"
          >
            <Award className="w-4 h-4" />
            <span>Chứng chỉ</span>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded">Sắp có</span>
          </button>
        </div>
      </div>

      {/* Tab Content 1: General Info */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> Thông tin cá nhân
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Họ và tên</span>
                <span className="font-semibold text-slate-900">{employee.fullName}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Mã nhân viên</span>
                <span className="font-mono font-semibold text-slate-900">{employee.code}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Giới tính</span>
                <span className="font-medium text-slate-900">{employee.gender || "—"}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Ngày sinh</span>
                <span className="font-medium text-slate-900">
                  {employee.dateOfBirth ? format(new Date(employee.dateOfBirth), "dd/MM/yyyy") : "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Số điện thoại</span>
                <span className="font-mono font-medium text-slate-900">{employee.phoneNumber || "Bị ẩn / Không có"}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Email cá nhân</span>
                <span className="font-medium text-slate-900">{employee.personalEmail || "Bị ẩn / Không có"}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Ngày vào công ty</span>
                <span className="font-medium text-slate-900">
                  {employee.joinedDate ? format(new Date(employee.joinedDate), "dd/MM/yyyy") : "—"}
                </span>
              </div>

              {employee.resignedDate && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Ngày nghỉ việc</span>
                  <span className="font-medium text-rose-600">
                    {format(new Date(employee.resignedDate), "dd/MM/yyyy")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Identity Security Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" /> Thông tin nhận dạng bảo mật (CCCD)
            </h3>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Số CCCD / CMND</span>
                <div className="flex items-center gap-3">
                  <div className="font-mono text-sm font-bold bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 text-slate-900 min-w-[180px]">
                    {revealedIdentity ? (
                      <span className="text-emerald-700">{revealedIdentity}</span>
                    ) : (
                      <span>{employee.maskedIdentityNumber || "Chưa cập nhật"}</span>
                    )}
                  </div>

                  {canReadSensitive && employee.identityNumberLastDigits && (
                    <button
                      type="button"
                      onClick={handleRevealIdentity}
                      disabled={revealing}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {revealing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : revealedIdentity ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Che bớt</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem đầy đủ</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {identityError && (
                  <p className="text-xs text-rose-600 mt-1">{identityError}</p>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 space-y-1 border border-slate-100">
                <p className="font-semibold text-slate-700">
                  Chính sách bảo vệ thông tin cá nhân và Nhật ký an ninh:
                </p>
                <p>
                  • Thông tin nhận dạng được mã hóa và bảo vệ trong hệ thống.
                </p>
                <p>
                  • Hành động giải mã hoặc truy cập thông tin định danh đều được ghi lại trong nhật ký hệ thống.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Organization History */}
      {activeTab === "org_history" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Dòng thời gian quá trình công tác phòng ban
          </h3>

          <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
            {organizationAssignments.map((assign) => {
              const isActive = !assign.endDate || new Date(assign.endDate) > new Date();
              return (
                <div key={assign.id} className="relative">
                  <div
                    className={cn(
                      "absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-white",
                      isActive
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-slate-300"
                    )}
                  />

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {assign.organizationUnit?.name} ({assign.organizationUnit?.code})
                        </span>
                        {assign.isPrimary && (
                          <span className="text-[10px] uppercase font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                            Phòng chính
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-[10px] uppercase font-bold px-2 py-0.5 rounded border",
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-200 text-slate-600 border-slate-300"
                          )}
                        >
                          {isActive ? "Đang hiệu lực" : "Đã kết thúc"}
                        </span>
                      </div>

                      <div className="text-xs font-medium text-slate-500">
                        {format(new Date(assign.startDate), "dd/MM/yyyy")}
                        {" → "}
                        {assign.endDate ? format(new Date(assign.endDate), "dd/MM/yyyy") : "Hiện tại"}
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 font-medium">
                      Chức danh: {assign.position?.title} ({assign.position?.code})
                    </div>

                    {assign.decisionNo && (
                      <div className="text-xs text-slate-500 font-mono">
                        Quyết định số: {assign.decisionNo}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content 3: Project Assignments */}
      {activeTab === "projects" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Lịch sử phân công nhân sự công trình
          </h3>

          {projectAssignments.length === 0 ? (
            <p className="text-sm text-slate-500 italic py-4">Chưa có dữ liệu phân công công trình.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                    <th className="p-3">Công trình / Dự án</th>
                    <th className="p-3">Vai trò dự án</th>
                    <th className="p-3">Tỉ lệ phân bổ</th>
                    <th className="p-3">Ngày bắt đầu</th>
                    <th className="p-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectAssignments.map((p) => (
                    <tr key={p.id}>
                      <td className="p-3 font-semibold text-slate-900">
                        {p.project?.name || p.projectId}
                      </td>
                      <td className="p-3 text-slate-700">{p.projectPersonnelRole?.name || p.projectPersonnelRoleId}</td>
                      <td className="p-3 font-mono text-slate-700">{p.allocationPercentage}%</td>
                      <td className="p-3 text-slate-700">{format(new Date(p.startDate), "dd/MM/yyyy")}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 4: Audit Change History */}
      {activeTab === "history" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Nhật ký thay đổi hồ sơ
          </h3>

          <div className="space-y-3">
            {changeHistory.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>{mapChangeTypeToVietnamese(log.changeType)}</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss")}
                  </span>
                </div>
                <p className="text-slate-600">{log.reason}</p>
                {log.performedBy && (
                  <p className="text-[11px] text-slate-400">
                    Người thực hiện: {log.performedBy.name} ({log.performedBy.email})
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 5: Linked User Account */}
      {activeTab === "user_link" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-purple-600" /> Tài khoản hệ thống liên kết
            </h3>
            {canUpdate && (
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition-colors"
              >
                {employee.user ? "Thay đổi / Hủy liên kết" : "Liên kết tài khoản mới"}
              </button>
            )}
          </div>

          {employee.user ? (
            <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  {employee.user.name}
                </span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-semibold text-[10px]">
                  Vai trò: {mapRoleToVietnamese(employee.user.role)}
                </span>
              </div>
              <p className="text-slate-600">Email: {employee.user.email}</p>
              <p className="text-slate-600">Tên đăng nhập: {employee.user.username || "—"}</p>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-300">
              Hồ sơ này chưa được liên kết với tài khoản người dùng nào.
            </div>
          )}
        </div>
      )}

      {/* Unimplemented Tab Placeholder */}
      {activeTab === "unimplemented" && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs space-y-2">
          <h3 className="text-lg font-bold text-slate-900">
            {unimplementedTitle}
          </h3>
          <p className="text-xs text-slate-500">
            Chức năng đang được tích hợp và hoàn thiện trong phiên bản tiếp theo.
          </p>
        </div>
      )}

      {/* Resign / Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Ghi nhận nhân viên nghỉ việc / Lưu trữ
            </h3>

            {archiveError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg">
                {archiveError}
              </div>
            )}

            <form onSubmit={handleArchiveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Trạng thái kết thúc <span className="text-rose-500">*</span>
                </label>
                <select
                  value={archiveForm.status}
                  onChange={(e) => setArchiveForm((p) => ({ ...p, status: e.target.value as EmployeeStatus }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
                >
                  <option value="RESIGNED">Đã nghỉ việc</option>
                  <option value="RETIRED">Nghỉ hưu</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày chính thức nghỉ việc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={archiveForm.resignedDate}
                  onChange={(e) => setArchiveForm((p) => ({ ...p, resignedDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do nghỉ việc <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={archiveForm.reason}
                  onChange={(e) => setArchiveForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Nhập lý do chi tiết..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={archiving}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {archiving ? "Đang xử lý..." : "Xác nhận lưu trữ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link User Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Liên kết tài khoản hệ thống
            </h3>

            {linkError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg">
                {linkError}
              </div>
            )}

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn tài khoản hệ thống chưa liên kết
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900"
                >
                  <option value="">-- Hủy liên kết (Không gắn tài khoản) --</option>
                  {unlinkedUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={linking}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {linking ? "Đang lưu..." : "Cập nhật liên kết"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Employee Modal */}
      <EmployeeTransferDialog
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        units={allUnits}
        positions={allPositions}
        employees={[{ id: employee.id, code: employee.code, fullName: employee.fullName }]}
        defaultEmployeeId={employee.id}
      />
    </div>
  );
}
