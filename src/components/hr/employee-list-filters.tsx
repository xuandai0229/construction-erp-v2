"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, RotateCcw, Filter, X } from "lucide-react";

interface EmployeeListFiltersProps {
  organizationUnits: { id: string; name: string; code: string }[];
  positions: { id: string; title: string; code: string }[];
}

export function EmployeeListFilters({ organizationUnits, positions }: EmployeeListFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [workplace, setWorkplace] = useState(searchParams.get("workplace") || "");
  const [orgUnitId, setOrgUnitId] = useState(searchParams.get("orgUnitId") || "");
  const [positionId, setPositionId] = useState(searchParams.get("positionId") || "");
  const [unlinked, setUnlinked] = useState(searchParams.get("unlinked") === "true");
  const [missingOrg, setMissingOrg] = useState(searchParams.get("missingOrg") === "true");
  const [assignmentEndingSoon, setAssignmentEndingSoon] = useState(
    searchParams.get("assignmentEndingSoon") === "true"
  );
  const [sort, setSort] = useState(searchParams.get("sort") || "joinedDate");
  const [dir, setDir] = useState(searchParams.get("dir") || "desc");
  const [showAdvanced, setShowAdvanced] = useState(
    searchParams.get("unlinked") === "true" ||
      searchParams.get("missingOrg") === "true" ||
      searchParams.get("assignmentEndingSoon") === "true"
  );

  useEffect(() => {
    setQ(searchParams.get("q") || "");
    setStatus(searchParams.get("status") || "");
    setWorkplace(searchParams.get("workplace") || "");
    setOrgUnitId(searchParams.get("orgUnitId") || "");
    setPositionId(searchParams.get("positionId") || "");
    setUnlinked(searchParams.get("unlinked") === "true");
    setMissingOrg(searchParams.get("missingOrg") === "true");
    setAssignmentEndingSoon(searchParams.get("assignmentEndingSoon") === "true");
    setSort(searchParams.get("sort") || "joinedDate");
    setDir(searchParams.get("dir") || "desc");
  }, [searchParams]);

  const hasActiveFilters = Boolean(
    q || status || workplace || orgUnitId || positionId || unlinked || missingOrg || assignmentEndingSoon
  );

  const applyFilters = (updates: Record<string, string | boolean | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1"); // Always reset page to 1 on filter change

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
    setWorkplace("");
    setOrgUnitId("");
    setPositionId("");
    setUnlinked(false);
    setMissingOrg(false);
    setAssignmentEndingSoon(false);
    setSort("joinedDate");
    setDir("desc");
    router.push("/hr/employees");
  };

  // Find full human readable names for filter chips
  const selectedOrgUnit = organizationUnits.find((u) => u.id === orgUnitId);
  const selectedPosition = positions.find((p) => p.id === positionId);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
      {/* Search Bar + Quick Submit */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã hoặc tên nhân viên..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
        </div>
        <button
          type="submit"
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Tìm</span>
        </button>
      </form>

      {/* Compact Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-1">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Trạng thái làm việc
          </label>
          <select
            value={status}
            onChange={(e) => applyFilters({ status: e.target.value })}
            className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Nhân sự hiện tại (Mặc định)</option>
            <option value="ACTIVE">Đang làm việc</option>
            <option value="PROBATION">Thử việc</option>
            <option value="SUSPENDED">Tạm ngừng</option>
            <option value="RESIGNED">Đã nghỉ việc</option>
            <option value="RETIRED">Nghỉ hưu</option>
            <option value="ALL">Tất cả hồ sơ (Bao gồm đã nghỉ việc)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Bố trí công trình
          </label>
          <select
            value={workplace}
            onChange={(e) => applyFilters({ workplace: e.target.value })}
            className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả</option>
            <option value="site">Đang ở công trình</option>
            <option value="unassigned">Chưa bố trí công trình</option>
            <option value="overallocated">Quá tải</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Phòng ban / Đơn vị
          </label>
          <select
            value={orgUnitId}
            onChange={(e) => applyFilters({ orgUnitId: e.target.value })}
            className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả phòng ban</option>
            <option value="UNASSIGNED">Chưa phân phòng ban</option>
            {organizationUnits.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Chức danh
          </label>
          <select
            value={positionId}
            onChange={(e) => applyFilters({ positionId: e.target.value })}
            className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả chức danh</option>
            <option value="UNASSIGNED">Chưa xác định chức danh</option>
            {positions.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sắp xếp</label>
          <select
            value={`${sort}:${dir}`}
            onChange={(e) => {
              const [nextSort, nextDir] = e.target.value.split(":");
              setSort(nextSort);
              setDir(nextDir);
              applyFilters({ sort: nextSort, dir: nextDir });
            }}
            className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="joinedDate:desc">Ngày vào làm: mới nhất</option>
            <option value="joinedDate:asc">Ngày vào làm: cũ nhất</option>
            <option value="fullName:asc">Họ và tên: A–Z</option>
            <option value="fullName:desc">Họ và tên: Z–A</option>
            <option value="code:asc">Mã nhân viên</option>
          </select>
        </div>
      </div>

      {/* Advanced Filter Toggle & Panel */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Bộ lọc nâng cao</span>
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-lg flex flex-wrap gap-4 text-xs font-medium text-slate-700">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={missingOrg}
              onChange={(e) => applyFilters({ missingOrg: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Chưa phân công phòng ban chính</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={assignmentEndingSoon}
              onChange={(e) => applyFilters({ assignmentEndingSoon: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Điều động sắp kết thúc (30 ngày)</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={unlinked}
              onChange={(e) => applyFilters({ unlinked: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Chưa liên kết tài khoản hệ thống</span>
          </label>
        </div>
      )}

      {/* Active Filter Chips (UNIFIED NEUTRAL VISUAL STYLE & HUMAN READABLE LABELS) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="font-semibold text-slate-500 mr-1">Đang lọc:</span>
          {q && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium">
              Từ khóa: &quot;{q}&quot;
              <button type="button" onClick={() => { setQ(""); applyFilters({ q: null }); }} className="hover:text-red-600 cursor-pointer ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {status && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium">
              Trạng thái: {status === "ACTIVE" ? "Đang làm việc" : status === "PROBATION" ? "Thử việc" : status === "SUSPENDED" ? "Tạm ngừng" : status === "RESIGNED" ? "Đã nghỉ việc" : status === "RETIRED" ? "Nghỉ hưu" : "Tất cả hồ sơ"}
              <button type="button" onClick={() => { setStatus(""); applyFilters({ status: null }); }} className="hover:text-red-600 cursor-pointer ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {workplace && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium">
              Bố trí: {workplace === "site" ? "Đang ở công trình" : workplace === "unassigned" ? "Chưa bố trí công trình" : "Quá tải"}
              <button type="button" onClick={() => { setWorkplace(""); applyFilters({ workplace: null }); }} className="hover:text-red-600 cursor-pointer ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedOrgUnit && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium">
              Phòng ban: {selectedOrgUnit.name}
              <button type="button" onClick={() => { setOrgUnitId(""); applyFilters({ orgUnitId: null }); }} className="hover:text-red-600 cursor-pointer ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedPosition && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium">
              Chức danh: {selectedPosition.title}
              <button type="button" onClick={() => { setPositionId(""); applyFilters({ positionId: null }); }} className="hover:text-red-600 cursor-pointer ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {missingOrg && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
              Thiếu phòng ban
              <button type="button" onClick={() => { setMissingOrg(false); applyFilters({ missingOrg: null }); }} className="hover:text-red-600 cursor-pointer ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {assignmentEndingSoon && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
              Sắp hết điều động
              <button type="button" onClick={() => { setAssignmentEndingSoon(false); applyFilters({ assignmentEndingSoon: null }); }} className="hover:text-red-600 cursor-pointer ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {unlinked && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium">
              Chưa có tài khoản
              <button type="button" onClick={() => { setUnlinked(false); applyFilters({ unlinked: null }); }} className="hover:text-red-600 cursor-pointer ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
