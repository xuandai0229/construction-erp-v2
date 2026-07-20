import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export type SupervisionDatabaseReadiness =
  | { ready: true }
  | {
      ready: false;
      reason: "MIGRATION_NOT_APPLIED" | "DATABASE_UNREACHABLE" | "DATABASE_PERMISSION_DENIED" | "UNKNOWN";
      message: string;
    };

type ReadinessCache = { checkedAt: number; value: SupervisionDatabaseReadiness };
const CACHE_TTL_MS = 30_000;
let cachedReadiness: ReadinessCache | undefined;

function classifyDatabaseError(error: unknown): Exclude<SupervisionDatabaseReadiness, { ready: true }> {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (["P1000", "P1001", "P1002", "P1008", "P1017"].includes(code)) {
    return { ready: false, reason: "DATABASE_UNREACHABLE", message: "Không kết nối được cơ sở dữ liệu của phân hệ Giám sát." };
  }
  if (["P1010", "42501"].includes(code)) {
    return { ready: false, reason: "DATABASE_PERMISSION_DENIED", message: "Tài khoản cơ sở dữ liệu không đủ quyền kiểm tra phân hệ Giám sát." };
  }
  console.error("[supervision-weekly] database readiness check failed", error);
  return { ready: false, reason: "UNKNOWN", message: "Không thể kiểm tra trạng thái cơ sở dữ liệu của phân hệ Giám sát." };
}

export async function getSupervisionDatabaseReadiness(): Promise<SupervisionDatabaseReadiness> {
  if (cachedReadiness && Date.now() - cachedReadiness.checkedAt < CACHE_TTL_MS) return cachedReadiness.value;
  try {
    const rows = await prisma.$queryRaw<{ dossier_table: string | null }[]>(
      Prisma.sql`SELECT to_regclass('public."SupervisionWeeklyDossier"')::text AS dossier_table`,
    );
    const value: SupervisionDatabaseReadiness = rows[0]?.dossier_table
      ? { ready: true }
      : { ready: false, reason: "MIGRATION_NOT_APPLIED", message: "Phân hệ Giám sát chưa được khởi tạo cơ sở dữ liệu. Cần áp migration supervision trước khi sử dụng." };
    cachedReadiness = { checkedAt: Date.now(), value };
    return value;
  } catch (error) {
    const value = classifyDatabaseError(error);
    cachedReadiness = { checkedAt: Date.now(), value };
    return value;
  }
}

export async function assertSupervisionDatabaseReady() {
  const readiness = await getSupervisionDatabaseReadiness();
  if (!readiness.ready) throw new Error(readiness.message);
}
