"use client";

import React, { useState, useTransition } from "react";
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  UserCheck,
  Search,
  ArrowRightLeft,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { UnitFormDialog } from "./unit-form-dialog";
import { deactivateOrgUnitAction } from "@/app/hr/organization/actions/organization-actions";

export interface OrgTreeNode {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  description: string | null;
  orderIndex: number;
  isActive: boolean;
  activeEmployeeCount: number;
  manager: {
    id: string;
    employeeId: string;
    fullName: string;
    employeeCode: string;
    startDate: string;
  } | null;
  children: OrgTreeNode[];
}

interface OrganizationTreeViewProps {
  treeData: OrgTreeNode[];
  flatUnits: { id: string; code: string; name: string; parentId?: string | null }[];
  canManage: boolean;
}

export function OrganizationTreeView({ treeData, flatUnits, canManage }: OrganizationTreeViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    flatUnits.forEach((u) => (init[u.id] = true));
    return init;
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(treeData[0]?.id || null);

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editNode, setEditNode] = useState<OrgTreeNode | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);

  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const findNode = (nodes: OrgTreeNode[], id: string): OrgTreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNode(node.children, id);
      if (found) return found;
    }
    return null;
  };

  const selectedNode = selectedNodeId ? findNode(treeData, selectedNodeId) : null;

  const handleCreateRoot = () => {
    setEditNode(null);
    setDefaultParentId(null);
    setIsFormOpen(true);
  };

  const handleCreateChild = (parentId: string) => {
    setEditNode(null);
    setDefaultParentId(parentId);
    setIsFormOpen(true);
  };

  const handleEdit = (node: OrgTreeNode) => {
    setEditNode(node);
    setDefaultParentId(node.parentId);
    setIsFormOpen(true);
  };

  const handleDeactivate = (node: OrgTreeNode) => {
    if (!confirm(`Bạn có chắc chắn muốn vô hiệu hóa đơn vị '${node.name}' (${node.code})?`)) {
      return;
    }
    setDeactivateError(null);
    startTransition(async () => {
      const res = await deactivateOrgUnitAction(node.id);
      if (!res.success) {
        setDeactivateError(res.error || "Không thể vô hiệu hóa đơn vị.");
      }
    });
  };

  const filterTree = (nodes: OrgTreeNode[], term: string): OrgTreeNode[] => {
    if (!term.trim()) return nodes;
    const lower = term.toLowerCase();

    return nodes
      .map((node) => {
        const matchesSelf =
          node.name.toLowerCase().includes(lower) || node.code.toLowerCase().includes(lower);
        const filteredChildren = filterTree(node.children, term);

        if (matchesSelf || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren,
          };
        }
        return null;
      })
      .filter((n): n is OrgTreeNode => n !== null);
  };

  const displayedTree = filterTree(treeData, searchTerm);

  const renderTreeItem = (node: OrgTreeNode, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = !!expandedNodes[node.id];
    const isSelected = selectedNodeId === node.id;

    return (
      <div key={node.id} className="space-y-1">
        <div
          onClick={() => setSelectedNodeId(node.id)}
          style={{ paddingLeft: `${level * 1.25 + 0.5}rem` }}
          className={`group flex items-center justify-between py-2 px-3 rounded-lg border transition-all cursor-pointer ${
            isSelected
              ? "bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs font-semibold"
              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 shrink-0">
              [{node.code}]
            </span>
            <span className="text-xs font-medium truncate">{node.name}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              <Users className="w-3 h-3 text-slate-400" />
              {node.activeEmployeeCount} NV
            </span>
            {canManage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateChild(node.id);
                }}
                title="Thêm đơn vị con"
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.children.map((child) => renderTreeItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {deactivateError && (
        <div className="flex items-center justify-between p-3.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl font-medium">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{deactivateError}</span>
          </div>
          <button onClick={() => setDeactivateError(null)} className="text-red-500 hover:text-red-800 text-xs">
            Đóng
          </button>
        </div>
      )}

      {/* Action Bar & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã hoặc tên đơn vị..."
            className="w-full h-9 pl-9 pr-3 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        {canManage && (
          <button
            onClick={handleCreateRoot}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm đơn vị cấp cao nhất</span>
          </button>
        )}
      </div>

      {/* Main Grid or Root Empty State */}
      {flatUnits.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-xs text-center space-y-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-slate-900">
              Chưa có cơ cấu tổ chức
            </h3>
            <p className="text-xs text-slate-500">
              Tạo đơn vị cấp cao nhất để bắt đầu xây dựng hệ thống phòng ban.
            </p>
          </div>
          {canManage && (
            <button
              onClick={handleCreateRoot}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo đơn vị đầu tiên</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Tree Hierarchy */}
          <div className="lg:col-span-2 space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xs min-h-[400px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-3">
              Cấu trúc phân cấp đơn vị
            </h3>

            {displayedTree.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
                <Building2 className="w-8 h-8 text-slate-300" />
                <p className="text-xs">Không tìm thấy đơn vị tổ chức phù hợp.</p>
              </div>
            ) : (
              <div className="space-y-1">{displayedTree.map((node) => renderTreeItem(node, 0))}</div>
            )}
          </div>

          {/* Right Column: Selected Unit Detail Panel */}
          <div className="space-y-4">
            {selectedNode ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-700 rounded-md mb-1">
                      {selectedNode.code}
                    </span>
                    <h2 className="text-base font-bold text-slate-900">{selectedNode.name}</h2>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(selectedNode)}
                        title="Chỉnh sửa đơn vị"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeactivate(selectedNode)}
                        disabled={isPending}
                        title="Vô hiệu hóa đơn vị"
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Attributes */}
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-500 block mb-0.5">Mô tả chức năng:</span>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {selectedNode.description || "Chưa có thông tin mô tả chi tiết."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[11px] text-slate-500 block">Số nhân viên active:</span>
                      <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                        {selectedNode.activeEmployeeCount} nhân sự
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[11px] text-slate-500 block">Số đơn vị trực thuộc:</span>
                      <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                        {selectedNode.children.length} đơn vị con
                      </span>
                    </div>
                  </div>

                  {/* Manager Box */}
                  <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        Trưởng đơn vị / Người quản lý
                      </span>
                    </div>

                    {selectedNode.manager ? (
                      <div className="text-xs text-slate-800 space-y-0.5 pt-1">
                        <div className="font-bold text-slate-900">
                          {selectedNode.manager.fullName} ({selectedNode.manager.employeeCode})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Ngày bổ nhiệm: {new Date(selectedNode.manager.startDate).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic pt-1">Chưa bổ nhiệm người quản lý đương nhiệm.</p>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                {canManage && (
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      onClick={() => handleCreateChild(selectedNode.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm đơn vị con trực thuộc</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-xs">
                Chọn một đơn vị trên cây để xem chi tiết.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      <UnitFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        units={flatUnits}
        editUnit={editNode}
        defaultParentId={defaultParentId}
      />
    </div>
  );
}
