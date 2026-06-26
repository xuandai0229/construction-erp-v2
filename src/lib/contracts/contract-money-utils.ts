/**
 * Utility functions for formatting and parsing contract values (VND).
 */

export function stripMoney(val: string): string {
  // Keep only digits
  return val.replace(/\D/g, "");
}

export function formatVndInput(val: string): string {
  const clean = stripMoney(val);
  if (!clean) return "";
  // Regular expression to insert dot separators every three digits from the right
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function getVndShortText(valStr: string): string {
  const clean = stripMoney(valStr);
  if (!clean) return "";
  const num = Number(clean);
  if (num === 0) return "";
  
  if (num >= 1000000000000) {
    const trillion = num / 1000000000000;
    return `≈ ${Number(trillion.toFixed(2)).toLocaleString("vi-VN")} nghìn tỷ đồng`;
  }
  if (num >= 1000000000) {
    const bill = num / 1000000000;
    return `≈ ${Number(bill.toFixed(2)).toLocaleString("vi-VN")} tỷ đồng`;
  }
  if (num >= 1000000) {
    const mill = num / 1000000;
    return `≈ ${Number(mill.toFixed(2)).toLocaleString("vi-VN")} triệu đồng`;
  }
  return "";
}
