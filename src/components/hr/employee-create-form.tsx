"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createEmployeeAction } from "@/app/hr/employees/actions/employee-actions";
import {
  User,
  Shield,
  Building2,
  UserCheck,
  Save,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface EmployeeCreateFormProps {
  organizationUnits: { id: string; name: string; code: string }[];
  positions: { id: string; title: string; code: string }[];
  unlinkedUsers: { id: string; name: string; email: string }[];
}

export function EmployeeCreateForm({
  organizationUnits,
  positions,
  unlinkedUsers,
}: EmployeeCreateFormProps) {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    gender: "NAM",
    dateOfBirth: "",
    phoneNumber: "",
    personalEmail: "",
    joinedDate: new Date().toISOString().split("T")[0],
    status: "ACTIVE",
    identityNumber: "",
    organizationUnitId: organizationUnits[0]?.id || "",
    positionId: positions[0]?.id || "",
    assignmentStartDate: new Date().toISOString().split("T")[0],
    decisionNo: "",
    notes: "",
    userId: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const res = await createEmployeeAction(formData);

    if (!res.success) {
      setErrorMsg(res.error || "Không thể tạo hồ sơ nhân viên");
      setSubmitting(false);
      return;
    }

    router.push(`/hr/employees/${res.employeeId}`);
    router.refresh();
  };

  // Check form completion status for summary panel
  const isNameFilled = formData.fullName.trim().length > 0;
  const isUnitFilled = !!formData.organizationUnitId;
  const isPositionFilled = !!formData.positionId;
  const selectedUnitName = organizationUnits.find((u) => u.id === formData.organizationUnitId)?.name || "Chưa chọn";
  const selectedPositionTitle = positions.find((p) => p.id === formData.positionId)?.title || "Chưa chọn";

  return (
    <form onSubmit={handleSubmit} className="relative space-y-6">
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Không thể tạo hồ sơ:</span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Grid 8/4 Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Form Sections */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section A: Basic Info */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                A. Thông tin cơ bản
              </h2>
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
                  placeholder="VD: Nguyễn Văn An"
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
                  placeholder="VD: 0912345678"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email cá nhân
                </label>
                <input
                  type="email"
                  name="personalEmail"
                  value={formData.personalEmail}
                  onChange={handleChange}
                  placeholder="VD: an.nguyen@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Trạng thái làm việc
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Đang làm việc</option>
                  <option value="PROBATION">Thử việc</option>
                  <option value="SUSPENDED">Tạm hoãn</option>
                  <option value="RESIGNED">Đã nghỉ việc</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section B: Security & Identity */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Shield className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">
                B. Định danh và Bảo mật
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số CCCD / CMND
              </label>
              <input
                type="text"
                name="identityNumber"
                value={formData.identityNumber}
                onChange={handleChange}
                placeholder="Nhập 9 hoặc 12 số CCCD / CMND..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Thông tin nhận dạng được mã hóa và bảo vệ trong hệ thống.
              </p>
            </div>
          </div>

          {/* Section C: Initial Assignment */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                C. Phân công công tác ban đầu
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Đơn vị / Phòng ban <span className="text-rose-500">*</span>
                </label>
                <select
                  name="organizationUnitId"
                  required
                  value={formData.organizationUnitId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {organizationUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      [{u.code}] {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chức danh ban đầu <span className="text-rose-500">*</span>
                </label>
                <select
                  name="positionId"
                  required
                  value={formData.positionId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày bắt đầu phân công
                </label>
                <input
                  type="date"
                  name="assignmentStartDate"
                  value={formData.assignmentStartDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số quyết định tiếp nhận
                </label>
                <input
                  type="text"
                  name="decisionNo"
                  value={formData.decisionNo}
                  onChange={handleChange}
                  placeholder="VD: QĐ-2026/08-NS"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section D: User Account Link */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <UserCheck className="w-5 h-5 text-purple-600" />
              <h2 className="text-base font-bold text-slate-900">
                D. Liên kết tài khoản hệ thống (Tùy chọn)
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chọn tài khoản hệ thống chưa liên kết
              </label>
              <select
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chưa liên kết tài khoản nào --</option>
                {unlinkedUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Mỗi tài khoản hệ thống chỉ được liên kết với 1 hồ sơ nhân viên duy nhất.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Summary Card & Completion Checklist */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-6 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Tóm tắt hồ sơ tạo mới
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Họ và tên:</span>
                <span className="font-bold text-slate-900 truncate max-w-[150px]">
                  {formData.fullName || "(Chưa nhập)"}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Phòng ban:</span>
                <span className="font-semibold text-blue-700 truncate max-w-[150px]">
                  {selectedUnitName}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Chức danh:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                  {selectedPositionTitle}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Ngày gia nhập:</span>
                <span className="font-medium text-slate-700">
                  {formData.joinedDate}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Mã NV tự động:</span>
                <span className="font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold">
                  NV-2026-XXXX
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Tiến độ hoàn thiện:
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isNameFilled ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className={isNameFilled ? "text-slate-700" : "text-slate-400"}>Họ tên nhân viên</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isUnitFilled ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className={isUnitFilled ? "text-slate-700" : "text-slate-400"}>Đơn vị phòng ban</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isPositionFilled ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className={isPositionFilled ? "text-slate-700" : "text-slate-400"}>Chức danh chuyên môn</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-xs border border-slate-200 p-4 rounded-xl shadow-lg flex items-center justify-between gap-4">
        <Link
          href="/hr/employees"
          className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Hủy bỏ</span>
        </Link>

        <button
          type="submit"
          id="btn-submit-employee-form"
          disabled={submitting}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 shrink-0"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Khởi tạo hồ sơ</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
