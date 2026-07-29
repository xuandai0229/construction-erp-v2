"use client";

import { useEffect, useState } from "react";
import { 
  X, AlertTriangle, FileText, CheckCircle2, ArrowRight, ExternalLink, 
  Calendar, User, Package, Clock, Activity, Loader2, ShieldAlert, Check, ArrowLeft, Building2
} from "lucide-react";
import { 
  fetchExecutiveRiskDetails, 
  fetchExecutiveVolumeDetails, 
  fetchExecutiveReports7dDetails, 
  fetchExecutiveActionItemsDetails,
  fetchExecutivePendingApprovalsDetails,
  fetchProjectStatusDetails,
  fetchSingleApprovalDetail,
  fetchSingleReportDetail,
  fetchSingleMaterialRequestDetail,
  type RiskDetailItem,
  type VolumeGroupedProject,
  type Report7dDetailItem,
  type ExecutiveActionDetailItem,
  type PendingApprovalDetailItem,
  type ProjectStatusDetailItem,
  type SingleApprovalDetail,
  type SingleReportDetail,
  type SingleMaterialRequestDetail
} from "@/lib/dashboard/dashboard-detail-actions";
import { resolveDashboardTargetUrl, type DashboardTargetType } from "@/lib/dashboard/dashboard-resolver";
import Link from "next/link";

export type DrawerType = 
  | "RISK" 
  | "VOLUME" 
  | "REPORTS_7D" 
  | "ACTIONS"
  | "PENDING_APPROVALS"
  | "PROJECT_STATUS"
  | "APPROVAL" 
  | "SITE_REPORT" 
  | "MATERIAL_REQUEST" 
  | null;

