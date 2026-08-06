import React from "react";
import { cn } from "@/lib/utils";
import { ProjectAssignmentDTO } from "@/lib/hr/project-assignment-dto";

interface AssignmentStatusBadgeProps {
  assignment: ProjectAssignmentDTO;
  className?: string;
}

export function AssignmentStatusBadge({ assignment, className }: AssignmentStatusBadgeProps) {
  const { status, startDate, endReason } = assignment;
  const todayStr = new Date().toISOString().split("T")[0];

  let label = "Không xác định";
  let variantClass = "bg-slate-100 text-slate-700 border-slate-200";

  if (status === "ACTIVE") {
    if (startDate > todayStr) {
      label = "Kế hoạch";
      variantClass = "bg-sky-50 text-sky-700 border-sky-200 font-medium";
    } else {
      label = "Đang hiệu lực";
      variantClass = "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium";
    }
  } else if (status === "COMPLETED") {
    if (endReason === "EARLY_RELEASE") {
      label = "Rút nhân sự sớm";
      variantClass = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (endReason === "ROLE_TRANSFER" || endReason === "ALLOCATION_CHANGE") {
      label = "Điều chỉnh vai trò";
      variantClass = "bg-purple-50 text-purple-700 border-purple-200";
    } else {
      label = "Hoàn thành";
      variantClass = "bg-slate-100 text-slate-700 border-slate-200";
    }
  } else if (status === "RELEASED") {
    label = "Đã rút";
    variantClass = "bg-amber-50 text-amber-800 border-amber-200 font-medium";
  } else if (status === "CANCELLED") {
    label = "Đã hủy";
    variantClass = "bg-rose-50 text-rose-700 border-rose-200 font-medium";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border tracking-tight shrink-0",
        variantClass,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
      {label}
    </span>
  );
}

export function EndReasonBadge({ reason }: { reason: string | null }) {
  if (!reason) return null;

  let text = reason;
  if (reason === "COMPLETED") text = "Hoàn thành đúng kế hoạch";
  else if (reason === "EARLY_RELEASE") text = "Rút nhân sự sớm";
  else if (reason === "ROLE_TRANSFER") text = "Thay đổi vai trò";
  else if (reason === "ALLOCATION_CHANGE") text = "Điều chỉnh tỷ lệ";
  else if (reason === "PROJECT_TRANSFER") text = "Chuyển công trình";

  return (
    <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
      {text}
    </span>
  );
}
