import { PrismaClient, EmployeeProjectAssignmentStatus } from "@prisma/client";

export interface AssignEmployeeProjectInput {
  employeeId: string;
  projectId: string;
  projectPersonnelRoleId: string;
  startDate: Date;
  expectedEndDate?: Date | null;
  allocationPercentage?: number;
  assignmentDecisionNo?: string | null;
  notes?: string | null;
  overrideReason?: string | null;
  createdById?: string | null;
}

type PrismaTransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
type PrismaLike = PrismaClient | PrismaTransactionClient;

/**
 * Assigns an employee to a project personnel role.
 * Validates active duplicate assignments unless `overrideReason` is provided.
 */
export async function assignEmployeeToProject(
  prisma: PrismaLike,
  input: AssignEmployeeProjectInput
) {
  // Check for existing active assignment in same project & role
  const existingActive = await prisma.employeeProjectAssignment.findFirst({
    where: {
      employeeId: input.employeeId,
      projectId: input.projectId,
      projectPersonnelRoleId: input.projectPersonnelRoleId,
      status: EmployeeProjectAssignmentStatus.ACTIVE,
      endDate: null,
    },
  });

  if (existingActive && !input.overrideReason) {
    throw new Error(
      "Employee already has an active assignment with this role in the project. Provide an overrideReason to allow dual assignment."
    );
  }

  const executeAssign = async (tx: PrismaTransactionClient) => {
    const assignment = await tx.employeeProjectAssignment.create({
      data: {
        employeeId: input.employeeId,
        projectId: input.projectId,
        projectPersonnelRoleId: input.projectPersonnelRoleId,
        startDate: input.startDate,
        expectedEndDate: input.expectedEndDate || null,
        allocationPercentage: input.allocationPercentage ?? 100,
        status: EmployeeProjectAssignmentStatus.ACTIVE,
        assignmentDecisionNo: input.assignmentDecisionNo || null,
        notes: input.notes || null,
        overrideReason: input.overrideReason || null,
        createdById: input.createdById || null,
      },
    });

    if (input.createdById) {
      await tx.employeeChangeHistory.create({
        data: {
          employeeId: input.employeeId,
          changeType: "EMPLOYEE_PROJECT_ASSIGNED",
          performedById: input.createdById,
          reason: input.assignmentDecisionNo ? `Decision: ${input.assignmentDecisionNo}` : "Project assigned",
          details: {
            projectId: input.projectId,
            projectPersonnelRoleId: input.projectPersonnelRoleId,
            allocationPercentage: input.allocationPercentage ?? 100,
          },
        },
      });
    }

    return assignment;
  };

  if (!("$transaction" in prisma)) {
    return executeAssign(prisma);
  }

  return (prisma as PrismaClient).$transaction(executeAssign);
}

/**
 * Releases an employee from a project assignment.
 */
export async function releaseEmployeeFromProject(
  prisma: PrismaLike,
  assignmentId: string,
  endDate: Date = new Date(),
  reason?: string,
  performedById?: string
) {
  const executeRelease = async (tx: PrismaTransactionClient) => {
    const updated = await tx.employeeProjectAssignment.update({
      where: { id: assignmentId },
      data: {
        status: EmployeeProjectAssignmentStatus.RELEASED,
        endDate,
        notes: reason ? `Released: ${reason}` : undefined,
      },
    });

    if (performedById) {
      await tx.employeeChangeHistory.create({
        data: {
          employeeId: updated.employeeId,
          changeType: "EMPLOYEE_PROJECT_RELEASED",
          performedById,
          reason: reason || "Project released",
          details: {
            assignmentId,
            projectId: updated.projectId,
            endDate,
          },
        },
      });
    }

    return updated;
  };

  if (!("$transaction" in prisma)) {
    return executeRelease(prisma);
  }

  return (prisma as PrismaClient).$transaction(executeRelease);
}
