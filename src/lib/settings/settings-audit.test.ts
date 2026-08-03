import { describe, expect, it } from "vitest";
import { createSettingsAuditPayload, getSettingsFieldLabel, parseSettingsAuditPayload } from "./settings-audit";

const actor = {
  id: "user-1",
  name: "Nguyễn Văn A",
  email: "admin@example.test",
  username: "admin",
  role: "ADMIN" as const,
  phone: null,
  isActive: true,
};

describe("settings audit payload", () => {
  it("persists an actor snapshot and before/after values without raw secrets", () => {
    const payload = createSettingsAuditPayload({
      section: "company",
      batchId: "batch-1",
      changedFields: ["companyName"],
      before: { companyName: "Cũ", password: "secret" },
      after: { companyName: "Mới" },
      actor,
    });

    expect(payload.actor).toMatchObject({ displayName: "Nguyễn Văn A", email: "admin@example.test", role: "ADMIN" });
    expect(payload.before.password).toBe("[REDACTED]");
    expect(parseSettingsAuditPayload(JSON.stringify(payload))?.batchId).toBe("batch-1");
  });

  it("maps persisted keys to Vietnamese labels", () => {
    expect(getSettingsFieldLabel("maxUploadSizeMb")).toBe("Dung lượng tải lên tối đa");
    expect(getSettingsFieldLabel("unknown")).toBe("Trường cấu hình chưa được đặt tên");
  });
});
