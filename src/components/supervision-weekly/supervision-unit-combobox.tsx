"use client";

import { useState } from "react";
import { EnterpriseCombobox, EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";

const standardUnits: EnterpriseComboboxOption[] = [
  { value: "m", label: "m" },
  { value: "m²", label: "m²" },
  { value: "m³", label: "m³" },
  { value: "kg", label: "kg" },
  { value: "tấn", label: "tấn" },
  { value: "cái", label: "cái" },
  { value: "bộ", label: "bộ" },
  { value: "%", label: "%" },
  { value: "ngày", label: "ngày" },
];

export function SupervisionUnitCombobox({ value, onChange, disabled, testId, placeholder = "Đơn vị" }: { value: string | null; onChange: (value: string) => void; disabled?: boolean; testId?: string; placeholder?: string }) {
  const [customMode, setCustomMode] = useState(() => value && !standardUnits.find(u => u.value === value));
  
  if (customMode) {
    return <input autoFocus disabled={disabled} value={value || ""} onChange={(e) => onChange(e.target.value)} onBlur={(e) => { if (!e.target.value.trim()) { setCustomMode(false); onChange(""); } }} className="h-10 w-full min-w-0 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder={placeholder} data-testid={`${testId}-custom`} />;
  }

  return (
    <EnterpriseCombobox
      options={[...standardUnits, { value: "__OTHER__", label: "Đơn vị khác" }]}
      value={value || ""}
      onChange={(val) => {
        if (val === "__OTHER__") {
          setCustomMode(true);
          onChange("");
        } else {
          onChange(val);
        }
      }}
      disabled={disabled}
      placeholder={placeholder}
      searchPlaceholder="Tìm đơn vị..."
      testId={testId}
      clearable={false}
      buttonClassName="h-10 w-full min-w-0 border-slate-300 font-normal px-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
    />
  );
}
