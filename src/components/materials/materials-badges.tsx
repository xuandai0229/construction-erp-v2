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

  if (status === "out") {
    return (
      <StatusBadge variant="neutral" size="sm" className="gap-1.5">
        <PackageX className="h-3.5 w-3.5" />
        {label}
      </StatusBadge>
    );
  }

  if (status === "low") {
    return (
      <StatusBadge variant="warning" size="sm" className="gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5" />
        {label}
      </StatusBadge>
    );
  }

  return (
    <StatusBadge variant="success" size="sm" className="gap-1.5">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {label}
    </StatusBadge>
  );
}

export function MovementTypeBadge({ type }: { type: MaterialMovementType }) {
  if (type === "IMPORT") {
    return (
      <StatusBadge variant="success" size="sm" className="gap-1.5">
        <ArrowDownRight className="h-3.5 w-3.5" />
        {getMovementLabel(type)}
      </StatusBadge>
    );
  }

  if (type === "EXPORT") {
    return (
      <StatusBadge variant="warning" size="sm" className="gap-1.5">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {getMovementLabel(type)}
      </StatusBadge>
    );
  }

  if (type === "RETURN") {
    return (
      <StatusBadge variant="info" size="sm" className="gap-1.5">
        <RotateCcw className="h-3.5 w-3.5" />
        {getMovementLabel(type)}
      </StatusBadge>
    );
  }

  return (
    <StatusBadge variant="neutral" size="sm" className="gap-1.5">
      <Truck className="h-3.5 w-3.5" />
      {getMovementLabel(type)}
    </StatusBadge>
  );
}
