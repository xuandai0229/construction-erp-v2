"use client";

import React, { useState, useRef } from "react";
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
  ShieldCheck,
} from "lucide-react";
import { OrgTreeNode } from "./organization-tree-view";

interface OrgChartViewProps {
  treeData: OrgTreeNode[];
  companyHeadcount?: number;
}

export function OrgChartView({ treeData, companyHeadcount }: OrgChartViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(1.4, prev + 0.1));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.6, prev - 0.1));
  const handleResetZoom = () => setZoomLevel(1);
  const handleFitScreen = () => setZoomLevel(0.9);

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

  // Calculate total headcount
  const countAll = (nodes: OrgTreeNode[]): number =>
    nodes.reduce((acc, n) => acc + n.activeEmployeeCount + countAll(n.children), 0);
  const assignedCompanyHeadcount = countAll(treeData);
  const totalCompanyHeadcount = companyHeadcount ?? assignedCompanyHeadcount;
  const unassignedHeadcount = Math.max(0, totalCompanyHeadcount - assignedCompanyHeadcount);

  const renderChartNode = (node: OrgTreeNode, isTopDirector = false) => {
    const isCollapsed = !!collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isMatched =
      searchTerm.trim() !== "" &&
      (node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.code.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node Card */}
        <div
          className={`relative z-10 w-64 rounded-xl border p-3.5 shadow-xs transition-all ${
            isTopDirector
              ? "bg-gradient-to-b from-blue-900 to-slate-900 text-white border-blue-600 ring-2 ring-blue-500 shadow-md"
              : isMatched
              ? "bg-white ring-4 ring-blue-500 border-blue-500 shadow-xl scale-105"
              : "bg-white border-slate-200 hover:border-blue-400 hover:shadow-md"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`px-2 py-0.5 text-[10px] font-mono font-extrabold uppercase tracking-wider rounded border ${
                isTopDirector
                  ? "bg-blue-800/80 text-blue-200 border-blue-500/50"
                  : "bg-blue-50 text-blue-800 border-blue-200"
              }`}
            >
              {node.code}
            </span>
            <div className="flex items-center gap-1">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  isTopDirector
                    ? "bg-blue-800/60 text-blue-100 border-blue-500/40"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <Users className={`w-3 h-3 ${isTopDirector ? "text-blue-300" : "text-slate-400"}`} />
                {node.activeEmployeeCount} NV
              </span>
            </div>
          </div>

          <h3
            className={`text-xs font-bold leading-snug mb-2 line-clamp-2 ${
              isTopDirector ? "text-white text-sm" : "text-slate-900"
            }`}
            title={node.name}
          >
            {node.name}
          </h3>

          {/* Manager Info (Line 4) */}
          <div className={`pt-2 border-t text-xs ${isTopDirector ? "border-blue-800/80" : "border-slate-100"}`}>
            {node.manager ? (
              <div
                className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] ${
                  isTopDirector
                    ? "bg-blue-800/50 border-blue-700 text-blue-100"
                    : "bg-blue-50/70 border-blue-100 text-slate-900"
                }`}
              >
                <UserCheck className={`w-3.5 h-3.5 shrink-0 ${isTopDirector ? "text-blue-300" : "text-blue-600"}`} />
                <div className="min-w-0">
                  <div className="font-bold leading-snug line-clamp-2" title={node.manager.fullName}>{node.manager.fullName}</div>
                </div>
              </div>
            ) : (
              <div className={`text-[11px] italic flex items-center gap-1 p-0.5 ${isTopDirector ? "text-blue-300/70" : "text-slate-400"}`}>
                <Building className="w-3.5 h-3.5 shrink-0" />
                <span>Chưa bổ nhiệm người phụ trách</span>
              </div>
            )}
          </div>

          {/* Expand / Collapse Button */}
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleCollapse(node.id)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-400 transition-colors z-20 cursor-pointer"
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Vertical Connector Line Down */}
        {hasChildren && !isCollapsed && (
          <>
            <div className="w-0.5 h-7 bg-slate-300" />
            <div className="relative flex justify-center gap-8 pt-7 border-t-2 border-slate-300">
              {node.children.map((child) => renderChartNode(child, false))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Control & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hoặc mã phòng ban..."
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

      {/* Desktop Org Chart Core Tower View */}
      <div
        ref={containerRef}
        className="hidden md:block rounded-xl border border-slate-200 bg-slate-50/60 p-8 shadow-xs overflow-auto min-h-[500px] cursor-grab active:cursor-grabbing"
      >
        <div
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top center" }}
          className="flex flex-col items-center min-w-max transition-transform duration-150"
        >
          {/* Top Level Company Header Card */}
          <div className="flex flex-col items-center">
            <div className="relative z-10 w-64 rounded-xl border border-slate-300 p-3 shadow-xs bg-white text-slate-900 text-center">
              <div className="flex items-center justify-between mb-1">
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-extrabold uppercase bg-slate-100 text-slate-700 rounded border border-slate-200">
                  CTY
                </span>
                <span className="text-[11px] font-extrabold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Tổng {totalCompanyHeadcount} NV{unassignedHeadcount > 0 ? ` (${assignedCompanyHeadcount} đã phân phòng, ${unassignedHeadcount} chưa phân)` : ""}
                </span>
              </div>
              <h2 className="text-xs font-extrabold text-slate-900">
                CÔNG TY CỔ PHẦN XÂY DỰNG
              </h2>
            </div>

            {/* Vertical Connector Down to Director */}
            <div className="w-0.5 h-7 bg-blue-600" />

            {/* Root Nodes Hierarchy (Starts at Director BGD) */}
            <div className="relative flex justify-center">
              {treeData.map((rootNode) => renderChartNode(rootNode, rootNode.code.toUpperCase() === "BGD"))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Responsive Vertical Tree List */}
      <div className="block md:hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Sơ đồ cây tổ chức</span>
          <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            Tổng {totalCompanyHeadcount} NV
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {treeData.map((node) => (
            <div key={node.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-extrabold text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded border border-blue-200">
                  {node.code}
                </span>
                <span className="font-bold text-slate-700">{node.activeEmployeeCount} NV</span>
              </div>
              <div className="font-bold text-slate-900">{node.name}</div>

              {node.children && node.children.length > 0 && (
                <div className="pl-4 pt-2 border-t border-slate-200/60 space-y-2">
                  {node.children.map((child) => (
                    <div key={child.id} className="p-2.5 bg-white rounded border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-slate-700">{child.code}</span>
                        <span className="font-semibold text-slate-600">{child.activeEmployeeCount} NV</span>
                      </div>
                      <div className="font-bold text-slate-900 text-xs">{child.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
