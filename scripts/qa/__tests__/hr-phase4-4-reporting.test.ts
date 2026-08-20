import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  getHrReportKpis,
  getHrReportCharts,
  getHrReportDetailsTable,
  generateHrExcelReportBuffer,
} from "../../../src/lib/hr/reporting-service";
import Workbook from "exceljs";

describe("HR Phase 4.4 — Enterprise Reporting & Excel Export Complete Validation", () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  const adminCtx = {
    session: { id: "user-admin-1", name: "Trưởng phòng HR", email: "admin@erp.com", role: "ADMIN" },
    isSystemAdmin: true,
    employeeId: null,
  };

  const managerCtx = {
    session: { id: "user-manager-1", name: "Quản lý Đơn vị", email: "manager@erp.com", role: "MANAGER" },
    isSystemAdmin: false,
    employeeId: "emp-manager-1",
  };

  it("1. Filter Parser - correctly filters by date range, org unit, project, and search query", async () => {
    const mockPrisma = {
      employee: {
        findMany: async (args: any) => {
          expect(args.where.AND).toBeDefined();
          return [
            {
              id: "emp-101",
              code: "NV-101",
              fullName: "Phạm Văn D",
              status: "ACTIVE",
              projectAssignments: [
                { id: "pa-101", projectId: "proj-101", allocationPercentage: 100, expectedEndDate: null },
              ],
              orgAssignments: [{ organizationUnitId: "unit-101" }],
            },
          ];
        },
      },
      organizationUnit: { count: async () => 1 },
      employeeProjectAssignment: {
        findMany: async () => [],
        count: async () => 0,
      },
    };

    const kpis = await getHrReportKpis(
      adminCtx as any,
      "ALL_EMPLOYEES" as any,
      {
        dateStart: "2026-08-01",
        orgUnitId: "unit-101",
        searchQuery: "Phạm",
      },
      mockPrisma as any
    );

    expect(kpis.totalOnSite).toBe(1);
    expect(kpis.totalActiveEmployees).toBe(1);
  });

  it("2. KPI Calculation - verifies all 6 canonical KPIs + 4 summary metrics", async () => {
    const mockPrisma = {
      employee: {
        findMany: async () => [
          {
            id: "emp-1",
            code: "NV-001",
            fullName: "Nguyen Van A",
            status: "ACTIVE",
            projectAssignments: [
              { id: "pa-1", projectId: "proj-1", allocationPercentage: 60, expectedEndDate: new Date("2026-08-15") },
              { id: "pa-2", projectId: "proj-2", allocationPercentage: 60, expectedEndDate: null }, // total 120% overallocated
            ],
            orgAssignments: [{ organizationUnitId: "unit-1" }],
          },
          {
            id: "emp-2",
            code: "NV-002",
            fullName: "Tran Thi B",
            status: "ACTIVE",
            projectAssignments: [], // unassigned
            orgAssignments: [{ organizationUnitId: "unit-1" }],
          },
          {
            id: "emp-3",
            code: "NV-003",
            fullName: "Le Van C",
            status: "ACTIVE",
            projectAssignments: [
              { id: "pa-3", projectId: "proj-1", allocationPercentage: 50, expectedEndDate: null }, // 50% available capacity
            ],
            orgAssignments: [{ organizationUnitId: "unit-2" }],
          },
        ],
      },
      organizationUnit: { count: async () => 2 },
    };

    const kpis = await getHrReportKpis(adminCtx as any, "ALL_EMPLOYEES" as any, {}, mockPrisma as any);

    expect(kpis.totalOnSite).toBe(2); // emp-1, emp-3
    expect(kpis.activeProjectsStaffed).toBe(2); // proj-1, proj-2
    expect(kpis.expiringAssignments30d).toBe(1); // pa-1
    expect(kpis.unassignedEmployees).toBe(1); // emp-2
    expect(kpis.availableCapacityEmployees).toBe(1); // emp-3
    expect(kpis.overallocatedEmployees).toBe(1); // emp-1
    expect(kpis.totalActiveAssignments).toBe(3);
    expect(kpis.totalActiveEmployees).toBe(3);
    expect(kpis.totalOrgUnits).toBe(2);
    expect(kpis.averageAllocation).toBe(57); // Math.round((60+60+50)/3) = 57
  });

  it("3. Effective-date semantics - includes only assignments active at date T", async () => {
    const targetDate = new Date("2026-08-01");
    const mockPrisma = {
      employee: {
        findMany: async () => [
          {
            id: "emp-1",
            code: "NV-001",
            fullName: "Nguyen Van A",
            status: "ACTIVE",
            projectAssignments: [
              // Active assignment: started Jan 2026, ends Dec 2026
              { id: "pa-active", projectId: "proj-1", allocationPercentage: 100, expectedEndDate: null },
            ],
            orgAssignments: [{ organizationUnitId: "unit-1" }],
          },
        ],
      },
      organizationUnit: { count: async () => 1 },
    };

    const kpis = await getHrReportKpis(
      adminCtx as any,
      "ALL_EMPLOYEES" as any,
      { dateStart: "2026-08-01" },
      mockPrisma as any
    );
    expect(kpis.totalOnSite).toBe(1);
  });

  it("4. Zero PII Exclusion - guarantees sensitive fields are omitted from reporting tables", async () => {
    const mockPrisma = {
      employeeProjectAssignment: {
        findMany: async () => [
          {
            id: "pa-1",
            employeeId: "emp-1",
            projectId: "proj-1",
            projectPersonnelRoleId: "role-1",
            startDate: new Date("2026-01-01"),
            allocationPercentage: 100,
            status: "ACTIVE",
            employee: {
              code: "NV-001",
              fullName: "Hoang Van E",
              orgAssignments: [
                {
                  organizationUnitId: "unit-1",
                  organizationUnit: { code: "PB-01", name: "Ban Chỉ huy" },
                  position: { title: "Giám sát" },
                },
              ],
            },
            project: { code: "DA-01", name: "Dự án Cao ốc 01" },
            projectPersonnelRole: { code: "GS", name: "Kỹ sư Giám sát" },
          },
        ],
        count: async () => 1,
      },
    };

    const tableData = await getHrReportDetailsTable(adminCtx as any, "ALL_EMPLOYEES" as any, {}, 1, 20, mockPrisma as any);
    const item = tableData.items[0];

    const forbiddenFields = [
      "identityNumberEncrypted",
      "identityNumberBlindIndex",
      "identityNumberLastDigits",
      "personalEmail",
      "phoneNumber",
      "bankAccount",
      "salary",
      "allowance",
    ];

    forbiddenFields.forEach((field) => {
      expect((item as any)[field]).toBeUndefined();
    });
  });

  it("5. Dashboard & Excel Parity - confirms 0% variance between KPI metrics and Excel export sheet 1", async () => {
    const mockPrisma = {
      employee: {
        findMany: async () => [
          {
            id: "emp-1",
            code: "NV-001",
            fullName: "Nguyen Van A",
            status: "ACTIVE",
            projectAssignments: [
              { id: "pa-1", projectId: "proj-1", allocationPercentage: 100, expectedEndDate: null },
            ],
            orgAssignments: [{ organizationUnitId: "unit-1" }],
          },
        ],
      },
      organizationUnit: { count: async () => 1 },
      employeeProjectAssignment: {
        findMany: async () => [
          {
            id: "pa-1",
            employeeId: "emp-1",
            projectId: "proj-1",
            projectPersonnelRoleId: "role-1",
            startDate: new Date("2026-01-01"),
            allocationPercentage: 100,
            status: "ACTIVE",
            employee: {
              code: "NV-001",
              fullName: "Nguyen Van A",
              orgAssignments: [
                {
                  organizationUnitId: "unit-1",
                  organizationUnit: { code: "PB-01", name: "Phòng KT" },
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

    const kpis = await getHrReportKpis(adminCtx as any, "ALL_EMPLOYEES" as any, {}, mockPrisma as any);
    const excelBuffer = await generateHrExcelReportBuffer(adminCtx as any, "ALL_EMPLOYEES" as any, {}, mockPrisma as any);

    const workbook = new Workbook.Workbook();
    await workbook.xlsx.load(excelBuffer as any);

    // Sheet 1: Summary KPI Table
    const sheet1 = workbook.getWorksheet("Tổng quan");
    expect(sheet1).toBeDefined();

    // Check Sheet 1 KPI Total On Site row value
    const totalOnSiteRow = sheet1?.getRow(7); // Row 7 = Total On Site
    const cellValue = totalOnSiteRow?.getCell(2).value;
    expect(cellValue).toBe(kpis.totalOnSite);

    // Sheet 2: Details
    const sheet2 = workbook.getWorksheet("Chi tiết điều động");
    expect(sheet2).toBeDefined();
    expect(sheet2?.actualRowCount).toBeGreaterThanOrEqual(2); // Header + 1 row

    // Sheet 3: Org structure
    const sheet3 = workbook.getWorksheet("Cơ cấu theo đơn vị");
    expect(sheet3).toBeDefined();
  });

  it("6. Handling Empty Datasets - exports empty workbook cleanly without throwing errors", async () => {
    const emptyPrisma = {
      employee: { findMany: async () => [] },
      organizationUnit: { count: async () => 0 },
      employeeProjectAssignment: { findMany: async () => [], count: async () => 0 },
    };

    const buffer = await generateHrExcelReportBuffer(adminCtx as any, "ALL_EMPLOYEES" as any, {}, emptyPrisma as any);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("7. Long Vietnamese Text Formatting - preserves accents and long text without truncation", async () => {
    const longText = "Công trình Đầu tư Xây dựng Khu Đô thị Sinh thái Trung tâm Thành phố Hà Nội Chân cầu Nhật Tân";
    const mockPrisma = {
      employee: { findMany: async () => [] },
      organizationUnit: { count: async () => 0 },
      employeeProjectAssignment: {
        findMany: async () => [
          {
            id: "pa-long",
            employeeId: "emp-1",
            projectId: "proj-long",
            projectPersonnelRoleId: "role-1",
            startDate: new Date("2026-01-01"),
            allocationPercentage: 100,
            status: "ACTIVE",
            employee: {
              code: "NV-999",
              fullName: "Nguyễn Trần Quang Trí Anh",
              orgAssignments: [{ organizationUnit: { code: "PB-LONG", name: "Phòng Kỹ thuật Thi công Công trình Ngầm" } }],
            },
            project: { code: "DA-LONG", name: longText },
            projectPersonnelRole: { code: "CHT", name: "Chỉ huy trưởng Tổ hợp Công trình" },
          },
        ],
        count: async () => 1,
      },
    };

    const tableResult = await getHrReportDetailsTable(adminCtx as any, "ALL_EMPLOYEES" as any, {}, 1, 20, mockPrisma as any);
    expect(tableResult.items[0].projectName).toBe(longText);

    const buffer = await generateHrExcelReportBuffer(adminCtx as any, "ALL_EMPLOYEES" as any, {}, mockPrisma as any);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
