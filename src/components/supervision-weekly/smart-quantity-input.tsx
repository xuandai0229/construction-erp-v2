"use client";

import { useEffect, useId, useState } from "react";
import { formatSupervisionQuantity, normalizeSupervisionUnit, parseSupervisionQuantityInput } from "@/lib/supervision-weekly/quantity";
import { AutoTextarea } from "./source-selector";
import { SupervisionUnitCombobox } from "./supervision-unit-combobox";
import { MoreHorizontal } from "lucide-react";

export type SmartQuantityValue = {
  raw: string | null;
  quantity: number | null;
  text: string | null;
  unit: string | null;
  unitCode: string | null;
};

function displayRaw(value: SmartQuantityValue) {
  if (value.raw) {
    const parsed = parseSupervisionQuantityInput(value.raw, value.unit);
    if (parsed.mode === "NUMBER" && value.unit) return formatSupervisionQuantity(parsed.numericValue, null, null);
    return value.raw;
  }
  return formatSupervisionQuantity(value.quantity, value.text, null);
}

export function SmartQuantityInput({ value, editable, testId, onChange }: {
  value: SmartQuantityValue;
  editable: boolean;
  testId: string;
  onChange: (value: SmartQuantityValue) => void;
}) {
  const listId = useId();
  const textMode = value.quantity == null && value.text !== null;
  const [raw, setRaw] = useState(displayRaw(value));
  useEffect(() => {
    setRaw(displayRaw(value));
  }, [value.raw, value.quantity, value.text, value.unit]);

  const updateRaw = (nextRaw: string) => {
    setRaw(nextRaw);
    const parsed = parseSupervisionQuantityInput(nextRaw, value.unit);
    if (parsed.mode === "NUMBER") onChange({ raw: nextRaw || null, quantity: parsed.numericValue, text: null, unit: parsed.unitLabel || value.unit, unitCode: parsed.unitCode || value.unitCode });
    else if (!nextRaw.trim()) onChange({ raw: null, quantity: null, text: null, unit: value.unit, unitCode: value.unitCode });
  };
  const normalizeOnBlur = () => {
    const parsed = parseSupervisionQuantityInput(raw, value.unit);
    if (parsed.mode !== "NUMBER") return;
    const normalizedRaw = formatSupervisionQuantity(parsed.numericValue, null, null);
    setRaw(normalizedRaw);
    onChange({ raw: normalizedRaw, quantity: parsed.numericValue, text: null, unit: parsed.unitLabel || value.unit, unitCode: parsed.unitCode || value.unitCode });
  };
  const updateUnit = (unitInput: string) => {
    const unit = normalizeSupervisionUnit(unitInput);
    onChange({ ...value, raw, unit: unit?.label || unitInput || null, unitCode: unit?.code || null });
  };

  return <div className="space-y-2 relative group" data-testid={testId}>
    {textMode ? <div className="relative"><AutoTextarea disabled={!editable} value={value.text || ""} onChange={(text) => onChange({ raw: text || null, quantity: null, text: text || null, unit: null, unitCode: null })} placeholder="Nhập nội dung khối lượng..." testId={`${testId}-text`} className="pr-8 min-h-10" />{editable && <button type="button" onClick={() => onChange({ raw: "", quantity: null, text: "", unit: null, unitCode: null })} className="absolute top-1.5 right-1.5 p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded transition-colors" title="Quay lại nhập số" data-testid={`${testId}-toggle-number`}><MoreHorizontal className="h-4 w-4" /></button>}</div> : <div className="flex gap-2">
      <div className="relative flex-1 min-w-0">
        <input disabled={!editable} inputMode="decimal" value={raw} onChange={(event) => updateRaw(event.target.value)} onBlur={normalizeOnBlur} placeholder="Nhập khối lượng..." data-testid={`${testId}-raw`} className="h-10 w-full min-w-0 rounded-md border border-slate-300 px-2.5 pr-8 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
        {editable && <button type="button" onClick={() => onChange({ raw: null, quantity: null, text: null, unit: null, unitCode: null })} className="absolute top-1.5 right-1.5 p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded transition-colors opacity-0 group-hover:opacity-100 focus-within:opacity-100" title="Nhập nội dung thay cho số" data-testid={`${testId}-toggle-text`}><MoreHorizontal className="h-4 w-4" /></button>}
      </div>
      <div className="w-[30%] min-w-0">
        <SupervisionUnitCombobox disabled={!editable} value={value.unit || ""} onChange={updateUnit} testId={`${testId}-unit`} />
      </div>
    </div>}
  </div>;
}
