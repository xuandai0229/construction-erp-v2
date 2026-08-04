"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, RotateCcw } from "lucide-react";

interface EmployeeListFiltersProps {
  organizationUnits: { id: string; name: string; code: string }[];
  positions: { id: string; title: string; code: string }[];
}

export function EmployeeListFilters({ organizationUnits, positions }: EmployeeListFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [orgUnitId, setOrgUnitId] = useState(searchParams.get("orgUnitId") || "");
  const [positionId, setPositionId] = useState(searchParams.get("positionId") || "");
  const [unlinked, setUnlinked] = useState(searchParams.get("unlinked") === "true");
  const [missingOrg, setMissingOrg] = useState(searchParams.get("missingOrg") === "true");
  const [sort, setSort] = useState(searchParams.get("sort") || "createdAt");
  const [dir, setDir] = useState(searchParams.get("dir") || "desc");

  useEffect(() => {
    setQ(searchParams.get("q") || "");
    setStatus(searchParams.get("status") || "");
    setOrgUnitId(searchParams.get("orgUnitId") || "");
    setPositionId(searchParams.get("positionId") || "");
    setUnlinked(searchParams.get("unlinked") === "true");
    setMissingOrg(searchParams.get("missingOrg") === "true");
    setSort(searchParams.get("sort") || "createdAt");
    setDir(searchParams.get("dir") || "desc");
  }, [searchParams]);

  const hasActiveFilters = Boolean(
    q || status || orgUnitId || positionId || unlinked || missingOrg
  );

  const applyFilters = (updates: Record<string, string | boolean | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");

    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "" || val === false) {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });

    router.push(`/hr/employees?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ q: q.trim() });
  };

  const handleReset = () => {
    setQ("");
    setStatus("");
    setOrgUnitId("");
    setPositionId("");
    setUnlinked(false);
    setMissingOrg(false);
    router.push("/hr/employees");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
      <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã, họ tên, số điện thoại, email hoặc CCCD..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors shrink-0 flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" />
          <span>Tìm kiếm</span>
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Trạng thái làm việc
          </label>
          <select
            value={status}
            onChange={(e) => applyFilters({ status: e.target.value })}
            className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang làm việc</option>
            <option value="PROBATION">Thử việc</option>
            <option value="SUSPENDED">Tạm ngừng làm việc</option>
            <option value="RESIGNED">Đã nghỉ việc</option>
            <option value="RETIRED">Nghỉ hưu</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Phòng ban / Đơn vị
          </label>
          <select
            value={orgUnitId}
            onChange={(e) => applyFilters({ orgUnitId: e.target.value })}
            className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả phòng ban</option>
            {organizationUnits.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Chức danh
          </label>
          <select
            value={positionId}
            onChange={(e) => applyFilters({ positionId: e.target.value })}
            className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả chức danh</option>
            {positions.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Sắp xếp</label>
          <select
            value={`${sort}:${dir}`}
            onChange={(e) => {
              const [nextSort, nextDir] = e.target.value.split(":");
              setSort(nextSort);
              setDir(nextDir);
              applyFilters({ sort: nextSort, dir: nextDir });
            }}
            className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="createdAt:desc">Mới nhất</option>
            <option value="code:asc">Mã nhân viên</option>
            <option value="fullName:asc">Họ và tên</option>
            <option value="joinedDate:asc">Ngày vào công ty</option>
            <option value="status:asc">Trạng thái</option>
          </select>
        </div>

        <div className="flex items-end">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-1.5 px-3 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          ) : (
            <div className="w-full py-1.5 px-3 text-xs text-slate-400 text-center italic">
              Chưa áp dụng bộ lọc
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 pt-1">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={unlinked}
            onChange={(e) => applyFilters({ unlinked: e.target.checked })}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Chỉ xem hồ sơ chưa liên kết tài khoản hệ thống</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={missingOrg}
            onChange={(e) => applyFilters({ missingOrg: e.target.checked })}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Chỉ xem hồ sơ chưa phân công phòng ban chính</span>
        </label>
      </div>
    </div>
  );
}
