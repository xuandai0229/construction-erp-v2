import { describe, it, expect, vi } from "vitest";
import { EmployeeProjectAssignmentStatus, EmployeeProjectAssignmentEndReason } from "@prisma/client";
import { createProjectAssignment, extendProjectAssignment, releaseEmployeeFromProject } from "../project-assignment-service";
import { parseVietnamDateOnly } from "../vietnam-date-helper";

describe("HR Project Assignment Domain Service Unit Suite (DEC-01 & DEC-05)", () => {
  it("1. should throw error if allocation percentage is < 1 or > 100", async () => {
    const mockPrisma = {} as any;
    await expect(
      createProjectAssignment(mockPrisma, {
        employeeId: "emp-1",
        projectId: "proj-1",
        projectPersonnelRoleId: "role-1",
        startDate: parseVietnamDateOnly("2026-08-01"),
        allocationPercentage: 150,
      })
    ).rejects.toThrow(/nằm trong khoảng từ 1% đến 100%/);
  });

  it("2. should throw error if expectedEndDate < startDate", async () => {
    const mockPrisma = {} as any;
    await expect(
      createProjectAssignment(mockPrisma, {
        employeeId: "emp-1",
        projectId: "proj-1",
        projectPersonnelRoleId: "role-1",
        startDate: parseVietnamDateOnly("2026-08-10"),
        expectedEndDate: parseVietnamDateOnly("2026-08-01"),
      })
    ).rejects.toThrow(/không thể trước ngày bắt đầu/);
  });

  it("3. should throw error on extending inactive assignment", async () => {
    const mockPrisma = {
      employeeProjectAssignment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "assign-1",
          employeeId: "emp-1",
          status: EmployeeProjectAssignmentStatus.RELEASED,
        }),
      },
    } as any;

    await expect(
      extendProjectAssignment(mockPrisma, {
        assignmentId: "assign-1",
        newExpectedEndDate: parseVietnamDateOnly("2026-12-31"),
      })
    ).rejects.toThrow(/đang hoạt động/);
  });
});
