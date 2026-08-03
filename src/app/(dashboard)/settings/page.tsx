import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSettingsAccess } from "@/lib/settings/settings-permissions";
import { getSettingsSnapshot } from "@/lib/settings/system-settings";
import { getSettingsRoleLabel, parseSettingsAuditPayload } from "@/lib/settings/settings-audit";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Cài đặt hệ thống | ERP Công trình",
  description: "Quản lý thông tin doanh nghiệp và chính sách tài liệu đang được hệ thống áp dụng.",
};

type SettingsPageProps = {
  searchParams: Promise<{ section?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const access = getSettingsAccess(session.role);
  if (!access.canView) redirect("/projects");

  const [settings, params, rawChanges] = await Promise.all([
    getSettingsSnapshot(),
    searchParams,
    access.canViewAdministration
      ? prisma.auditLog.findMany({
          where: { entityType: "SystemSetting" },
          orderBy: { createdAt: "desc" },
          take: 12,
          include: { user: { select: { name: true, role: true } } },
        })
      : Promise.resolve([]),
  ]);

  const requestedSection = params.section;
  const initialSection = requestedSection === "documents" || (requestedSection === "administration" && access.canViewAdministration)
    ? requestedSection
    : "company";
  const changes = rawChanges
    .filter((change) => {
      const payload = parseSettingsAuditPayload(change.afterData);
      return payload?.environment !== "QA" && payload?.source !== "AUTOMATED_TEST";
    })
    .map((change) => {
      const payload = parseSettingsAuditPayload(change.afterData);
      return {
        ...change,
        user: payload?.actor
          ? { name: payload.actor.displayName, role: getSettingsRoleLabel(payload.actor.role) }
          : change.user ? { name: change.user.name, role: getSettingsRoleLabel(change.user.role) } : { name: change.userId ? "Tài khoản đã bị xóa" : "Không có thông tin người thực hiện", role: null },
      };
    });

  return (
    <SettingsWorkspace
      initialSettings={settings}
      initialSection={initialSection}
      access={access}
      recentChanges={changes.map((change) => ({
        id: change.id,
        action: change.action,
        beforeData: change.beforeData,
        afterData: change.afterData,
        createdAt: change.createdAt.toISOString(),
        actorName: change.user?.name ?? "Không xác định",
        actorRole: change.user?.role ?? null,
      }))}
    />
  );
}
