import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageUsers, ROLE_DISPLAY_NAMES, getAllowedRolesForActor, USER_ROLE_LEVEL } from "@/lib/rbac";
import { PROJECT_ROLE_DISPLAY_NAMES } from "@/lib/roles/role-registry";
import prisma from "@/lib/prisma";
import { UserManagementClient } from "@/components/users/user-management-client";
import { KpiCard, PageHeading } from "@/components/ui/enterprise";
import { Users, Shield, HardHat, Activity } from "lucide-react";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");
  if (!canManageUsers(session)) redirect("/projects");

  const users = await prisma.user.findMany({
    include: {
      projectMembers: {
        where: { deletedAt: null, isActive: true },
        include: {
          project: { select: { id: true, code: true, name: true } },
        },
      },
      supervisionScope: {
        include: { projects: true }
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    select: { id: true, code: true, name: true, status: true },
    orderBy: { code: "asc" },
  });

  // Count stats (exclude soft deleted from stats except total if wanted, but better exclude)
  const activeAndLockedUsers = users.filter(u => u.deletedAt === null);
  const totalUsers = activeAndLockedUsers.length;
  const directors = activeAndLockedUsers.filter(u => u.role === "DIRECTOR" || u.role === "DEPUTY_DIRECTOR").length;
  const commanders = activeAndLockedUsers.filter(u => u.role === "CHIEF_COMMANDER").length;
  const activeUsers = activeAndLockedUsers.filter(u => u.isActive).length;

  const serializedUsers = JSON.parse(JSON.stringify(users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    phone: u.phone,
    role: u.role,
    roleDisplay: ROLE_DISPLAY_NAMES[u.role],
    isActive: u.isActive,
    deletedAt: u.deletedAt ? u.deletedAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
    assignedProjects: u.projectMembers.map(pm => ({
      id: pm.project.id,
      code: pm.project.code,
      name: pm.project.name,
      role: pm.role,
      roleDisplay: PROJECT_ROLE_DISPLAY_NAMES[pm.role],
    })),
    supervisionScopeType: u.supervisionScope?.scopeType || null,
    supervisionProjectIds: u.supervisionScope?.projects.map(p => p.projectId) || [],
  }))));

  // Compute allowed roles for this actor
  const allowedRoles = getAllowedRolesForActor(session.role).map(r => ({
    role: r,
    label: ROLE_DISPLAY_NAMES[r],
  }));
  const projectRoleOptions = Object.entries(PROJECT_ROLE_DISPLAY_NAMES).map(([role, label]) => ({ role, label }));

  return (
    <div className="app-page space-y-6 pt-2 sm:pt-0">
      <PageHeading
        title="Quản lý tài khoản"
        description="Tạo và quản lý tài khoản người dùng trong hệ thống"
      />

      <p className="text-xs text-[var(--muted-foreground)]">KPI tính trên toàn hệ thống, không đổi theo bộ lọc bảng. “Tài khoản hiện hành”, “GĐ / Phó GĐ” và “Chỉ huy trưởng” loại tài khoản ngừng sử dụng; “Đang hoạt động” chỉ đếm `isActive=true`.</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Tài khoản hiện hành"
          value={totalUsers}
          tone="slate"
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          label="GĐ / Phó GĐ"
          value={directors}
          tone="blue"
          icon={<Shield className="h-5 w-5" />}
        />
        <KpiCard
          label="Chỉ huy trưởng"
          value={commanders}
          tone="emerald"
          icon={<HardHat className="h-5 w-5" />}
        />
        <KpiCard
          label="Đang hoạt động"
          value={activeUsers}
          tone="amber"
          icon={<Activity className="h-5 w-5" />}
        />
      </div>

      <UserManagementClient 
        initialUsers={serializedUsers}
        projects={JSON.parse(JSON.stringify(projects))}
        currentUserId={session.id}
        currentUserRole={session.role}
        allowedRoles={allowedRoles}
        projectRoleOptions={projectRoleOptions}
        roleLevels={USER_ROLE_LEVEL}
      />
    </div>
  );
}
