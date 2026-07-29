import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ────────────────────────────────────────────
const mockFindManyReports = vi.fn();
const mockFindManyProjects = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    siteReport: { findMany: (...args: unknown[]) => mockFindManyReports(...args) },
    project: { findMany: (...args: unknown[]) => mockFindManyProjects(...args) },
  },
}));

// Import after mock setup
import {
  getWeeklyCompanySummary,
  assertWeeklyCompanySummaryPermission,
  canAggregateWeeklyCompanySummary,
} from "@/lib/reports/weekly-company-summary";

// ─── Helpers ────────────────────────────────────────────────

const makeProject = (id: string, code: string, name: string) => ({ id, code, name });

const makeReport = (
  projectId: string,
  overrides: Partial<{
    id: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    summary: string;
    issues: string;
    recommendations: string;
    generalNote: string;
    reporterName: string;
    materials: string;
    labor: string;
    quality: string;
  }> = {},
) => ({
  id: overrides.id || `rep-${Math.random()}`,
  projectId,
  status: overrides.status || "APPROVED",
  createdAt: overrides.createdAt || new Date("2026-07-26T08:00:00Z"),
  updatedAt: overrides.updatedAt || new Date("2026-07-26T10:00:00Z"),
  summary: overrides.summary || "Test summary",
  issues: overrides.issues || null,
  recommendations: overrides.recommendations || null,
  generalNote: overrides.generalNote || null,
  reporterName: overrides.reporterName || "Tester",
  materials: overrides.materials || null,
  labor: overrides.labor || null,
  quality: overrides.quality || null,
});

const PROJECTS_FIXTURE = [
  makeProject("p1", "PRJ-01", "Công trình A"),
  makeProject("p2", "PRJ-02", "Công trình B"),
  makeProject("p3", "PRJ-03", "Công trình C"),
  makeProject("p4", "PRJ-04", "Công trình D"),
  makeProject("p5", "PRJ-05", "Công trình E"),
];

beforeEach(() => {
  vi.clearAllMocks();
  mockFindManyProjects.mockResolvedValue(PROJECTS_FIXTURE);
  mockFindManyReports.mockResolvedValue([]);
});

// ─── Tests ──────────────────────────────────────────────────

