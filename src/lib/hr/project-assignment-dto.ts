import { Prisma } from "@prisma/client";
import { formatVietnamDateOnly } from "./vietnam-date-helper";

export interface ProjectAssignmentDTO {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  orgUnitId: string | null;
  orgUnitName: string | null;
  projectId: string;
  projectCode: string;
  projectName: string;
  projectPersonnelRoleId: string;
  projectPersonnelRoleName: string;
  startDate: string; // YYYY-MM-DD
  expectedEndDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  allocationPercentage: number;
  status: string;
  endReason: string | null;
  decisionNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const projectAssignmentDTOSelect = Prisma.validator<Prisma.EmployeeProjectAssignmentSelect>()({
  id: true,
  employeeId: true,
  projectId: true,
  projectPersonnelRoleId: true,
  startDate: true,
  expectedEndDate: true,
  endDate: true,
  allocationPercentage: true,
  status: true,
  endReason: true,
  assignmentDecisionNo: true,
  notes: true,
  sourceOrgUnitId: true,
  sourceOrgUnitCodeSnapshot: true,
  sourceOrgUnitNameSnapshot: true,
  createdAt: true,
  updatedAt: true,
  sourceOrgUnit: {
    select: { id: true, name: true, code: true },
  },
  employee: {
    select: {
      code: true,
      fullName: true,
      orgAssignments: {
        where: { isPrimary: true, endDate: null },
        select: {
          organizationUnit: {
            select: { id: true, name: true },
          },
        },
        take: 1,
      },
    },
  },
  project: {
    select: {
      code: true,
      name: true,
    },
  },
  projectPersonnelRole: {
    select: {
      name: true,
    },
  },
});

type RawAssignmentRecord = Prisma.EmployeeProjectAssignmentGetPayload<{
  select: typeof projectAssignmentDTOSelect;
}>;

/**
 * Transforms raw Prisma selection to PII-safe DTO.
 * Explicitly excludes identity numbers, bank info, salary, address, personal email, keys, IVs.
 */
export function toProjectAssignmentDTO(record: RawAssignmentRecord): ProjectAssignmentDTO {
  const currentOrgUnit = record.employee.orgAssignments[0]?.organizationUnit;
  const orgUnitId = record.sourceOrgUnitId || record.sourceOrgUnit?.id || currentOrgUnit?.id || null;
  const orgUnitName = record.sourceOrgUnitNameSnapshot || record.sourceOrgUnit?.name || currentOrgUnit?.name || null;

  return {
    id: record.id,
    employeeId: record.employeeId,
    employeeCode: record.employee.code,
    employeeName: record.employee.fullName,
    orgUnitId,
    orgUnitName,
    projectId: record.projectId,
    projectCode: record.project.code,
    projectName: record.project.name,
    projectPersonnelRoleId: record.projectPersonnelRoleId,
    projectPersonnelRoleName: record.projectPersonnelRole.name,
    startDate: formatVietnamDateOnly(record.startDate),
    expectedEndDate: record.expectedEndDate ? formatVietnamDateOnly(record.expectedEndDate) : null,
    endDate: record.endDate ? formatVietnamDateOnly(record.endDate) : null,
    allocationPercentage: record.allocationPercentage,
    status: record.status,
    endReason: record.endReason || null,
    decisionNumber: record.assignmentDecisionNo || null,
    notes: record.notes || null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
