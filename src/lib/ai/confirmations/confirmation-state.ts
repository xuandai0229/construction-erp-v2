import { randomUUID } from "node:crypto";
import { UserRole } from "@prisma/client";

export interface PendingAIConfirmation {
  id: string;
  confirmationToken: string;
  userId: string;
  requiredRole: UserRole[];
  projectId?: string;
  toolName: string;
  proposedInput: Record<string, unknown>;
  createdAt: number;
  expiresAt: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "EXPIRED";
  confirmedBy?: string;
  confirmedAt?: number;
}

const pendingConfirmations = new Map<string, PendingAIConfirmation>();
const CONFIRMATION_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function createPendingConfirmation(params: {
  userId: string;
  requiredRole: UserRole[];
  projectId?: string;
  toolName: string;
  proposedInput: Record<string, unknown>;
}): PendingAIConfirmation {
  const id = randomUUID();
  const confirmationToken = `conf_${randomUUID().replace(/-/g, "")}`;
  const now = Date.now();

  const record: PendingAIConfirmation = {
    id,
    confirmationToken,
    userId: params.userId,
    requiredRole: params.requiredRole,
    projectId: params.projectId,
    toolName: params.toolName,
    proposedInput: params.proposedInput,
    createdAt: now,
    expiresAt: now + CONFIRMATION_TTL_MS,
    status: "PENDING",
  };

  pendingConfirmations.set(confirmationToken, record);
  return record;
}

export function getPendingConfirmation(confirmationToken: string): PendingAIConfirmation | null {
  const record = pendingConfirmations.get(confirmationToken);
  if (!record) return null;

  if (Date.now() > record.expiresAt && record.status === "PENDING") {
    record.status = "EXPIRED";
  }

  return record;
}
