import { describe, expect, it } from "vitest";
import type { DashboardProjectOverview } from "@/lib/dashboard/dashboard-queries";
import { buildExecutiveStatusChartViewModel } from "@/components/dashboard/executive/executive-status-chart";

function projectFixture(overrides: Partial<DashboardProjectOverview> = {}): DashboardProjectOverview {
  return {
    id: "p-1",
    code: "PRJ-1",
    name: "Công trình kiểm thử",
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
    updatedAt: new Date("2026-07-29T00:00:00.000Z"),
    startDate: null,
    endDate: null,
    daysRemaining: null,
    health: "NO_DATA",
    warning: "Chưa đủ dữ liệu thực tế",
    ...overrides,
  };
}

describe("ExecutiveStatusChart completeness partition", () => {
  it("uses exactly one exhaustive completeness category for each project", () => {
    const projects = [
      projectFixture({ id: "complete", completenessCategory: "COMPLETE" }),
      projectFixture({ id: "missing-plan", completenessCategory: "MISSING_PLAN" }),
      projectFixture({ id: "missing-actual", completenessCategory: "MISSING_ACTUAL" }),
      projectFixture({ id: "missing-both", completenessCategory: "MISSING_BOTH" }),
    ];

    const vm = buildExecutiveStatusChartViewModel(projects);

    expect(vm.totalProjects).toBe(4);
    expect(vm.legendItems.reduce((total, item) => total + item.count, 0)).toBe(vm.totalProjects);
    expect(vm.legendItems.map((item) => item.label)).toEqual([
      "Đủ dữ liệu",
      "Thiếu kế hoạch",
      "Thiếu thực tế",
      "Thiếu cả kế hoạch và thực tế",
    ]);
  });

  it("does not expose an action list or mix progress-health groups into the donut model", () => {
    const vm = buildExecutiveStatusChartViewModel([
      projectFixture({ id: "delayed", completenessCategory: "COMPLETE", plannedProgressPercent: 60, actualProgressPercent: 35, variancePercent: -25, actualProgressDataStatus: "AVAILABLE", health: "DELAYED" }),
      projectFixture({ id: "missing", completenessCategory: "MISSING_ACTUAL", plannedProgressPercent: 60 }),
    ]);

    expect(Object.keys(vm)).not.toContain("priorityProjects");
    expect(Object.keys(vm)).not.toContain("varianceProjects");
    expect(vm.completeProgressCount).toBe(1);
    expect(vm.insufficientDataCount).toBe(1);
  });
});
