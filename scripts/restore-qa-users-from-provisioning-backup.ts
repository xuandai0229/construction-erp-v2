import dotenv from "dotenv";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const backupPath = path.resolve(
  process.cwd(),
  "backups/site-commander-account-provisioning/pre-provisioning-2026-08-13T08-57-01-360Z.json",
);
const restoreIds = new Set([
  "qa_admin_override_id",
  "qa_closure_admin",
  "qa_freeze_admin",
  "cmsczcskg00009ck57x7moaxt",
]);

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL chưa được cấu hình.");
  const backup = JSON.parse(await readFile(backupPath, "utf8")) as {
    tables: {
      User: Array<{
        id: string;
        email: string;
        username: string | null;
        password: string;
        name: string;
        role: UserRole;
        phone: string | null;
        avatar: string | null;
        isActive: boolean;
        mustChangePassword: boolean;
        passwordChangedAt: string | null;
        deletedAt: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
    };
  };
  const rows = backup.tables.User.filter((user) => restoreIds.has(user.id));
  if (rows.length !== restoreIds.size) throw new Error("Backup không đủ bốn tài khoản QA cần phục hồi.");

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    for (const user of rows) {
      const data = {
        email: user.email,
        username: user.username,
        password: user.password,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        passwordChangedAt: user.passwordChangedAt ? new Date(user.passwordChangedAt) : null,
        deletedAt: user.deletedAt ? new Date(user.deletedAt) : null,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      };
      await prisma.user.upsert({
        where: { id: user.id },
        create: { id: user.id, ...data },
        update: data,
      });
    }
    console.log(JSON.stringify({ restoredFrom: backupPath, restoredUserIds: [...restoreIds], passwordsLogged: false }));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
