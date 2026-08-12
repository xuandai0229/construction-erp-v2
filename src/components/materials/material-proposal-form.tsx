"use client";

import { useEffect, useState, useRef, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Layers,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  PackageCheck,
  Search,
  ChevronDown,
  Building2,
  Eye,
} from "lucide-react";
import { autoSaveMaterialProposal } from "@/lib/material-proposals/actions";

export interface ProposalFormItem {
  id?: string;
  sectionName?: string;
  isCatalog: boolean;
  materialItemId?: string;
  materialCodeSnapshot?: string;
  materialName: string;
  unit: string;
  contractQuantityText?: string;
  actualQuantity: number | string;
  specification?: string;
  manufacturerOrigin?: string;
  note?: string;
}

export interface CatalogItemOption {
  id: string;
  code: string;
  name: string;
  unit: string;
  manufacturer?: string | null;
  origin?: string | null;
  description?: string | null;
}

export interface ProjectOption {
  id: string;
  name: string;
  code?: string | null;
  location?: string | null;
}

interface MaterialProposalFormProps {
  initialProposal?: {
    id: string;
    proposalNo: string;
    projectId: string;
    projectNameSnapshot: string;
    projectLocationSnapshot?: string | null;
    requestedById: string;
    requesterNameSnapshot: string;
    requesterRoleSnapshot?: string | null;
    proposalDate: Date;
    purchaseReason?: string | null;
    requiredDeliveryDate?: Date | null;
    items: Array<{
      id: string;
      sequence: number;
      sectionName?: string | null;
      materialItemId?: string | null;
      materialCodeSnapshot?: string | null;
      materialName: string;
      unit: string;
      contractQuantityText?: string | null;
      actualQuantity: number | string;
      specification?: string | null;
      manufacturerOrigin?: string | null;
      note?: string | null;
    }>;
  };
  projects: ProjectOption[];
  catalogItems: CatalogItemOption[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  initialProjectId?: string;
  returnTo?: string;
}

const createBlankItem = (sectionName?: string): ProposalFormItem => ({
  sectionName,
  isCatalog: false,
  materialItemId: undefined,
  materialName: "",
  unit: "",
  contractQuantityText: "",
  actualQuantity: "",
  specification: "",
  manufacturerOrigin: "",
  note: "",
});

// Reusable Auto-Growing Textarea Component for Table Cells
interface AutoResizeTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value: string;
  onChangeValue: (val: string) => void;
  maxRows?: number;
}

function AutoResizeTextarea({
  value,
  onChangeValue,
  className = "",
  placeholder,
  title,
  onFocus,
  onBlur,
  maxRows = 4,
  ...props
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const computed = window.getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight) || 18;
    const paddingTop = parseFloat(computed.paddingTop) || 6;
    const paddingBottom = parseFloat(computed.paddingBottom) || 6;
    const borderTop = parseFloat(computed.borderTopWidth) || 1;
    const borderBottom = parseFloat(computed.borderBottomWidth) || 1;

    const minHeight = lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
    const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom + borderTop + borderBottom;

    const contentHeight = el.scrollHeight;
    const targetHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);
    el.style.height = `${targetHeight}px`;

    // Only show scrollbar if content exceeds max rows + buffer
    if (contentHeight > maxHeight + 2) {
      el.style.overflowY = "auto";
    } else {
      el.style.overflowY = "hidden";
    }
  }, [maxRows]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      value={value}
      title={title || value}
      placeholder={placeholder}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={(e) => onChangeValue(e.target.value)}
      className={`resize-none overflow-hidden block w-full text-xs font-medium focus:outline-none [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap ${className}`}
      {...props}
    />
  );
}

