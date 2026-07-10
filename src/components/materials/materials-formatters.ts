import type { MaterialMovementType } from "@prisma/client";
import { safeFormatDateTimeVN, safeFormatDateVN } from "@/lib/date-utils";

export function formatQuantity(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits,
  }).format(value);
}

export function formatDate(value: string | Date) {
  return safeFormatDateVN(value);
}

export function formatDateTime(value: string | Date) {
  return safeFormatDateTimeVN(value);
}

export function getStockStatus(stock: number, minStockLevel: number) {
  if (stock < 0) return "negative" as const;
  if (stock === 0) return "out" as const;
  if (minStockLevel > 0 && stock <= minStockLevel) return "low" as const;
  return "healthy" as const;
}

export function getStockStatusLabel(status: ReturnType<typeof getStockStatus>) {
  if (status === "negative") return "Âm kho";
  if (status === "out") return "Hết hàng";
  if (status === "low") return "Sắp hết";
  return "Đủ hàng";
}

export function getStockDelta(stock: number, minStockLevel: number) {
  return stock - minStockLevel;
}

export function getStockRatio(stock: number, minStockLevel: number) {
  if (minStockLevel <= 0) return stock > 0 ? 100 : 0;
  return Math.max(0, Math.round((stock / minStockLevel) * 100));
}

export function getMovementLabel(type: MaterialMovementType) {
  switch (type) {
    case "IMPORT":
      return "Nhập";
    case "EXPORT":
      return "Xuất";
    case "TRANSFER":
      return "Điều chuyển";
    case "RETURN":
      return "Hoàn trả";
    default:
      return type;
  }
}

export function getMovementSign(type: MaterialMovementType) {
  return type === "EXPORT" || type === "TRANSFER" ? "-" : "+";
}
