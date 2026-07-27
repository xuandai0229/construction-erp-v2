import { describe, expect, it } from "vitest";
import { sanitizeAuditData } from "./audit";

describe("security audit sanitization", () => {
  it("redacts secrets recursively without mutating the input", () => {
    const input = {
      actorId: "actor-a",
      token: "top-secret",
      nested: { cookie: "session=secret", note: "Bearer abc.def" },
    };

    expect(sanitizeAuditData(input)).toEqual({
      actorId: "actor-a",
      token: "[REDACTED]",
      nested: { cookie: "[REDACTED]", note: "Bearer [REDACTED]" },
    });
    expect(input.token).toBe("top-secret");
  });

  it("keeps the mandatory denial metadata", () => {
    const event = sanitizeAuditData({
      actorId: "actor-a",
      role: "CONSTRUCTION_SUPERVISOR",
      requestedAction: "supervision.weekly.export",
      resourceType: "SupervisionWeeklyDossier",
      resourceId: "dossier-a",
      projectId: "project-a",
      reasonCode: "OWNER_EXPORT_POLICY_DENIED",
      timestamp: new Date("2026-07-27T00:00:00.000Z"),
    });

    expect(event).toMatchObject({
      actorId: "actor-a",
      role: "CONSTRUCTION_SUPERVISOR",
      reasonCode: "OWNER_EXPORT_POLICY_DENIED",
      timestamp: "2026-07-27T00:00:00.000Z",
    });
  });
});
