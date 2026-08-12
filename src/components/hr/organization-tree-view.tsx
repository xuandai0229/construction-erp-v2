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
  PowerOff,
  Loader2,
  Building,
  Lock,
} from "lucide-react";
import { UnitFormDialog } from "./unit-form-dialog";
import { deleteOrgUnitAction } from "@/app/hr/organization/actions/organization-actions";

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
  companyHeadcount?: number;
}

export function OrganizationTreeView({ treeData, flatUnits, canManage, companyHeadcount }: OrganizationTreeViewProps) {
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

  const [deleteTargetNode, setDeleteTargetNode] = useState<OrgTreeNode | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (canManage && searchParams.get("create") === "1") handleCreateRoot();
  }, [canManage, searchParams]);

  const isDescendantOf = (ancestorId: string, targetId: string): boolean => {
    const ancestor = findNode(treeData, ancestorId);
    if (!ancestor) return false;
    const check = (node: OrgTreeNode): boolean => {
      for (const child of node.children) {
        if (child.id === targetId || check(child)) return true;
      }
      return false;
    };
    return check(ancestor);
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => {
      const willBeCollapsed = prev[id] !== false; // default is expanded if not explicitly false
      if (willBeCollapsed && selectedNodeId && isDescendantOf(id, selectedNodeId)) {
        setSelectedNodeId(id);
      }
      return { ...prev, [id]: !willBeCollapsed };
    });
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

  const handleConfirmDelete = () => {
    if (!deleteTargetNode) return;
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteOrgUnitAction(deleteTargetNode.id);
      if (!res.success) {
        setDeleteError(res.error || "Không thể xóa đơn vị tổ chức.");
      } else {
        const nextSelected =
          deleteTargetNode.parentId || treeData.find((n) => n.id !== deleteTargetNode.id)?.id || null;
        setSelectedNodeId(nextSelected);
        setDeleteTargetNode(null);
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
  const assignedCompanyHeadcount = countTreeHeadcount(treeData);
  const totalCompanyHeadcount = companyHeadcount ?? assignedCompanyHeadcount;
  const unassignedHeadcount = Math.max(0, totalCompanyHeadcount - assignedCompanyHeadcount);

  const renderTreeItem = (node: OrgTreeNode, level = 1) => {
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
            <div className="min-w-0">
              <span className="block text-xs font-semibold leading-snug line-clamp-2" title={node.name}>{node.name}</span>
              <span className="mt-0.5 block font-mono text-[10px] font-medium text-slate-500">Mã: {node.code}</span>
            </div>
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
                  Tổng {totalCompanyHeadcount} NV{unassignedHeadcount > 0 ? ` (${assignedCompanyHeadcount} đã phân phòng, ${unassignedHeadcount} chưa phân)` : ""}
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
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTargetNode(selectedNode);
                        }}
                        disabled={isPending}
                        title="Xóa phòng ban"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

      {/* Delete Confirmation Modal */}
      {deleteTargetNode && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Xóa phòng ban này?
              </h3>
            </div>

            {deleteTargetNode.activeEmployeeCount > 0 && (
              <p className="text-xs text-slate-600">
                Phòng ban hiện có <strong className="text-slate-900 font-bold">{deleteTargetNode.activeEmployeeCount} nhân sự</strong>. Sau khi xóa, các nhân sự này vẫn được giữ lại và chuyển sang 'Chưa phân phòng ban'.
              </p>
            )}

            {deleteTargetNode.children && deleteTargetNode.children.length > 0 && (
              <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 font-semibold">
                Có {deleteTargetNode.children.length} đơn vị trực thuộc. Các đơn vị này sẽ được chuyển lên cấp trên của phòng đang xóa.
              </p>
            )}

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
              <p className="font-semibold text-slate-900 mb-1">Sau khi xóa:</p>
              <p>• Phòng ban '{deleteTargetNode.name}' ({deleteTargetNode.code}) sẽ bị xóa hoàn toàn khỏi hệ thống.</p>
              <p>• Nhân sự vẫn được bảo toàn hồ sơ.</p>
              <p>• Lịch sử công tác vẫn được lưu giữ và đọc được.</p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTargetNode(null)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Xóa phòng ban</span>
              </button>
            </div>
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