export function ExecutiveDetailDrawer({
  isOpen,
  drawerType,
  targetId,
  projectId,
  onClose,
}: {
  isOpen: boolean;
  drawerType: DrawerType;
  targetId?: string | null;
  projectId?: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Detail Item for Mode A (Nested Detail View within same Drawer)
  const [selectedItemDetail, setSelectedItemDetail] = useState<{
    targetType: DrawerType;
    targetId: string;
    title?: string;
  } | null>(null);

  // Loaded Data States
  const [riskItems, setRiskItems] = useState<RiskDetailItem[]>([]);
  const [volumeGroups, setVolumeGroups] = useState<VolumeGroupedProject[]>([]);
  const [report7dItems, setReport7dItems] = useState<Report7dDetailItem[]>([]);
  const [actionItems, setActionItems] = useState<ExecutiveActionDetailItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalDetailItem[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatusDetailItem[]>([]);
  
  // Single Record Detail States
  const [approvalDetail, setApprovalDetail] = useState<SingleApprovalDetail | null>(null);
  const [reportDetail, setReportDetail] = useState<SingleReportDetail | null>(null);
  const [materialDetail, setMaterialDetail] = useState<SingleMaterialRequestDetail | null>(null);

  // Filter States
  const [riskSeverityFilter, setRiskSeverityFilter] = useState<"ALL" | "HIGH" | "MEDIUM">("ALL");
  const [volumeStatusFilter, setVolumeStatusFilter] = useState<"ALL" | "UPDATED" | "PENDING">("ALL");
  const [actionTabFilter, setActionTabFilter] = useState<"ALL" | "APPROVAL" | "REPORT" | "MATERIAL">("ALL");
  const [projectStatusFilter, setProjectStatusFilter] = useState<"ALL" | "ON_TRACK" | "AT_RISK" | "DELAYED">("ALL");

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (selectedItemDetail) {
          setSelectedItemDetail(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedItemDetail, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset internal detail mode when top drawerType changes
  useEffect(() => {
    if (isOpen) {
      if (targetId && (drawerType === "APPROVAL" || drawerType === "SITE_REPORT" || drawerType === "MATERIAL_REQUEST")) {
        setSelectedItemDetail({ targetType: drawerType, targetId });
      } else {
        setSelectedItemDetail(null);
      }
    }
  }, [isOpen, drawerType, targetId]);

  // Fetch Main List Data when Drawer opens
  useEffect(() => {
    if (!isOpen || !drawerType) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadListData() {
      try {
        if (drawerType === "RISK") {
          const res = await fetchExecutiveRiskDetails(projectId);
          if (isMounted) setRiskItems(res);
        } else if (drawerType === "VOLUME") {
          const res = await fetchExecutiveVolumeDetails(projectId);
          if (isMounted) setVolumeGroups(res);
        } else if (drawerType === "REPORTS_7D") {
          const res = await fetchExecutiveReports7dDetails(projectId);
          if (isMounted) setReport7dItems(res);
        } else if (drawerType === "ACTIONS") {
          const res = await fetchExecutiveActionItemsDetails(projectId);
          if (isMounted) setActionItems(res);
        } else if (drawerType === "PENDING_APPROVALS") {
          const res = await fetchExecutivePendingApprovalsDetails(projectId);
          if (isMounted) setPendingApprovals(res);
        } else if (drawerType === "PROJECT_STATUS") {
          const res = await fetchProjectStatusDetails(projectId);
          if (isMounted) setProjectStatuses(res);
        }
      } catch (err: any) {
        if (isMounted) setError("Không thể tải thông tin chi tiết. Vui lòng thử lại sau.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadListData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, drawerType, projectId]);

  // Fetch Single Record Detail when selectedItemDetail is activated
  useEffect(() => {
    if (!isOpen || !selectedItemDetail) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadItemDetail() {
      try {
        const { targetType: type, targetId: id } = selectedItemDetail!;
        if (type === "APPROVAL") {
          const res = await fetchSingleApprovalDetail(id);
          if (isMounted) setApprovalDetail(res);
        } else if (type === "SITE_REPORT") {
          const res = await fetchSingleReportDetail(id);
          if (isMounted) setReportDetail(res);
        } else if (type === "MATERIAL_REQUEST") {
          const res = await fetchSingleMaterialRequestDetail(id);
          if (isMounted) setMaterialDetail(res);
        }
      } catch (err: any) {
        if (isMounted) setError("Không thể tải chi tiết bản ghi. Vui lòng thử lại sau.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadItemDetail();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedItemDetail]);

  if (!isOpen) return null;

  function getDrawerTitle() {
    if (selectedItemDetail) {
      switch (selectedItemDetail.targetType) {
        case "APPROVAL": return "Chi tiết Hồ sơ Phê duyệt";
        case "SITE_REPORT": return "Chi tiết Báo cáo Hiện trường";
        case "MATERIAL_REQUEST": return "Chi tiết Đề xuất Vật tư";
        case "RISK": return "Chi tiết Cảnh báo Rủi ro";
        default: return "Chi tiết Bản ghi";
      }
    }
    switch (drawerType) {
      case "RISK": return "Chi tiết Cảnh báo & Rủi ro Công trình";
      case "VOLUME": return "Khối lượng Thực hiện Hôm nay";
      case "REPORTS_7D": return "Báo cáo Hiện trường trong 7 Ngày";
      case "ACTIONS": return "Danh sách Việc Cần Xử Lý Ngay";
      case "PENDING_APPROVALS": return "Hồ sơ Chờ duyệt";
      case "PROJECT_STATUS": return "Trạng thái & Tiến độ Công trình";
      case "APPROVAL": return "Chi tiết Hồ sơ Phê duyệt";
      case "SITE_REPORT": return "Chi tiết Báo cáo Hiện trường";
      case "MATERIAL_REQUEST": return "Chi tiết Đề xuất Vật tư";
      default: return "Thông tin chi tiết";
    }
  }

  function getFullPageTargetType(): DashboardTargetType {
    const activeType = selectedItemDetail ? selectedItemDetail.targetType : drawerType;
    switch (activeType) {
      case "RISK": return "RISK_LIST";
      case "VOLUME": return "VOLUME_TODAY";
      case "REPORTS_7D": return "REPORTS_7D";
      case "ACTIONS": return "ACTION_LIST";
      case "PENDING_APPROVALS": return "APPROVAL";
      case "PROJECT_STATUS": return "PROJECT_LIST";
      case "APPROVAL": return "APPROVAL";
      case "SITE_REPORT": return "SITE_REPORT";
      case "MATERIAL_REQUEST": return "MATERIAL_REQUEST";
      default: return "PROJECT";
    }
  }

  const activeTargetId = selectedItemDetail ? selectedItemDetail.targetId : targetId;

  const fullPageUrl = resolveDashboardTargetUrl({
    targetType: getFullPageTargetType(),
    targetId: activeTargetId,
    projectId,
  });

  // Filter calculations
  const filteredRiskItems = riskItems.filter(item => {
    if (riskSeverityFilter === "HIGH") return item.severity === "HIGH";
    if (riskSeverityFilter === "MEDIUM") return item.severity === "MEDIUM";
    return true;
  });

  const filteredVolumeGroups = volumeGroups.filter(group => {
    if (volumeStatusFilter === "UPDATED") return group.isUpdatedToday;
    if (volumeStatusFilter === "PENDING") return !group.isUpdatedToday;
    return true;
  });

  const filteredActionItems = actionItems.filter(item => {
    if (actionTabFilter === "APPROVAL") return item.type === "APPROVAL";
    if (actionTabFilter === "REPORT") return item.type === "REPORT";
    if (actionTabFilter === "MATERIAL") return item.type === "MATERIAL";
    return true;
  });

  const filteredProjectStatuses = projectStatuses.filter(item => {
    if (projectStatusFilter === "ON_TRACK") return item.health === "ON_TRACK" || item.health === "COMPLETED";
    if (projectStatusFilter === "AT_RISK") return item.health === "AT_RISK";
    if (projectStatusFilter === "DELAYED") return item.health === "DELAYED";
    return true;
  });

  const isSingleProject = !!projectId && projectId !== "all";

  // Summary Metrics
  const severeRiskCount = riskItems.filter(r => r.severity === "HIGH").length;
  const mediumRiskCount = riskItems.filter(r => r.severity === "MEDIUM").length;
  const updatedProjectsCount = volumeGroups.filter(g => g.isUpdatedToday).length;
  const pendingProjectsCount = volumeGroups.filter(g => !g.isUpdatedToday).length;
  const totalVolumeEntries = volumeGroups.reduce((acc, g) => acc + g.totalEntriesCount, 0);

  // Handle clicking "Xem chi tiết" on an Action Item inside ACTIONS or PENDING_APPROVALS list
  function handleOpenItemDetail(targetType: DrawerType, targetId: string, title?: string) {
    setSelectedItemDetail({
      targetType,
      targetId,
      title,
    });
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Body */}
      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-250 border-l border-slate-200">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            {selectedItemDetail ? (
              <button
                type="button"
                onClick={() => setSelectedItemDetail(null)}
                className="flex h-9 px-3 items-center gap-1.5 rounded-xl bg-slate-200/80 text-slate-800 font-bold text-xs hover:bg-slate-300 transition-colors cursor-pointer"
                title="Quay lại danh sách"
              >
                <ArrowLeft className="h-4 w-4" /> Quay lại
              </button>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100/80 text-blue-700 font-bold">
                {drawerType === "RISK" && <AlertTriangle className="h-5 w-5 text-rose-600" />}
                {drawerType === "VOLUME" && <Activity className="h-5 w-5 text-emerald-600" />}
                {drawerType === "REPORTS_7D" && <FileText className="h-5 w-5 text-violet-600" />}
                {drawerType === "ACTIONS" && <ShieldAlert className="h-5 w-5 text-amber-600" />}
                {drawerType === "PENDING_APPROVALS" && <CheckCircle2 className="h-5 w-5 text-amber-600" />}
                {drawerType === "PROJECT_STATUS" && <Building2 className="h-5 w-5 text-blue-600" />}
                {drawerType === "APPROVAL" && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
                {drawerType === "SITE_REPORT" && <FileText className="h-5 w-5 text-sky-600" />}
                {drawerType === "MATERIAL_REQUEST" && <Package className="h-5 w-5 text-amber-600" />}
              </div>
            )}

            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                {getDrawerTitle()}
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                {isSingleProject ? "Phạm vi công trình đang chọn" : "Phạm vi toàn hệ thống"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
            title="Đóng (ESC)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
              <p className="text-sm font-semibold text-slate-600">Đang tải dữ liệu chi tiết...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
              <AlertTriangle className="mx-auto h-6 w-6 text-rose-500 mb-2" />
              <p className="text-sm font-semibold text-rose-800">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* MODE B: SINGLE ITEM DETAIL VIEW (Inside Drawer Mode Switch) */}
              {selectedItemDetail && (
                <div className="space-y-4">
                  {/* APPROVAL DETAIL */}
                  {selectedItemDetail.targetType === "APPROVAL" && approvalDetail && (
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">HỒ SƠ PHÊ DUYỆT</span>
                          <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{approvalDetail.title}</h3>
                          <p className="text-xs font-medium text-slate-500 mt-1">{approvalDetail.projectName}</p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                          {approvalDetail.status}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-700">
                        <p><strong>Người trình duyệt:</strong> {approvalDetail.requesterName}</p>
                        <p><strong>Thời gian gửi:</strong> {approvalDetail.createdAt}</p>
                        <p><strong>Mức độ ưu tiên:</strong> <span className="font-bold text-rose-600">{approvalDetail.priority}</span></p>
                        {approvalDetail.description && (
                          <div className="rounded-lg bg-slate-50 p-3 text-slate-800 border border-slate-200/60 mt-2">
                            <strong className="block text-slate-900 mb-1">Nội dung trình phê duyệt:</strong>
                            <p className="whitespace-pre-wrap">{approvalDetail.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SITE REPORT DETAIL */}
                  {selectedItemDetail.targetType === "SITE_REPORT" && reportDetail && (
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 text-xs">
                      <div className="border-b border-slate-100 pb-3">
                        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">BÁO CÁO HIỆN TRƯỜNG</span>
                        <h3 className="text-base font-bold text-slate-900 mt-0.5">{reportDetail.title}</h3>
                        <p className="text-slate-500 mt-0.5">{reportDetail.projectName} • {reportDetail.reporterName} • Ngày lập: {reportDetail.reportDate}</p>
                      </div>

                      {reportDetail.weather && <p><strong>Thời tiết:</strong> {reportDetail.weather}</p>}
                      {reportDetail.manpowerCount && <p><strong>Nhân lực thi công:</strong> {reportDetail.manpowerCount} người</p>}

                      {reportDetail.lines.length > 0 && (
                        <div>
                          <strong className="block mb-2 text-slate-900 font-bold">Khối lượng hạng mục thi công:</strong>
                          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                            {reportDetail.lines.map((l) => (
                              <div key={l.id} className="p-2.5 flex justify-between items-center bg-white">
                                <span className="font-medium text-slate-800">{l.workContent}</span>
                                <span className="font-bold text-slate-900">{l.volume} {l.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {reportDetail.issues && (
                        <div className="rounded-lg bg-rose-50 p-3 border border-rose-200 text-rose-900">
                          <strong>Vấn đề phát sinh & Kiến nghị:</strong>
                          <p className="mt-1">{reportDetail.issues}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MATERIAL REQUEST DETAIL */}
                  {selectedItemDetail.targetType === "MATERIAL_REQUEST" && materialDetail && (
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 text-xs">
                      <div className="border-b border-slate-100 pb-3">
                        <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">ĐỀ XUẤT VẬT TƯ ({materialDetail.requestNo})</span>
                        <h3 className="text-base font-bold text-slate-900 mt-0.5">{materialDetail.projectName}</h3>
                        <p className="text-slate-500 mt-0.5">Người đề xuất: {materialDetail.requesterName} • Ngày gửi: {materialDetail.createdAt}</p>
                      </div>

                      <div>
                        <strong className="block mb-2 text-slate-900">Danh sách vật tư yêu cầu cấp:</strong>
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                          {materialDetail.items.map((item, idx) => (
                            <div key={idx} className="p-2.5 flex justify-between items-center bg-white">
                              <div>
                                <span className="font-bold text-slate-800 block">{item.materialName}</span>
                                {item.note && <span className="text-[11px] text-slate-500">{item.note}</span>}
                              </div>
                              <span className="font-bold text-slate-900">{item.quantity} {item.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODE A: MAIN LIST VIEWS (When selectedItemDetail is null) */}
              {!selectedItemDetail && (
                <>
                  {/* 1. PENDING APPROVALS DRAWER (Rule III Fix) */}
                  {drawerType === "PENDING_APPROVALS" && (
                    <div className="space-y-4">
                      {pendingApprovals.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2 stroke-[1.5]" />
                          <h4 className="text-sm font-bold text-slate-800">
                            {isSingleProject ? "Công trình này hiện không có hồ sơ chờ bạn phê duyệt." : "Hiện không có hồ sơ chờ bạn phê duyệt."}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">Tất cả các hồ sơ trình duyệt trong phạm vi đã được hoàn tất.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3.5 text-xs text-amber-900 font-medium">
                            Có <strong>{pendingApprovals.length}</strong> hồ sơ đang chờ duyệt trong phạm vi quản lý.
                          </div>

                          {pendingApprovals.map((item) => (
                            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">{item.type}</span>
                                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h4>
                                  <p className="text-xs text-slate-500 mt-0.5">{item.projectName} • Người gửi: {item.requesterName}</p>
                                </div>
                                <span className={`rounded-md px-2 py-0.5 text-xs font-bold shrink-0 ${item.priority === "HIGH" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>
                                  {item.priority === "HIGH" ? "Ưu tiên cao" : "Trung bình"}
                                </span>
                              </div>

                              {item.description && (
                                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                  <strong>Trích yếu trình:</strong> {item.description}
                                </p>
                              )}

                              <div className="pt-2 flex justify-between items-center text-xs text-slate-500 border-t border-slate-100">
                                <span className="font-mono text-[11px]">Ngày trình: {item.createdAt}</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenItemDetail("APPROVAL", item.targetId, item.title)}
                                  className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                >
                                  Xem chi tiết <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. PROJECT STATUS DRAWER (Rule VI Fix) */}
                  {drawerType === "PROJECT_STATUS" && (
                    <div className="space-y-4">
                      {/* Filter Bar */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setProjectStatusFilter("ALL")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${projectStatusFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                        >
                          Tất cả ({projectStatuses.length})
                        </button>
                        <button
                          onClick={() => setProjectStatusFilter("ON_TRACK")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${projectStatusFilter === "ON_TRACK" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                        >
                          Đúng tiến độ ({projectStatuses.filter(p => p.health === "ON_TRACK" || p.health === "COMPLETED").length})
                        </button>
                        <button
                          onClick={() => setProjectStatusFilter("AT_RISK")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${projectStatusFilter === "AT_RISK" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100"}`}
                        >
                          Cần chú ý ({projectStatuses.filter(p => p.health === "AT_RISK").length})
                        </button>
                        <button
                          onClick={() => setProjectStatusFilter("DELAYED")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${projectStatusFilter === "DELAYED" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
                        >
                          Rủi ro ({projectStatuses.filter(p => p.health === "DELAYED").length})
                        </button>
                      </div>

                      {filteredProjectStatuses.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                          <Building2 className="mx-auto h-8 w-8 text-slate-400 mb-2 stroke-[1.5]" />
                          <h4 className="text-sm font-bold text-slate-800">Không có công trình nào trong nhóm này</h4>
                        </div>
                      ) : (
                        filteredProjectStatuses.map((item) => (
                          <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">{item.code}</span>
                                <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                              </div>
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                item.health === "ON_TRACK" || item.health === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                                item.health === "AT_RISK" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                              }`}>
                                {item.warning}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                              <div>Tiến độ kế hoạch: <strong className="text-slate-900">{item.plannedProgressPercent !== null ? `${Math.round(item.plannedProgressPercent)}%` : "--"}</strong></div>
                              <div>Thời gian còn lại: <strong className="text-slate-900">{item.daysRemaining !== null ? `${item.daysRemaining} ngày` : "--"}</strong></div>
                            </div>

                            <div className="pt-2 flex justify-end border-t border-slate-100">
                              <Link
                                href={`/projects/${item.id}`}
                                onClick={onClose}
                                className="font-bold text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                              >
                                Mở chi tiết dự án <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* 3. RISK DRAWER */}
                  {drawerType === "RISK" && (
                    <div className="space-y-4">
                      {/* Top Summary Card */}
                      <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs">
                        <div className="p-2 rounded-lg bg-white border border-slate-200/60 text-center">
                          <span className="text-[11px] font-bold text-slate-500 uppercase block">Tổng rủi ro</span>
                          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">{riskItems.length}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200/60 text-center">
                          <span className="text-[11px] font-bold text-rose-700 uppercase block">Nghiêm trọng</span>
                          <span className="text-base font-extrabold text-rose-700 mt-0.5 block">{severeRiskCount}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/60 text-center">
                          <span className="text-[11px] font-bold text-amber-800 uppercase block">Cần chú ý</span>
                          <span className="text-base font-extrabold text-amber-800 mt-0.5 block">{mediumRiskCount}</span>
                        </div>
                      </div>

                      {/* Filter Bar */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRiskSeverityFilter("ALL")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${riskSeverityFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                        >
                          Tất cả ({riskItems.length})
                        </button>
                        <button
                          onClick={() => setRiskSeverityFilter("HIGH")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${riskSeverityFilter === "HIGH" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
                        >
                          Nghiêm trọng ({severeRiskCount})
                        </button>
                        <button
                          onClick={() => setRiskSeverityFilter("MEDIUM")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${riskSeverityFilter === "MEDIUM" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100"}`}
                        >
                          Cần chú ý ({mediumRiskCount})
                        </button>
                      </div>

                      {/* Risk List */}
                      {filteredRiskItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2 stroke-[1.5]" />
                          <h4 className="text-sm font-bold text-slate-800">Không ghi nhận rủi ro tiến độ</h4>
                          <p className="text-xs text-slate-500 mt-1">Các công trình trong phạm vi đang hoạt động ổn định.</p>
                        </div>
                      ) : (
                        filteredRiskItems.map((item, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs space-y-3">
                            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                              <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">{item.projectCode}</span>
                                <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.projectName}</h3>
                              </div>
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0 ${item.severity === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
                                {item.warningTitle}
                              </span>
                            </div>

                            <div className="space-y-2 text-xs text-slate-700">
                              <div>
                                <span className="font-bold text-slate-900">Nguyên nhân chính: </span>
                                <span className="text-slate-600">{item.rootCause}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-900">Nguồn phát hiện: </span>
                                <span className="text-slate-600">{item.detectionSource}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-900">Mốc ảnh hưởng: </span>
                                <span className="text-slate-600">{item.affectedMilestone}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-900">Mức độ ảnh hưởng: </span>
                                <span className="text-slate-600">{item.impact}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 pt-1 text-[11.5px] text-slate-500 font-medium">
                                <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-slate-400" /> Phụ trách: <strong>{item.assignee}</strong></span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> 
                                  Hạn xử lý: <strong className={item.dueDate ? "text-slate-900" : "text-amber-600"}>{item.dueDate ?? "Chưa xác định hạn xử lý"}</strong>
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex justify-end">
                              <Link 
                                href={`/projects/${item.projectId}`}
                                onClick={onClose}
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                              >
                                Xem chi tiết công trình <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* 4. VOLUME DRAWER */}
                  {drawerType === "VOLUME" && (
                    <div className="space-y-4">
                      {/* Top Summary */}
                      <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs">
                        <div className="p-2 rounded-lg bg-white border border-slate-200/60 text-center">
                          <span className="text-[11px] font-bold text-slate-500 uppercase block">Công trình cập nhật</span>
                          <span className="text-base font-extrabold text-emerald-600 mt-0.5 block">{updatedProjectsCount}/{volumeGroups.length}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-slate-200/60 text-center">
                          <span className="text-[11px] font-bold text-slate-500 uppercase block">Chưa cập nhật</span>
                          <span className="text-base font-extrabold text-amber-600 mt-0.5 block">{pendingProjectsCount}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-slate-200/60 text-center">
                          <span className="text-[11px] font-bold text-slate-500 uppercase block">Tổng bản ghi</span>
                          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">{totalVolumeEntries}</span>
                        </div>
                      </div>

                      {/* Filter Bar */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setVolumeStatusFilter("ALL")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${volumeStatusFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                        >
                          Tất cả ({volumeGroups.length})
                        </button>
                        <button
                          onClick={() => setVolumeStatusFilter("UPDATED")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${volumeStatusFilter === "UPDATED" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                        >
                          Đã cập nhật ({updatedProjectsCount})
                        </button>
                        <button
                          onClick={() => setVolumeStatusFilter("PENDING")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${volumeStatusFilter === "PENDING" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100"}`}
                        >
                          Chưa cập nhật ({pendingProjectsCount})
                        </button>
                      </div>

                      {/* Volume Groups List */}
                      {filteredVolumeGroups.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                          <Clock className="mx-auto h-8 w-8 text-amber-500 mb-2 stroke-[1.5]" />
                          <h4 className="text-sm font-bold text-slate-800">
                            {isSingleProject ? "Công trình chưa cập nhật khối lượng hôm nay." : "Chưa có công trình nào cập nhật khối lượng hôm nay."}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">Chưa có bản ghi nhập liệu khối lượng thi công trong ngày.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredVolumeGroups.map((group) => (
                            <div key={group.projectId} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div>
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">{group.projectCode}</span>
                                  <h4 className="text-sm font-bold text-slate-900">{group.projectName}</h4>
                                </div>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${group.isUpdatedToday ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                  {group.isUpdatedToday ? "Đã cập nhật" : "Chưa cập nhật"}
                                </span>
                              </div>

                              {group.entries.length > 0 ? (
                                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                                  {group.entries.map((entry) => (
                                    <div key={entry.id} className="p-3 flex items-center justify-between gap-3 text-xs bg-slate-50/50">
                                      <div>
                                        <span className="font-bold text-slate-900 block">{entry.itemName}</span>
                                        <span className="text-[11.5px] text-slate-500 block mt-0.5">Người nhập: {entry.reporterName} • {entry.updatedAt}</span>
                                      </div>
                                      <span className="text-xs font-extrabold text-emerald-600 shrink-0">{entry.todayQty} {entry.unit}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 italic">Chưa ghi nhận bản ghi khối lượng hôm nay.</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 5. ACTIONS DRAWER (Rule VI & Section IV/V Fix) */}
                  {drawerType === "ACTIONS" && (
                    <div className="space-y-4">
                      {/* Top Summary */}
                      <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs">
                        <div className="p-2 rounded-lg bg-white border border-slate-200/60 text-center">
                          <span className="text-[11px] font-bold text-slate-500 uppercase block">Tổng việc</span>
                          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">{actionItems.length}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200/60 text-center">
                          <span className="text-[11px] font-bold text-rose-700 uppercase block">Ưu tiên cao</span>
                          <span className="text-base font-extrabold text-rose-700 mt-0.5 block">{actionItems.filter(a => a.priority === "HIGH").length}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/60 text-center">
                          <span className="text-[11px] font-bold text-amber-800 uppercase block">Chờ quyết định</span>
                          <span className="text-base font-extrabold text-amber-800 mt-0.5 block">{actionItems.length}</span>
                        </div>
                      </div>

                      {/* Tabs */}
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <button
                          onClick={() => setActionTabFilter("ALL")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${actionTabFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                        >
                          Tất cả ({actionItems.length})
                        </button>
                        <button
                          onClick={() => setActionTabFilter("APPROVAL")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${actionTabFilter === "APPROVAL" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
                        >
                          Phê duyệt ({actionItems.filter(a => a.type === "APPROVAL").length})
                        </button>
                        <button
                          onClick={() => setActionTabFilter("REPORT")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${actionTabFilter === "REPORT" ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-700 hover:bg-violet-100"}`}
                        >
                          Báo cáo ({actionItems.filter(a => a.type === "REPORT").length})
                        </button>
                        <button
                          onClick={() => setActionTabFilter("MATERIAL")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${actionTabFilter === "MATERIAL" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100"}`}
                        >
                          Vật tư ({actionItems.filter(a => a.type === "MATERIAL").length})
                        </button>
                      </div>

                      {/* Action Item Cards */}
                      {filteredActionItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2 stroke-[1.5]" />
                          <h4 className="text-sm font-bold text-slate-800">Không có việc cần xử lý</h4>
                        </div>
                      ) : (
                        filteredActionItems.map((item) => (
                          <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs hover:border-slate-300 transition-all">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">{item.typeLabel}</span>
                                <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h4>
                                <p className="text-xs text-slate-500 mt-0.5">{item.projectName} • Gửi bởi: {item.assignee}</p>
                              </div>
                              <span className={`rounded-md px-2 py-0.5 text-xs font-bold shrink-0 ${item.priority === "HIGH" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>
                                {item.priority === "HIGH" ? "Ưu tiên cao" : "Trung bình"}
                              </span>
                            </div>

                            <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <strong>Lý do cần xử lý:</strong> {item.reason}
                            </p>

                            <div className="pt-2 flex justify-between items-center text-xs text-slate-500 border-t border-slate-100">
                              <span className="font-mono text-[11px]">Ngày tạo: {item.createdAt}</span>
                              <button
                                type="button"
                                onClick={() => handleOpenItemDetail(item.targetType as DrawerType, item.targetId, item.title)}
                                className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Xem chi tiết <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* 6. REPORTS 7D DRAWER */}
                  {drawerType === "REPORTS_7D" && (
                    <div className="space-y-3">
                      {report7dItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                          <FileText className="mx-auto h-8 w-8 text-slate-400 mb-2 stroke-[1.5]" />
                          <h4 className="text-sm font-bold text-slate-800">Không có báo cáo trong 7 ngày gần đây</h4>
                        </div>
                      ) : (
                        report7dItems.map((item) => (
                          <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">{item.type}</span>
                                <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h4>
                                <p className="text-xs text-slate-500 mt-0.5">{item.projectName} • Người lập: {item.reporterName}</p>
                              </div>
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 shrink-0">
                                {item.status}
                              </span>
                            </div>

                            {item.hasIssue ? (
                              <div className="rounded-lg bg-rose-50 border border-rose-200/60 p-2.5 text-xs text-rose-800 flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                                <span>Vấn đề ghi nhận: <strong>{item.issuesNote || "Có nội dung phát sinh cần chú ý"}</strong></span>
                              </div>
                            ) : (
                              <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-2 text-xs text-emerald-700 flex items-center gap-1.5 font-medium">
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Không ghi nhận vấn đề thi công</span>
                              </div>
                            )}

                            <div className="pt-2 flex justify-between items-center text-xs text-slate-500 border-t border-slate-100">
                              <span className="font-mono text-[11px]">Ngày báo cáo: {item.reportDate}</span>
                              <Link 
                                href={item.previewRoute}
                                onClick={onClose}
                                className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                Xem bản ghi <ExternalLink className="h-3 w-3" />
                              </Link>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-4 flex items-center justify-between gap-3">
          {selectedItemDetail ? (
            <button
              type="button"
              onClick={() => setSelectedItemDetail(null)}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Quay lại danh sách
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <Link
              href={fullPageUrl}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3.5 py-2 rounded-lg transition-colors"
            >
              Xem toàn màn hình <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
