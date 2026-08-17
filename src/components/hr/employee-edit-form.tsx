"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateEmployeeProfileAction,
  updateEmployeeIdentityNumberAction,
} from "@/app/hr/employees/actions/employee-actions";
import {
  User,
  Shield,
  Save,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Lock,
  Building2,
  Briefcase,
  HardHat,
  Link2,
  Unlink,
  ArrowRightLeft,
  Calendar,
  Phone,
  Mail,
  BadgeCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { EmployeeStatus } from "@prisma/client";
import { EmployeeTransferModal } from "@/components/hr/employee-transfer-modal";
import { LinkUserAccountModal } from "@/components/hr/link-user-account-modal";

interface EmployeeEditFormProps {
  employee: any;
  orgUnits?: { id: string; code: string; name: string }[];
  positions?: { id: string; code: string; title: string }[];
  availableUsers?: { id: string; username: string | null; email: string | null; role: string }[];
}

export function EmployeeEditForm({
  employee,
  orgUnits = [],
  positions = [],
  availableUsers = [],
}: EmployeeEditFormProps) {
  const router = useRouter();

  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [submittingIdentity, setSubmittingIdentity] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identitySuccess, setIdentitySuccess] = useState(false);
  const [newIdentityNumber, setNewIdentityNumber] = useState("");

  // Modals state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showLinkUserModal, setShowLinkUserModal] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: employee.id,
    fullName: employee.fullName || "",
    gender: employee.gender || "NAM",
    dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split("T")[0] : "",
    phoneNumber: employee.phoneNumber || "",
    personalEmail: employee.personalEmail || "",
    joinedDate: employee.joinedDate ? employee.joinedDate.split("T")[0] : "",
    status: employee.status || EmployeeStatus.ACTIVE,
    resignedDate: employee.resignedDate ? employee.resignedDate.split("T")[0] : "",
    expectedUpdatedAt: employee.updatedAt,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProfile(true);
    setProfileError(null);

    const res = await updateEmployeeProfileAction(formData);
    setSubmittingProfile(false);

    if (!res.success) {
      setProfileError(res.error || "Không thể cập nhật hồ sơ");
      return;
    }

    router.push(`/hr/employees/${employee.id}`);
    router.refresh();
  };

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdentityNumber.trim()) return;

    setSubmittingIdentity(true);
    setIdentityError(null);
    setIdentitySuccess(false);

    const res = await updateEmployeeIdentityNumberAction(employee.id, newIdentityNumber.trim());
    setSubmittingIdentity(false);

    if (!res.success) {
      setIdentityError(res.error || "Lỗi cập nhật CCCD");
      return;
    }

    setIdentitySuccess(true);
    setNewIdentityNumber("");
    router.refresh();
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Profile Form */}
      <form onSubmit={handleProfileSubmit} className="space-y-6">
        {profileError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Lỗi cập nhật:</span>
              <span>{profileError}</span>
            </div>
          </div>
        )}

        {/* Card 1: Personal & Contact Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                1. Thông tin cá nhân & Liên hệ
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Mã nhân viên:</span>
              <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                {employee.code}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Giới tính
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="NAM">Nam</option>
                <option value="NỮ">Nữ</option>
                <option value="KHÁC">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ngày sinh
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số điện thoại
              </label>
              <input
                type="text"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email cá nhân
              </label>
              <input
                type="email"
                name="personalEmail"
                value={formData.personalEmail}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Work Status & Join Date */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              2. Thông tin làm việc & Trạng thái
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ngày vào công ty <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="joinedDate"
                required
                value={formData.joinedDate}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Trạng thái làm việc <span className="text-rose-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="ACTIVE">Đang làm việc (ACTIVE)</option>
                <option value="PROBATION">Thử việc (PROBATION)</option>
                <option value="SUSPENDED">Tạm ngừng làm việc (SUSPENDED)</option>
                <option value="RESIGNED">Đã nghỉ việc (RESIGNED)</option>
                <option value="RETIRED">Nghỉ hưu (RETIRED)</option>
              </select>
            </div>

            {(formData.status === EmployeeStatus.RESIGNED || formData.status === EmployeeStatus.RETIRED) && (
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày chính thức nghỉ việc / nghỉ hưu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="resignedDate"
                  required
                  value={formData.resignedDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Org Unit & Position Transfer */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                3. Phòng ban & Chức danh Chuyên môn
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowTransferModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Thực hiện Điều chuyển Công tác</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-slate-500 font-bold block">Phòng ban / Đơn vị hiện tại:</span>
              <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>{employee.currentOrgUnit?.name || "Chưa thuộc phòng ban nào"}</span>
                {employee.currentOrgUnit?.code && (
                  <span className="font-mono text-xs text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.2 rounded">
                    {employee.currentOrgUnit.code}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-slate-500 font-bold block">Chức danh chuyên môn hiện tại:</span>
              <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-600" />
                <span>{employee.currentPosition?.title || "Chưa gán chức danh"}</span>
                {employee.currentPosition?.code && (
                  <span className="font-mono text-xs text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.2 rounded">
                    {employee.currentPosition.code}
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            * Thay đổi phòng ban và chức danh được thực hiện thông qua luồng Điều chuyển công tác nhằm bảo lưu lịch sử bổ nhiệm và phục vụ báo cáo nhân sự.
          </p>
        </div>

        {/* Card 4: Active Project Assignments */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <HardHat className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                4. Phân công Công trình / Dự án đang tham gia
              </h2>
            </div>
            <Link
              href={`/hr/project-assignments?employeeId=${employee.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Quản lý Điều động Công trình</span>
            </Link>
          </div>

          {employee.activeProjects && employee.activeProjects.length > 0 ? (
            <div className="space-y-2">
              {employee.activeProjects.map((p: any) => (
                <div
                  key={p.id}
                  className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <HardHat className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900">{p.projectName}</span>
                      <span className="font-mono text-slate-500 ml-1.5">({p.projectCode})</span>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Vai trò: <strong>{p.roleTitle || "Thành viên dự án"}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="font-extrabold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg">
                    {p.allocationPercentage}% định biên
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs italic">
              Nhân viên hiện chưa được phân công tham gia công trình nào.
            </div>
          )}
        </div>

        {/* Card 5: Linked System User Account */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-cyan-600" />
              <h2 className="text-base font-bold text-slate-900">
                5. Liên kết Tài khoản Hệ thống
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowLinkUserModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Link2 className="w-4 h-4" />
              <span>{employee.user ? "Quản lý Liên kết Tài khoản" : "Liên kết Tài khoản Hệ thống"}</span>
            </button>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
            {employee.user ? (
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <BadgeCheck className="w-4 h-4 text-emerald-600" />
                <span>Đã liên kết với tài khoản: @{employee.user.username} ({employee.user.email})</span>
              </div>
            ) : (
              <span className="text-slate-500 italic">Chưa liên kết với tài khoản người dùng hệ thống nào.</span>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            href={`/hr/employees/${employee.id}`}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Hủy bỏ</span>
          </Link>

          <button
            type="submit"
            disabled={submittingProfile}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submittingProfile ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Cập nhật Thông tin Hồ sơ</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Separate Identity (CCCD) Update Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">
            6. Bảo mật & Mã hóa Số CCCD / CMND
          </h2>
        </div>

        <form onSubmit={handleIdentitySubmit} className="space-y-4">
          {identityError && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg">
              {identityError}
            </div>
          )}
          {identitySuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg">
              Cập nhật và mã hóa số CCCD thành công!
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Số CCCD / CMND mới
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newIdentityNumber}
                onChange={(e) => setNewIdentityNumber(e.target.value)}
                placeholder="Nhập 9 hoặc 12 số CCCD..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={submittingIdentity || !newIdentityNumber.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {submittingIdentity ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Mã hóa & Lưu CCCD</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modals */}
      <EmployeeTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        employeeId={employee.id}
        employeeName={employee.fullName}
        employeeCode={employee.code}
        currentOrgUnitId={employee.currentOrgUnit?.id}
        currentOrgUnitName={employee.currentOrgUnit?.name}
        currentPositionId={employee.currentPosition?.id}
        currentPositionTitle={employee.currentPosition?.title}
        orgUnits={orgUnits}
        positions={positions}
      />

      <LinkUserAccountModal
        isOpen={showLinkUserModal}
        onClose={() => setShowLinkUserModal(false)}
        employeeId={employee.id}
        employeeName={employee.fullName}
        employeeCode={employee.code}
        currentUserId={employee.userId}
        currentUsername={employee.user?.username}
        currentUserEmail={employee.user?.email}
        availableUsers={availableUsers}
      />
    </div>
  );
}
