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
  ChevronDown,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { batchSaveDailyEntries } from "@/app/(dashboard)/projects/[id]/field-progress/daily/actions";
import { createItem } from "@/app/(dashboard)/projects/[id]/field-progress/actions";
import { formatQuantity } from "@/lib/field-progress";
import { StatusBadge } from "@/components/ui/status-badge";
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
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>(parentGroups || []);
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

function parseVietnameseDecimalInput(raw: string | number | null | undefined): number | null {
  if (raw === "" || raw === null || raw === undefined) return null;
  const strValue = String(raw);
  const value = strValue.trim().replace(",", ".");
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
      
      let matchesStatus = true;
      if (statusFilter === "EMPTY") matchesStatus = !math.hasTodayQuantity;
      if (statusFilter === "ENTERED") matchesStatus = math.hasTodayQuantity;
      if (statusFilter === "OVER") matchesStatus = math.isOver;

      return matchesSearch && matchesStatus;
    });
  }, [statusFilter, items, searchTerm]);

  const groupedItems = useMemo(() => {
    const map: Record<string, DailyItem[]> = {};
    filteredItems.forEach(item => {
      const pName = item.parentName || "Khác";
      if (!map[pName]) map[pName] = [];
      map[pName].push(item);
    });
    return Object.entries(map).sort((a,b) => a[0].localeCompare(b[0])).map(([gName, gItems]) => {
      gItems.sort((a, b) => {
        const ma = getItemMath(a);
        const mb = getItemMath(b);
        const scoreA = ma.isOver ? 0 : !ma.hasTodayQuantity ? 1 : 2;
        const scoreB = mb.isOver ? 0 : !mb.hasTodayQuantity ? 1 : 2;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return 0;
      });
      return [gName, gItems] as [string, DailyItem[]];
    });
  }, [filteredItems]);

  useEffect(() => {
    if (Object.keys(expandedGroups).length === 0 && groupedItems.length > 0) {
      const firstGroupToExpand = groupedItems.find(([_, gItems]) => gItems.some(i => !getItemMath(i).hasTodayQuantity));
      if (firstGroupToExpand) {
        setExpandedGroups({ [firstGroupToExpand[0]]: true });
      } else if (groupedItems[0]) {
        setExpandedGroups({ [groupedItems[0][0]]: true });
      }
    }
  }, [groupedItems, expandedGroups]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

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
    const flatGrouped = groupedItems.flatMap(([_, items]) => items);
    const currentIndex = flatGrouped.findIndex(i => i.id === filteredItems[index]?.id);
    const next = flatGrouped[currentIndex + 1] || filteredItems[index + 1];
    if (next) {
      quantityRefs.current[next.id]?.focus();
      quantityRefs.current[next.id]?.select();
    }
  };

  const focusNextEmpty = () => {
    let targetId: string | null = null;
    for (const [gName, gItems] of groupedItems) {
      const emptyItem = gItems.find(i => !getItemMath(i).hasTodayQuantity);
      if (emptyItem) {
        targetId = emptyItem.id;
        if (!expandedGroups[gName]) {
          setExpandedGroups(prev => ({ ...prev, [gName]: true }));
        }
        break;
      }
    }
    
    if (targetId) {
      setTimeout(() => {
        const input = quantityRefs.current[targetId as string];
        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      alert("Tuyệt vời! Đã nhập hết các công việc.");
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
    const idSuffix = compact ? "-mobile" : "-desktop";

    return (
      <div>
        <label htmlFor={`daily-quantity-${item.id}${idSuffix}`} className="sr-only">Khối lượng ngày {dateStr}</label>
        <input
          id={`daily-quantity-${item.id}${idSuffix}`}
          name={`daily-quantity-${item.id}${idSuffix}`}
          ref={(el) => {
            if (!compact) {
              quantityRefs.current[item.id] = el;
            }
          }}
          type="text"
          inputMode="decimal"
          value={item.quantity}
          onChange={(e) => patchItem(item.id, "quantity", e.target.value)}
          onFocus={(e) => {
            setFocusedItemId(item.id);
            e.target.select();
          }}
          onBlur={() => setFocusedItemId(null)}
          onKeyDown={(e) => handleQuantityKeyDown(e, index)}
          disabled={loading}
          className={`w-full rounded border-2 px-2 text-right font-bold outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${
            compact ? "h-10 text-base" : "h-11 text-xl"
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
          <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] font-semibold ${math.guard.level === "NEAR_LIMIT" ? "text-amber-600" : "text-red-600"}`}>
            <AlertCircle className="h-3 w-3" />
            {math.isNegative || math.hasInvalidNumber ? "Không nhập âm" : math.guard.message}
          </div>
        )}
      </div>
    );
  };

  const renderMobileRow = (item: DailyItem, index: number) => {
    const math = getItemMath(item);
    const isDirty = !!dirtyEntries[item.id];
    const isFocused = focusedItemId === item.id;

    return (
      <div
        key={item.id}
        className={`border-b last:border-0 bg-white p-3 transition-all duration-150 ease-out active:scale-[0.99] active:bg-blue-50/50 ${
          isFocused ? "bg-blue-50/50 ring-inset ring-2 ring-blue-400 relative z-10" : math.isOver ? "bg-red-50/40" : isDirty ? "bg-amber-50/20" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">{item.name}</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{item.constructionCrew || "—"}</span>
              <span className="text-slate-400">•</span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{item.unit || "—"}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
              <span>Thiết kế: <span className="font-semibold text-slate-700">{item.designQuantity ? formatQuantity(item.designQuantity) : "-"}</span></span>
              <span className="text-slate-300">|</span>
              <span>Đã làm: <span className="font-semibold text-slate-700">{formatQuantity(item.cumulativeBefore)}</span></span>
            </div>
          </div>
          <Button
            variant="ghost"
            aria-label={`Xem chi tiết ${item.name}`}
            className="h-10 w-10 p-0 shrink-0 text-slate-500 hover:text-blue-600 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100"
            onClick={() => setActiveDrawerItem(item)}
          >
            <Info className="h-5 w-5" />
          </Button>
        </div>

        {math.isOver && (
          <div className="mt-3 w-full rounded-lg bg-red-50 border border-red-200 p-2.5 text-left">
            <div className="text-xs font-bold text-red-600 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> Vượt khối lượng thiết kế</div>
            <div className="text-[11px] font-medium text-red-600 mt-1 flex items-center justify-between">
              <span>Sau nhập: {formatQuantity(math.cumulativeAfter)} / Thiết kế: {item.designQuantity ? formatQuantity(item.designQuantity) : "-"}</span>
            </div>
            <div className="text-[10px] font-semibold text-red-500 mt-0.5">Cần ghi chú giải trình</div>
          </div>
        )}

        <div className={`mt-3 flex items-center justify-between gap-3 bg-slate-50 border rounded-lg p-2 ${math.isOver ? "border-red-300" : "border-slate-100"}`}>
          {!math.isOver && (
            <div className="flex-1 min-w-0">
              {math.hasTodayQuantity ? (
                <div className="text-xs font-bold text-emerald-600">
                  Đã nhập: {formatQuantity(math.cumulativeAfter)}
                  <div className="text-[10px] font-medium text-emerald-500 mt-0.5">
                    Tỷ lệ sau nhập: {math.percent === null ? "-" : `${math.percent.toFixed(1)}%`}
                  </div>
                </div>
              ) : (
                <div className="text-xs font-semibold text-slate-500">Chưa nhập</div>
              )}
            </div>
          )}
          <div className={`shrink-0 w-[120px] ${math.isOver ? "ml-auto" : ""}`}>
            {renderQuantityInput(item, index, true)}
          </div>
        </div>
      </div>
    );
  };

  const renderMobileGroup = (groupName: string, groupItems: DailyItem[]) => {
    const isExpanded = !!expandedGroups[groupName];
    const total = groupItems.length;
    let entered = 0;
    let over = 0;
    groupItems.forEach(i => {
      const math = getItemMath(i);
      if (math.hasTodayQuantity) entered++;
      if (math.isOver) over++;
    });
    const empty = total - entered;

    return (
      <div key={groupName} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-3">
        <button
          onClick={() => toggleGroup(groupName)}
          className={`flex w-full items-center justify-between p-3 transition-all active:bg-blue-50/80 active:scale-[0.99] ${
            isExpanded ? "bg-slate-50 border-b border-slate-200" : "bg-white"
          }`}
        >
          <div className="flex-1 text-left min-w-0 pr-2">
            <h3 className="line-clamp-2 text-sm font-bold text-slate-900">{groupName}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
              <span className="text-slate-500">{total} công việc</span>
              {entered > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-600">{entered} đã nhập</span>
                </>
              )}
              {empty > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-amber-600">{empty} chưa nhập</span>
                </>
              )}
              {over > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <StatusBadge variant="danger" size="sm" className="rounded-full px-1.5 text-[11px]">{over} vượt thiết kế</StatusBadge>
                </>
              )}
            </div>
          </div>
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </div>
        </button>

        {isExpanded && (
          <div className="flex flex-col">
            {groupItems.map((item, index) => renderMobileRow(item, index))}
          </div>
        )}
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
                id="quickAdd-workContent"
                name="quickAdd-workContent"
                value={quickAddData.workContent}
                onChange={(e) => setQuickAddData(prev => ({ ...prev, workContent: e.target.value }))}
                className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                placeholder="Ví dụ: Đào móng đoạn Km3+200 đến Km3+500..."
                required
              />
            </label>

            <label className="block" htmlFor="quickAdd-parentId">
              <span className="mb-2 block text-sm font-bold text-slate-800">Thuộc hạng mục chính</span>
              <select
                id="quickAdd-parentId"
                name="quickAdd-parentId"
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
              <label className="block rounded-xl bg-blue-50 border-2 border-blue-200 p-4" htmlFor="quickAdd-newGroupName">
                <span className="mb-2 block text-sm font-bold text-blue-800">
                  Tên hạng mục chính mới <span className="text-red-600">*</span>
                </span>
                <input
                  id="quickAdd-newGroupName"
                  name="quickAdd-newGroupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full rounded-xl border-2 border-blue-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Ví dụ: Phần cống hộp đường Nguyễn Trãi..."
                  required
                />
              </label>
            )}

            <div className="grid grid-cols-2 gap-4">
              <label className="block" htmlFor="quickAdd-constructionCrew">
                <span className="mb-2 block text-sm font-bold text-slate-800">Mũi thi công</span>
                <input
                  id="quickAdd-constructionCrew"
                  name="quickAdd-constructionCrew"
                  value={quickAddData.constructionCrew}
                  onChange={(e) => setQuickAddData(prev => ({ ...prev, constructionCrew: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Mũi 1, Tổ 2..."
                />
              </label>

              <label className="block" htmlFor="quickAdd-unit">
                <span className="mb-2 block text-sm font-bold text-slate-800">Đơn vị</span>
                <input
                  id="quickAdd-unit"
                  name="quickAdd-unit"
                  value={quickAddData.unit}
                  onChange={(e) => setQuickAddData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  placeholder="m, m3, tấn..."
                />
              </label>
            </div>

            <label className="block" htmlFor="quickAdd-designQuantity">
              <span className="mb-2 block text-sm font-bold text-slate-800">Tổng khối lượng thiết kế</span>
              <input
                id="quickAdd-designQuantity"
                name="quickAdd-designQuantity"
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
            <label className="block max-w-xs" htmlFor="daily-dateStr1">
              <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600">
                <Calendar className="h-3.5 w-3.5" /> Ngày nhập
              </span>
              <input
                id="daily-dateStr1"
                name="daily-dateStr1"
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
      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1 flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
            <div>
              <div className="flex items-center gap-2 sm:gap-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 hidden sm:block">Danh sách công việc</h2>
                <StatusBadge variant={
                  dateStatus === 'Đã nhập' ? 'success' :
                  dateStatus.includes('Chưa lưu') ? 'warning' :
                  'neutral'
                } className="rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs border">
                  {dateStatus}
                </StatusBadge>
              </div>
            </div>
            <Button
              onClick={() => setShowQuickAdd(true)}
              variant="outline"
              className="mt-1 sm:mt-0 text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 flex items-center gap-1.5 self-start sm:self-center font-semibold shadow-sm h-8 px-3 text-xs transition-all"
            >
              <Plus className="h-3.5 w-3.5" /> <span className="sm:hidden">Thêm phát sinh</span><span className="hidden sm:inline">Thêm công việc phát sinh</span>
            </Button>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-2 lg:flex-row lg:items-end lg:justify-between">

          <div className="grid gap-2 grid-cols-2 lg:grid-cols-[140px_220px]">
            <label className="block" htmlFor="daily-dateStr2">
              <span className="mb-1 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-700">
                <Calendar className="h-3 w-3 text-blue-600" /> Ngày nhập
              </span>
              <input
                id="daily-dateStr2"
                name="daily-dateStr2"
                type="date"
                value={dateStr}
                onChange={handleDateChange}
                className="h-8 sm:h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all outline-none"
              />
            </label>

            <label className="block col-span-2 sm:col-span-1" htmlFor="daily-searchTerm">
              <span className="mb-1 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-700">
                <Search className="h-3 w-3 text-blue-600" /> Tìm kiếm
              </span>
              <input
                id="daily-searchTerm"
                name="daily-searchTerm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 sm:h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all outline-none"
                placeholder="Tên, hạng mục, mũi thi công..."
              />
            </label>

          </div>

          <div className="flex flex-wrap items-center gap-2 pb-1 mt-1 sm:hidden">
            {[
              { id: "ALL", label: "Tất cả" },
              { id: "EMPTY", label: "Chưa nhập" },
              { id: "ENTERED", label: "Đã nhập" },
              { id: "OVER", label: "Vượt khối lượng" }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-[0.97] ${
                  statusFilter === f.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
          
          <div className="hidden sm:flex items-center gap-2 mr-auto">
            {[
              { id: "ALL", label: "Tất cả" },
              { id: "EMPTY", label: "Chưa nhập" },
              { id: "ENTERED", label: "Đã nhập" },
              { id: "OVER", label: "Vượt khối lượng" }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.97] ${
                  statusFilter === f.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block overflow-x-auto overflow-y-hidden max-w-full">
        <table className="w-full text-left text-sm whitespace-nowrap min-w-max border-collapse">
          <thead className="border-b-2 border-slate-200 bg-slate-50">
            <tr>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.dailyCols.stt} bg-slate-100 border-r-slate-200`}>STT</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.dailyCols.content} bg-slate-100 border-r-slate-200`}>Công việc</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.dailyCols.crew}`}>Mũi</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.dailyCols.unit}`}>Đơn vị</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.dailyCols.designQty}`}>Tổng khối lượng</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.dailyCols.cumulative}`}>Đã thực hiện</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.dailyCols.dayQty} bg-blue-100 text-blue-800`}>Khối lượng ngày này</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.dailyCols.remaining}`}>Sau nhập</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.dailyCols.percent}`}>Tỷ lệ</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.dailyCols.notes}`}>Ghi chú nhanh</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.dailyCols.action} bg-slate-100 border-l border-slate-200`}>Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item, index) => {
              const math = getItemMath(item);
              const isDirty = !!dirtyEntries[item.id];

              return (
                <tr
                  key={item.id}
                  className={`transition ${sharedTableStyles.workRow} ${math.isOver ? "bg-red-50/60" : isDirty ? "bg-amber-50/40" : ""}`}
                >
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.dailyCols.stt} bg-white border-r-slate-100 ${math.isOver ? '!bg-red-50/60' : isDirty ? '!bg-amber-50/40' : ''}`}>
                    {index + 1}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.dailyCols.content} bg-white ${math.isOver ? '!bg-red-50/60' : isDirty ? '!bg-amber-50/40' : ''}`}>
                    {item.parentName && <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 truncate w-full">{item.parentName}</div>}
                    <div className="font-semibold text-slate-800 truncate w-full" title={item.name}>{item.name}</div>
                    {math.isOver && (
                      <div className="mt-1 text-xs font-bold text-red-600 flex items-center gap-1.5 whitespace-nowrap">
                        <AlertCircle className="h-3.5 w-3.5" /> Vượt khối lượng thiết kế. <span className="font-medium">Cần ghi chú giải trình.</span>
                      </div>
                    )}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.dailyCols.crew}`}>
                    {item.constructionCrew ? <span className="text-slate-800 truncate block w-full" title={item.constructionCrew}>{item.constructionCrew}</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.dailyCols.unit}`}>
                    {item.unit ? <span className="text-slate-800">{item.unit}</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.dailyCols.designQty} font-semibold text-slate-700`}>
                    {item.designQuantity ? formatQuantity(item.designQuantity) : "-"}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.dailyCols.cumulative} text-slate-600`}>
                    {formatQuantity(item.cumulativeBefore)}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.dailyCols.dayQty} bg-blue-50/30 p-2 border-l border-r border-blue-100 ${math.isOver ? "bg-red-50/50 border-red-200" : ""}`}>
                    {renderQuantityInput(item, index)}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.dailyCols.remaining} font-bold ${math.isOver ? "text-red-600" : "text-blue-800"}`}>
                    {formatQuantity(math.cumulativeAfter)}
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.dailyCols.percent} relative`}>
                    <div className={`font-bold flex flex-col items-end gap-0.5 ${math.isOver ? "text-red-600" : math.guard.level === "NEAR_LIMIT" ? "text-amber-600" : "text-slate-800"}`}>
                      <span>{math.percent === null ? "-" : `${math.percent.toFixed(1)}%`}</span>
                    </div>
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.dailyCols.notes} p-2`}>
                    <label htmlFor={`daily-note-${item.id}`} className="sr-only">Ghi chú nhanh cho {item.name}</label>
                    <input
                      id={`daily-note-${item.id}`}
                      name={`daily-note-${item.id}`}
                      value={item.note}
                      onChange={(e) => patchItem(item.id, "note", e.target.value)}
                      className="h-9 w-full min-w-[120px] rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      placeholder="Ghi chú nhanh..."
                    />
                  </td>
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.dailyCols.action} bg-white border-l border-slate-100 ${math.isOver ? '!bg-red-50/60' : isDirty ? '!bg-amber-50/40' : ''}`}>
                    <Button variant="ghost" aria-label={`Xem chi tiết ${item.name}`} className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 mx-auto block hover:bg-slate-100 rounded-full" onClick={() => setActiveDrawerItem(item)}>
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

      <div className="flex flex-col pb-24 lg:hidden">
        {groupedItems.map(([groupName, groupItems]) => renderMobileGroup(groupName, groupItems))}
        {groupedItems.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
            <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            Không có công việc phù hợp bộ lọc.
          </div>
        )}
      </div>



      <div className={`fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-slate-200 bg-white p-3 sm:p-4 shadow-[0_-8px_16px_rgba(15,23,42,0.08)] lg:hidden transition-transform duration-300 ease-out ${hasChanges ? "translate-y-0" : "translate-y-full"}`}>
        <Button
          onClick={() => handleSave()}
          disabled={!hasChanges || loading}
          className="h-12 flex-1 bg-blue-600 text-white font-bold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all rounded-xl"
        >
          <Save className="mr-2 h-4.5 w-4.5" /> {loading ? "Đang lưu..." : hasChanges ? `Lưu ${Object.keys(dirtyEntries).length} thay đổi` : "Lưu khối lượng"}
        </Button>
      </div>

      <div className="fixed bottom-[88px] right-4 z-20 lg:hidden">
        {stats.empty > 0 && (
          <Button
            onClick={focusNextEmpty}
            className="h-11 w-11 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center p-0"
            title="Tiếp theo"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Sticky Save Bar Desktop */}
      <div className="hidden lg:block fixed bottom-6 right-8 z-40 transition-transform duration-300 ease-out">
        <Button
          onClick={() => handleSave()}
          disabled={!hasChanges || loading}
          className={`h-12 px-6 font-bold shadow-xl rounded-xl border-2 transition-all ${
            hasChanges 
              ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-[0_8px_16px_rgba(37,99,235,0.2)]" 
              : "bg-white text-slate-400 border-slate-200 cursor-not-allowed hidden"
          }`}
        >
          <Save className="mr-2 h-4.5 w-4.5" /> 
          {loading ? "Đang lưu..." : hasChanges ? `Lưu ${Object.keys(dirtyEntries).length} thay đổi` : "Lưu khối lượng"}
        </Button>
      </div>

      {activeDrawerItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5">
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-xl">Chi tiết công việc trong ngày</h3>
                <p className="mt-1.5 text-sm text-slate-600 font-medium leading-relaxed">
                  {activeDrawerItem.name}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  <span className="bg-slate-100 px-2 py-1 rounded">Mũi: {activeDrawerItem.constructionCrew || "—"}</span>
                  <span className="bg-slate-100 px-2 py-1 rounded">Đơn vị: {activeDrawerItem.unit || "—"}</span>
                </div>
              </div>
              <Button variant="ghost" className="h-9 w-9 p-0 rounded-full hover:bg-slate-200" onClick={() => setActiveDrawerItem(null)}>
                <X className="h-5 w-5 text-slate-600" />
              </Button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5 bg-slate-50/50">
              {(() => {
                const math = getItemMath(activeDrawerItem);
                return (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div>
                      <div className="text-xs uppercase text-slate-500 mb-1">Tổng thiết kế</div>
                      <div className="font-bold text-slate-800">{activeDrawerItem.designQuantity ? formatQuantity(activeDrawerItem.designQuantity) : "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-slate-500 mb-1">Đã thực hiện</div>
                      <div className="font-bold text-slate-800">{formatQuantity(activeDrawerItem.cumulativeBefore)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-slate-500 mb-1">Khối lượng sau nhập</div>
                      <div className={`font-bold ${math.isOver ? "text-red-600" : "text-blue-700"}`}>
                        {formatQuantity(math.cumulativeAfter)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-slate-500 mb-1">Tỷ lệ sau nhập</div>
                      <div className={`font-bold ${math.isOver ? "text-red-600" : math.guard.level === "NEAR_LIMIT" ? "text-amber-600" : "text-blue-700"}`}>
                        {math.percent === null ? "-" : `${math.percent.toFixed(2)}%`}
                      </div>
                    </div>
                    
                    {math.isOver && (
                      <div className="col-span-2 sm:col-span-4 mt-2 p-2 rounded bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4" /> Vượt khối lượng thiết kế. Vui lòng ghi chú giải trình.
                      </div>
                    )}
                  </div>
                );
              })()}

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
