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
} from "lucide-react";
import Link from "next/link";
import { EmployeeStatus } from "@prisma/client";

interface EmployeeEditFormProps {
  employee: any;
}

export function EmployeeEditForm({ employee }: EmployeeEditFormProps) {
  const router = useRouter();

  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [submittingIdentity, setSubmittingIdentity] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identitySuccess, setIdentitySuccess] = useState(false);
  const [newIdentityNumber, setNewIdentityNumber] = useState("");

  const [formData, setFormData] = useState({
    employeeId: employee.id,
    fullName: employee.fullName || "",
    gender: employee.gender || "NAM",
    dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split("T")[0] : "",
    phoneNumber: employee.phoneNumber || "",
    personalEmail: employee.personalEmail || "",
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

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                Chỉnh sửa thông tin cơ bản
              </h2>
            </div>
            <span className="font-mono text-xs text-slate-500 font-bold">Mã NV: {employee.code}</span>
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

            <div>
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
                <option value="SUSPENDED">Tạm ngừng làm việc</option>
                <option value="RESIGNED">Đã nghỉ việc</option>
                <option value="RETIRED">Nghỉ hưu</option>
              </select>
            </div>

            {formData.status === EmployeeStatus.RESIGNED && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày chính thức nghỉ việc
                </label>
                <input
                  type="date"
                  name="resignedDate"
                  value={formData.resignedDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {submittingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Cập nhật thông tin</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Separate Identity Update Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">
            Cập nhật số CCCD / CMND
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
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0"
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
    </div>
  );
}
