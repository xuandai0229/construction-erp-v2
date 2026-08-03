import * as fs from "fs";
import * as path from "path";
import * as bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";

export const SETTINGS_E2E_RUN_ID = "RUN_20260803";
export const SETTINGS_E2E_PREFIX = "SETTINGS_E2E_";

export async function seedSettingsE2eFixtures(targetDbUrl?: string) {
  const qaDbUrl = targetDbUrl || process.env.QA_DATABASE_URL;
  if (!qaDbUrl) throw new Error("QA_DATABASE_URL is required; fallback to DATABASE_URL is prohibited");

  process.env.DATABASE_URL = qaDbUrl;
  const pool = new Pool({ connectionString: qaDbUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const rolePasswords = Object.fromEntries(
      Object.values(UserRole).map((role) => {
        const value = process.env[`SETTINGS_E2E_PASSWORD_${role}`];
        if (!value || value.length < 16) throw new Error(`SETTINGS_E2E_PASSWORD_${role} must be supplied as a strong environment secret`);
        return [role, value];
      }),
    ) as Record<UserRole, string>;

    // 1. SystemSetting (Singleton default)
    const systemSetting = await prisma.systemSetting.upsert({
      where: { id: "settings_e2e_singleton_id" },
      update: {
        companyName: "Công ty Cổ phần Xây dựng QA E2E Test",
        taxCode: "0109999888",
        hotline: "1900 8888",
        timezone: "Asia/Ho_Chi_Minh",
        currency: "VND",
        requireTwoFactorForAdmins: true,
        sessionTimeoutMinutes: 60,
        passwordRotationDays: 90,
        allowedIpMode: "restricted",
        trustedDeviceReviewDays: 30,
        auditSensitiveActions: true,
        materialRequestApproval: true,
        reportLockAfterApproval: true,
        enforceNamingConvention: true,
        autoVersioning: true,
        allowedExtensions: "pdf, docx, xlsx, dwg, jpg, png, heic",
        maxUploadSizeMb: 50,
        documentRetentionYears: 10,
        emailDailyDigest: false,
        approvalEscalation: true,
        fieldReportReminder: true,
        reminderTime: "17:30",
        escalationHours: 24,
        automaticBackup: true,
        backupFrequency: "daily",
        retentionYears: 7,
        exportRequiresApproval: true,
        maintenanceWindow: "22:00 - 23:00",
        version: 1,
      },
      create: {
        id: "settings_e2e_singleton_id",
        companyName: "Công ty Cổ phần Xây dựng QA E2E Test",
        taxCode: "0109999888",
        hotline: "1900 8888",
        timezone: "Asia/Ho_Chi_Minh",
        currency: "VND",
        requireTwoFactorForAdmins: true,
        sessionTimeoutMinutes: 60,
        passwordRotationDays: 90,
        allowedIpMode: "restricted",
        trustedDeviceReviewDays: 30,
        auditSensitiveActions: true,
        materialRequestApproval: true,
        reportLockAfterApproval: true,
        enforceNamingConvention: true,
        autoVersioning: true,
        allowedExtensions: "pdf, docx, xlsx, dwg, jpg, png, heic",
        maxUploadSizeMb: 50,
        documentRetentionYears: 10,
        emailDailyDigest: false,
        approvalEscalation: true,
        fieldReportReminder: true,
        reminderTime: "17:30",
        escalationHours: 24,
        automaticBackup: true,
        backupFrequency: "daily",
        retentionYears: 7,
        exportRequiresApproval: true,
        maintenanceWindow: "22:00 - 23:00",
        version: 1,
      },
    });

    // 2. Roles Seeding
    const roles: { role: UserRole; email: string; name: string }[] = [
      { role: "ADMIN", email: "settings_e2e_admin@qa-e2e.local", name: "QA Admin E2E" },
      { role: "DIRECTOR", email: "settings_e2e_director@qa-e2e.local", name: "QA Director E2E" },
      { role: "DEPUTY_DIRECTOR", email: "settings_e2e_deputy@qa-e2e.local", name: "QA Deputy Director E2E" },
      { role: "CHIEF_COMMANDER", email: "settings_e2e_chief@qa-e2e.local", name: "QA Chief Commander E2E" },
      { role: "MANAGER", email: "settings_e2e_manager@qa-e2e.local", name: "QA Manager E2E" },
      { role: "ENGINEER", email: "settings_e2e_engineer@qa-e2e.local", name: "QA Engineer E2E" },
      { role: "STAFF", email: "settings_e2e_staff@qa-e2e.local", name: "QA Staff E2E" },
      { role: "SUPERVISION_HEAD", email: "settings_e2e_sup_head@qa-e2e.local", name: "QA Supervision Head E2E" },
      { role: "CONSTRUCTION_SUPERVISOR", email: "settings_e2e_sup_const@qa-e2e.local", name: "QA Construction Supervisor E2E" },
    ];

    const createdUsers: Record<string, { id: string; email: string; role: UserRole }> = {};
    for (const r of roles) {
      const hashedPassword = await bcrypt.hash(rolePasswords[r.role], 10);
      const user = await prisma.user.upsert({
        where: { email: r.email },
        update: {
          name: r.name,
          role: r.role,
          password: hashedPassword,
          isActive: true,
          deletedAt: null,
        },
        create: {
          email: r.email,
          name: r.name,
          role: r.role,
          password: hashedPassword,
          isActive: true,
        },
      });
      createdUsers[r.role] = { id: user.id, email: user.email, role: user.role };
    }

    // 3. QA Project
    const projectCode = `${SETTINGS_E2E_PREFIX}PROJ_01`;
    const project = await prisma.project.upsert({
      where: { code: projectCode },
      update: {
        name: "Dự án Thử nghiệm Settings E2E",
        status: "ACTIVE",
        deletedAt: null,
      },
      create: {
        code: projectCode,
        name: "Dự án Thử nghiệm Settings E2E",
        status: "ACTIVE",
      },
    });

    // Add project membership for ADMIN & DIRECTOR
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: createdUsers.ADMIN.id,
        },
      },
      update: { role: "PROJECT_MANAGER", isActive: true, deletedAt: null },
      create: {
        projectId: project.id,
        userId: createdUsers.ADMIN.id,
        role: "PROJECT_MANAGER",
        isActive: true,
      },
    });

    // 4. Document Folder
    const folder = await prisma.documentFolder.upsert({
      where: { id: "settings_e2e_folder_01" },
      update: {
        name: "Hồ sơ nghiệm thu",
        projectId: project.id,
        deletedAt: null,
      },
      create: {
        id: "settings_e2e_folder_01",
        name: "Hồ sơ nghiệm thu",
        projectId: project.id,
      },
    });

    // Save manifest
    const manifestDir = path.join(process.cwd(), "test-results/settings-e2e");
    fs.mkdirSync(manifestDir, { recursive: true });
    const manifestPath = path.join(manifestDir, "seed-manifest.json");

    const manifestData = {
      runId: SETTINGS_E2E_RUN_ID,
      timestamp: new Date().toISOString(),
      systemSettingId: systemSetting.id,
      projectId: project.id,
      projectCode: project.code,
      folderId: folder.id,
      users: createdUsers,
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), "utf-8");
    console.log(`Saved Settings E2E fixture manifest to ${manifestPath}`);

    return manifestData;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("seed-settings-e2e-fixtures.ts")) {
  seedSettingsE2eFixtures()
    .then((data) => console.log("Seeding complete:", JSON.stringify(data.users, null, 2)))
    .catch((err) => {
      console.error("SEEDING_FAILED:", err.message);
      process.exitCode = 1;
    });
}
