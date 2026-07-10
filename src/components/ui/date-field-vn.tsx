"use client";

import { useRef } from "react";
import { Calendar } from "lucide-react";
import { fromDateTimeLocalInputValue, safeFormatDateTimeVN, safeFormatDateVN, fromDateInputValue } from "@/lib/date-utils";

interface FieldProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

export function DateTimeFieldVN({ id, name, value, onChange, className, required }: FieldProps) {
  const displayValue = value ? safeFormatDateTimeVN(fromDateTimeLocalInputValue(value)) : "";
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        ref={inputRef}
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="absolute w-[1px] h-[1px] p-0 m-[-1px] overflow-hidden whitespace-nowrap border-0 border-none outline-none clip-[rect(0,0,0,0)]"
        style={{ clip: "rect(0 0 0 0)" }}
        tabIndex={-1}
      />
      <div 
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.showPicker?.();
          }
        }}
        onClick={() => inputRef.current?.showPicker?.()}
        className={`flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className || ""}`}
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {displayValue || "dd/MM/yyyy HH:mm"}
        </span>
        <Calendar className="h-4 w-4 text-slate-400" />
      </div>
    </div>
  );
}

export function DateFieldVN({ id, name, value, onChange, className, required }: FieldProps) {
  const displayValue = value ? safeFormatDateVN(fromDateInputValue(value)) : "";
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="absolute w-[1px] h-[1px] p-0 m-[-1px] overflow-hidden whitespace-nowrap border-0 border-none outline-none clip-[rect(0,0,0,0)]"
        style={{ clip: "rect(0 0 0 0)" }}
        tabIndex={-1}
      />
      <div 
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.showPicker?.();
          }
        }}
        onClick={() => inputRef.current?.showPicker?.()}
        className={`flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className || ""}`}
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {displayValue || "dd/MM/yyyy"}
        </span>
        <Calendar className="h-4 w-4 text-slate-400" />
      </div>
    </div>
  );
}