export function MaterialProposalForm({
  initialProposal,
  projects,
  catalogItems,
  currentUserName,
  currentUserRole,
  initialProjectId,
  returnTo,
}: MaterialProposalFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialProposal);

  const [proposalId, setProposalId] = useState<string | null>(initialProposal?.id || null);
  const [projectId, setProjectId] = useState<string>(
    initialProposal?.projectId || initialProjectId || projects[0]?.id || ""
  );

  // Editable Project Location State
  const [projectLocation, setProjectLocation] = useState<string>(() => {
    if (initialProposal) {
      return initialProposal.projectLocationSnapshot ?? "";
    }
    const selected = projects.find((p) => p.id === (initialProjectId || projects[0]?.id));
    return selected?.location ?? "";
  });

  const [purchaseReason, setPurchaseReason] = useState<string>(initialProposal?.purchaseReason || "");
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState<string>(
    initialProposal?.requiredDeliveryDate
      ? new Date(initialProposal.requiredDeliveryDate).toISOString().slice(0, 10)
      : ""
  );

  const [items, setItems] = useState<ProposalFormItem[]>(() => {
    if (initialProposal?.items && initialProposal.items.length > 0) {
      return initialProposal.items.map((i) => ({
        id: i.id,
        sectionName: i.sectionName || undefined,
        isCatalog: Boolean(i.materialItemId),
        materialItemId: i.materialItemId || undefined,
        materialCodeSnapshot: i.materialCodeSnapshot || undefined,
        materialName: i.materialName,
        unit: i.unit || "",
        contractQuantityText: i.contractQuantityText || "",
        actualQuantity: i.actualQuantity === 0 || i.actualQuantity ? Number(i.actualQuantity) : "",
        specification: i.specification || "",
        manufacturerOrigin: i.manufacturerOrigin || "",
        note: i.note || "",
      }));
    }
    return [createBlankItem()];
  });

  // Auto-Save Status
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Project Combobox Popover State
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const projectBoxRef = useRef<HTMLDivElement | null>(null);

  // Active Catalog Suggestions Popover Index
  const [activeSuggestionRow, setActiveSuggestionRow] = useState<number | null>(null);
  const suggestionBoxRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const selectedProject = projects.find((p) => p.id === projectId) || projects[0];
  const displayRoleName = currentUserRole === "ADMIN" ? "Quản trị viên hệ thống" : currentUserRole;

  // Auto-save logic
  const isInitialRender = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performAutoSave = useCallback(async () => {
    if (!projectId) return;
    setSaveStatus("saving");
    setSaveErrorMsg(null);

    try {
      const res = await autoSaveMaterialProposal({
        id: proposalId,
        projectId,
        projectLocationSnapshot: projectLocation,
        purchaseReason,
        requiredDeliveryDate,
        items,
      });

      if (res?.id) {
        if (!proposalId) {
          setProposalId(res.id);
          const newUrl = returnTo
            ? `/materials/proposals/new?edit=${res.id}&returnTo=${encodeURIComponent(returnTo)}`
            : `/materials/proposals/new?edit=${res.id}`;
          window.history.replaceState({}, "", newUrl);
        }
        setSaveStatus("saved");
        const now = new Date();
        setLastSavedTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
      }
    } catch (err) {
      setSaveStatus("error");
      setSaveErrorMsg(err instanceof Error ? err.message : "Chưa lưu được");
    }
  }, [proposalId, projectId, projectLocation, purchaseReason, requiredDeliveryDate, items, returnTo]);

  const handleOpenPreview = async () => {
    if (!projectId) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setSaveStatus("saving");
    try {
      const res = await autoSaveMaterialProposal({
        id: proposalId,
        projectId,
        projectLocationSnapshot: projectLocation,
        purchaseReason,
        requiredDeliveryDate,
        items,
      });

      if (res?.id) {
        setSaveStatus("saved");
        const now = new Date();
        setLastSavedTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
        const previewUrl = returnTo
          ? `/materials/proposals/${res.id}/preview?returnTo=${encodeURIComponent(returnTo)}`
          : `/materials/proposals/${res.id}/preview`;
        router.push(previewUrl);
      } else {
        throw new Error("Tự động lưu thất bại.");
      }
    } catch (err) {
      setSaveStatus("error");
      setSaveErrorMsg(err instanceof Error ? err.message : "Chưa thể xem trước vì thay đổi chưa được lưu.");
    }
  };

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    setSaveStatus("saving");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [projectId, projectLocation, purchaseReason, requiredDeliveryDate, items, performAutoSave]);

  // Click outside to close project combobox or catalog dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projectBoxRef.current && !projectBoxRef.current.contains(e.target as Node)) {
        setIsProjectOpen(false);
      }
      if (activeSuggestionRow !== null) {
        const box = suggestionBoxRefs.current[activeSuggestionRow];
        if (box && !box.contains(e.target as Node)) {
          setActiveSuggestionRow(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeSuggestionRow]);

  // Handle Project Selection from Combobox (Both Create & Edit Mode)
  const handleSelectProject = (p: ProjectOption) => {
    setProjectId(p.id);
    setProjectLocation(p.location ?? "");
    setIsProjectOpen(false);
  };

  // Filter Projects for Combobox
  const filteredProjects = projects.filter((p) => {
    const q = projectSearch.toLowerCase().trim();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q));
  });

  // Item List Modifiers
  const updateItem = <K extends keyof ProposalFormItem>(index: number, field: K, value: ProposalFormItem[K]) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addItem = (sectionName?: string) => {
    setItems((prev) => [...prev, createBlankItem(sectionName)]);
  };

  const addSection = () => {
    const defaultSectionName = `PHẦN VẬT TƯ ${items.filter((i) => i.sectionName).length + 1}`;
    setItems((prev) => [...prev, createBlankItem(defaultSectionName)]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const selectCatalogItem = (index: number, catItem: CatalogItemOption) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        isCatalog: true,
        materialItemId: catItem.id,
        materialCodeSnapshot: catItem.code,
        materialName: catItem.name,
        unit: catItem.unit || copy[index].unit || "",
        specification: catItem.description || copy[index].specification || "",
        manufacturerOrigin: [catItem.manufacturer, catItem.origin].filter(Boolean).join(" · ") || copy[index].manufacturerOrigin || "",
      };
      return copy;
    });
    setActiveSuggestionRow(null);
  };

  const selectOutsideCatalog = (index: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        isCatalog: false,
        materialItemId: undefined,
        materialCodeSnapshot: undefined,
      };
      return copy;
    });
    setActiveSuggestionRow(null);
  };

  return (
    <main className="w-full max-w-full space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (returnTo) {
                router.push(returnTo);
              } else {
                const targetUrl = `/materials?tab=requests${projectId ? `&projectId=${projectId}` : ""}`;
                router.push(targetUrl);
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-50"
            aria-label="Quay lại danh sách đề xuất"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              {isEditing ? "CHỈNH SỬA ĐỀ XUẤT VẬT TƯ" : "TẠO ĐỀ XUẤT VẬT TƯ"}
            </h1>
            <p className="text-xs text-slate-500">
              Phiếu đề xuất vật tư công trình. Mọi thay đổi được tự động lưu.
            </p>
          </div>
        </div>

        {/* Auto-Save Indicator & Preview Button */}
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Đang lưu...</span>
            </div>
          )}
          {saveStatus === "saved" && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Đã lưu {lastSavedTime ? `lúc ${lastSavedTime}` : ""}</span>
            </div>
          )}
          {saveStatus === "error" && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
              <span>{saveErrorMsg || "Chưa lưu được"}</span>
              <button
                type="button"
                onClick={performAutoSave}
                className="ml-1 underline hover:text-rose-900"
              >
                Thử lại
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenPreview}
            disabled={!projectId}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors disabled:opacity-50"
            title="Xem trước tài liệu đề xuất vật tư"
          >
            <Eye className="h-3.5 w-3.5 text-slate-600" />
            <span>Xem trước</span>
          </button>
        </div>
      </div>

      {/* Editable Proposal Metadata Header */}
      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 shadow-2xs">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          THÔNG TIN ĐỀ XUẤT
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* CÔNG TRÌNH - Searchable Combobox */}
          <div className="relative" ref={projectBoxRef}>
            <label className="block text-xs font-semibold text-slate-700 mb-1">CÔNG TRÌNH</label>
            <button
              type="button"
              onClick={() => setIsProjectOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none text-left"
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="truncate" title={selectedProject?.name || "Chọn công trình"}>
                  {selectedProject?.name || "Chọn công trình"}
                </span>
                {selectedProject?.code && (
                  <span className="ml-1 rounded bg-slate-100 px-1 py-0.2 text-[10px] font-normal text-slate-500 shrink-0">
                    {selectedProject.code}
                  </span>
                )}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Combobox Dropdown */}
            {isProjectOpen && (
              <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-full min-w-[320px] overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg text-xs">
                <div className="relative p-1 border-b border-slate-100">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Tìm công trình theo tên, mã..."
                    className="w-full rounded-md border border-slate-200 pl-8 pr-2 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-50">
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProject(p)}
                        className={`w-full text-left px-2.5 py-2 hover:bg-blue-50 rounded transition flex items-center justify-between gap-2 ${
                          p.id === projectId ? "bg-blue-50 font-bold text-blue-900" : "text-slate-800"
                        }`}
                        title={p.name}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="truncate block font-semibold">{p.name}</span>
                          {p.location && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              📍 {p.location}
                            </span>
                          )}
                        </div>
                        {p.code && (
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {p.code}
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-center text-slate-400 italic">Không tìm thấy công trình</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ĐỊA ĐIỂM - Fully Editable Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ĐỊA ĐIỂM</label>
            <input
              type="text"
              value={projectLocation}
              onChange={(e) => setProjectLocation(e.target.value)}
              placeholder="Nhập địa điểm..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Người đề nghị */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">NGƯỜI ĐỀ NGHỊ</label>
            <input
              type="text"
              readOnly
              value={currentUserName}
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
            />
          </div>

          {/* Chức danh / vai trò */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">CHỨC DANH / VAI TRÒ</label>
            <input
              type="text"
              readOnly
              value={displayRoleName}
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
            />
          </div>

          {/* Ngày đề nghị */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">NGÀY ĐỀ NGHỊ</label>
            <input
              type="text"
              readOnly
              value={new Date().toLocaleDateString("vi-VN")}
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
            />
          </div>

          {/* Ngày cấp về công trình */}
          <div>
            <label className="block text-xs font-bold text-blue-900 mb-1">
              NGÀY CẤP VỀ CÔNG TRÌNH
            </label>
            <input
              type="date"
              value={requiredDeliveryDate}
              onChange={(e) => setRequiredDeliveryDate(e.target.value)}
              className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Lý do mua hàng */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-blue-900 mb-1">LÝ DO MUA HÀNG</label>
          <textarea
            rows={2}
            value={purchaseReason}
            onChange={(e) => setPurchaseReason(e.target.value)}
            placeholder="Nhập lý do mua hàng, mục đích sử dụng cho công trình..."
            className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none"
          />
        </div>
      </section>

      {/* Material Table Section */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-blue-700" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
              DANH SÁCH VẬT TƯ ĐỀ XUẤT
            </h2>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              {items.length} dòng
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addSection}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              <Layers className="h-3.5 w-3.5 text-slate-600" />
              + Thêm phần
            </button>
            <button
              type="button"
              onClick={() => addItem()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              + Thêm vật tư
            </button>
          </div>
        </div>

        {/* Golden Table 2-Level Header */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-200">
              {/* Row 1 Header - Pristine 1-Line Headers */}
              <tr>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-center font-bold w-12"
                >
                  STT
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-4 py-2.5 text-left font-bold min-w-[280px] max-w-[420px]"
                >
                  TÊN VẬT TƯ / VẬT LIỆU
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-center font-bold w-20"
                >
                  ĐƠN VỊ
                </th>
                <th
                  colSpan={2}
                  className="whitespace-nowrap border-b border-r border-slate-200 px-4 py-1.5 text-center font-bold bg-slate-200/60"
                >
                  KHỐI LƯỢNG
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-4 py-2.5 text-left font-bold min-w-[200px]"
                >
                  QUY CÁCH / THÔNG SỐ KỸ THUẬT
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-4 py-2.5 text-left font-bold min-w-[180px]"
                >
                  HÃNG SẢN XUẤT / XUẤT XỨ
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-4 py-2.5 text-left font-bold min-w-[160px]"
                >
                  GHI CHÚ
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-2 py-2.5 text-center font-bold w-14"
                >
                  XÓA
                </th>
              </tr>
              {/* Row 2 Header */}
              <tr>
                <th className="whitespace-nowrap border-r border-slate-200 px-3 py-1.5 text-center font-bold w-28 bg-slate-100">
                  THEO HỢP ĐỒNG
                </th>
                <th className="whitespace-nowrap border-r border-slate-200 px-3 py-1.5 text-center font-bold w-28 bg-slate-100 text-blue-900">
                  THỰC TẾ
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.map((item, index) => {
                const isSectionHeader =
                  item.sectionName &&
                  (index === 0 || items[index - 1].sectionName !== item.sectionName);

                const sequenceNum = index + 1;

                // Catalog suggestions filter
                const searchLower = item.materialName.trim().toLowerCase();
                const filteredSuggestions = catalogItems.filter(
                  (c) =>
                    c.name.toLowerCase().includes(searchLower) ||
                    c.code.toLowerCase().includes(searchLower)
                );

                return (
                  <Fragment key={item.id || index}>
                    {/* Section Header Row */}
                    {isSectionHeader && (
                      <tr className="bg-slate-100/90 font-bold text-slate-900 border-y border-slate-300">
                        <td colSpan={9} className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-blue-600 shrink-0" />
                            <span className="text-xs uppercase text-slate-500 font-bold">
                              Phần vật tư:
                            </span>
                            <input
                              type="text"
                              value={item.sectionName}
                              onChange={(e) => updateItem(index, "sectionName", e.target.value)}
                              placeholder="Nhập tên phần vật tư..."
                              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-blue-900 shadow-2xs focus:border-blue-500 focus:outline-none min-w-[280px]"
                            />
                            <button
                              type="button"
                              onClick={() => updateItem(index, "sectionName", undefined)}
                              className="text-[11px] font-normal text-rose-600 hover:underline ml-2"
                            >
                              Bỏ phần này
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Item Row - Entire Row Aligns Vertically Center */}
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      {/* STT - Compact 1-line Vertical Middle */}
                      <td className="px-3 py-2 text-center font-semibold text-slate-600 text-xs border-r border-slate-100 align-middle whitespace-nowrap">
                        {sequenceNum}
                      </td>

                      {/* TÊN VẬT TƯ / VẬT LIỆU - Auto-Growing Textarea */}
                      <td className="px-2 py-2 border-r border-slate-100 align-middle relative min-w-[280px] max-w-[420px]">
                        <div
                          ref={(el) => {
                            suggestionBoxRefs.current[index] = el;
                          }}
                          className="relative w-full"
                        >
                          <AutoResizeTextarea
                            value={item.materialName}
                            onChangeValue={(val) => {
                              updateItem(index, "materialName", val);
                              if (item.isCatalog) {
                                updateItem(index, "isCatalog", false);
                                updateItem(index, "materialItemId", undefined);
                              }
                              setActiveSuggestionRow(index);
                            }}
                            onFocus={() => setActiveSuggestionRow(index)}
                            placeholder="Nhập tên vật tư..."
                            maxRows={4}
                            className={`w-full rounded-md border px-2.5 py-1.5 text-xs font-semibold leading-relaxed shadow-2xs ${
                              item.isCatalog
                                ? "border-blue-400 bg-blue-50/30 text-blue-950 focus:border-blue-600 focus:bg-white"
                                : "border-slate-200 bg-white text-slate-900 focus:border-blue-500"
                            }`}
                          />

                          {/* Catalog Suggestions Dropdown */}
                          {activeSuggestionRow === index && (
                            <div className="absolute left-0 top-full z-30 mt-1 max-h-70 w-full min-w-[360px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg text-xs">
                              <div className="px-2 py-1 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-100 flex items-center justify-between">
                                <span>Gợi ý từ danh mục ({filteredSuggestions.length})</span>
                                <Search className="h-3 w-3 text-slate-400" />
                              </div>
                              {filteredSuggestions.length > 0 ? (
                                filteredSuggestions.map((cat) => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => selectCatalogItem(index, cat)}
                                    className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 rounded transition flex items-center justify-between gap-2"
                                    title={cat.name}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <span className="font-semibold text-slate-900 truncate block">
                                        {cat.name}
                                      </span>
                                      <span className="text-[10px] text-slate-400">[{cat.code}]</span>
                                    </div>
                                    <span className="text-[11px] text-blue-600 font-medium shrink-0">
                                      {cat.unit}
                                    </span>
                                  </button>
                                ))
                              ) : (
                                <div className="px-2.5 py-2 text-slate-500 italic text-[11px]">
                                  Không thấy trong danh mục
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => selectOutsideCatalog(index)}
                                className="w-full text-left px-2.5 py-1.5 text-blue-700 font-semibold hover:bg-slate-100 rounded border-t border-slate-100 mt-1"
                              >
                                + Sử dụng vật tư ngoài danh mục
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* ĐƠN VỊ - Compact 1-Line Vertical Middle */}
                      <td className="px-2 py-2 border-r border-slate-100 align-middle">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItem(index, "unit", e.target.value)}
                          placeholder="Đơn vị..."
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* KHỐI LƯỢNG - THEO HỢP ĐỒNG - Compact 1-Line Vertical Middle */}
                      <td className="px-2 py-2 border-r border-slate-100 align-middle">
                        <input
                          type="text"
                          value={item.contractQuantityText || ""}
                          onChange={(e) => updateItem(index, "contractQuantityText", e.target.value)}
                          placeholder="vd: 35"
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* KHỐI LƯỢNG - THỰC TẾ - Compact 1-Line Vertical Middle */}
                      <td className="px-2 py-2 border-r border-slate-100 align-middle">
                        <input
                          type="number"
                          step="any"
                          value={
                            item.actualQuantity === undefined || item.actualQuantity === null
                              ? ""
                              : item.actualQuantity
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            updateItem(index, "actualQuantity", val === "" ? "" : Number(val));
                          }}
                          placeholder="Số lượng..."
                          className="w-full rounded-md border border-blue-300 bg-white px-2 py-1.5 text-center text-xs font-bold text-blue-900 shadow-2xs focus:border-blue-600 focus:outline-none"
                        />
                      </td>

                      {/* QUY CÁCH / THÔNG SỐ KỸ THUẬT - Auto-Growing Textarea */}
                      <td className="px-2 py-2 border-r border-slate-100 align-middle min-w-[200px]">
                        <AutoResizeTextarea
                          value={item.specification || ""}
                          onChangeValue={(val) => updateItem(index, "specification", val)}
                          placeholder="Thông số, quy cách..."
                          maxRows={4}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 whitespace-pre-wrap break-words"
                        />
                      </td>

                      {/* HÃNG SẢN XUẤT / XUẤT XỨ - Auto-Growing Textarea */}
                      <td className="px-2 py-2 border-r border-slate-100 align-middle min-w-[180px]">
                        <AutoResizeTextarea
                          value={item.manufacturerOrigin || ""}
                          onChangeValue={(val) => updateItem(index, "manufacturerOrigin", val)}
                          placeholder="Hãng SX, xuất xứ..."
                          maxRows={4}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 whitespace-pre-wrap break-words"
                        />
                      </td>

                      {/* GHI CHÚ - Auto-Growing Textarea */}
                      <td className="px-2 py-2 border-r border-slate-100 align-middle min-w-[160px]">
                        <AutoResizeTextarea
                          value={item.note || ""}
                          onChangeValue={(val) => updateItem(index, "note", val)}
                          placeholder="Ghi chú thêm..."
                          maxRows={4}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 whitespace-pre-wrap break-words"
                        />
                      </td>

                      {/* XÓA - Compact 1-Line Vertical Middle */}
                      <td className="px-2 py-2 text-center align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition"
                          title="Xóa dòng này"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
