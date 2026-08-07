"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
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
  ShieldAlert,
  RotateCcw,
  Loader2,
  Building,
  Lock,
} from "lucide-react";
import { UnitFormDialog } from "./unit-form-dialog";
import { deactivateOrgUnitAction, reactivateOrgUnitAction } from "@/app/hr/organization/actions/organization-actions";

const CORE_CODES = new Set(["BGD", "PKT", "KTTTC"]);
const isCoreUnit = (code: string) => CORE_CODES.has(code.toUpperCase());

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
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { VIRTUAL_ROOT: true };
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

  useEffect(() => {
    if (canManage && searchParams.get("create") === "1") handleCreateRoot();
  }, [canManage, searchParams]);

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
  const parentOfSelected = selectedNode?.parentId
    ? flatUnits.find((u) => u.id === selectedNode.parentId)
    : null;

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
    if (isCoreUnit(node.code)) {
      setDeactivateError("Đây là phòng ban lõi của công ty. Không thể vô hiệu hóa.");
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn vô hiệu hóa phòng ban/đơn vị '${node.name}' (${node.code})?`)) {
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

  const countTreeHeadcount = (nodes: OrgTreeNode[]): number =>
    nodes.reduce((acc, n) => acc + n.activeEmployeeCount + countTreeHeadcount(n.children), 0);

  const displayedTree = filterTree(treeData, searchTerm);
  const totalCompanyHeadcount = countTreeHeadcount(treeData);

  const renderTreeItem = (node: OrgTreeNode, level = 1) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = !!expandedNodes[node.id];
    const isSelected = selectedNodeId === node.id;
    const isCore = isCoreUnit(node.code);

    return (
      <div key={node.id} className="space-y-1">
        <div
          onClick={() => setSelectedNodeId(node.id)}
          style={{ paddingLeft: `${level * 1.25 + 0.5}rem` }}
          className={`group flex items-center justify-between py-2 px-3 rounded-lg border transition-all cursor-pointer ${
            isSelected
              ? "bg-blue-50/90 border-blue-400 text-blue-950 shadow-2xs font-semibold ring-1 ring-blue-300"
              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded cursor-pointer"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
              {node.code}
            </span>
            <span className="text-xs font-semibold truncate">{node.name}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              <Users className="w-3 h-3 text-slate-400" />
              {node.activeEmployeeCount} NV
            </span>
            {canManage && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateChild(node.id);
                }}
                title="Thêm đơn vị con trực thuộc"
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
          <button onClick={() => setDeactivateError(null)} className="text-red-500 hover:text-red-800 text-xs font-bold cursor-pointer">
            Đóng
          </button>
        </div>
      )}

      {/* Action Bar & Search (Single CTA Enforcement: Toolbar contains Search ONLY) */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã hoặc tên đơn vị..."
            className="w-full h-9 pl-9 pr-3 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Main Grid: Left Tree (65%) & Right Detail (35%) */}
      {flatUnits.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-xs text-center space-y-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-slate-900">
              Chưa có cơ cấu phòng ban
            </h3>
            <p className="text-xs text-slate-500">
              Tạo phòng ban hoặc đơn vị đầu tiên để khởi tạo cấu trúc tổ chức công ty.
            </p>
          </div>
          {canManage && (
            <button
              onClick={handleCreateRoot}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo phòng ban đầu tiên</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Tree Hierarchy (65%) */}
          <div className="lg:col-span-7 space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xs min-h-[440px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Cấu trúc phân cấp đơn vị</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {flatUnits.length} đơn vị
              </span>
            </div>

            {/* Virtual Root "Công ty" */}
            <div className="space-y-1">
              <div
                className="flex items-center justify-between py-2 px-3 bg-slate-100/90 border border-slate-300 rounded-lg text-slate-900 font-bold text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => toggleExpand("VIRTUAL_ROOT", e)}
                    className="p-1 text-slate-500 hover:text-slate-800 rounded cursor-pointer"
                  >
                    {expandedNodes["VIRTUAL_ROOT"] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  <Building2 className="w-4.5 h-4.5 text-blue-700" />
                  <span className="font-mono text-[10px] text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200 uppercase font-extrabold">
                    CTY
                  </span>
                  <span>Công ty Cổ phần Xây dựng</span>
                </div>
                <span className="text-[11px] font-extrabold text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-full">
                  Tổng {totalCompanyHeadcount} NV
                </span>
              </div>

              {/* Children under Virtual Root */}
              {expandedNodes["VIRTUAL_ROOT"] && (
                <div className="space-y-1 pt-1">
                  {displayedTree.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      Không tìm thấy phòng ban nào phù hợp với từ khóa.
                    </div>
                  ) : (
                    displayedTree.map((node) => renderTreeItem(node, 1))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Unit Detail Panel (35%) */}
          <div className="lg:col-span-5 space-y-4 sticky top-4">
            {selectedNode ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 rounded border border-blue-200">
                        {selectedNode.code}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 leading-tight">
                      {selectedNode.name}
                    </h2>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(selectedNode)}
                        title="Chỉnh sửa thông tin đơn vị"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {isCoreUnit(selectedNode.code) ? (
                        <button
                          type="button"
                          disabled
                          title="Đây là phòng ban lõi của công ty. Không thể vô hiệu hóa."
                          className="p-1.5 text-slate-300 bg-slate-50 rounded-lg cursor-not-allowed border border-slate-200"
                        >
                          <Lock className="w-4 h-4 text-slate-400" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(selectedNode)}
                          disabled={isPending}
                          title="Vô hiệu hóa đơn vị"
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Attributes */}
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 block mb-1">Trực thuộc:</span>
                    <div className="text-slate-800 font-semibold bg-slate-50 p-2 rounded-lg border border-slate-200/80 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{parentOfSelected ? `${parentOfSelected.name} (${parentOfSelected.code})` : "Công ty Cổ phần Xây dựng (Trực thuộc Công ty)"}</span>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-500 block mb-1">Chức năng, nhiệm vụ chính:</span>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 min-h-[60px]">
                      {selectedNode.description || "Chưa có thông tin mô tả chức năng chi tiết."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                      <span className="text-[11px] font-semibold text-slate-500 block">Nhân sự hiện tại:</span>
                      <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                        {selectedNode.activeEmployeeCount} nhân sự
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                      <span className="text-[11px] font-semibold text-slate-500 block">Đơn vị trực thuộc:</span>
                      <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                        {selectedNode.children.length} đơn vị con
                      </span>
                    </div>
                  </div>

                  {/* Manager Box */}
                  <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        Người phụ trách / Trưởng đơn vị
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
                      <p className="text-xs text-slate-500 italic pt-1">Chưa bổ nhiệm người phụ trách đơn vị.</p>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                {canManage && (
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleCreateChild(selectedNode.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm đơn vị con trực thuộc</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500 text-xs shadow-xs">
                Chọn một phòng ban trên cây để xem thông tin chi tiết.
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
