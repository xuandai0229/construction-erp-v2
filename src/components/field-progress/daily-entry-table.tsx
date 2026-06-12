"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  Info,
  Package,
  Plus,
  Save,
  Search,
  Send,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { batchSaveDailyEntries } from "@/app/(dashboard)/projects/[id]/field-progress/daily/actions";
import { createItem } from "@/app/(dashboard)/projects/[id]/field-progress/actions";
import { formatQuantity } from "@/lib/field-progress";
import { sharedTableStyles } from "./table-styles";
import { evaluateVolumeGuard } from "@/lib/field-progress/volume-guard";

type DailyItem = {
  id: string;
  code?: string | null;
  name: string;
  parentName?: string | null;
  constructionCrew?: string | null;
  designQuantity?: number | null;
  unit?: string | null;
  cumulativeBefore: number;
  todayEntry?: any;
  materials?: any[];
  quantity: string | number;
  issueNote: string;
  proposalNote: string;
  note: string;
  status: string;
};

export function DailyEntryTable({
  projectId,
  templateId,
  dateStr,
  projectLabel,
  initialItems,
  parentGroups = [],
}: {
  projectId: string;
  templateId: string;
  dateStr: string;
  projectLabel: string;
  initialItems: any[];
  parentGroups?: any[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<DailyItem[]>([]);
  const [dirtyEntries, setDirtyEntries] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [activeDrawerItem, setActiveDrawerItem] = useState<DailyItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [crewFilter, setCrewFilter] = useState("ALL");

  // Quick Add State
  const [groups, setGroups] = useState<any[]>(parentGroups || []);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [quickAddData, setQuickAddData] = useState({
    workContent: "",
    parentId: "",
    constructionCrew: "",
    designQuantity: "",
    unit: "m"
  });

  useEffect(() => {
    setGroups(parentGroups || []);
  }, [parentGroups]);

  const handleQuickAdd = async () => {
    if (!quickAddData.workContent.trim()) {
      alert("Vui lòng nhập nội dung công việc.");
      return;
    }
    
    setLoading(true);
    try {
      let finalParentId = quickAddData.parentId;
      
      // If user wants to create a new group
      if (quickAddData.parentId === "NEW_GROUP") {
        if (!newGroupName.trim()) {
          alert("Vui lòng nhập tên hạng mục cha mới.");
          setLoading(false);
          return;
        }
        
        const groupRes = await createItem(templateId, projectId, {
          itemType: "GROUP",
          categoryName: newGroupName,
          level: 0
        });
        
        if (groupRes?.error) {
          alert("Lỗi khi tạo hạng mục cha: " + groupRes.error);
          setLoading(false);
          return;
        }
        
        if (groupRes?.item) {
          finalParentId = groupRes.item.id;
          setGroups(prev => [...prev, groupRes.item]);
        }
      }
      
      const res = await createItem(templateId, projectId, {
        parentId: finalParentId || null,
        itemType: "WORK",
        workContent: quickAddData.workContent,
        level: finalParentId ? 1 : 0,
        constructionCrew: quickAddData.constructionCrew || null,
        designQuantity: quickAddData.designQuantity ? Number(quickAddData.designQuantity) : null,
        unit: quickAddData.unit || "m"
      });
      
      if (res?.error) {
        alert("Lỗi khi tạo công việc: " + res.error);
      } else if (res?.item) {
        // Find parent category name
        const parentObj = groups.find(g => g.id === finalParentId);
        const newDailyItem: DailyItem = {
          id: res.item.id,
          code: res.item.code,
          name: res.item.workContent || "",
          parentName: parentObj?.categoryName || newGroupName || null,
          constructionCrew: res.item.constructionCrew,
          designQuantity: res.item.designQuantity ? Number(res.item.designQuantity) : null,
          unit: res.item.unit,
          cumulativeBefore: 0,
          todayEntry: null,
          materials: [],
          quantity: "",
          issueNote: "",
          proposalNote: "",
          note: "",
          status: "EMPTY"
        };
        
        setItems(prev => [...prev, newDailyItem]);
        setShowQuickAdd(false);
        // Reset form
        setQuickAddData({
          workContent: "",
          parentId: "",
          constructionCrew: "",
          designQuantity: "",
          unit: "m"
        });
        setNewGroupName("");
        
        // Focus the newly added item's quantity input
        setTimeout(() => {
          quantityRefs.current[res.item.id]?.focus();
          quantityRefs.current[res.item.id]?.select();
        }, 100);
      }
    } catch (e: any) {
      alert("Có lỗi xảy ra: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const quantityRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const mapped = initialItems.map((item) => {
      const e = item.todayEntry || {};
      return {
        ...item,
        quantity: e.quantity ? String(Number(e.quantity)) : "",
        issueNote: e.issueNote || "",
        proposalNote: e.proposalNote || "",
        note: e.note || "",
        status: e.status || "EMPTY",
      };
    });
    setItems(mapped);
    setDirtyEntries({});
  }, [initialItems]);

  const crews = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.constructionCrew).filter(Boolean))).sort() as string[];
  }, [items]);

