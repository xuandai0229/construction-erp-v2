/**
 * Read-only production-data audit for account roles and project memberships.
 *
 * This script deliberately performs only Prisma read operations. It never
 * selects password hashes, session tokens, or other authentication secrets.
 * Run: npx tsx scripts/audit-users-roles-and-permissions.ts
 */
import "dotenv/config";
import { UserRole } from "@prisma/client";
import prisma from "../src/lib/prisma";

const HIGH_LEVEL_ROLES: UserRole[] = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"];

const normalize = (value: string | null) => value?.trim().toLocaleLowerCase("vi-VN") ?? "";
const foldVietnamese = (value: string | null) => normalize(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/g, "d");

function duplicateValues<T extends { id: string }>(
  rows: T[],
  getValue: (row: T) => string | null,
) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const normalized = normalize(getValue(row));
    if (!normalized) continue;
    grouped.set(normalized, [...(grouped.get(normalized) ?? []), row]);
  }

  return [...grouped.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([value, matches]) => ({ value, userIds: matches.map((match) => match.id) }));
}

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      isActive: true,
      deletedAt: true,
      projectMembers: {
        select: {
          role: true,
          isActive: true,
          deletedAt: true,
          leftAt: true,
          project: { select: { id: true, code: true, name: true, deletedAt: true } },
        },
        orderBy: { project: { code: "asc" } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const activeUsers = users.filter((user) => user.isActive && user.deletedAt === null);
  const inactiveOrDeletedUsers = users.filter((user) => !user.isActive || user.deletedAt !== null);
  const byRole = Object.fromEntries(
    Object.values(UserRole).map((role) => [role, users.filter((user) => user.role === role).length]),
  );

  const highLevel = users
    .filter((user) => HIGH_LEVEL_ROLES.includes(user.role))
    .map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.name,
      databaseRole: user.role,
      isActive: user.isActive,
      deletedAt: user.deletedAt?.toISOString() ?? null,
      projects: user.projectMembers.map((membership) => ({
        id: membership.project.id,
        code: membership.project.code,
        name: membership.project.name,
        projectRole: membership.role,
        membershipActive: membership.isActive,
        membershipDeletedAt: membership.deletedAt?.toISOString() ?? null,
        leftAt: membership.leftAt?.toISOString() ?? null,
        projectDeletedAt: membership.project.deletedAt?.toISOString() ?? null,
      })),
    }));

  const xd = users.filter((user) => {
    const username = foldVietnamese(user.username);
    const displayName = foldVietnamese(user.name);
    return username === "xd" || username.startsWith("xd") || displayName === "xd" || displayName.startsWith("xd ");
  });
  const phamThuHang = users.filter((user) => foldVietnamese(user.name).includes("pham thu hang"));
  const sameRecord = xd.some((xdUser) => phamThuHang.some((person) => person.id === xdUser.id));

  const result = {
    audit: "users-roles-and-permissions",
    mode: "READ_ONLY",
    totals: {
      users: users.length,
      active: activeUsers.length,
      inactiveOrDeleted: inactiveOrDeletedUsers.length,
    },
    usersBySystemRole: byRole,
    highLevelAccounts: highLevel,
    accountXd: xd.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.name,
      databaseRole: user.role,
      isActive: user.isActive,
      deletedAt: user.deletedAt?.toISOString() ?? null,
    })),
    accountPhamThuHang: phamThuHang.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.name,
      databaseRole: user.role,
      isActive: user.isActive,
      deletedAt: user.deletedAt?.toISOString() ?? null,
    })),
    xdAndPhamThuHangAreSameRecord: sameRecord,
    duplicateIdentifiers: {
      username: duplicateValues(users, (user) => user.username),
      email: duplicateValues(users, (user) => user.email),
      phone: duplicateValues(users, (user) => user.phone),
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error("Read-only audit failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
