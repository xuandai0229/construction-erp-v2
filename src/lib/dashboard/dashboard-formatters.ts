export function formatCurrencyVND(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "0 ₫";
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(amount)} ₫`;
}

export function formatPercentVN(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}%`;
}

export function formatDateVNShort(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTimeVN(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", "");
}

export function formatStatusLabel(status: string): string {
  if (!status) return '';
  
  const s = status.toUpperCase();
  
  const statusMap: Record<string, string> = {
    'DRAFT': 'Nháp',
    'SUBMITTED': 'Đã gửi',
    'PENDING': 'Chờ duyệt',
    'APPROVED': 'Đã duyệt',
    'REJECTED': 'Từ chối',
    'COMPLETED': 'Hoàn tất',
    'PAID': 'Đã thanh toán',
    'CANCELLED': 'Đã hủy',
    'ON_TRACK': 'Đúng tiến độ',
    'AT_RISK': 'Cần chú ý',
    'DELAYED': 'Rủi ro',
    'NO_DATA': 'Chưa cập nhật'
  };

  return statusMap[s] || status;
}
