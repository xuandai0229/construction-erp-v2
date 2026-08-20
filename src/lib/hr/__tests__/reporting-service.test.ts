import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  getHrReportKpis,
  getHrReportCharts,
  getHrReportDetailsTable,
  generateHrExcelReportBuffer,
} from "../reporting-service";
import Workbook from "exceljs";

describe("HR Phase 4.4 — Reporting Service & Excel Export Scoped Integration Tests", () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  const mockUserContext = {
    session: {
      id: "test-user-admin",
      name: "Admin User",
      email: "admin@erp.com",
      role: "ADMIN",
    },
    isSystemAdmin: true,
    employeeId: null,
  };

  it("1. KPI Calculation - calculates correct metrics on mock prisma dataset", async () => {
    const mockPrisma = {
      employee: {
        findMany: async () => [
          {
            id: "emp-1",
            code: "NV-001",
            fullName: "Nguyen Van A",
            status: "ACTIVE",
            projectAssignments: [
              { id: "pa-1", projectId: "proj-1", allocationPercentage: 50, expectedEndDate: new Date("2026-08-20") },
            ],
            orgAssignments: [{ organizationUnitId: "unit-1" }],
          },
          {
            id: "emp-2",
            code: "NV-002",
            fullName: "Tran Thi B",
            status: "ACTIVE",
            projectAssignments: [
              { id: "pa-2", projectId: "proj-1", allocationPercentage: 100, expectedEndDate: new Date("2026-10-01") },
            ],
            orgAssignments: [{ organizationUnitId: "unit-1" }],
          },
          {
            id: "emp-3",
            code: "NV-003",
            fullName: "Le Van C",
            status: "ACTIVE",
            projectAssignments: [],
            orgAssignments: [{ organizationUnitId: "unit-2" }],
          },
        ],
      },
      organizationUnit: {
        count: async () => 2,
      },
    };

    const kpis = await getHrReportKpis(mockUserContext as any, "ALL_EMPLOYEES" as any, {}, mockPrisma as any);

    expect(kpis.totalOnSite).toBe(2); // emp-1, emp-2
    expect(kpis.activeProjectsStaffed).toBe(1); // proj-1
    expect(kpis.expiringAssignments30d).toBe(1); // pa-1 (Aug 20)
    expect(kpis.unassignedEmployees).toBe(1); // emp-3
    expect(kpis.availableCapacityEmployees).toBe(1); // emp-1 (50%)
    expect(kpis.overallocatedEmployees).toBe(0);
    expect(kpis.totalActiveAssignments).toBe(2);
    expect(kpis.totalActiveEmployees).toBe(3);
    expect(kpis.averageAllocation).toBe(75); // (50+100)/2
  });

  it("2. Chart Aggregation - orgUnit & project distribution", async () => {
    const mockPrisma = {
      employeeProjectAssignment: {
        findMany: async () => [
          {
            id: "pa-1",
            projectId: "proj-1",
            projectPersonnelRoleId: "role-1",
            allocationPercentage: 50,
            status: "ACTIVE",
            employee: {
              orgAssignments: [{ organizationUnit: { id: "unit-1", code: "PB-01", name: "Phòng KT" } }],
            },
            project: { id: "proj-1", code: "DA-01", name: "Dự án A" },
            projectPersonnelRole: { id: "role-1", code: "CHT", name: "Chỉ huy trưởng" },
          },
        ],
      },
    };

    const charts = await getHrReportCharts(mockUserContext as any, "ALL_EMPLOYEES" as any, {}, mockPrisma as any);

    expect(charts.orgUnitDistribution).toHaveLength(1);
    expect(charts.orgUnitDistribution[0].unitCode).toBe("PB-01");
    expect(charts.projectDistribution[0].projectCode).toBe("DA-01");
    expect(charts.roleBreakdown[0].roleCode).toBe("CHT");
  });

  it("3. Details Table & PII Exclusion - ensures PII fields are completely excluded", async () => {
    const mockPrisma = {
      employeeProjectAssignment: {
        findMany: async () => [
          {
            id: "pa-1",
            employeeId: "emp-1",
            projectId: "proj-1",
            projectPersonnelRoleId: "role-1",
            startDate: new Date("2026-01-01"),
            expectedEndDate: new Date("2026-12-31"),
            endDate: null,
            allocationPercentage: 100,
            status: "ACTIVE",
            endReason: null,
            assignmentDecisionNo: "QĐ-01",
            employee: {
              code: "NV-001",
              fullName: "Nguyen Van A",
              orgAssignments: [
                {
                  organizationUnitId: "unit-1",
                  organizationUnit: { code: "PB-01", name: "Phòng KT" },
                  position: { title: "Kỹ sư" },
                },
              ],
            },
            project: { code: "DA-01", name: "Dự án A" },
            projectPersonnelRole: { code: "CHT", name: "Chỉ huy trưởng" },
          },
        ],
        count: async () => 1,
      },
    };

    const result = await getHrReportDetailsTable(mockUserContext as any, "ALL_EMPLOYEES" as any, {}, 1, 20, mockPrisma as any);

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item.employeeFullName).toBe("Nguyen Van A");
    expect(item.allocationPercentage).toBe(100);

    // Verify PII exclusion
    const itemKeys = Object.keys(item);
    expect(itemKeys).not.toContain("identityNumberEncrypted");
    expect(itemKeys).not.toContain("identityNumberBlindIndex");
    expect(itemKeys).not.toContain("salary");
    expect(itemKeys).not.toContain("bankAccount");
    expect(itemKeys).not.toContain("personalEmail");
  });

  it("4. Excel Workbook Parity - verifies sheets and structure", async () => {
    const mockPrisma = {
      employee: {
        findMany: async () => [],
      },
      organizationUnit: {
        count: async () => 0,
      },
      employeeProjectAssignment: {
        findMany: async () => [],
        count: async () => 0,
      },
    };

    const buffer = await generateHrExcelReportBuffer(mockUserContext as any, "ALL_EMPLOYEES" as any, {}, mockPrisma as any);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    const readWorkbook = new Workbook.Workbook();
    await readWorkbook.xlsx.load(buffer as any);

    expect(readWorkbook.worksheets).toHaveLength(3);
    const sheetNames = readWorkbook.worksheets.map((s) => s.name);
    expect(sheetNames).toContain("Tổng quan");
    expect(sheetNames).toContain("Chi tiết điều động");
    expect(sheetNames).toContain("Cơ cấu theo đơn vị");
  });
});
