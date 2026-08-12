"use client";

import type { MaterialMovementType } from "@prisma/client";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, PackageX, RotateCcw, ShieldAlert, Truck } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { getMovementLabel, getStockStatus, getStockStatusLabel } from "./materials-formatters";

interface StockStatusBadgeProps {
  stock: number;
  minStockLevel: number;
  compact?: boolean;
}

export function StockStatusBadge({ stock, minStockLevel, compact = false }: StockStatusBadgeProps) {
  const status = getStockStatus(stock, minStockLevel);
  const label = compact && status === "healthy" ? "Đủ" : getStockStatusLabel(status);

  if (status === "negative") {
    return (
      <StatusBadge variant="danger" size="sm" className="gap-1.5" title="Dữ liệu bất thường, cần kiểm tra ledger">
        <ShieldAlert className="h-3.5 w-3.5" />
        {label}
      </StatusBadge>
    );
  }

  if (status === "out") {
    return (
      <StatusBadge variant="neutral" size="sm" className="gap-1.5 bg-[var(--border)] text-[var(--muted-foreground)] border-[var(--border)]" title="Đã hết hoàn toàn trong kho">
        <PackageX className="h-3.5 w-3.5" />
        {label}
      </StatusBadge>
    );
  }

  if (status === "low") {
    return (
      <StatusBadge variant="warning" size="sm" className="gap-1.5" title="Tồn hiện tại nhỏ hơn hoặc bằng ngưỡng cảnh báo">
        <ShieldAlert className="h-3.5 w-3.5" />
        {label}
      </StatusBadge>
    );
  }

  return (
    <StatusBadge variant="success" size="sm" className="gap-1.5" title="Tồn kho cao hơn ngưỡng cảnh báo">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {label}
    </StatusBadge>
  );
}

export function MovementTypeBadge({ type, className, compact }: { type: string | MaterialMovementType; className?: string; compact?: boolean }) {
  const moveType = type as MaterialMovementType;
  if (moveType === "IMPORT") {
    return (
      <StatusBadge variant="success" size="sm" className={`gap-1.5 ${className || ""}`}>
        <ArrowDownRight className="h-3.5 w-3.5" />
        {getMovementLabel(moveType)}
      </StatusBadge>
    );
  }

  if (moveType === "EXPORT") {
    return (
      <StatusBadge variant="warning" size="sm" className={`gap-1.5 ${className || ""}`}>
        <ArrowUpRight className="h-3.5 w-3.5" />
        {getMovementLabel(moveType)}
      </StatusBadge>
    );
  }

  if (moveType === "RETURN") {
    return (
      <StatusBadge variant="info" size="sm" className={`gap-1.5 ${className || ""}`}>
        <RotateCcw className="h-3.5 w-3.5" />
        {getMovementLabel(moveType)}
      </StatusBadge>
    );
  }

  return (
    <StatusBadge variant="neutral" size="sm" className={`gap-1.5 ${className || ""}`}>
      <Truck className="h-3.5 w-3.5" />
      {getMovementLabel(moveType)}
    </StatusBadge>
  );
}

export function ProposalStatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") {
    return (
      <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded text-xs border border-emerald-200">
        Đã duyệt
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded text-xs border border-rose-200">
        Bị từ chối
      </span>
    );
  }
  return (
    <span className="bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded text-xs border border-amber-200">
      Chờ duyệt
    </span>
  );
}