describe("getWeeklyCompanySummary", () => {
  it("only queries type=WEEKLY reports and NEVER queries DAILY reports", async () => {
    await getWeeklyCompanySummary("2026-07-20");
    expect(mockFindManyReports).toHaveBeenCalledTimes(1);
    const whereArg = mockFindManyReports.mock.calls[0][0].where;
    expect(whereArg.type).toBe("WEEKLY");
    expect(whereArg.type).not.toBe("DAILY");
  });

  it("selects correct week range", async () => {
    await getWeeklyCompanySummary("2026-07-20");
    const whereArg = mockFindManyReports.mock.calls[0][0].where;
    expect(whereArg.weekStartDate).toBeDefined();
    expect(whereArg.weekEndDate).toBeDefined();
  });

  it("does NOT filter out reports based on approval status (DRAFT, REJECTED, SUBMITTED, etc. are all included)", async () => {
    await getWeeklyCompanySummary("2026-07-20");
    const whereArg = mockFindManyReports.mock.calls[0][0].where;
    expect(whereArg.status).toBeUndefined(); // Must NOT filter by status
  });

  it("returns all projects even with no reports (hasReport=false, 'Chưa có báo cáo tuần.')", async () => {
    mockFindManyReports.mockResolvedValue([]);
    const result = await getWeeklyCompanySummary("2026-07-20");
    expect(result.projects).toHaveLength(5);
    expect(result.projects.every((p) => p.hasReport === false)).toBe(true);
    expect(result.projects.every((p) => p.result === "Chưa có báo cáo tuần.")).toBe(true);
    expect(result.summaryCounts.missingProjects).toBe(5);
    expect(result.summaryCounts.reportedProjects).toBe(0);
  });

  it("includes DRAFT reports in aggregate summary", async () => {
    mockFindManyReports.mockResolvedValue([
      makeReport("p1", { status: "DRAFT", summary: "Bản nháp tuần này" }),
    ]);
    const result = await getWeeklyCompanySummary("2026-07-20");
    const p1 = result.projects.find((p) => p.id === "p1")!;
    expect(p1.hasReport).toBe(true);
    expect(p1.result).toBe("Bản nháp tuần này");
  });

  it("includes REJECTED reports in aggregate summary", async () => {
    mockFindManyReports.mockResolvedValue([
      makeReport("p1", { status: "REJECTED", summary: "Bị từ chối nhưng vẫn tổng hợp" }),
    ]);
    const result = await getWeeklyCompanySummary("2026-07-20");
    const p1 = result.projects.find((p) => p.id === "p1")!;
    expect(p1.hasReport).toBe(true);
    expect(p1.result).toBe("Bị từ chối nhưng vẫn tổng hợp");
  });

  it("picks LATEST report version based on updatedAt desc, not status rank", async () => {
    mockFindManyReports.mockResolvedValue([
      makeReport("p1", { status: "APPROVED", summary: "Old Approved", updatedAt: new Date("2026-07-25T10:00:00Z") }),
      makeReport("p1", { status: "REJECTED", summary: "Newer Rejected", updatedAt: new Date("2026-07-26T15:00:00Z") }),
    ]);
    const result = await getWeeklyCompanySummary("2026-07-20");
    const p1 = result.projects.find((p) => p.id === "p1")!;
    expect(p1.result).toBe("Newer Rejected");
  });

  it("handles year-crossing week without error", async () => {
    await expect(getWeeklyCompanySummary("2025-12-29")).resolves.toBeDefined();
  });

  it("rejects non-Monday weekStartDate", async () => {
    await expect(getWeeklyCompanySummary("2026-07-22")).rejects.toThrow("Thứ Hai");
  });

  it("parses nextWeekPlan from generalNote", async () => {
    mockFindManyReports.mockResolvedValue([
      makeReport("p1", {
        status: "APPROVED",
        generalNote: JSON.stringify({
          version: 2,
          nextWeekPlan: [
            { fieldProgressItemId: "x", workContent: "Đổ bê tông" },
            { fieldProgressItemId: "y", workContent: "Lắp cốp pha" },
          ],
        }),
      }),
    ]);
    const result = await getWeeklyCompanySummary("2026-07-20");
    const p1 = result.projects.find((p) => p.id === "p1")!;
    expect(p1.nextWeekPlan).toBe("Đổ bê tông; Lắp cốp pha");
  });
});

describe("assertWeeklyCompanySummaryPermission", () => {
  it("allows ADMIN", () => {
    expect(() => assertWeeklyCompanySummaryPermission("ADMIN")).not.toThrow();
  });

  it("allows DIRECTOR", () => {
    expect(() => assertWeeklyCompanySummaryPermission("DIRECTOR")).not.toThrow();
  });

  it("allows DEPUTY_DIRECTOR", () => {
    expect(() => assertWeeklyCompanySummaryPermission("DEPUTY_DIRECTOR")).not.toThrow();
  });

  it("rejects CHIEF_COMMANDER", () => {
    expect(() => assertWeeklyCompanySummaryPermission("CHIEF_COMMANDER")).toThrow();
  });

  it("rejects ENGINEER", () => {
    expect(() => assertWeeklyCompanySummaryPermission("ENGINEER")).toThrow();
  });

  it("rejects STAFF", () => {
    expect(() => assertWeeklyCompanySummaryPermission("STAFF")).toThrow();
  });
});

describe("canAggregateWeeklyCompanySummary", () => {
  it("returns true for company-wide roles", () => {
    expect(canAggregateWeeklyCompanySummary("ADMIN")).toBe(true);
    expect(canAggregateWeeklyCompanySummary("DIRECTOR")).toBe(true);
    expect(canAggregateWeeklyCompanySummary("DEPUTY_DIRECTOR")).toBe(true);
  });

  it("returns false for project-level roles", () => {
    expect(canAggregateWeeklyCompanySummary("CHIEF_COMMANDER")).toBe(false);
    expect(canAggregateWeeklyCompanySummary("ENGINEER")).toBe(false);
    expect(canAggregateWeeklyCompanySummary("STAFF")).toBe(false);
  });
});
