"use client";

import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Building2,
  Users,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Building,
  AlertTriangle,
  X,
  ExternalLink,
  Edit,
  ArrowRight,
  ShieldCheck,
  User,
} from "lucide-react";
import { OrgTreeNode } from "./organization-tree-view";
import { ManagerAssignmentPanel } from "./manager-assignment-panel";

interface OrgChartViewProps {
  treeData: OrgTreeNode[];
  companyHeadcount?: number;
  canManage?: boolean;
  activeEmployees?: { id: string; fullName: string; code: string }[];
}

export function OrgChartView({ treeData, companyHeadcount, canManage, activeEmployees }: OrgChartViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedUnit, setSelectedUnit] = useState<OrgTreeNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(1.4, prev + 0.1));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.6, prev - 0.1));
  const handleResetZoom = () => setZoomLevel(1);
  const handleFitScreen = () => setZoomLevel(0.85);

  if (treeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-xs text-center space-y-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-base font-bold text-slate-900">
            Chưa có sơ đồ tổ chức
          </h3>
          <p className="text-xs text-slate-500">
            Khởi tạo các phòng ban và đơn vị đầu tiên để xem cơ cấu cây tổ chức trực quan.
          </p>
        </div>
      </div>
    );
  }

  // Calculate assigned company headcount across tree
  const countAllAssigned = (nodes: OrgTreeNode[]): number =>
    nodes.reduce((acc, n) => acc + n.activeEmployeeCount + countAllAssigned(n.children), 0);
  
  const assignedCompanyHeadcount = countAllAssigned(treeData);
  const totalCompanyHeadcount = companyHeadcount ?? assignedCompanyHeadcount;
  const unassignedHeadcount = Math.max(0, totalCompanyHeadcount - assignedCompanyHeadcount);

  const renderChartNode = (node: OrgTreeNode, isTopDirector = false) => {
    const isCollapsed = !!collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;

    // Search matching logic: code, unit name, manager name, or member name
    const lowerSearch = searchTerm.trim().toLowerCase();
    const isMatched =
      lowerSearch !== "" &&
      (node.name.toLowerCase().includes(lowerSearch) ||
        node.code.toLowerCase().includes(lowerSearch) ||
        (node.manager && node.manager.fullName.toLowerCase().includes(lowerSearch)) ||
        (node.members && node.members.some((m) => m.fullName.toLowerCase().includes(lowerSearch))));

    const isSelected = selectedUnit?.id === node.id;

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node Card */}
        <div
          onClick={() => setSelectedUnit(node)}
          className={`relative z-10 w-64 rounded-xl border p-3.5 shadow-xs transition-all cursor-pointer select-none ${
            isSelected
              ? "bg-blue-50/90 border-blue-600 ring-2 ring-blue-500 shadow-md"
              : isTopDirector
              ? "bg-slate-900 text-white border-slate-800 hover:border-blue-500 shadow-md"
              : isMatched
              ? "bg-amber-50/90 ring-2 ring-amber-500 border-amber-400 shadow-md"
              : "bg-white border-slate-200 hover:border-blue-400 hover:shadow-md"
          }`}
        >
          {/* Header Row: Unit Code Badge & Headcount */}
          <div className="flex items-center justify-between mb-2">
            <span
              className={`px-2 py-0.5 text-[10px] font-mono font-extrabold uppercase tracking-wider rounded border ${
                isTopDirector
                  ? "bg-slate-800 text-blue-300 border-slate-700"
                  : "bg-blue-50 text-blue-800 border-blue-200"
              }`}
            >
              {node.code}
            </span>
            <div className="flex items-center gap-1">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${
                  node.activeEmployeeCount === 0 && node.manager
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : isTopDirector
                    ? "bg-slate-800 text-slate-200 border-slate-700"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <Users className={`w-3 h-3 ${isTopDirector ? "text-blue-400" : "text-slate-400"}`} />
                {node.activeEmployeeCount} NV
              </span>
            </div>
          </div>

          {/* Unit Title */}
          <h3
            className={`text-xs font-bold leading-snug mb-2 line-clamp-2 ${
              isTopDirector ? "text-white text-sm font-extrabold" : "text-slate-900"
            }`}
            title={node.name}
          >
            {node.name}
          </h3>

          {/* Manager Row */}
          <div className={`pt-2 border-t text-xs ${isTopDirector ? "border-slate-800" : "border-slate-100"}`}>
            {node.manager ? (
              <div
                className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] ${
                  isTopDirector
                    ? "bg-slate-800/80 border-slate-700 text-slate-100"
                    : "bg-blue-50/70 border-blue-100 text-slate-900"
                }`}
              >
                <UserCheck className={`w-3.5 h-3.5 shrink-0 ${isTopDirector ? "text-blue-400" : "text-blue-600"}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                    {node.activeEmployeeCount === 0 ? "Người phụ trách" : "Trưởng phòng"}
                  </div>
                  <div className="font-bold leading-snug line-clamp-1" title={node.manager.fullName}>
                    {node.manager.fullName}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`text-[11px] italic flex items-center gap-1.5 p-1 ${isTopDirector ? "text-slate-400" : "text-slate-400"}`}>
                <Building className="w-3.5 h-3.5 shrink-0" />
                <span>Chưa bổ nhiệm người phụ trách</span>
              </div>
            )}
          </div>

          {/* Expand / Collapse Button */}
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => toggleCollapse(node.id, e)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-400 transition-colors z-20 cursor-pointer"
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Vertical Connector Line Down */}
        {hasChildren && !isCollapsed && (
          <>
            <div className="w-0.5 h-6 bg-slate-300" />
            <div className="relative flex justify-center gap-8 pt-6 border-t-2 border-slate-300">
              {node.children.map((child) => renderChartNode(child, false))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Clickable Warning Banner if unassigned employees exist */}
      {unassignedHeadcount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Cảnh báo dữ liệu: <strong className="font-extrabold">{unassignedHeadcount} nhân sự</strong> chưa được phân bổ vào phòng ban chính thức.
            </span>
          </div>
          <Link
            href="/hr/employees?missingOrg=true"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1 rounded-lg transition-colors shrink-0"
          >
            <span>Xem danh sách nhân sự</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Control & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên phòng, mã, hoặc tên NV..."
            className="w-full h-9 pl-9 pr-3 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 mr-2 hidden md:inline-block">
            Tỷ lệ: {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Thu nhỏ (-)"
            className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            title="Đặt lại 100%"
            className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Phóng to (+)"
            className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleFitScreen}
            title="Fit to Screen"
            className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas View */}
      <div
        ref={containerRef}
        className="rounded-xl border border-slate-200 bg-slate-50/60 p-8 shadow-xs overflow-auto min-h-[520px] select-none"
      >
        <div
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top center" }}
          className="flex flex-col items-center min-w-max transition-transform duration-150"
        >
          {/* Top Level Company Header Card */}
          <div className="flex flex-col items-center">
            <div className="relative z-10 w-72 rounded-xl border border-slate-300 p-3.5 shadow-xs bg-white text-slate-900 text-center space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-extrabold uppercase bg-slate-100 text-slate-700 rounded border border-slate-200">
                  CÔNG TY
                </span>
                <span className="text-[11px] font-extrabold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Tổng {totalCompanyHeadcount} nhân sự
                </span>
              </div>
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                CÔNG TY CỔ PHẦN XÂY DỰNG
              </h2>
              <div className="text-[11px] text-slate-500 font-medium">
                {treeData.length} đơn vị cấp cao nhất · {assignedCompanyHeadcount} nhân sự đã phân phòng
              </div>
            </div>

            {/* Vertical Connector Down to Root Units */}
            <div className="w-0.5 h-6 bg-blue-600" />

            {/* Root Nodes Hierarchy */}
            <div className="relative flex justify-center gap-8 pt-6 border-t-2 border-blue-600">
              {treeData.map((rootNode) => renderChartNode(rootNode, rootNode.code.toUpperCase() === "BGD"))}
            </div>
          </div>
        </div>
      </div>

      {/* Right-Side Unit Detail Drawer */}
      {selectedUnit && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[200] overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-extrabold uppercase bg-blue-100 text-blue-800 rounded border border-blue-200">
                    {selectedUnit.code}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Hoạt động
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">{selectedUnit.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUnit(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-5 text-xs">
              {/* Headcount overview */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-500 font-medium">Nhân sự trực thuộc</div>
                  <div className="text-lg font-extrabold text-blue-700">{selectedUnit.activeEmployeeCount} người</div>
                </div>
                <div>
                  <div className="text-slate-500 font-medium">Đơn vị trực thuộc</div>
                  <div className="text-lg font-extrabold text-slate-800">{selectedUnit.children.length} đơn vị</div>
                </div>
              </div>

              {/* Manager Card */}
              <ManagerAssignmentPanel
                unitId={selectedUnit.id}
                unitCode={selectedUnit.code}
                unitName={selectedUnit.name}
                currentManager={selectedUnit.manager}
                canManage={canManage ?? false}
                activeEmployees={activeEmployees}
              />

              {/* Members List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>Danh sách nhân sự ({selectedUnit.members?.length || 0})</span>
                  </div>
                  <Link
                    href={`/hr/employees?orgUnitId=${selectedUnit.id}`}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    <span>Xem tất cả</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {selectedUnit.members && selectedUnit.members.length > 0 ? (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {selectedUnit.members.map((member) => (
                      <Link
                        key={member.id}
                        href={`/hr/employees/${member.id}`}
                        className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {member.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 line-clamp-1">{member.fullName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{member.code}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          {member.positionTitle || "Chưa chọn chức danh"}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 italic text-center">
                    Không có nhân sự trực thuộc phòng ban này.
                  </div>
                )}
              </div>

              {/* Sub-Units List */}
              {selectedUnit.children.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-700">Đơn vị trực thuộc ({selectedUnit.children.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUnit.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => setSelectedUnit(child)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {child.name} ({child.activeEmployeeCount} NV)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
              <Link
                href={`/hr/employees?orgUnitId=${selectedUnit.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Xem danh sách NV</span>
              </Link>
              {canManage && (
                <Link
                  href={`/hr/organization?tab=units&edit=${selectedUnit.id}`}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-lg text-xs transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Sửa phòng</span>
                </Link>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
