import { describe, it, expect } from "vitest";
import { EmployeeProjectAssignmentStatus } from "@prisma/client";
import { checkAllocationCapacity, AllocationCandidate } from "../allocation-engine";
import { parseVietnamDateOnly } from "../vietnam-date-helper";

describe("Allocation Engine Sweep-Line Algorithm (DEC-01 & DEC-07)", () => {
  const referenceAt = parseVietnamDateOnly("2026-05-01");

  it("1. 50% + 50% in same period -> PASS (100% peak allocation)", () => {
    const existing: AllocationCandidate[] = [
      {
        assignmentId: "assign-1",
        employeeId: "emp-1",
        projectId: "proj-1",
        projectPersonnelRoleId: "role-1",
        startDate: parseVietnamDateOnly("2026-01-01"),
        expectedEndDate: null,
        endDate: null,
        allocationPercentage: 50,
        status: EmployeeProjectAssignmentStatus.ACTIVE,
      },
    ];

    const candidate: AllocationCandidate = {
      employeeId: "emp-1",
      projectId: "proj-2",
      projectPersonnelRoleId: "role-2",
      startDate: parseVietnamDateOnly("2026-02-01"),
      expectedEndDate: parseVietnamDateOnly("2026-08-01"),
      endDate: null,
      allocationPercentage: 50,
      status: EmployeeProjectAssignmentStatus.ACTIVE,
    };

    const result = checkAllocationCapacity(existing, candidate, referenceAt);
    expect(result.hasConflict).toBe(false);
    expect(result.maximumCombinedAllocation).toBe(100);
  });

  it("2. 50% + 60% overlapping -> CONFLICT 110% peak allocation", () => {
    const existing: AllocationCandidate[] = [
      {
        assignmentId: "assign-1",
        employeeId: "emp-1",
        projectId: "proj-1",
        projectPersonnelRoleId: "role-1",
        startDate: parseVietnamDateOnly("2026-01-01"),
        expectedEndDate: null,
        endDate: null,
        allocationPercentage: 50,
        status: EmployeeProjectAssignmentStatus.ACTIVE,
      },
    ];

    const candidate: AllocationCandidate = {
      employeeId: "emp-1",
      projectId: "proj-2",
      projectPersonnelRoleId: "role-2",
      startDate: parseVietnamDateOnly("2026-02-01"),
      expectedEndDate: parseVietnamDateOnly("2026-08-01"),
      endDate: null,
      allocationPercentage: 60,
      status: EmployeeProjectAssignmentStatus.ACTIVE,
    };

    const result = checkAllocationCapacity(existing, candidate, referenceAt);
    expect(result.hasConflict).toBe(true);
    expect(result.maximumCombinedAllocation).toBe(110);
    expect(result.conflictStartDate).toEqual(parseVietnamDateOnly("2026-02-01"));
    expect(result.conflictingAssignments).toHaveLength(2);
    expect(result.conflictingAssignments[0].assignmentId).toBe("assign-1");
  });

  it("3. 100% ending at date D, new assignment starting at date D -> PASS (END before START ordering)", () => {
    const existing: AllocationCandidate[] = [
      {
        assignmentId: "assign-1",
        employeeId: "emp-1",
        projectId: "proj-1",
        projectPersonnelRoleId: "role-1",
        startDate: parseVietnamDateOnly("2026-01-01"),
        expectedEndDate: parseVietnamDateOnly("2026-06-01"),
        endDate: parseVietnamDateOnly("2026-06-01"), // Ends on 2026-06-01
        allocationPercentage: 100,
        status: EmployeeProjectAssignmentStatus.RELEASED,
      },
    ];

    const candidate: AllocationCandidate = {
      employeeId: "emp-1",
      projectId: "proj-2",
      projectPersonnelRoleId: "role-2",
      startDate: parseVietnamDateOnly("2026-06-01"), // Starts on 2026-06-01
      expectedEndDate: null,
      endDate: null,
      allocationPercentage: 100,
      status: EmployeeProjectAssignmentStatus.ACTIVE,
    };

    const result = checkAllocationCapacity(existing, candidate, referenceAt);
    expect(result.hasConflict).toBe(false);
    expect(result.maximumCombinedAllocation).toBe(100);
  });

  it("4. Inactive assignments (COMPLETED, RELEASED, CANCELLED) -> Ignored for allocation", () => {
    const existing: AllocationCandidate[] = [
      {
        assignmentId: "assign-1",
        employeeId: "emp-1",
        projectId: "proj-1",
        projectPersonnelRoleId: "role-1",
        startDate: parseVietnamDateOnly("2026-01-01"),
        expectedEndDate: null,
        endDate: parseVietnamDateOnly("2026-03-01"),
        allocationPercentage: 100,
        status: EmployeeProjectAssignmentStatus.RELEASED,
      },
      {
        assignmentId: "assign-2",
        employeeId: "emp-1",
        projectId: "proj-2",
        projectPersonnelRoleId: "role-2",
        startDate: parseVietnamDateOnly("2026-01-01"),
        expectedEndDate: null,
        endDate: parseVietnamDateOnly("2026-04-01"),
        allocationPercentage: 100,
        status: EmployeeProjectAssignmentStatus.COMPLETED,
      },
      {
        assignmentId: "assign-3",
        employeeId: "emp-1",
        projectId: "proj-3",
        projectPersonnelRoleId: "role-3",
        startDate: parseVietnamDateOnly("2026-01-01"),
        expectedEndDate: null,
        endDate: null,
        allocationPercentage: 100,
        status: EmployeeProjectAssignmentStatus.CANCELLED,
      },
    ];

    const candidate: AllocationCandidate = {
      employeeId: "emp-1",
      projectId: "proj-4",
      projectPersonnelRoleId: "role-4",
      startDate: parseVietnamDateOnly("2026-02-01"),
      expectedEndDate: null,
      endDate: null,
      allocationPercentage: 100,
      status: EmployeeProjectAssignmentStatus.ACTIVE,
    };

    const result = checkAllocationCapacity(existing, candidate, referenceAt);
    expect(result.hasConflict).toBe(false);
    expect(result.maximumCombinedAllocation).toBe(100);
  });

  it("5. Updating an assignment must exclude currentAssignmentId", () => {
    const existing: AllocationCandidate[] = [
      {
        assignmentId: "assign-1",
        employeeId: "emp-1",
        projectId: "proj-1",
        projectPersonnelRoleId: "role-1",
        startDate: parseVietnamDateOnly("2026-01-01"),
        expectedEndDate: null,
        endDate: null,
        allocationPercentage: 100,
        status: EmployeeProjectAssignmentStatus.ACTIVE,
      },
    ];

    // Update assign-1 to change allocation to 80%
    const candidate: AllocationCandidate = {
      assignmentId: "assign-1", // Same ID
      employeeId: "emp-1",
      projectId: "proj-1",
      projectPersonnelRoleId: "role-1",
      startDate: parseVietnamDateOnly("2026-01-01"),
      expectedEndDate: null,
      endDate: null,
      allocationPercentage: 80,
      status: EmployeeProjectAssignmentStatus.ACTIVE,
    };

    const result = checkAllocationCapacity(existing, candidate, referenceAt);
    expect(result.hasConflict).toBe(false);
    expect(result.maximumCombinedAllocation).toBe(80);
  });
});
