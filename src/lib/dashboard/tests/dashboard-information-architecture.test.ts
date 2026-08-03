import { describe, expect, it } from "vitest";
import type { DashboardActionItem, DashboardProjectOverview } from "@/lib/dashboard/dashboard-queries";
import { resolveDashboardContext } from "@/lib/dashboard/dashboard-context";
import {
  selectDataQualityPriorityProjects,
  selectOperationalInterventionProjects,
  selectProjectNextActions,
} from "@/lib/dashboard/dashboard-information-architecture";

function projectFixture(overrides: Partial<DashboardProjectOverview> = {}): DashboardProjectOverview {
  return {
    id: "project-1",
    code: "QA-1",
    name: "Nhà văn phòng điều hành 5 tầng – Khu công nghiệp Từ Hiệp và hạ tầng kỹ thuật phụ trợ",
    displayName: null,
    location: null,
    identityQualifier: null,
    status: "ACTIVE",
    plannedProgressPercent: null,
    actualProgressPercent: null,
    variancePercent: null,
    actualProgressDataStatus: "NO_APPROVED_ENTRIES",
    completenessCategory: "MISSING_BOTH",
    approvedActualQuantity: null,
    totalDesignQuantity: null,
    lastActualProgressAt: null,
    actualProgressWarnings: [],
    workItemCount: 0,
    quantityUnitStatus: "NOT_APPLICABLE",
    quantityUnit: null,
    quantityUnitCount: 0,
    updatedAt: new Date("2026-07-29T00:00:00.000Z"),
    startDate: null,
    endDate: null,
    daysRemaining: null,
    health: "NO_DATA",
    warning: "Chưa đủ dữ liệu",
    ...overrides,
  };
}

function actionFixture(overrides: Partial<DashboardActionItem> = {}): DashboardActionItem {
  return {
    id: "report-1",
    projectId: "project-1",
    title: "Vướng mắc an toàn tại hiện trường",
    projectName: "Công trình QA",
    type: "Sự cố / Vướng mắc",
    priority: "HIGH",
    status: "Khẩn cấp",
    createdAt: null,
    href: "/reports?projectId=project-1",
    reason: "Ghi nhận nguy cơ mất an toàn cần xử lý ngay.",
    targetType: "SITE_REPORT",
    targetId: "report-1",
    assignee: "Chỉ huy trưởng QA",
    dueDateLabel: null,
    ageLabel: "Phát sinh 29/07/2026",
    ...overrides,
  };
}

describe("Dashboard context", () => {
  it("derives mode only from the validated selected project id", () => {
    expect(resolveDashboardContext(null)).toEqual({ mode: "PORTFOLIO", projectId: null });
    expect(resolveDashboardContext("project-1")).toEqual({ mode: "PROJECT", projectId: "project-1" });
  });
});

describe("Dashboard semantic selectors", () => {
  it("does not add projects to operational intervention merely because data is missing", () => {
    const missing = projectFixture();
    const operational = selectOperationalInterventionProjects({ projectOverview: [missing], actionItems: [] });
    const dataQuality = selectDataQualityPriorityProjects([missing]);

    expect(operational.items).toEqual([]);
    expect(dataQuality.items).toHaveLength(1);
    expect(dataQuality.items[0].reason).toContain("Chưa có kế hoạch");
  });

  it("keeps reason and CTA semantic when one project qualifies for both lists", () => {
    const overlapping = projectFixture();
    const operational = selectOperationalInterventionProjects({ projectOverview: [overlapping], actionItems: [actionFixture()] });
    const dataQuality = selectDataQualityPriorityProjects([overlapping]);

    expect(operational.items).not.toEqual(dataQuality.items);
    expect(operational.items[0]).toMatchObject({ badgeLabel: "Vấn đề hiện trường", ctaLabel: "Mở báo cáo hiện trường" });
    expect(dataQuality.items[0]).toMatchObject({ ctaLabel: "Bổ sung kế hoạch" });
    expect(operational.items[0].reason).not.toBe(dataQuality.items[0].reason);
    expect(operational.items[0].ctaLabel).not.toBe(dataQuality.items[0].ctaLabel);
  });

  it("uses totalCount independently from the visible five-item limit", () => {
    const projects = Array.from({ length: 11 }, (_, index) => projectFixture({ id: `project-${index}`, code: `QA-${index}` }));
    const selection = selectDataQualityPriorityProjects(projects);

    expect(selection.totalCount).toBe(11);
    expect(selection.visibleCount).toBe(5);
    expect(selection.maxVisible).toBe(5);
  });

  it("ranks a valid negative variance as operational without using completeness", () => {
    const delayed = projectFixture({
      id: "delayed",
      completenessCategory: "COMPLETE",
      plannedProgressPercent: 70,
      actualProgressPercent: 40,
      variancePercent: -30,
      actualProgressDataStatus: "AVAILABLE",
      health: "DELAYED",
    });
    const selection = selectOperationalInterventionProjects({ projectOverview: [delayed], actionItems: [] });

    expect(selection.items[0]).toMatchObject({ projectId: "delayed", badgeLabel: "Chậm tiến độ", ctaLabel: "Mở tổng hợp tiến độ" });
    expect(selection.items[0].reason).toContain("30 điểm %");
  });

  it("aggregates multiple operational signals by project and keeps the most severe real action", () => {
    const project = projectFixture({ id: "project-1", identityQualifier: "Gói thầu QA-01" });
    const selection = selectOperationalInterventionProjects({
      projectOverview: [project],
      actionItems: [
        actionFixture({ id: "task-1", targetType: "WORK_TASK", targetId: "task-1", priority: "MEDIUM", type: "Nhiệm vụ", reason: "Nhiệm vụ nghiệm thu đã quá hạn.", assignee: "Nguyễn Văn A", ageLabel: "Quá hạn 3 ngày" }),
        actionFixture({ id: "report-2", targetId: "report-2", priority: "HIGH", reason: "Rào chắn an toàn tại khu vực thi công bị thiếu.", assignee: "Trần Văn B", ageLabel: "Phát sinh 28/07/2026" }),
      ],
    });

    expect(selection.items).toHaveLength(1);
    expect(selection.items[0]).toMatchObject({
      reason: "Rào chắn an toàn tại khu vực thi công bị thiếu.",
      assignee: "Trần Văn B",
      timeLabel: "Phát sinh 28/07/2026",
      additionalIssueCount: 1,
      projectQualifier: "Gói thầu QA-01",
    });
  });

  it("builds project actions from semantic null/status values without actual-to-planned fallback", () => {
    const actions = selectProjectNextActions(projectFixture({ plannedProgressPercent: 65 }));

    expect(actions.map((action) => action.id)).toContain("entries");
    expect(actions.map((action) => action.id)).not.toContain("plan");
    expect(actions.map((action) => action.id)).toContain("summary");
  });
});
