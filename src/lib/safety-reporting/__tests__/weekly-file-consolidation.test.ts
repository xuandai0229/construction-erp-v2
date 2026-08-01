import { describe, it, expect, vi, beforeEach } from "vitest";
import { SafetyWeeklyFileService, canDeleteWeeklyFile } from "../weekly-file-service";
import prisma from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  default: {
    safetyWeeklyFile: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    safetyReportPlan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    safetySelfAssessmentReport: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    safetyReportAuditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe("SafetyWeeklyFileService Consolidation & RBAC Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("evaluates canDeleteWeeklyFile permissions correctly", () => {
    const admin = { id: "admin-1", role: "ADMIN" };
    const creator = { id: "user-1", role: "STAFF" };
    const stranger = { id: "user-2", role: "STAFF" };
    const wf = { createdById: "user-1" };

    expect(canDeleteWeeklyFile({ actor: admin, weeklyFile: wf })).toBe(true);
    expect(canDeleteWeeklyFile({ actor: creator, weeklyFile: wf })).toBe(true);
    expect(canDeleteWeeklyFile({ actor: stranger, weeklyFile: wf })).toBe(false);
  });

  it("aggregates SafetyWeeklyFile with Plans and Assessments into summary list", async () => {
    const monday = new Date("2026-07-20T00:00:00.000Z");
    const sunday = new Date("2026-07-26T23:59:59.000Z");

    const mockWf = {
      id: "wf-123",
      fileCode: "HS-ATLĐ-2026-0001",
      officialDocumentNumber: "12/KH-ATLĐ",
      periodStart: monday,
      periodEnd: sunday,
      createdById: "user-1",
      createdBy: { id: "user-1", name: "Nguyễn Văn A", role: "STAFF" },
      updatedAt: new Date("2026-07-21T10:00:00.000Z"),
      plans: [
        {
          id: "plan-123",
          documentNumber: "KH-2026-001",
          officialDocumentNumber: "12/KH-ATLĐ",
          entries: [{ id: "e1", projectId: "p1", projectNameSnapshot: "Dự án Landmark 81" }],
        },
      ],
      assessments: [
        {
          id: "report-456",
          documentNumber: "BC-2026-001",
          entries: [{ id: "ae1", projectId: "p1", projectNameSnapshot: "Dự án Landmark 81" }],
        },
      ],
    };

    (prisma.safetyWeeklyFile.findMany as any).mockResolvedValue([mockWf]);

    const actor = { id: "user-1", role: "STAFF" };
    const res = await SafetyWeeklyFileService.getWeeklyFilesList(actor);

    expect(res.items.length).toBe(1);
    const item = res.items[0];
    expect(item.id).toBe("wf-123");
    expect(item.planId).toBe("plan-123");
    expect(item.reportId).toBe("report-456");
    expect(item.planStatus).toBe("SAVED");
    expect(item.assessmentStatus).toBe("SAVED");
    expect(item.canDelete).toBe(true);
  });

  it("handles atomic soft-delete of weekly file, plan, and assessment records", async () => {
    const mockWf = {
      id: "wf-123",
      fileCode: "HS-ATLĐ-2026-0001",
      periodStart: new Date(),
      createdById: "user-1",
      deletedAt: null,
    };

    (prisma.safetyWeeklyFile.findFirst as any).mockResolvedValue(mockWf);

    const actor = { id: "user-1", role: "STAFF" };
    const result = await SafetyWeeklyFileService.deleteWeeklyFile(actor, "wf-123");

    expect(result.ok).toBe(true);
    expect(prisma.safetyWeeklyFile.update).toHaveBeenCalled();
    expect(prisma.safetyReportPlan.updateMany).toHaveBeenCalled();
    expect(prisma.safetySelfAssessmentReport.updateMany).toHaveBeenCalled();
    expect(prisma.safetyReportAuditLog.create).toHaveBeenCalled();
  });

  it("prevents deletion if actor has no permission", async () => {
    const mockWf = {
      id: "wf-123",
      fileCode: "HS-ATLĐ-2026-0001",
      periodStart: new Date(),
      createdById: "user-1",
      deletedAt: null,
    };

    (prisma.safetyWeeklyFile.findFirst as any).mockResolvedValue(mockWf);

    const strangerActor = { id: "user-2", role: "STAFF" };
    const result = await SafetyWeeklyFileService.deleteWeeklyFile(strangerActor, "wf-123");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("FORBIDDEN");
    }
    expect(prisma.safetyWeeklyFile.update).not.toHaveBeenCalled();
  });
});
