"use client";

export function WeeklyPrintButton() {
  return <button className="print-actions" type="button" onClick={() => window.print()}>In / Lưu PDF</button>;
}
