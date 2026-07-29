import type { DashboardProjectOverview } from "./dashboard-queries";
import type { StatusBadgeVariant } from "@/components/ui/status-badge";

export const completenessPresentation: Record<DashboardProjectOverview["completenessCategory"], { label: string; color: string; variant: StatusBadgeVariant }> = {
  COMPLETE: { label: "Đủ dữ liệu", color: "#22c55e", variant: "success" },
  MISSING_PLAN: { label: "Thiếu kế hoạch", color: "#f59e0b", variant: "warning" },
  MISSING_ACTUAL: { label: "Thiếu thực tế", color: "#ef4444", variant: "danger" },
  MISSING_BOTH: { label: "Thiếu cả kế hoạch và thực tế", color: "#94a3b8", variant: "neutral" },
};

export function getActualProgressDataLabel(project: Pick<DashboardProjectOverview, "actualProgressDataStatus" | "actualProgressWarnings">) {
  if (project.actualProgressDataStatus === "MULTIPLE_ACTIVE_TEMPLATES" || project.actualProgressWarnings.includes("MULTIPLE_ACTIVE_TEMPLATES")) {
    return "Có nhiều biểu mẫu đang hoạt động";
  }

  switch (project.actualProgressDataStatus) {
    case "AVAILABLE": return "Dữ liệu thực tế sẵn sàng";
    case "NO_PROGRESS_ITEMS": return "Chưa có hạng mục khối lượng";
    case "NO_APPROVED_ENTRIES": return "Chưa có khối lượng được phê duyệt";
    case "MISSING_DESIGN_QUANTITY": return "Thiếu khối lượng thiết kế";
    case "INVALID_QUANTITY": return "Dữ liệu khối lượng không hợp lệ";
    case "DATA_SCOPE_MISMATCH": return "Dữ liệu khối lượng không đúng phạm vi";
  }
}
