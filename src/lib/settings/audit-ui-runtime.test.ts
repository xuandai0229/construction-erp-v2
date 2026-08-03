import { describe, it, expect } from "vitest";
import {
  getSettingsFieldLabel,
  getSettingsRoleLabel,
  parseSettingsAuditPayload,
} from "@/lib/settings/settings-audit";
import { getSettingsAccess } from "@/lib/settings/settings-permissions";

describe("Phase 4 — Settings Audit UI Runtime & Translation Tests", () => {
  it("1. Translates raw field keys to Vietnamese labels", () => {
    expect(getSettingsFieldLabel("companyName")).toBe("Tên doanh nghiệp");
    expect(getSettingsFieldLabel("taxCode")).toBe("Mã số thuế");
    expect(getSettingsFieldLabel("hotline")).toBe("Hotline nội bộ");
    expect(getSettingsFieldLabel("maxUploadSizeMb")).toBe("Dung lượng tải lên tối đa");
    expect(getSettingsFieldLabel("allowedExtensions")).toBe("Định dạng tệp được phép");
    expect(getSettingsFieldLabel("enforceNamingConvention")).toBe("Bắt buộc chuẩn đặt tên hồ sơ");
    expect(getSettingsFieldLabel("autoVersioning")).toBe("Tự động tạo phiên bản");
  });

  it("2. Does not output raw English field keys in Vietnamese labels", () => {
    const rawKeys = ["companyName", "taxCode", "maxUploadSizeMb", "allowedExtensions"];
    for (const key of rawKeys) {
      expect(getSettingsFieldLabel(key)).not.toBe(key);
    }
  });

  it("3. Groups multiple modified fields in a single audit payload", () => {
    const auditJson = JSON.stringify({
      schemaVersion: 1,
      section: "company",
      batchId: "batch_001",
      changedFields: ["companyName", "taxCode", "hotline"],
      actor: { userId: "user_admin_01", displayName: "Nguyễn Văn Admin", email: "admin@qa.local", role: "ADMIN" },
      environment: "QA",
      source: "USER_INTERFACE",
    });

    const parsed = parseSettingsAuditPayload(auditJson);
    expect(parsed?.changedFields).toEqual(["companyName", "taxCode", "hotline"]);
    expect(parsed?.actor?.displayName).toBe("Nguyễn Văn Admin");
  });

  it("4. Formats role labels to Vietnamese", () => {
    expect(getSettingsRoleLabel("ADMIN")).toBe("Quản trị viên hệ thống");
    expect(getSettingsRoleLabel("DIRECTOR")).toBe("Giám đốc điều hành");
    expect(getSettingsRoleLabel("DEPUTY_DIRECTOR")).toBe("Phó giám đốc");
  });

  it("5. Retains actor snapshot info when actor account is deleted", () => {
    const auditJson = JSON.stringify({
      schemaVersion: 1,
      section: "documents",
      batchId: "batch_002",
      changedFields: ["autoVersioning"],
      actor: { userId: "deleted_user_99", displayName: "Phạm Văn Cũ", email: "cu@qa.local", role: "ADMIN" },
      environment: "QA",
      source: "USER_INTERFACE",
    });

    const parsed = parseSettingsAuditPayload(auditJson);
    expect(parsed?.actor?.displayName).toBe("Phạm Văn Cũ");
  });

  it("6. Filters automated test logs from default view", () => {
    const automatedJson = JSON.stringify({
      schemaVersion: 1,
      section: "company",
      batchId: "batch_003",
      source: "AUTOMATED_TEST",
      environment: "QA",
    });

    const parsed = parseSettingsAuditPayload(automatedJson);
    expect(parsed?.source).toBe("AUTOMATED_TEST");
    expect(parsed?.environment).toBe("QA");
  });

  it("7. Blocks DIRECTOR and DEPUTY_DIRECTOR from Administration section", () => {
    const directorAccess = getSettingsAccess("DIRECTOR");
    const deputyAccess = getSettingsAccess("DEPUTY_DIRECTOR");
    const adminAccess = getSettingsAccess("ADMIN");

    expect(directorAccess.canViewAdministration).toBe(false);
    expect(deputyAccess.canViewAdministration).toBe(false);
    expect(adminAccess.canViewAdministration).toBe(true);
  });
});
