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
    throw new Error("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.");
  }
  // Allow ADMIN, DIRECTOR, DEPUTY_DIRECTOR to view settings
  if (!canManageUsers(session)) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
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

import { SETTINGS_REGISTRY, SettingDefinition } from "@/lib/settings/settings-registry";

function checkUpdatePermission(
  key: keyof SystemSettingsInput,
  oldVal: any,
  newVal: any,
  role: string
) {
  if (oldVal === newVal) return; // No change, allow

  const def = SETTINGS_REGISTRY.find(d => d.key === key);
  if (!def) {
    throw new Error(`Cấu hình không hợp lệ: ${key}`);
  }

  if (!def.editable || !def.implemented) {
    throw new Error(`Cấu hình ${def.label} hiện đang ở chế độ chỉ đọc hoặc chưa được kích hoạt.`);
  }

  if (role === "ADMIN") {
    return; // Admin can change any editable setting
  }

  if (role === "DIRECTOR") {
    if (def.category !== "company") {
      throw new Error(`Giám đốc chỉ được phép chỉnh sửa nhóm thông tin doanh nghiệp. Không được sửa: ${def.label}`);
    }
    return;
  }

  throw new Error(`Vai trò ${role} không được phép thay đổi cài đặt hệ thống.`);
}

export async function updateSystemSettings(input: SystemSettingsInput) {
  const session = await getSession();
  if (!session) {
    throw new Error("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.");
  }
  // First layer: Must be high level user
  if (!canManageUsers(session)) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }

  const validatedData = systemSettingsSchema.parse(input);

  if (!("systemSetting" in prisma)) {
    throw new Error("Prisma Client chưa có delegate systemSetting. Hãy chạy prisma generate, migrate/db push và restart dev server.");
  }

  const existingSetting = await prisma.systemSetting.findFirst();
  if (!existingSetting) {
    throw new Error("Settings not initialized");
  }

  // Second layer: check specific keys
  // Convert existing threshold back to number for comparison
  const existingValues = {
    ...existingSetting,
    contractValueThreshold: Number(existingSetting.contractValueThreshold.toString()),
  };

  const changedData: any = {};
  for (const key of Object.keys(validatedData) as (keyof SystemSettingsInput)[]) {
    const oldVal = existingValues[key];
    const newVal = validatedData[key];
    
    // Loose compare for primitives
    if (oldVal !== newVal) {
      checkUpdatePermission(key, oldVal, newVal, session.role);
      changedData[key] = newVal;
    }
  }

  if (Object.keys(changedData).length === 0) {
    // No actual changes
    return {
      ...existingSetting,
      contractValueThreshold: Number(existingSetting.contractValueThreshold.toString()),
    } as SystemSettingsInput & { id: string; updatedAt: Date; updatedById: string | null };
  }

  const { ipAddress, userAgent } = await getClientIpAndUserAgent();

  const updatedSetting = await prisma.$transaction(async (tx) => {
    // Only update changed data that are allowed
    const newSetting = await tx.systemSetting.update({
      where: { id: existingSetting.id },
      data: {
        ...changedData,
        taxCode: changedData.taxCode ?? existingSetting.taxCode,
        hotline: changedData.hotline ?? existingSetting.hotline,
        updatedById: session.id,
        version: {
          increment: 1,
        },
      },
    });

    // Write audit log with only changed data diff
    await tx.auditLog.create({
      data: {
        userId: session.id,
        action: "UPDATE_SETTINGS",
        entityType: "SystemSetting",
        entityId: existingSetting.id,
        beforeData: JSON.stringify(
          Object.keys(changedData).reduce((acc, k) => ({ ...acc, [k]: existingValues[k as keyof typeof existingValues] }), {})
        ),
        afterData: JSON.stringify(changedData),
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
