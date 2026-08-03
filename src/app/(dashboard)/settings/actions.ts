"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { sanitizeAuditData } from "@/lib/audit";
import { createSettingsAuditPayload } from "@/lib/settings/settings-audit";
import { randomUUID } from "crypto";
import { assertPermission } from "@/lib/permissions/permission-resolver";
import prisma from "@/lib/prisma";
import {
  companyProfileSchema,
  documentPolicySchema,
  settingsUpdateEnvelopeSchema,
  DEFAULT_SYSTEM_SETTINGS,
  type CompanyProfileInput,
  type DocumentPolicyInput,
} from "@/lib/settings/settings-validation";
import { toSettingsSnapshot, type SettingsSnapshot } from "@/lib/settings/system-settings";

const SETTINGS_ADVISORY_LOCK = 91824411;

type SettingsSection = "company" | "documents";

type SettingsSaveResult =
  | { ok: true; snapshot: SettingsSnapshot }
  | { ok: false; reason: "conflict"; message: string };

class SettingsConflictError extends Error {
  readonly code = "SETTINGS_CONFLICT";

  constructor() {
    super("Cấu hình đã được người khác cập nhật. Hãy tải lại trang trước khi lưu lại thay đổi của bạn.");
    this.name = "SettingsConflictError";
  }
}

async function getActor(permission: "settings.company.manage" | "settings.documents.manage") {
  const session = await getSession();
  if (!session) throw new Error("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
  await assertPermission(session, permission);
  return session;
}

async function getClientIpAndUserAgent() {
  const headersList = await headers();
  return {
    ipAddress: headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null,
    userAgent: headersList.get("user-agent") || null,
  };
}

function changedFields<T extends Record<string, unknown>>(current: T, next: T) {
  return Object.keys(next).filter((key) => current[key] !== next[key]) as (keyof T)[];
}

async function persistSettingsSection({
  section,
  expectedVersion,
  data,
  actor,
  ipAddress,
  userAgent,
}: {
  section: SettingsSection;
  expectedVersion: number;
  data: CompanyProfileInput | DocumentPolicyInput;
  actor: Awaited<ReturnType<typeof getSession>> & {};
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<SettingsSnapshot> {
  const batchId = randomUUID();
  const setting = await prisma.$transaction(async (tx) => {
    // No schema migration is needed for this singleton, but an advisory lock prevents two
    // first saves from creating multiple rows before an explicit singleton constraint exists.
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${SETTINGS_ADVISORY_LOCK})`);
    const current = await tx.systemSetting.findUnique({
      where: { singletonKey: "DEFAULT_SETTINGS" },
      include: { updatedBy: { select: { id: true, name: true } } },
    });

    if (!current) {
      if (expectedVersion !== 0) throw new SettingsConflictError();
      const created = await tx.systemSetting.create({
        data: {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...data,
          singletonKey: "DEFAULT_SETTINGS",
          updatedById: actor.id,
        },
        include: { updatedBy: { select: { id: true, name: true } } },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "CREATE_SETTINGS_SECTION",
          entityType: "SystemSetting",
          entityId: created.id,
          beforeData: JSON.stringify({ section, changedFields: [], values: {} }),
          afterData: JSON.stringify(createSettingsAuditPayload({ section, batchId, changedFields: Object.keys(data), before: {}, after: data, actor })),
          ipAddress,
          userAgent,
        },
      });
      return created;
    }

    if (current.version !== expectedVersion) throw new SettingsConflictError();

    const before = section === "company"
      ? { companyName: current.companyName, taxCode: current.taxCode, hotline: current.hotline }
      : {
          maxUploadSizeMb: current.maxUploadSizeMb,
          allowedExtensions: current.allowedExtensions,
          enforceNamingConvention: current.enforceNamingConvention,
          autoVersioning: current.autoVersioning,
        };
    const changed = changedFields(before, data as typeof before);
    if (changed.length === 0) return current;

    const changedData = Object.fromEntries(changed.map((key) => [key, data[key as keyof typeof data]]));
    const result = await tx.systemSetting.updateMany({
      where: { id: current.id, version: expectedVersion },
      data: { ...changedData, updatedById: actor.id, version: { increment: 1 } },
    });
    if (result.count !== 1) throw new SettingsConflictError();

    const updated = await tx.systemSetting.findUniqueOrThrow({
      where: { id: current.id },
      include: { updatedBy: { select: { id: true, name: true } } },
    });
    const beforeData = Object.fromEntries(changed.map((key) => [key, before[key as keyof typeof before]]));
    const afterData = Object.fromEntries(changed.map((key) => [key, data[key as keyof typeof data]]));

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "UPDATE_SETTINGS_SECTION",
        entityType: "SystemSetting",
        entityId: current.id,
        beforeData: JSON.stringify(sanitizeAuditData({ section, changedFields: changed, values: beforeData })),
          afterData: JSON.stringify(createSettingsAuditPayload({ section, batchId, changedFields: changed as string[], before: beforeData, after: afterData, actor })),
        ipAddress,
        userAgent,
      },
    });
    return updated;
  });

  revalidatePath("/settings");
  if (section === "documents") revalidatePath("/documents");
  return toSettingsSnapshot(setting);
}

export async function updateCompanyProfile(
  input: CompanyProfileInput & { expectedVersion: number },
): Promise<SettingsSaveResult> {
  const actor = await getActor("settings.company.manage");
  const data = companyProfileSchema.parse({
    companyName: input.companyName,
    taxCode: input.taxCode,
    hotline: input.hotline,
  });
  const { expectedVersion } = settingsUpdateEnvelopeSchema.parse({ expectedVersion: input.expectedVersion });
  const client = await getClientIpAndUserAgent();
  try {
    const snapshot = await persistSettingsSection({ section: "company", expectedVersion, data, actor, ...client });
    return { ok: true, snapshot };
  } catch (error) {
    if (error instanceof SettingsConflictError) {
      return { ok: false, reason: "conflict", message: error.message };
    }
    throw error;
  }
}

export async function updateDocumentPolicies(
  input: DocumentPolicyInput & { expectedVersion: number },
): Promise<SettingsSaveResult> {
  const actor = await getActor("settings.documents.manage");
  const data = documentPolicySchema.parse({
    maxUploadSizeMb: input.maxUploadSizeMb,
    allowedExtensions: input.allowedExtensions,
    enforceNamingConvention: input.enforceNamingConvention,
    autoVersioning: input.autoVersioning,
  });
  const { expectedVersion } = settingsUpdateEnvelopeSchema.parse({ expectedVersion: input.expectedVersion });
  const client = await getClientIpAndUserAgent();
  try {
    const snapshot = await persistSettingsSection({ section: "documents", expectedVersion, data, actor, ...client });
    return { ok: true, snapshot };
  } catch (error) {
    if (error instanceof SettingsConflictError) {
      return { ok: false, reason: "conflict", message: error.message };
    }
    throw error;
  }
}