function parseVietnameseDecimalInput(raw: string): number | null {
  if (raw === "" || raw === null || raw === undefined) return null;
  const value = raw.trim().replace(",", ".");
  if (value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

  const getItemMath = (item: DailyItem) => {
    const raw = item.quantity;
    const parsed = parseVietnameseDecimalInput(raw);
    const quantity = parsed === null ? 0 : parsed;
    const isActuallyEmpty = raw === "" || raw === null || raw === undefined;
    const hasInvalidNumber = !isActuallyEmpty && parsed === null;
    const isNegative = !hasInvalidNumber && quantity < 0;
    const hasTodayQuantity = !hasInvalidNumber && quantity > 0;

    const validQuantityForCalc = hasInvalidNumber || isNegative ? 0 : quantity;
    const guard = evaluateVolumeGuard({
      designQuantity: item.designQuantity || 0,
      cumulativeBefore: item.cumulativeBefore,
      todayQuantity: validQuantityForCalc,
      status: (item.status as "DRAFT" | "SUBMITTED" | "APPROVED") || "DRAFT",
      note: item.note,
      issueNote: item.issueNote,
      proposalNote: item.proposalNote
    });

    const isOver = guard.level === "OVER_DESIGN" || guard.level === "BLOCK_SUBMIT" || guard.level === "REQUIRE_NOTE";

    return { 
      quantity, 
      hasInvalidNumber, 
      isNegative, 
      cumulativeAfter: guard.projectedCumulative, 
      percent: guard.level === "NEED_DESIGN_QUANTITY" ? null : guard.percent, 
      isOver, 
      hasTodayQuantity,
      guard
    };
  };

  const filteredItems = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const math = getItemMath(item);
      const matchesSearch =
        !needle ||
        item.name?.toLowerCase().includes(needle) ||
        item.parentName?.toLowerCase().includes(needle) ||
        item.constructionCrew?.toLowerCase().includes(needle);
      const matchesCrew = crewFilter === "ALL" || item.constructionCrew === crewFilter;

      return matchesSearch && matchesCrew;
    });
  }, [crewFilter, items, searchTerm]);

  useEffect(() => {
    const firstId = filteredItems[0]?.id;
    if (!firstId) return;

    const timer = window.setTimeout(() => {
      quantityRefs.current[firstId]?.focus();
      quantityRefs.current[firstId]?.select();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [dateStr, filteredItems]);

  const dateStatus = useMemo(() => {
    if (Object.keys(dirtyEntries).length > 0) return "Đang chỉnh sửa (Chưa lưu)";
    const entered = items.filter((i) => i.quantity !== "" && Number(i.quantity) > 0);
    if (entered.length === 0) return "Chưa nhập";
    return "Đã nhập";
  }, [items, dirtyEntries]);

  const stats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const math = getItemMath(item);
        acc.total += 1;
        if (math.hasTodayQuantity) acc.entered += 1;
        if (!math.hasTodayQuantity) acc.empty += 1;
        if (math.isOver) acc.over += 1;
        return acc;
      },
      { total: 0, entered: 0, empty: 0, over: 0 }
    );
  }, [items]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (Object.keys(dirtyEntries).length > 0) {
      if (!confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn chuyển ngày?")) {
        return;
      }
    }
    router.push(`/projects/${projectId}/field-progress/daily?date=${e.target.value}`);
  };

  const patchItem = (itemId: string, field: string, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item))
    );

    const current = items.find((item) => item.id === itemId);
    setDirtyEntries((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || current),
        [field]: value,
        itemId,
      },
    }));
  };

  const focusNextQuantity = (index: number) => {
    const next = filteredItems[index + 1];
    if (next) {
      quantityRefs.current[next.id]?.focus();
      quantityRefs.current[next.id]?.select();
    }
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      focusNextQuantity(index);
    }
  };

  const handleSave = async () => {
    const invalidItems = items.filter((item) => {
      const math = getItemMath(item);
      return math.hasInvalidNumber || math.isNegative || !math.guard.canSubmit;
    });

    if (invalidItems.length > 0) {
      alert("Có dòng nhập không hợp lệ hoặc thiếu lý do vượt khối lượng. Vui lòng kiểm tra lại cảnh báo màu đỏ.");
      quantityRefs.current[invalidItems[0].id]?.focus();
      return;
    }

    const entriesToSave = items
      .filter((item) => getItemMath(item).hasTodayQuantity || dirtyEntries[item.id])
      .map((item) => ({
        itemId: item.id,
        quantity: parseVietnameseDecimalInput(item.quantity) === null ? "" : String(parseVietnameseDecimalInput(item.quantity)),
        issueNote: item.issueNote,
        proposalNote: item.proposalNote,
        note: item.note,
      }));

    if (entriesToSave.length === 0) {
      return;
    }

    setLoading(true);
    const res = await batchSaveDailyEntries(projectId, templateId, dateStr, entriesToSave, true);
    if (res?.error) {
      alert(res.error);
    } else {
      setDirtyEntries({});
      router.refresh();
    }
    setLoading(false);
  };

  const hasChanges = Object.keys(dirtyEntries).length > 0;

  const renderQuantityInput = (item: DailyItem, index: number, compact = false) => {
    const math = getItemMath(item);

    return (
      <div>
        <input
          ref={(el) => {
            quantityRefs.current[item.id] = el;
          }}
          type="text"
          inputMode="decimal"
          disabled={loading}
          value={item.quantity}
          onChange={(e) => patchItem(item.id, "quantity", e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => handleQuantityKeyDown(e, index)}
          className={`w-full rounded-lg border-2 px-3 text-right font-bold outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${
            compact ? "h-14 text-2xl" : "h-11 text-xl"
          } ${
            math.isNegative || math.hasInvalidNumber
              ? "border-red-500 bg-red-50 text-red-700 focus:ring-red-100"
              : math.isOver
                ? "border-red-400 bg-red-50/50 text-red-700 focus:border-red-500 focus:ring-red-100"
                : math.guard.level === "NEAR_LIMIT"
                  ? "border-amber-400 bg-amber-50/50 text-amber-700 focus:border-amber-500 focus:ring-amber-100"
                  : "border-blue-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-blue-100"
          }`}
          placeholder="0"
        />
        {(math.isNegative || math.hasInvalidNumber || math.guard.level !== "OK") && math.guard.level !== "NEED_DESIGN_QUANTITY" && (
          <div className={`mt-1 flex items-center justify-end gap-1 text-xs font-semibold ${math.guard.level === "NEAR_LIMIT" ? "text-amber-600" : "text-red-600"}`}>
            <AlertCircle className="h-3.5 w-3.5" />
            {math.isNegative || math.hasInvalidNumber ? "Không nhập âm" : math.guard.message}
          </div>
        )}
      </div>
    );
  };

  const renderMobileCard = (item: DailyItem, index: number) => {
    const math = getItemMath(item);
    const isDirty = !!dirtyEntries[item.id];

    return (
      <div
        key={item.id}
        className={`rounded-lg border bg-white p-4 shadow-sm ${
          math.isOver ? "border-red-300 bg-red-50/40" : isDirty ? "border-amber-300" : "border-slate-200"
        }`}
      >
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900">{item.name}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Mũi: {item.constructionCrew ? <span className="text-slate-800">{item.constructionCrew}</span> : <span className="text-slate-400">—</span>}</span>
            {item.parentName && <span className="max-w-full truncate">Hạng mục: {item.parentName}</span>}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
          <div>
            <div className="text-[10px] uppercase text-slate-500">Tổng KL</div>
            <div className="font-semibold text-slate-800">
              {item.designQuantity ? formatQuantity(item.designQuantity) : "-"} {item.unit}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-500">Đã làm</div>
            <div className="font-semibold text-slate-800">{formatQuantity(item.cumulativeBefore)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-500">% sau nhập</div>
            <div className={`font-bold ${math.isOver ? "text-red-600" : math.guard.level === "NEAR_LIMIT" ? "text-amber-600" : "text-slate-800"}`}>
              {math.percent === null ? "-" : `${math.percent.toFixed(2)}%`}
            </div>
          </div>
        </div>

        <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-blue-700">
          KL ngày này ({item.unit || "KL"})
        </label>
        <div className="mt-1">{renderQuantityInput(item, index, true)}</div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="text-[10px] uppercase text-slate-500">Sau nhập</div>
            <div className={`text-lg font-bold ${math.isOver ? "text-red-600" : "text-slate-900"}`}>
              {formatQuantity(math.cumulativeAfter)}
            </div>
          </div>
          <input
            value={item.note}
            onChange={(e) => patchItem(item.id, "note", e.target.value)}
            className="h-full min-w-0 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
            placeholder="Ghi chú nhanh"
          />
        </div>

        <Button
          variant="outline"
          className="mt-3 h-9 w-full justify-center text-sm"
          onClick={() => setActiveDrawerItem(item)}
        >
          <Info className="mr-2 h-4 w-4" /> Chi tiết
        </Button>
      </div>
    );
  };

  const renderQuickAddModal = () => {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl">
          <div className="flex items-start justify-between gap-4 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5">
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-xl flex items-center gap-2">
                <Plus className="h-6 w-6 text-blue-600" />
                Thêm công việc phát sinh
              </h3>
              <p className="mt-1 text-sm text-slate-600">Tạo công việc phát sinh và báo cáo trực tiếp trong ngày</p>
            </div>
            <Button variant="ghost" className="h-9 w-9 p-0 rounded-full hover:bg-slate-200" onClick={() => setShowQuickAdd(false)}>
              <X className="h-5 w-5 text-slate-600" />
            </Button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5 bg-slate-50/50">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-800">
                Nội dung công việc <span className="text-red-600">*</span>
              </span>
              <input
                value={quickAddData.workContent}
                onChange={(e) => setQuickAddData(prev => ({ ...prev, workContent: e.target.value }))}
                className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                placeholder="Ví dụ: Đào móng đoạn Km3+200 đến Km3+500..."
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-800">Thuộc hạng mục chính</span>
              <select
                value={quickAddData.parentId}
                onChange={(e) => setQuickAddData(prev => ({ ...prev, parentId: e.target.value }))}
                className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              >
                <option value="">-- Không thuộc hạng mục nào --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.categoryName || g.workContent || "Hạng mục không tên"}
                  </option>
                ))}
                <option value="NEW_GROUP">+ Tạo hạng mục chính mới...</option>
              </select>
            </label>

            {quickAddData.parentId === "NEW_GROUP" && (
              <label className="block rounded-xl bg-blue-50 border-2 border-blue-200 p-4">
                <span className="mb-2 block text-sm font-bold text-blue-800">
                  Tên hạng mục chính mới <span className="text-red-600">*</span>
                </span>
                <input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full rounded-xl border-2 border-blue-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Ví dụ: Phần cống hộp đường Nguyễn Trãi..."
                  required
                />
              </label>
            )}

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-800">Mũi thi công</span>
                <input
                  value={quickAddData.constructionCrew}
                  onChange={(e) => setQuickAddData(prev => ({ ...prev, constructionCrew: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Mũi 1, Tổ 2..."
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-800">Đơn vị</span>
                <input
                  value={quickAddData.unit}
                  onChange={(e) => setQuickAddData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="m, m3, tấn..."
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-800">Tổng khối lượng thiết kế</span>
              <input
                type="text"
                inputMode="decimal"
                value={quickAddData.designQuantity}
                onChange={(e) => setQuickAddData(prev => ({ ...prev, designQuantity: e.target.value }))}
                className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                placeholder="0.00"
              />
            </label>
          </div>

          <div className="flex gap-3 border-t-2 border-slate-200 p-4 bg-gradient-to-r from-white to-slate-50">
            <Button 
              variant="outline" 
              className="flex-1 h-11 border-2 border-slate-300 hover:bg-slate-100 font-semibold text-slate-700" 
              onClick={() => setShowQuickAdd(false)} 
              disabled={loading}
            >
              Hủy
            </Button>
            <Button 
              className="flex-1 h-11 bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-md shadow-blue-200" 
              onClick={handleQuickAdd} 
              disabled={loading}
            >
              <Plus className="mr-2 h-5 w-5" /> Lưu công việc
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1 flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Nhập khối lượng theo ngày</h2>
                <p className="text-sm text-slate-500">Công trình: {projectLabel}</p>
              </div>
              <Button
                onClick={() => setShowQuickAdd(true)}
                className="mt-2 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 self-start sm:self-center font-semibold shadow-sm"
              >
                <Plus className="h-4 w-4" /> Thêm công việc phát sinh
              </Button>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <label className="block max-w-xs">
              <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600">
                <Calendar className="h-3.5 w-3.5" /> Ngày nhập
              </span>
              <input
                type="date"
                value={dateStr}
                onChange={handleDateChange}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-bold text-blue-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <ClipboardList className="mx-auto mb-4 h-16 w-16 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-800">Chưa có công việc để nhập khối lượng</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Bạn cần tạo bảng mẫu trước, sau đó mới nhập khối lượng theo ngày.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href={`/projects/${projectId}/field-progress`}>
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                Đi tới bảng mẫu
              </Button>
            </Link>
            <Button
              onClick={() => setShowQuickAdd(true)}
              className="bg-blue-600 text-white hover:bg-blue-700 font-bold"
            >
              <Plus className="mr-2 h-4 w-4" /> Thêm công việc phát sinh
            </Button>
          </div>
        </div>

        {showQuickAdd && renderQuickAddModal()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1 flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">Nhập khối lượng theo ngày</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                  dateStatus === 'Đã nhập' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  dateStatus.includes('Chưa lưu') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {dateStatus}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">Công trình: {projectLabel}</p>
            </div>
            <Button
              onClick={() => setShowQuickAdd(true)}
              className="mt-2 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 self-start sm:self-center font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4" /> Thêm công việc phát sinh
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t-2 border-slate-100 pt-5 lg:flex-row lg:items-end lg:justify-between">

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[200px_300px_220px]">
            <label className="block">
              <span className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Calendar className="h-4 w-4 text-blue-600" /> Ngày báo cáo
              </span>
              <input
                type="date"
                value={dateStr}
                onChange={handleDateChange}
                className="h-11 w-full rounded-lg border-2 border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Search className="h-4 w-4 text-blue-600" /> Tìm công việc
              </span>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full rounded-lg border-2 border-slate-300 bg-white px-4 text-sm text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                placeholder="Tên công việc, hạng mục, mũi..."
              />
            </label>

            {crews.length > 0 && (
              <label className="block">
                <span className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                  <SlidersHorizontal className="h-4 w-4 text-blue-600" /> Mũi thi công
                </span>
                <select
                  value={crewFilter}
                  onChange={(e) => setCrewFilter(e.target.value)}
                  className="h-11 w-full rounded-lg border-2 border-slate-300 bg-white px-4 text-sm text-slate-900 font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                >
                  <option value="ALL">Tất cả mũi</option>
                  {crews.map((crew) => (
                    <option key={crew} value={crew}>
                      {crew}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t-2 border-slate-100 pt-5 lg:flex-row lg:items-center lg:justify-end">

          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 border-2 border-slate-200 px-3 py-2.5">
              <div className="text-slate-500 font-medium">Tổng công việc</div>
              <div className="text-base font-bold text-slate-900">{stats.total}</div>
            </div>
            <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2.5">
              <div className="text-green-700 font-medium">Đã nhập ngày này</div>
              <div className="text-base font-bold text-green-800">{stats.entered}</div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
              <div className="text-amber-700 font-medium">Chưa nhập</div>
              <div className="text-base font-bold text-amber-800">{stats.empty}</div>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
              <div className="text-red-700 font-medium">Vượt KL</div>
              <div className="text-base font-bold text-red-700">{stats.over}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <table className="w-full text-left text-sm whitespace-nowrap min-w-[1200px]">
          <thead className="border-b-2 border-slate-200 bg-slate-50">
            <tr>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.stt} sticky left-0 z-20 text-center`}>STT</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.content} sticky left-[56px] z-20 text-left`}>Công việc</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.crew} text-center`}>Mũi</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.unit} text-center`}>Đơn vị</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.designQty} text-right`}>Tổng KL</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.cumulative} text-right`}>Đã làm</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.dayQty} border-x border-blue-200 bg-blue-50 text-center text-blue-700`}>KL ngày này</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.remaining} text-right`}>Sau nhập</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.percent} text-right`}>%</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.notes} text-left`}>Ghi chú nhanh</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.action} text-center`}>Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item, index) => {
              const math = getItemMath(item);
              const isDirty = !!dirtyEntries[item.id];

              return (
                <tr
                  key={item.id}
                  className={`transition ${sharedTableStyles.workRow} ${math.isOver ? "bg-red-50/40 border-red-200" : isDirty ? "bg-amber-50/30" : ""}`}
                >
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.stt} sticky left-0 z-10 text-center text-slate-400 ${math.isOver ? 'bg-red-50/50' : isDirty ? 'bg-amber-50/30' : 'bg-white'}`}>
                    {index + 1}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.content} sticky left-[56px] z-10 ${math.isOver ? 'bg-red-50/50' : isDirty ? 'bg-amber-50/30' : 'bg-white'}`}>
                    {item.parentName && <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 truncate">{item.parentName}</div>}
                    <div className="font-semibold text-slate-800 truncate" title={item.name}>{item.name}</div>
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.crew}`}>
                    {item.constructionCrew ? <span className="text-slate-800 truncate block w-full" title={item.constructionCrew}>{item.constructionCrew}</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.unit}`}>
                    {item.unit ? <span className="text-slate-800">{item.unit}</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.designQty} font-semibold text-slate-700`}>
                    {item.designQuantity ? formatQuantity(item.designQuantity) : "-"}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.cumulative} text-slate-600`}>
                    {formatQuantity(item.cumulativeBefore)}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.dayQty} bg-blue-50/50 p-2`}>
                    {renderQuantityInput(item, index)}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.remaining} font-bold ${math.isOver ? "text-red-600" : "text-blue-800"}`}>
                    {formatQuantity(math.cumulativeAfter)}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.percent} relative`}>
                    <div className={`font-bold flex flex-col items-end gap-0.5 ${math.isOver ? "text-red-600" : math.guard.level === "NEAR_LIMIT" ? "text-amber-600" : "text-slate-800"}`}>
                      <span>{math.percent === null ? "-" : `${math.percent.toFixed(2)}%`}</span>
                      {math.percent !== null && (
                        <span className="text-[10px] font-medium text-slate-500">
                          còn {formatQuantity(math.guard.remaining)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.notes} p-2`}>
                    <input
                      value={item.note}
                      onChange={(e) => patchItem(item.id, "note", e.target.value)}
                      className="h-9 w-full min-w-[120px] rounded-md border border-slate-200 px-3 text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                      placeholder="Ghi chú nhanh..."
                    />
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.action}`}>
                    <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 mx-auto block" onClick={() => setActiveDrawerItem(item)}>
                      <Info className="h-4 w-4 mx-auto" />
                    </Button>
                  </td>
                </tr>
              );
            })}

            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  Không có công việc phù hợp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 pb-28 lg:hidden">
        {filteredItems.map((item, index) => renderMobileCard(item, index))}
        {filteredItems.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
            <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            Không có công việc phù hợp bộ lọc.
          </div>
        )}
      </div>

      <div className="hidden flex-col items-end gap-2 lg:flex">
        <div className="flex items-center justify-end gap-3">
          <Button
            onClick={() => handleSave()}
            disabled={!hasChanges || loading}
            className={`h-11 px-5 border border-transparent font-semibold shadow-sm ${hasChanges ? "bg-blue-600 text-white hover:bg-blue-700" : "cursor-not-allowed bg-slate-100 text-slate-400"}`}
            title={!hasChanges ? "Không có thay đổi để lưu" : "Lưu khối lượng vào lũy kế chính thức"}
          >
            <Save className="mr-2 h-4 w-4" /> {loading ? "Đang lưu..." : "Lưu khối lượng"} {!loading && hasChanges && `(${Object.keys(dirtyEntries).length})`}
          </Button>
        </div>
        {(!hasChanges || loading) && (
          <p className="text-xs text-slate-500">
            {!hasChanges ? "Nút lưu chỉ bật khi có thay đổi." : "Đang xử lý dữ liệu ngày này."}
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t-2 border-slate-200 bg-white p-4 shadow-[0_-4px_12px_rgba(15,23,42,0.12)] lg:hidden">
        <Button
          onClick={() => handleSave()}
          disabled={!hasChanges || loading}
          className={`h-12 flex-1 border border-transparent font-semibold shadow-sm ${hasChanges ? "bg-blue-600 text-white hover:bg-blue-700" : "cursor-not-allowed bg-slate-100 text-slate-400"}`}
          title={!hasChanges ? "Không có thay đổi để lưu" : "Lưu khối lượng vào lũy kế chính thức"}
        >
          <Save className="mr-2 h-4 w-4" /> {loading ? "Đang lưu..." : "Lưu khối lượng"} {!loading && hasChanges && `(${Object.keys(dirtyEntries).length})`}
        </Button>
      </div>

      {activeDrawerItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5">
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-xl">Chi tiết công việc trong ngày</h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-slate-600 font-medium leading-relaxed">
                  {activeDrawerItem.name}
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                  <Calendar className="h-3.5 w-3.5" />
                  Ngày: {dateStr.split("-").reverse().join("/")}
                </div>
              </div>
              <Button variant="ghost" className="h-9 w-9 p-0 rounded-full hover:bg-slate-200" onClick={() => setActiveDrawerItem(null)}>
                <X className="h-5 w-5 text-slate-600" />
              </Button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5 bg-slate-50/50">
              {activeDrawerItem.materials && activeDrawerItem.materials.length > 0 && (
                <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-base font-bold text-orange-800">
                    <Package className="h-5 w-5" /> Vật tư đề xuất
                  </div>
                  <div className="space-y-2">
                    {activeDrawerItem.materials.map((request: any) => (
                      <div key={request.id} className="rounded-lg bg-white border border-orange-100 p-3 text-sm text-slate-700 shadow-sm">
                        <div className="font-semibold text-slate-900">{request.note || "Phiếu đề xuất vật tư"}</div>
                        {request.items?.map((material: any) => (
                          <div key={material.id} className="mt-1.5 text-xs text-slate-600">
                            • {material.materialName}: <span className="font-bold">{formatQuantity(material.requestedQuantity)} {material.unit}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">1</span>
                  Diễn biến công việc trong ngày
                </span>
                <textarea
                  value={activeDrawerItem.note}
                  onChange={(e) => {
                    patchItem(activeDrawerItem.id, "note", e.target.value);
                    setActiveDrawerItem({ ...activeDrawerItem, note: e.target.value });
                  }}
                  className="min-h-[100px] w-full rounded-xl border-2 border-slate-300 bg-white p-4 text-sm text-slate-900 leading-relaxed focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Ví dụ: Đã hoàn thành đoạn từ Km... đến Km..., còn vướng mặt bằng..."
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">2</span>
                  Khó khăn / Vướng mắc
                </span>
                <textarea
                  value={activeDrawerItem.issueNote}
                  onChange={(e) => {
                    patchItem(activeDrawerItem.id, "issueNote", e.target.value);
                    setActiveDrawerItem({ ...activeDrawerItem, issueNote: e.target.value });
                  }}
                  className="min-h-[100px] w-full rounded-xl border-2 border-slate-300 bg-white p-4 text-sm text-slate-900 leading-relaxed focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all"
                  placeholder="Ví dụ: Vướng mặt bằng đoạn Km3+200, thiếu nhân công, thời tiết xấu..."
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">3</span>
                  Đề xuất / Kiến nghị
                </span>
                <textarea
                  value={activeDrawerItem.proposalNote}
                  onChange={(e) => {
                    patchItem(activeDrawerItem.id, "proposalNote", e.target.value);
                    setActiveDrawerItem({ ...activeDrawerItem, proposalNote: e.target.value });
                  }}
                  className="min-h-[100px] w-full rounded-xl border-2 border-slate-300 bg-white p-4 text-sm text-slate-900 leading-relaxed focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                  placeholder="Ví dụ: Cần bổ sung nhân công/máy móc/vật tư, đề nghị xử lý mặt bằng..."
                />
              </label>
            </div>

            <div className="flex gap-3 border-t-2 border-slate-200 p-4 bg-gradient-to-r from-white to-slate-50">
              <Button 
                variant="outline" 
                className="flex-1 h-11 border-2 border-slate-300 hover:bg-slate-100 font-semibold text-slate-700" 
                onClick={() => setActiveDrawerItem(null)}
              >
                Đóng
              </Button>
              <Button 
                className="flex-1 h-11 bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-md shadow-blue-200" 
                onClick={() => setActiveDrawerItem(null)}
              >
                <CheckCircle2 className="mr-2 h-5 w-5" /> Xong
              </Button>
            </div>
          </div>
        </div>
      )}
      {showQuickAdd && renderQuickAddModal()}
    </div>
  );
}
