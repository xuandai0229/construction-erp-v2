"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Plus, Search, Filter, Package, AlertCircle, Eye, Edit2, CheckCircle2, Clock, XCircle, FileText } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { MaterialRequestForm } from "./material-request-form";
import { MaterialRequestDetail } from "./material-request-detail";

const statusConfig = {
  DRAFT: { label: "Nháp", variant: "neutral" as const, icon: FileText },
  REQUESTED: { label: "Đã đề xuất", variant: "info" as const, icon: Clock },
  SUBMITTED: { label: "Chờ phê duyệt", variant: "warning" as const, icon: Clock },
  APPROVED: { label: "Đã duyệt", variant: "success" as const, icon: CheckCircle2 },
  REJECTED: { label: "Từ chối", variant: "danger" as const, icon: XCircle },
  PROCESSING: { label: "Đang xử lý", variant: "info" as const, icon: AlertCircle },
  ISSUED: { label: "Đã cấp", variant: "info" as const, icon: Package },
  RECEIVED: { label: "Đã nhận", variant: "success" as const, icon: CheckCircle2 },
  CANCELLED: { label: "Hủy", variant: "danger" as const, icon: XCircle },
};

const priorityConfig = {
  LOW: { label: "Thấp", variant: "neutral" as const },
  MEDIUM: { label: "Trung bình", variant: "info" as const },
  HIGH: { label: "Cao", variant: "warning" as const },
  URGENT: { label: "Khẩn cấp", variant: "danger" as const },
};

export function MaterialRequestList({ 
  projectId, 
  initialRequests, 
  wbsItems 
}: { 
  projectId: string;
  initialRequests: any[];
  wbsItems: any[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  useEffect(() => {
    // eslint-disable-next-line
    setRequests(initialRequests);
  }, [initialRequests]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // Filter Logic
  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.requestNo.toLowerCase().includes(search.toLowerCase()) ||
      req.note?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI Calculation
  const totalRequests = requests.length;
  const processingRequests = requests.filter(r => ["REQUESTED", "SUBMITTED", "APPROVED", "PROCESSING", "ISSUED"].includes(r.status)).length;
  const receivedRequests = requests.filter(r => r.status === "RECEIVED").length;
  const missingItemsRequests = requests.filter(r => 
    r.items.some((i: any) => Number(i.requestedQuantity) > Number(i.receivedQuantity)) && r.status !== "CANCELLED"
  ).length;

  const handleCreate = () => {
    setSelectedRequest(null);
    setIsFormOpen(true);
  };

  const handleEdit = (req: any) => {
    setSelectedRequest(req);
    setIsFormOpen(true);
  };

  const handleView = (req: any) => {
    setSelectedRequest(req);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-xs sm:text-sm font-medium text-slate-500">Tổng phiếu</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{totalRequests}</p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-yellow-200 shadow-sm flex flex-col justify-between bg-yellow-50/30">
          <p className="text-xs sm:text-sm font-medium text-yellow-700">Đang xử lý</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-800 mt-1">{processingRequests}</p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between bg-emerald-50/30">
          <p className="text-xs sm:text-sm font-medium text-emerald-700">Đã nhận hoàn tất</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1">{receivedRequests}</p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-orange-200 shadow-sm flex flex-col justify-between bg-orange-50/30">
          <p className="text-xs sm:text-sm font-medium text-orange-700">Phiếu còn thiếu vật tư</p>
          <p className="text-xl sm:text-2xl font-bold text-orange-800 mt-1">{missingItemsRequests}</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <label htmlFor="search-request" className="sr-only">Tìm kiếm đề xuất</label>
            <input 
              id="search-request"
              name="search-request"
              type="text"
              placeholder="Tìm mã phiếu, ghi chú..."
              className="w-full pl-9 pr-4 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <label htmlFor="filter-status" className="sr-only">Bộ lọc trạng thái</label>
            <select
              id="filter-status"
              name="filter-status"
              className="w-full sm:w-auto appearance-none pl-3 pr-8 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>
        <button 
          onClick={handleCreate}
          className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 active:scale-95 flex items-center justify-center gap-2 shadow-sm transition-all whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Tạo đề xuất
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3">Mã phiếu</th>
                <th className="px-4 py-3">Ngày cần</th>
                <th className="px-4 py-3">Số loại VT</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ưu tiên</th>
                <th className="px-4 py-3">Người tạo</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Không tìm thấy đề xuất vật tư nào. Hãy tạo đề xuất vật tư đầu tiên.
                  </td>
                </tr>
              ) : filteredRequests.map(req => {
                const StatusIcon = statusConfig[req.status as keyof typeof statusConfig]?.icon || FileText;
                const isEditable = ["DRAFT"].includes(req.status);
                
                return (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{req.requestNo}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {req.neededDate ? format(new Date(req.neededDate), "dd/MM/yyyy") : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{req.items?.length || 0}</td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={statusConfig[req.status as keyof typeof statusConfig]?.variant || "neutral"} size="sm" className="gap-1.5 px-2.5 py-1">
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig[req.status as keyof typeof statusConfig]?.label}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={priorityConfig[req.priority as keyof typeof priorityConfig]?.variant || "neutral"} size="sm">
                        {priorityConfig[req.priority as keyof typeof priorityConfig]?.label}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">{req.requestedBy?.name}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {isEditable && (
                        <button onClick={() => handleEdit(req)} aria-label={`Sửa đề xuất ${req.requestNo}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleView(req)} aria-label={`Chi tiết đề xuất ${req.requestNo}`} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Chi tiết">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500 text-sm">
            Không tìm thấy đề xuất vật tư nào. Hãy tạo đề xuất vật tư đầu tiên.
          </div>
        ) : filteredRequests.map(req => {
          const StatusIcon = statusConfig[req.status as keyof typeof statusConfig]?.icon || FileText;
          return (
            <div key={req.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 active:scale-[0.99] transition-transform" onClick={() => handleView(req)}>
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{req.requestNo}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ngày cần: {req.neededDate ? format(new Date(req.neededDate), "dd/MM/yyyy") : "-"}</p>
                </div>
                <StatusBadge variant={statusConfig[req.status as keyof typeof statusConfig]?.variant || "neutral"} size="sm" className="gap-1">
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig[req.status as keyof typeof statusConfig]?.label}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex gap-2">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium border border-slate-200">{req.items?.length || 0} loại VT</span>
                  <StatusBadge variant={priorityConfig[req.priority as keyof typeof priorityConfig]?.variant || "neutral"} size="sm" className="rounded px-2 py-1">
                    {priorityConfig[req.priority as keyof typeof priorityConfig]?.label}
                  </StatusBadge>
                </div>
                <button aria-label={`Chi tiết đề xuất ${req.requestNo}`} className="text-blue-600 text-sm font-semibold flex items-center gap-1" onClick={(e) => { e.stopPropagation(); handleView(req); }}>
                  Chi tiết <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modals/Drawers */}
      {isFormOpen && (
        <MaterialRequestForm 
          projectId={projectId}
          initialData={selectedRequest}
          wbsItems={wbsItems}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            window.location.reload(); // Quick refresh for MVP, better to use Next router.refresh
          }}
        />
      )}

      {isDetailOpen && (
        <MaterialRequestDetail
          request={selectedRequest}
          wbsItems={wbsItems}
          onClose={() => setIsDetailOpen(false)}
          onEdit={() => {
            setIsDetailOpen(false);
            setIsFormOpen(true);
          }}
          onSuccess={() => {
            setIsDetailOpen(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

// ArrowRight missing import
function ArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
}
