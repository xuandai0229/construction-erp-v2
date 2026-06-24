import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageUsers, ROLE_DISPLAY_NAMES } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { UserManagementClient } from "@/components/users/user-management-client";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageUsers(session)) redirect("/projects");

  const users = await prisma.user.findMany({
    include: {
      projectMembers: {
        where: { deletedAt: null, isActive: true },
        include: {
          project: { select: { id: true, code: true, name: true } },
        },
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
    })),
  }))));

  return (
    <div className="app-page space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-heading">Quản lý tài khoản</h1>
          <p className="page-description">Tạo và quản lý tài khoản người dùng trong hệ thống</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng tài khoản</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalUsers}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">GĐ / Phó GĐ</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{directors}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Chỉ huy trưởng</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{commanders}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đang hoạt động</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{activeUsers}</p>
        </div>
      </div>

      <UserManagementClient 
        initialUsers={serializedUsers}
        projects={JSON.parse(JSON.stringify(projects))}
      />
    </div>
  );
}
