import type { StatusBadgeVariant } from "@/components/ui/status-badge";

export type ProjectStatusKey =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED";

export type ProjectStatusMeta = {
  key: ProjectStatusKey | "UNKNOWN";
  label: string;
  groupLabel: string;
  variant: StatusBadgeVariant;
  dotClassName: string;
  iconToneClassName: string;
  order: number;
};

const PROJECT_STATUS_META: Record<ProjectStatusKey, ProjectStatusMeta> = {
  PLANNING: {
    key: "PLANNING",
    label: "Công tác chuẩn bị",
    groupLabel: "Công tác chuẩn bị",
    variant: "neutral",
    dotClassName: "bg-slate-400",
    iconToneClassName: "text-slate-500 group-hover:text-blue-500",
    order: 10,
  },
  ACTIVE: {
    key: "ACTIVE",
    label: "Đang thi công",
    groupLabel: "Đang thi công",
    variant: "success",
    dotClassName: "bg-emerald-500",
    iconToneClassName: "text-emerald-600 group-hover:text-blue-500",
    order: 20,
  },
  ON_HOLD: {
    key: "ON_HOLD",
    label: "Tạm dừng",
    groupLabel: "Tạm dừng",
    variant: "warning",
    dotClassName: "bg-amber-500",
    iconToneClassName: "text-amber-600 group-hover:text-amber-500",
    order: 30,
  },
  COMPLETED: {
    key: "COMPLETED",
    label: "Hoàn thành",
    groupLabel: "Hoàn thành",
    variant: "success",
    dotClassName: "bg-emerald-600",
    iconToneClassName: "text-emerald-700 group-hover:text-emerald-600",
    order: 40,
  },
  CANCELLED: {
    key: "CANCELLED",
    label: "Đã hủy",
    groupLabel: "Đã hủy",
    variant: "danger",
    dotClassName: "bg-rose-500",
    iconToneClassName: "text-rose-600 group-hover:text-rose-500",
    order: 50,
  },
};

export const UNKNOWN_PROJECT_STATUS_META: ProjectStatusMeta = {
  key: "UNKNOWN",
  label: "Chưa xác định",
  groupLabel: "Chưa xác định",
  variant: "neutral",
  dotClassName: "bg-slate-300",
  iconToneClassName: "text-slate-400 group-hover:text-slate-600",
  order: 999,
};

export function getProjectStatusMeta(status: string | null | undefined): ProjectStatusMeta {
  if (!status) return UNKNOWN_PROJECT_STATUS_META;
  return PROJECT_STATUS_META[status as ProjectStatusKey] ?? UNKNOWN_PROJECT_STATUS_META;
}

export function isPreparationProjectStatus(status: string | null | undefined) {
  return status === "PLANNING";
}

export function sortProjectStatuses(left: string | null | undefined, right: string | null | undefined) {
  return getProjectStatusMeta(left).order - getProjectStatusMeta(right).order;
}
