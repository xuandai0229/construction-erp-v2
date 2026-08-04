"use client";

import React, { useState } from "react";
import {
  Building2,
  Users,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Search,
  Maximize2,
  Minimize2,
  Building,
} from "lucide-react";
import { OrgTreeNode } from "./organization-tree-view";

interface OrgChartViewProps {
  treeData: OrgTreeNode[];
}

export function OrgChartView({ treeData }: OrgChartViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
            Hãy khởi tạo đơn vị và phòng ban đầu tiên để xem sơ đồ phân cấp trực quan.
          </p>
        </div>
        <a
          href="/hr/organization"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
        >
          <span>Thêm đơn vị đầu tiên</span>
        </a>
      </div>
    );
  }

  const renderChartNode = (node: OrgTreeNode, level = 0) => {
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
          className={`relative z-10 w-64 rounded-xl border p-4 shadow-xs transition-all bg-white ${
            isMatched
              ? "ring-2 ring-blue-500 border-blue-500 shadow-md"
              : "border-slate-200 hover:border-blue-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 rounded border border-slate-200">
              {node.code}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              <Users className="w-3 h-3 text-slate-400" />
              {node.activeEmployeeCount}
            </span>
          </div>

          <h3 className="text-sm font-bold text-slate-900 leading-snug mb-2 line-clamp-2">
            {node.name}
          </h3>

          {/* Manager Badge */}
          <div className="pt-2 border-t border-slate-100 text-xs">
            {node.manager ? (
              <div className="flex items-center gap-2 bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">
                    {node.manager.fullName}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    [{node.manager.employeeCode}] — Trưởng đơn vị
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5 p-1">
                <Building className="w-3.5 h-3.5 text-slate-300" />
                <span>Chưa bổ nhiệm quản lý</span>
              </div>
            )}
          </div>

          {/* Expand / Collapse Button */}
          {hasChildren && (
            <button
              onClick={() => toggleCollapse(node.id)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-400 transition-colors z-20"
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Connector Line down */}
        {hasChildren && !isCollapsed && (
          <>
            <div className="w-0.5 h-6 bg-slate-300" />
            <div className="relative flex justify-center gap-8 pt-6 border-t border-slate-300">
              {node.children.map((child) => renderChartNode(child, level + 1))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Toolbar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm đơn vị để làm nổi bật trên sơ đồ..."
            className="w-full h-9 pl-9 pr-3 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium hidden sm:block">
          Sử dụng cuộn ngang để xem toàn bộ sơ đồ cây
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-8 shadow-xs overflow-x-auto min-h-[500px]">
        <div className="flex justify-center min-w-max">
          {treeData.map((rootNode) => renderChartNode(rootNode))}
        </div>
      </div>
    </div>
  );
}
