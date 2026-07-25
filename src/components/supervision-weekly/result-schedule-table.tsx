"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { AutoTextarea, SourceSelector, InspectionWorkSelector } from "./source-selector";
import { formatSupervisionProjectAndWorkItem } from "@/lib/supervision-weekly/source-formatter";
import { RowActionMenu } from "./row-action-menu";
import type { WeeklyDocumentType, WeeklyEntry, WeeklyProject, WeeklyShift, WeeklyShiftSelection } from "@/lib/supervision-weekly/editor-types";

const shifts: WeeklyShift[] = ["MORNING", "AFTERNOON", "EVENING"];
const shiftLabels: Record<WeeklyShift, string> = { MORNING: "Sáng", AFTERNOON: "Chiều", EVENING: "Tối" };

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function editorDateLabel(value: string) {
  const text = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T00:00:00`));
  return text.charAt(0).toLocaleUpperCase("vi-VN") + text.slice(1);
}

function emptyEntry(documentType: WeeklyDocumentType, entryDate: string, shift: WeeklyShift, sortOrder: number): WeeklyEntry {
  return {
    id: undefined, clientKey: crypto.randomUUID(),
    documentType, entryDate, shift, sortOrder, inputMode: "MANUAL_TEXT",
    projectId: null, projectNameSnapshot: null, locationId: null, locationNameSnapshot: null,
    workItemId: null, workItemNameSnapshot: null, manualText: null, manualLocation: null,
    manualProjectName: null, manualWorkItemName: null, categoryItemId: null, categoryNameSnapshot: null,
    manualCategoryName: null, inspectionWorkItemId: null, inspectionWorkNameSnapshot: null, displayText: "",
    inspectionContent: null, result: null, commanderProposal: null,
  };
}

function rowKey(entry: WeeklyEntry) {
  return entry.clientKey || entry.id || `${entry.documentType}-${entry.entryDate}-${entry.shift}-${entry.sortOrder}`;
}

function hasEntryData(entry: WeeklyEntry) {
  return Boolean(formatSupervisionProjectAndWorkItem(entry) || entry.inspectionContent?.trim() || entry.result?.trim() || entry.commanderProposal?.trim());
}

export function ResultScheduleTable({ documentType, startDate, entries, selections, projects, editable, onChange }: {
  documentType: WeeklyDocumentType;
  startDate: string;
  entries: WeeklyEntry[];
  selections: WeeklyShiftSelection[];
  projects: WeeklyProject[];
  editable: boolean;
  onChange: (entries: WeeklyEntry[], selections: WeeklyShiftSelection[]) => void;
}) {
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(startDate, index));
  const documentEntries = entries.filter((entry) => entry.documentType === documentType);

  const isActive = (date: string, shift: WeeklyShift) => selections.some((selection) => selection.documentType === documentType && selection.entryDate === date && selection.shift === shift)
    || documentEntries.some((entry) => entry.entryDate === date && entry.shift === shift);

  const focusCreated = (entry: WeeklyEntry) => {
    setFocusKey(rowKey(entry));
    setFocusToken((value) => value + 1);
  };
  const activateShift = (date: string, shift: WeeklyShift) => {
    const existing = documentEntries.filter((entry) => entry.entryDate === date && entry.shift === shift);
    const nextSelections = selections.some((item) => item.documentType === documentType && item.entryDate === date && item.shift === shift)
      ? selections : [...selections, { documentType, entryDate: date, shift }];
    if (existing.length) return onChange(entries, nextSelections);
    const created = emptyEntry(documentType, date, shift, 0);
    focusCreated(created);
    onChange([...entries, created], nextSelections);
  };
  const deleteShift = (date: string, shift: WeeklyShift) => onChange(
    entries.filter((entry) => !(entry.documentType === documentType && entry.entryDate === date && entry.shift === shift)),
    selections.filter((selection) => !(selection.documentType === documentType && selection.entryDate === date && selection.shift === shift)),
  );
  const requestDeactivate = (date: string, shift: WeeklyShift) => deleteShift(date, shift);
  const addEntry = (date: string, shift: WeeklyShift) => {
    const sortOrder = documentEntries.filter((entry) => entry.entryDate === date && entry.shift === shift).length;
    const created = emptyEntry(documentType, date, shift, sortOrder);
    const nextSelections = isActive(date, shift) ? selections : [...selections, { documentType, entryDate: date, shift }];
    focusCreated(created);
    onChange([...entries, created], nextSelections);
  };
  const updateEntry = (target: WeeklyEntry, patch: Partial<WeeklyEntry>) => onChange(entries.map((entry) => entry === target ? { ...entry, ...patch } : entry), selections);
  const deleteEntry = (target: WeeklyEntry) => {
    const remaining = entries.filter((entry) => entry !== target);
    onChange(remaining.map((entry) => entry.documentType === documentType && entry.entryDate === target.entryDate && entry.shift === target.shift
      ? { ...entry, sortOrder: remaining.filter((candidate) => candidate.documentType === documentType && candidate.entryDate === target.entryDate && candidate.shift === target.shift).indexOf(entry) }
      : entry), selections);
  };
  const duplicateEntry = (target: WeeklyEntry) => {
    const slot = documentEntries.filter((entry) => entry.entryDate === target.entryDate && entry.shift === target.shift);
    const duplicated = { ...target, id: undefined, clientKey: crypto.randomUUID(), sortOrder: slot.length };
    focusCreated(duplicated);
    onChange([...entries, duplicated], selections);
  };
  const moveEntry = (target: WeeklyEntry, delta: -1 | 1) => {
    const slot = documentEntries.filter((entry) => entry.entryDate === target.entryDate && entry.shift === target.shift).sort((a, b) => a.sortOrder - b.sortOrder);
    const swap = slot[slot.indexOf(target) + delta];
    if (!swap) return;
    onChange(entries.map((entry) => entry === target ? { ...entry, sortOrder: swap.sortOrder } : entry === swap ? { ...entry, sortOrder: target.sortOrder } : entry), selections);
  };

  const contentHeader = documentType === "RESULT" ? "Nội dung kiểm tra" : "Phát sinh do chỉ huy công trình đề xuất";
  const resultHeader = documentType === "RESULT" ? "Kết quả" : "Nội dung (có phụ lục kèm theo)";

  const headerGridClass = editable
    ? "hidden grid-cols-[17%_minmax(0,30fr)_minmax(0,30fr)_minmax(0,23fr)_44px] bg-slate-100 text-xs font-bold text-slate-700 md:grid"
    : "hidden grid-cols-[17%_minmax(0,30fr)_minmax(0,30fr)_minmax(0,23fr)] bg-slate-100 text-xs font-bold text-slate-700 md:grid";

  const entryGridClass = editable
    ? "group relative grid grid-cols-1 border-t border-slate-100 md:grid-cols-[minmax(0,30fr)_minmax(0,30fr)_minmax(0,23fr)_44px]"
    : "group relative grid grid-cols-1 border-t border-slate-100 md:grid-cols-[minmax(0,30fr)_minmax(0,30fr)_minmax(0,23fr)]";

  return <section data-section="I" data-testid={`schedule-${documentType.toLocaleLowerCase()}`}>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className={headerGridClass}>
        <div className="border-r border-slate-300 p-3">{documentType === "RESULT" ? "Thời gian kiểm tra" : "Ngày/thứ"}</div>
        <div className="border-r border-slate-300 p-3 text-center">{documentType === "RESULT" ? "Công trình và hạng mục kiểm tra" : "Công trình"}</div>
        <div className="border-r border-slate-300 p-3 text-center">{contentHeader}</div>
        <div className="border-r border-slate-300 p-3 text-center">{resultHeader}</div>
        {editable ? <div className="shrink-0 w-[44px]"></div> : null}
      </div>
      {dates.map((date) => {
        const activeShifts = shifts.filter((shift) => isActive(date, shift));
        const isCompact = activeShifts.length === 0;

        return <div key={date} data-testid={`day-${documentType}-${date}`} className="border-t border-slate-200 first:border-t-0 md:grid md:grid-cols-[17%_83%] md:items-start">
          <div className={`bg-slate-50 md:border-r md:border-slate-200 md:bg-white ${isCompact ? "p-2.5 sm:p-3" : "p-3"}`}>
            <div className="font-bold text-slate-900 text-sm">{editorDateLabel(date)}</div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5 md:block md:space-y-1.5">
              {shifts.map((shift) => <label key={shift} className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-700"><input type="checkbox" disabled={!editable} checked={isActive(date, shift)} onChange={(event) => event.target.checked ? activateShift(date, shift) : requestDeactivate(date, shift)} data-testid={`shift-${documentType}-${date}-${shift}`} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />{shiftLabels[shift]}</label>)}
            </div>
          </div>
          <div className={isCompact ? "flex items-center p-3 text-xs text-slate-400 min-h-[44px]" : ""}>
            {isCompact ? <p>Chưa phát sinh lịch kiểm tra trong ngày.</p> : activeShifts.map((shift) => {
              const slotEntries = documentEntries.filter((entry) => entry.entryDate === date && entry.shift === shift).sort((a, b) => a.sortOrder - b.sortOrder);
              return <div key={shift} className="border-b border-slate-200 last:border-b-0" data-testid={`slot-${documentType}-${date}-${shift}`}><div className="bg-blue-50/70 px-3 py-1.5 text-xs font-bold text-blue-800">{shiftLabels[shift]}</div>{slotEntries.map((entry, entryIndex) => {
                const key = rowKey(entry);
                return <div key={key} className={entryGridClass} data-testid={`entry-${documentType}-${date}-${shift}-${entryIndex}`}>
                  <div className="border-b border-slate-200 p-2 md:border-b-0 md:border-r"><SourceSelector value={entry} projects={projects} editable={editable} testId={`entry-source-${documentType}-${date}-${shift}-${entryIndex}`} autoFocusToken={focusKey === key ? focusToken : undefined} onChange={(patch) => updateEntry(entry, patch)} /></div>
                  <div className="border-b border-slate-200 p-2 md:border-b-0 md:border-r">
                    {documentType === "RESULT" ? (
                      <InspectionWorkSelector value={entry} editable={editable} testId={`entry-content-${documentType}-${date}-${shift}-${entryIndex}`} onChange={(patch) => updateEntry(entry, patch)} />
                    ) : (
                      <AutoTextarea disabled={!editable} value={entry.commanderProposal || ""} onChange={(value) => updateEntry(entry, { commanderProposal: value || null })} placeholder="Nhập nội dung đề xuất..." testId={`entry-content-${documentType}-${date}-${shift}-${entryIndex}`} />
                    )}
                  </div>
                  <div className="border-b border-slate-200 p-2 md:border-b-0 md:border-r"><AutoTextarea disabled={!editable} value={documentType === "RESULT" ? entry.result || "" : entry.inspectionContent || ""} onChange={(value) => updateEntry(entry, documentType === "RESULT" ? { result: value || null } : { inspectionContent: value || null })} placeholder={documentType === "RESULT" ? "Nhập kết quả..." : "Nhập nội dung kế hoạch..."} testId={`entry-result-${documentType}-${date}-${shift}-${entryIndex}`} /></div>
                  {editable ? <div className="p-1 align-top border-b md:border-b-0 border-slate-200"><div className="opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"><RowActionMenu canMoveUp={entryIndex > 0} canMoveDown={entryIndex < slotEntries.length - 1} onMoveUp={() => moveEntry(entry, -1)} onMoveDown={() => moveEntry(entry, 1)} onDuplicate={() => duplicateEntry(entry)} onDelete={() => deleteEntry(entry)} testId={`entry-actions-${documentType}-${date}-${shift}-${entryIndex}`} /></div></div> : null}
                </div>;
              })}{editable ? <div className="border-t border-dashed border-slate-200 p-2"><button type="button" onClick={() => addEntry(date, shift)} data-testid={`add-inspection-${documentType}-${date}-${shift}`} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50"><Plus className="h-4 w-4" />{documentType === "RESULT" ? "Thêm dòng kiểm tra" : "Thêm công việc kiểm tra"}</button></div> : null}</div>;
            })}
          </div>
        </div>;
      })}
    </div>
  </section>;
}
