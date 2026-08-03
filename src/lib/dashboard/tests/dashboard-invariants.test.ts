import { describe, it, expect, vi } from "vitest";
import { deriveOperationalIssueState } from "../operational-issue-service";
import type { ExecutiveDashboardScope } from "../dashboard-scope";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    project: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "proj-1",
          code: "VPTH-01",
          name: "Nhà văn phòng Tứ Hiệp",
          endDate: new Date(Date.now() - 5 * 86400000), // Overdue by 5 days
          members: [{ user: { name: "Nguyễn Văn A" } }],
        },
      ]),
    },
    siteReport: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "rep-1",
          projectId: "proj-1",
          reportDate: new Date(),
          issues: "Sự cố nứt dầm tầng 2, thiếu vật tư sắt thép",
          recommendations: "Tạm dừng thi công sàn 2",
          quality: "Cần kiểm định",
          labor: "Thiếu 5 thợ",
          materials: "Thiếu 2 tấn thép",
          weatherCondition: "Mưa lớn",
          status: "SUBMITTED", // Even if status is SUBMITTED, issue state is derived from domain content
          createdAt: new Date(),
          project: { id: "proj-1", name: "Nhà văn phòng Tứ Hiệp" },
          createdBy: { name: "Lê Văn B" },
        },
        {
          id: "rep-2",
          projectId: "proj-1",
          reportDate: new Date(),
          issues: null, // No domain issue
          status: "SUBMITTED",
          createdAt: new Date(),
          project: { id: "proj-1", name: "Nhà văn phòng Tứ Hiệp" },
          createdBy: { name: "Lê Văn B" },
        },
      ]),
    },
    materialRequest: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    fieldMaterialRequest: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { getExecutiveActionItems, getOperationalActionItems } from "../executive-action-service";

describe("Operational Action Items & Dashboard Invariants", () => {
  it("should derive operational issue state correctly based on domain content", () => {
    const issueState = deriveOperationalIssueState({
      issues: "Sự cố sập giàn giáo",
      safetyStatus: "Tai nạn lao động",
      status: "SUBMITTED",
    });

    expect(issueState.hasIssue).toBe(true);
    expect(issueState.severity).toBe("CRITICAL");
    expect(issueState.displayLabel).toBe("Khẩn cấp");
  });

  it("should exclude administrative approvals and reports with null issues", async () => {
    const scope: ExecutiveDashboardScope = {
      userId: "user-1",
      role: "DIRECTOR",
      timezone: "Asia/Ho_Chi_Minh",
      generatedAt: new Date(),
      mode: "ALL_PROJECTS",
      projectId: null,
      allowedProjectIds: ["proj-1"],
    };

    const result = await getExecutiveActionItems(scope, 10);

    // 1 overdue project risk + 1 site report with issues = 2 total
    // Note: rep-2 (SUBMITTED with null issues) MUST BE EXCLUDED!
    expect(result.total).toBe(2);
    expect(result.allItems.length).toBe(2);
    expect(result.topItems.length).toBe(2);
  });

  it("should satisfy the invariant dashboardActionKpi == actionsPageTotal", async () => {
    const scope: ExecutiveDashboardScope = {
      userId: "user-1",
      role: "DIRECTOR",
      timezone: "Asia/Ho_Chi_Minh",
      generatedAt: new Date(),
      mode: "ALL_PROJECTS",
      projectId: null,
      allowedProjectIds: ["proj-1"],
    };

    const execResult = await getExecutiveActionItems(scope, 5);
    const opResult = await getOperationalActionItems(scope, 100);

    expect(execResult.total).toBe(opResult.total);
    expect(execResult.total).toBe(opResult.allItems.length);
  });
});
