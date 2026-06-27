"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import {
  systemSettingsSchema,
  DEFAULT_SYSTEM_SETTINGS,
  type SystemSettingsInput,
} from "@/lib/settings/settings-validation";
import { headers } from "next/headers";

async function getClientIpAndUserAgent() {
  const headersList = await headers();
  const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
  const userAgent = headersList.get("user-agent") || null;
  return { ipAddress, userAgent };
}

export async function getSystemSettings() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  if (!canManageUsers(session)) {
    throw new Error("Forbidden");
  }

  if (!("systemSetting" in prisma)) {
    throw new Error("Prisma Client chưa có delegate systemSetting. Hãy chạy prisma generate, migrate/db push và restart dev server.");
  }

  let setting = await prisma.systemSetting.findFirst();

  if (!setting) {
    // Init default settings if not exists
    setting = await prisma.systemSetting.create({
      data: {
        ...DEFAULT_SYSTEM_SETTINGS,
        updatedById: session.id,
      },
    });
    
    // Log init
    const { ipAddress, userAgent } = await getClientIpAndUserAgent();
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "INITIALIZE_SETTINGS",
        entityType: "SystemSetting",
        entityId: setting.id,
        afterData: JSON.stringify(setting),
        ipAddress,
        userAgent,
      },
    });
  }

  // Convert Decimal to number for client safety, since Next.js server actions
  // have trouble sending Decimal objects to client components directly if not careful
  const plainSetting = {
    ...setting,
    contractValueThreshold: Number(setting.contractValueThreshold.toString()),
  } as SystemSettingsInput & { id: string; updatedAt: Date; updatedById: string | null };

  return plainSetting;
}

export async function updateSystemSettings(input: SystemSettingsInput) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  if (!canManageUsers(session)) {
    throw new Error("Forbidden");
  }

  const validatedData = systemSettingsSchema.parse(input);

  if (!("systemSetting" in prisma)) {
    throw new Error("Prisma Client chưa có delegate systemSetting. Hãy chạy prisma generate, migrate/db push và restart dev server.");
  }

  const existingSetting = await prisma.systemSetting.findFirst();
  if (!existingSetting) {
    throw new Error("Settings not initialized");
  }

  const { ipAddress, userAgent } = await getClientIpAndUserAgent();

  const updatedSetting = await prisma.$transaction(async (tx) => {
    const newSetting = await tx.systemSetting.update({
      where: { id: existingSetting.id },
      data: {
        ...validatedData,
        taxCode: validatedData.taxCode ?? "",
        hotline: validatedData.hotline ?? "",
        updatedById: session.id,
        version: {
          increment: 1,
        },
      },
    });

    // Write audit log
    await tx.auditLog.create({
      data: {
        userId: session.id,
        action: "UPDATE_SETTINGS",
        entityType: "SystemSetting",
        entityId: existingSetting.id,
        beforeData: JSON.stringify(existingSetting),
        afterData: JSON.stringify(newSetting),
        ipAddress,
        userAgent,
      },
    });

    return newSetting;
  });

  revalidatePath("/settings");

  return {
    ...updatedSetting,
    contractValueThreshold: Number(updatedSetting.contractValueThreshold.toString()),
  } as SystemSettingsInput & { id: string; updatedAt: Date; updatedById: string | null };
}
