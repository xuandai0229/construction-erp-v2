"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions/permission-resolver";

type MarkNotificationReadInput = {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string | null;
  projectId: string | null;
  href: string | null;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text.length > 0 ? text : null;
}

function assertSafeComputedNotificationId(id: string) {
  const isKnownComputedId = id.startsWith("app-") || id.startsWith("rep-");
  if (!isKnownComputedId || id.length > 128) {
    throw new Error("Thông báo không hợp lệ");
  }
}

function assertSafeInternalHref(href: string | null) {
  if (!href) return;
  if (!href.startsWith("/") || href.startsWith("//")) {
    throw new Error("Đường dẫn thông báo không hợp lệ");
  }
}

export async function markGlobalNotificationRead(input: MarkNotificationReadInput) {
  const session = await getSession();
  if (!session) throw new Error("Vui lòng đăng nhập");

  const id = normalizeText(input.id);
  assertSafeComputedNotificationId(id);
  const ledgerId = `${session.id}:${id}`;

  const href = normalizeOptionalText(input.href);
  assertSafeInternalHref(href);
  const projectId = normalizeOptionalText(input.projectId);
  if (projectId) {
    await assertPermission(session, "projects.view", { projectId });
  }

  const now = new Date();
  await prisma.notification.upsert({
    where: { id: ledgerId },
    update: {
      isRead: true,
      readAt: now,
    },
    create: {
      id: ledgerId,
      userId: session.id,
      projectId,
      type: normalizeText(input.type) || "SYSTEM",
      severity: normalizeText(input.severity) || "INFO",
      title: normalizeText(input.title) || "Thông báo",
      message: normalizeOptionalText(input.message),
      href,
      isRead: true,
      readAt: now,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/approvals");
  revalidatePath("/reports");
  return { ok: true };
}
