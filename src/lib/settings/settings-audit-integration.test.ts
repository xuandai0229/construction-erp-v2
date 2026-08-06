import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createSettingsAuditPayload, parseSettingsAuditPayload, getSettingsFieldLabel } from "./settings-audit";
import { sanitizeAuditData } from "@/lib/audit";

const dbUrl = process.env.QA_DATABASE_URL;
if (!dbUrl) throw new Error("QA_DATABASE_URL is required; credential fallback is prohibited");

describe("Phase 6 — Settings Audit Integration Tests", () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let prisma: PrismaClient;

  let testRunId = `HR_PHASE_4_1_3_${Date.now()}`;
  let adminUser: any;
  let setting: any;

  beforeAll(async () => {
    process.env.DATABASE_URL = dbUrl;
    pool = new Pool({ connectionString: dbUrl });
    adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });

    adminUser = await prisma.user.create({
      data: {
        email: `admin_${testRunId}@qa-e2e.local`,
        name: "Admin User",
        password: "hashed_password",
        role: "ADMIN",
      }
    });

    setting = await prisma.systemSetting.findFirst();
    if (!setting) {
      setting = await prisma.systemSetting.create({
        data: {
          companyName: "QA Company",
          taxCode: "1234567890",
          hotline: "1900 1234",
          maxUploadSizeMb: 50,
          allowedExtensions: ".pdf,.docx",
          timezone: "Asia/Ho_Chi_Minh",
          currency: "VND",
        }
      });
    }
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { userId: adminUser.id } });
    if (setting) await prisma.systemSetting.delete({ where: { id: setting.id } });
    await prisma.user.delete({ where: { id: adminUser.id } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("1 & 2. ADMIN changes hotline - audit stores actor snapshot, metadata, before & after", async () => {
    const batchId = "batch_test_01";
    const beforeVal = { hotline: setting.hotline };
    const afterVal = { hotline: "1900 9999" };
    const actorSnapshot = {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      username: adminUser.username || "",
      role: adminUser.role,
      phone: null,
      isActive: true,
    };

    process.env.SETTINGS_AUDIT_ENVIRONMENT = "QA";
    process.env.SETTINGS_AUDIT_SOURCE = "USER_INTERFACE";

    const payload = createSettingsAuditPayload({
      section: "company",
      batchId,
      changedFields: ["hotline"],
      before: beforeVal,
      after: afterVal,
      actor: actorSnapshot,
    });

    const auditLog = await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "UPDATE_SETTINGS_SECTION",
        entityType: "SystemSetting",
        entityId: setting.id,
        beforeData: JSON.stringify(beforeVal),
        afterData: JSON.stringify(payload),
        ipAddress: "127.0.0.1",
        userAgent: "IntegrationTestAgent/1.0",
      },
    });

    expect(auditLog.id).toBeDefined();
    expect(auditLog.ipAddress).toBe("127.0.0.1");

    const parsed = parseSettingsAuditPayload(auditLog.afterData)!;
    expect(parsed.batchId).toBe(batchId);
    expect(parsed.actor?.userId).toBe(adminUser.id);
    expect(parsed.actor?.displayName).toBe(adminUser.name);
    expect(parsed.actor?.email).toBe(adminUser.email);
    expect(parsed.actor?.role).toBe("ADMIN");
    expect(parsed.environment).toBe("QA");
    expect(parsed.source).toBe("USER_INTERFACE");
    expect(parsed.before).toEqual(beforeVal);
    expect(parsed.after).toEqual(afterVal);
  });

  it("3. Multiple fields changed in one save share batchId", async () => {
    const batchId = "batch_multi_field_02";
    const beforeVal = { companyName: setting.companyName, hotline: "1900 8888" };
    const afterVal = { companyName: "Công ty Mới", hotline: "1900 9999" };
    const actorSnapshot = {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      username: adminUser.username || "",
      role: adminUser.role,
      phone: null,
      isActive: true,
    };

    const payload = createSettingsAuditPayload({
      section: "company",
      batchId,
      changedFields: ["companyName", "hotline"],
      before: beforeVal,
      after: afterVal,
      actor: actorSnapshot,
    });

    const auditLog = await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "UPDATE_SETTINGS_SECTION",
        entityType: "SystemSetting",
        entityId: setting.id,
        beforeData: JSON.stringify(beforeVal),
        afterData: JSON.stringify(payload),
        ipAddress: "127.0.0.1",
        userAgent: "IntegrationTestAgent/1.0",
      },
    });

    const parsed = parseSettingsAuditPayload(auditLog.afterData)!;
    expect(parsed.batchId).toBe(batchId);
    expect(parsed.changedFields).toEqual(["companyName", "hotline"]);
  });

  it("4. Audit retains actor snapshot even after user deletion", async () => {
    // Create temporary actor to delete
    const tempActor = await prisma.user.create({
      data: {
        email: "temp_actor_deleted@qa-e2e.local",
        name: "Người Dùng Tạm Thời",
        password: "hashed_password",
        role: "ADMIN",
      },
    });

    const payload = createSettingsAuditPayload({
      section: "company",
      batchId: "batch_deleted_actor",
      changedFields: ["hotline"],
      before: { hotline: "111" },
      after: { hotline: "222" },
      actor: {
        id: tempActor.id,
        name: tempActor.name,
        email: tempActor.email,
        username: null,
        role: tempActor.role,
        phone: null,
        isActive: true,
      },
    });

    const auditLog = await prisma.auditLog.create({
      data: {
        userId: tempActor.id,
        action: "UPDATE_SETTINGS_SECTION",
        entityType: "SystemSetting",
        entityId: "setting-1",
        afterData: JSON.stringify(payload),
      },
    });

    // Delete user
    await prisma.user.delete({ where: { id: tempActor.id } });

    // Fetch audit log with user relation
    const reFetched = await prisma.auditLog.findUnique({
      where: { id: auditLog.id },
      include: { user: true },
    });

    expect(reFetched?.user).toBeNull();
    const parsed = parseSettingsAuditPayload(reFetched?.afterData || null)!;
    expect(parsed.actor?.displayName).toBe("Người Dùng Tạm Thời");
    expect(parsed.actor?.email).toBe("temp_actor_deleted@qa-e2e.local");
  });

  it("5. Audit automation source filtering (AUTOMATED_TEST vs USER_INTERFACE)", async () => {
    process.env.SETTINGS_AUDIT_ENVIRONMENT = "QA";
    process.env.SETTINGS_AUDIT_SOURCE = "AUTOMATED_TEST";

    const payload = createSettingsAuditPayload({
      section: "documents",
      batchId: "batch_auto_test",
      changedFields: ["maxUploadSizeMb"],
      before: { maxUploadSizeMb: 50 },
      after: { maxUploadSizeMb: 100 },
      actor: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        username: null,
        role: adminUser.role,
        phone: null,
        isActive: true,
      },
    });

    expect(payload.source).toBe("AUTOMATED_TEST");
    expect(payload.environment).toBe("QA");
  });

  it("6. Redaction of sensitive fields in audit payload", async () => {
    const rawData = {
      password: "SuperSecretPassword123!",
      token: "bearer_xyz_999",
      secret: "api_key_888",
      companyName: "Công ty Minh Bạch",
    };

    const sanitized = sanitizeAuditData(rawData) as Record<string, any>;
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.token).toBe("[REDACTED]");
    expect(sanitized.secret).toBe("[REDACTED]");
    expect(sanitized.companyName).toBe("Công ty Minh Bạch");
  });

  it("11 & 12. Vietnamese field labels mapping", async () => {
    expect(getSettingsFieldLabel("companyName")).toBe("Tên doanh nghiệp");
    expect(getSettingsFieldLabel("taxCode")).toBe("Mã số thuế");
    expect(getSettingsFieldLabel("hotline")).toBe("Hotline nội bộ");
    expect(getSettingsFieldLabel("maxUploadSizeMb")).toBe("Dung lượng tải lên tối đa");
    expect(getSettingsFieldLabel("allowedExtensions")).toBe("Định dạng tệp được phép");
    expect(getSettingsFieldLabel("enforceNamingConvention")).toBe("Bắt buộc chuẩn đặt tên hồ sơ");
    expect(getSettingsFieldLabel("autoVersioning")).toBe("Tự động tạo phiên bản");
  });
});
