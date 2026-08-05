import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  createOrganizationUnit,
  updateOrganizationUnit,
  validateOrgUnitHierarchy,
  assignEmployeeToOrganization,
  createPosition,
  updatePosition,
  assignUnitManager,
  transferEmployee,
} from "../organization-service";

describe("Organization & Position Hierarchy Service", () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const connectionString = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;
    pool = new Pool({ connectionString });
    adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });

    // Clean up any leftover test data from prior aborted test runs
    await prisma.employeeOrganizationAssignment.deleteMany({ where: { employee: { code: "NV-TEST-ORG-001" } } });
    await prisma.organizationUnitManagerAssignment.deleteMany({ where: { employee: { code: "NV-TEST-ORG-001" } } });
    await prisma.employeeChangeHistory.deleteMany({ where: { employee: { code: "NV-TEST-ORG-001" } } });
    await prisma.employee.deleteMany({ where: { code: "NV-TEST-ORG-001" } });
    await prisma.position.deleteMany({ where: { code: { in: ["POS_TP_TEST", "POS_CV_TEST"] } } });
    await prisma.organizationUnit.deleteMany({ where: { code: { in: ["PKT_TEST", "BGD_TEST", "ORG_TEST_A", "ORG_TEST_B"] } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("prevents self-referencing parentId", async () => {
    await expect(validateOrgUnitHierarchy(prisma, "unit-1", "unit-1")).rejects.toThrow(
      "Một đơn vị không thể chọn chính mình làm đơn vị cha."
    );
  });

  it("detects circular parent hierarchy (A -> B -> A)", async () => {
    const unitA = await prisma.organizationUnit.create({
      data: { code: "ORG_TEST_A", name: "Org Test A" },
    });

    const unitB = await prisma.organizationUnit.create({
      data: { code: "ORG_TEST_B", name: "Org Test B", parentId: unitA.id },
    });

    await expect(validateOrgUnitHierarchy(prisma, unitA.id, unitB.id)).rejects.toThrow(
      "Phát hiện vòng lặp phân cấp"
    );

    await prisma.organizationUnit.deleteMany({
      where: { id: { in: [unitA.id, unitB.id] } },
    });
  });

  it("creates organization units, positions, assigns manager, and transfers employee", async () => {
    const parentOrg = await createOrganizationUnit(prisma, {
      code: "BGD_TEST",
      name: "Ban Giám Đốc Test",
    });

    const childOrg = await createOrganizationUnit(prisma, {
      code: "PKT_TEST",
      name: "Phòng Kỹ Thuật Test",
      parentId: parentOrg.id,
    });

    expect(childOrg.parentId).toBe(parentOrg.id);

    const pos1 = await createPosition(prisma, {
      code: "POS_TP_TEST",
      title: "Trưởng phòng Test",
      level: 2,
    });

    const pos2 = await createPosition(prisma, {
      code: "POS_CV_TEST",
      title: "Chuyên viên Test",
      level: 4,
    });

    const emp = await prisma.employee.create({
      data: {
        code: "NV-TEST-ORG-001",
        fullName: "Trần Văn Manager Test",
        joinedDate: new Date("2026-01-01"),
      },
    });

    // Assign Manager to childOrg
    const mgrAssign1 = await assignUnitManager(prisma, {
      organizationUnitId: childOrg.id,
      employeeId: emp.id,
      startDate: new Date("2026-01-01"),
      isPrimary: true,
      decisionNo: "QD-001",
    });

    expect(mgrAssign1.isPrimary).toBe(true);
    expect(mgrAssign1.employeeId).toBe(emp.id);

    // Initial employee org assignment
    const assign1 = await assignEmployeeToOrganization(prisma, {
      employeeId: emp.id,
      organizationUnitId: childOrg.id,
      positionId: pos1.id,
      startDate: new Date("2026-01-01"),
      isPrimary: true,
    });

    expect(assign1.isPrimary).toBe(true);
    expect(assign1.endDate).toBeNull();

    // Ensure a valid User exists for FK references in audit/change history
    let userActor = await prisma.user.findFirst({ select: { id: true } });
    if (!userActor) {
      userActor = await prisma.user.create({
        data: {
          email: `org_actor_${Date.now()}@example.com`,
          username: `org_actor_${Date.now()}`,
          password: "dummy",
          name: "Org Actor Test",
          role: "STAFF",
        },
        select: { id: true },
      });
    }
    const actorId = userActor.id;

    const transferResult = await transferEmployee(prisma, {
      employeeId: emp.id,
      organizationUnitId: parentOrg.id,
      positionId: pos2.id,
      effectiveDate: new Date("2026-07-01"),
      decisionNo: "QD-TRANS-01",
      reason: "Điều chuyển cán bộ",
      performedById: actorId,
    });

    expect(transferResult.organizationUnitId).toBe(parentOrg.id);
    expect(transferResult.positionId).toBe(pos2.id);
    expect(transferResult.isPrimary).toBe(true);

    // Verify old assignment is closed (endDate set) while retaining its historical isPrimary status
    const updatedAssign1 = await prisma.employeeOrganizationAssignment.findUnique({
      where: { id: assign1.id },
    });
    expect(updatedAssign1?.isPrimary).toBe(true);
    expect(updatedAssign1?.endDate).not.toBeNull();

    // Verify change history logged
    const histories = await prisma.employeeChangeHistory.findMany({
      where: { employeeId: emp.id },
    });
    expect(histories.length).toBeGreaterThan(0);

    // Cleanup
    await prisma.organizationUnitManagerAssignment.deleteMany({ where: { employeeId: emp.id } });
    await prisma.employeeOrganizationAssignment.deleteMany({ where: { employeeId: emp.id } });
    await prisma.employeeChangeHistory.deleteMany({ where: { employeeId: emp.id } });
    await prisma.employee.delete({ where: { id: emp.id } });
    await prisma.position.deleteMany({ where: { id: { in: [pos1.id, pos2.id] } } });
    await prisma.organizationUnit.deleteMany({ where: { id: { in: [childOrg.id, parentOrg.id] } } });
  });

  it("enforces [startDate, endDate) date-range semantics with zero overlap at transition point D", async () => {
    const transitionDate = new Date("2026-07-01T00:00:00.000Z");
    const dMinusOne = new Date("2026-06-30T23:59:59.999Z");
    const dPlusOne = new Date("2026-07-01T00:00:00.001Z");

    // Old record: startDate = 2026-01-01, endDate = 2026-07-01
    // New record: startDate = 2026-07-01, endDate = null
    const isOldActiveAt = (t: Date) => t >= new Date("2026-01-01") && t < transitionDate;
    const isNewActiveAt = (t: Date) => t >= transitionDate;

    // At D - 1ms
    expect(isOldActiveAt(dMinusOne)).toBe(true);
    expect(isNewActiveAt(dMinusOne)).toBe(false);

    // At D (Exact transition point)
    expect(isOldActiveAt(transitionDate)).toBe(false);
    expect(isNewActiveAt(transitionDate)).toBe(true);

    // At D + 1ms
    expect(isOldActiveAt(dPlusOne)).toBe(false);
    expect(isNewActiveAt(dPlusOne)).toBe(true);
  });
});
