import type { MaterialMovementType } from "@prisma/client";

export function formatQuantity(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits,
  }).format(value);
}

export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getStockStatus(stock: number, minStockLevel: number) {
  if (stock <= 0) return "out" as const;
  if (minStockLevel > 0 && stock <= minStockLevel) return "low" as const;
  return "healthy" as const;
}

export function getStockStatusLabel(status: ReturnType<typeof getStockStatus>) {
  if (status === "out") return "Hết hàng";
  if (status === "low") return "Sắp hết";
  return "Đủ hàng";
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
