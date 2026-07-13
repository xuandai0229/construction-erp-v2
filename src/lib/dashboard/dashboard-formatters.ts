const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Đã duyệt",
  COMPLETED: "Hoàn thành",
  DRAFT: "Bản nháp",
  IN_PROGRESS: "Đang thực hiện",
  PENDING: "Chờ xử lý",
  REJECTED: "Từ chối",
  SUBMITTED: "Chờ duyệt",
  CANCELLED: "Đã hủy",
};

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
  }).format(date).replace(",", "");
}

/** Maps operational workflow statuses to a concise Vietnamese label. */
export function formatStatusLabel(status: string | null | undefined) {
  if (!status) return "";
  return STATUS_LABELS[status] ?? status;
}
