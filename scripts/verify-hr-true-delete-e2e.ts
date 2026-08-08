import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function runTrueDeleteVerification() {
  console.log("=== START HR V1 TRUE HARD DELETE E2E VERIFICATION ===");
  const prisma = (await import("../src/lib/prisma")).default;
  const { deleteOrgUnitAction, deletePositionAction } = await import("../src/app/hr/organization/actions/organization-actions");

  // Find an admin user for server actions
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    select: { id: true, email: true },
  });

  if (!adminUser) {
    throw new Error("No active ADMIN user found for audit execution.");
  }

  // Mock global session for server actions
  (globalThis as any).__TEST_SESSION__ = {
    user: { id: adminUser.id, role: "ADMIN", email: adminUser.email },
  };

  // Pre-test cleanup of any leftover QA entities
  await prisma.employeeChangeHistory.deleteMany({ where: { employee: { code: { startsWith: "QA-EMP-" } } } });
  await prisma.employeeOrganizationAssignment.deleteMany({ where: { employee: { code: { startsWith: "QA-EMP-" } } } });
  await prisma.employee.deleteMany({ where: { code: { startsWith: "QA-EMP-" } } });
  await prisma.organizationUnitManagerAssignment.deleteMany({ where: { organizationUnit: { code: { startsWith: "QA-" } } } });
  await prisma.organizationUnit.deleteMany({ where: { code: { startsWith: "QA-" } } });
  await prisma.position.deleteMany({ where: { code: { startsWith: "QA-" } } });

  const initialWorkforceCount = await prisma.employee.count({
    where: { status: { in: ["ACTIVE", "PROBATION"] } },
  });
  console.log(`Initial Active Workforce Count: ${initialWorkforceCount}`);

  // ==========================================
  // TEST 1 — UNIT WITH EMPLOYEES (HARD DELETE)
  // ==========================================
  console.log("\n--- TEST 1: UNIT WITH EMPLOYEES HARD DELETE ---");
  const testUnit1 = await prisma.organizationUnit.create({
    data: {
      code: "QA-UNIT-HARD-01",
      name: "Phòng Thử Nghiệm Xóa Thật 01",
      description: "QA Fixture for hard delete test",
    },
  });

  const testPos1 = await prisma.position.create({
    data: {
      code: "QA-POS-TEMP-01",
      title: "Chức danh Tạm 01",
    },
  });

  const emp1A = await prisma.employee.create({
    data: {
      code: "QA-EMP-HARD-01A",
      fullName: "QA Employee Hard Delete 01A",
      joinedDate: new Date("2024-01-01"),
      status: "ACTIVE",
    },
  });

  const emp1B = await prisma.employee.create({
    data: {
      code: "QA-EMP-HARD-01B",
      fullName: "QA Employee Hard Delete 01B",
      joinedDate: new Date("2024-01-01"),
      status: "ACTIVE",
    },
  });

  await prisma.employeeOrganizationAssignment.createMany({
    data: [
      {
        employeeId: emp1A.id,
        organizationUnitId: testUnit1.id,
        positionId: testPos1.id,
        startDate: new Date("2024-01-01"),
        isPrimary: true,
      },
      {
        employeeId: emp1B.id,
        organizationUnitId: testUnit1.id,
        positionId: testPos1.id,
        startDate: new Date("2024-01-01"),
        isPrimary: true,
      },
    ],
  });

  const unit1Before = await prisma.organizationUnit.findUnique({ where: { id: testUnit1.id } });
  if (!unit1Before) throw new Error("TEST 1 Setup Failed: Unit not created.");

  console.log(`Unit created: ${testUnit1.name} (${testUnit1.id})`);
  const delRes1 = await deleteOrgUnitAction(testUnit1.id);
  if (!delRes1.success) {
    throw new Error(`deleteOrgUnitAction failed: ${delRes1.error}`);
  }

  const unit1After = await prisma.organizationUnit.findUnique({ where: { id: testUnit1.id } });
  console.log(`Unit 1 query after delete:`, unit1After); // Must be null
  if (unit1After !== null) {
    throw new Error("TEST 1 FAILED: OrganizationUnit record still exists in DB! (Must be null)");
  }

  const emp1AAfter = await prisma.employee.findUnique({ where: { id: emp1A.id } });
  const emp1BAfter = await prisma.employee.findUnique({ where: { id: emp1B.id } });
  if (!emp1AAfter || !emp1BAfter) {
    throw new Error("TEST 1 FAILED: Employee record was deleted!");
  }

  const activeAssign1A = await prisma.employeeOrganizationAssignment.findFirst({
    where: { employeeId: emp1A.id, endDate: null },
  });
  if (activeAssign1A !== null) {
    throw new Error("TEST 1 FAILED: Employee active org assignment was not cleared!");
  }

  const history1A = await prisma.employeeChangeHistory.findFirst({
    where: { employeeId: emp1A.id, reason: { contains: "Phòng Thử Nghiệm Xóa Thật 01" } },
  });
  if (!history1A) {
    throw new Error("TEST 1 FAILED: Change history snapshot missing deleted unit details!");
  }
  console.log("TEST 1 PASS: Unit hard-deleted, employees survived, active org cleared, history snapshotted.");

  // ==========================================
  // TEST 2 — UNIT WITH MANAGER (HARD DELETE)
  // ==========================================
  console.log("\n--- TEST 2: UNIT WITH MANAGER HARD DELETE ---");
  const testUnit2 = await prisma.organizationUnit.create({
    data: {
      code: "QA-UNIT-HARD-02",
      name: "Phòng Thử Nghiệm Quản Lý 02",
    },
  });

  const mgrEmp = await prisma.employee.create({
    data: {
      code: "QA-EMP-MGR-02",
      fullName: "QA Manager Employee 02",
      joinedDate: new Date("2024-01-01"),
      status: "ACTIVE",
    },
  });

  await prisma.organizationUnitManagerAssignment.create({
    data: {
      organizationUnitId: testUnit2.id,
      employeeId: mgrEmp.id,
      startDate: new Date("2024-01-01"),
      isPrimary: true,
    },
  });

  const delRes2 = await deleteOrgUnitAction(testUnit2.id);
  if (!delRes2.success) {
    throw new Error(`deleteOrgUnitAction failed in TEST 2: ${delRes2.error}`);
  }

  const unit2After = await prisma.organizationUnit.findUnique({ where: { id: testUnit2.id } });
  if (unit2After !== null) {
    throw new Error("TEST 2 FAILED: OrganizationUnit record still exists in DB!");
  }

  const mgrAssigns = await prisma.organizationUnitManagerAssignment.findMany({
    where: { organizationUnitId: testUnit2.id },
  });
  if (mgrAssigns.length > 0) {
    throw new Error("TEST 2 FAILED: Manager assignments were not deleted!");
  }
  console.log("TEST 2 PASS: Unit with manager hard-deleted, manager assignments cleared.");

  // ==========================================
  // TEST 3 — PARENT WITH CHILD (REPARENTING)
  // ==========================================
  console.log("\n--- TEST 3: PARENT WITH CHILD REPARENTING ---");
  const parentUnit3 = await prisma.organizationUnit.create({
    data: {
      code: "QA-PAR-03",
      name: "Phòng Cha QA 03",
    },
  });

  const childUnit3 = await prisma.organizationUnit.create({
    data: {
      code: "QA-CHI-03",
      name: "Phòng Con QA 03",
      parentId: parentUnit3.id,
    },
  });

  const delRes3 = await deleteOrgUnitAction(parentUnit3.id);
  if (!delRes3.success) {
    throw new Error(`deleteOrgUnitAction failed in TEST 3: ${delRes3.error}`);
  }

  const parent3After = await prisma.organizationUnit.findUnique({ where: { id: parentUnit3.id } });
  if (parent3After !== null) {
    throw new Error("TEST 3 FAILED: Parent unit record still exists!");
  }

  const child3After = await prisma.organizationUnit.findUnique({ where: { id: childUnit3.id } });
  if (!child3After) throw new Error("TEST 3 FAILED: Child unit missing!");
  if (child3After.parentId !== null) {
    throw new Error(`TEST 3 FAILED: Child unit parentId is ${child3After.parentId}, expected null`);
  }
  console.log("TEST 3 PASS: Parent hard-deleted, child unit reparented to null.");

  // ==========================================
  // TEST 4 — POSITION WITH EMPLOYEES (HARD DELETE)
  // ==========================================
  console.log("\n--- TEST 4: POSITION WITH EMPLOYEES HARD DELETE ---");
  const testPos4 = await prisma.position.create({
    data: {
      code: "QA-POS-HARD-04",
      title: "Chức danh Thử Nghiệm Xóa Thật 04",
    },
  });

  const emp4 = await prisma.employee.create({
    data: {
      code: "QA-EMP-POS-04",
      fullName: "QA Position Employee 04",
      joinedDate: new Date("2024-01-01"),
      status: "ACTIVE",
    },
  });

  await prisma.employeeOrganizationAssignment.create({
    data: {
      employeeId: emp4.id,
      organizationUnitId: childUnit3.id,
      positionId: testPos4.id,
      startDate: new Date("2024-01-01"),
      isPrimary: true,
    },
  });

  const delRes4 = await deletePositionAction(testPos4.id);
  if (!delRes4.success) {
    throw new Error(`deletePositionAction failed in TEST 4: ${delRes4.error}`);
  }

  const pos4After = await prisma.position.findUnique({ where: { id: testPos4.id } });
  if (pos4After !== null) {
    throw new Error("TEST 4 FAILED: Position record still exists in DB! (Must be null)");
  }

  const emp4After = await prisma.employee.findUnique({ where: { id: emp4.id } });
  if (!emp4After) {
    throw new Error("TEST 4 FAILED: Employee record was deleted!");
  }

  const activeAssign4 = await prisma.employeeOrganizationAssignment.findFirst({
    where: { employeeId: emp4.id, endDate: null },
  });
  if (activeAssign4 !== null) {
    throw new Error("TEST 4 FAILED: Active position assignment was not cleared!");
  }

  const history4 = await prisma.employeeChangeHistory.findFirst({
    where: { employeeId: emp4.id, reason: { contains: "Chức danh 'Chức danh Thử Nghiệm Xóa Thật 04'" } },
  });
  if (!history4) {
    throw new Error("TEST 4 FAILED: Position history snapshot missing!");
  }
  console.log("TEST 4 PASS: Position hard-deleted, employee survived, active position cleared, history snapshotted.");

  // ==========================================
  // TEST 5 — CLEANUP QA FIXTURES & INTEGRITY
  // ==========================================
  console.log("\n--- TEST 5: CLEANUP EXACT QA FIXTURE ENTITIES ---");

  // Clean change histories for QA employees
  const qaEmpIds = [emp1A.id, emp1B.id, mgrEmp.id, emp4.id];
  await prisma.employeeChangeHistory.deleteMany({
    where: { employeeId: { in: qaEmpIds } },
  });

  // Clean QA employees
  await prisma.employee.deleteMany({
    where: { id: { in: qaEmpIds } },
  });

  // Clean remaining QA units & positions created in test
  await prisma.organizationUnit.deleteMany({
    where: { id: childUnit3.id },
  });
  await prisma.position.deleteMany({
    where: { id: testPos1.id },
  });

  // Verify zero remaining QA entities
  const remEmp = await prisma.employee.count({ where: { id: { in: qaEmpIds } } });
  const remUnits = await prisma.organizationUnit.count({
    where: { id: { in: [testUnit1.id, testUnit2.id, parentUnit3.id, childUnit3.id] } },
  });
  const remPos = await prisma.position.count({
    where: { id: { in: [testPos1.id, testPos4.id] } },
  });

  console.log(`Remaining QA Employees: ${remEmp}`);
  console.log(`Remaining QA Units: ${remUnits}`);
  console.log(`Remaining QA Positions: ${remPos}`);

  if (remEmp > 0 || remUnits > 0 || remPos > 0) {
    throw new Error("TEST 5 FAILED: QA entities remaining in DB!");
  }

  const finalWorkforceCount = await prisma.employee.count({
    where: { status: { in: ["ACTIVE", "PROBATION"] } },
  });
  console.log(`Final Active Workforce Count: ${finalWorkforceCount}`);

  if (finalWorkforceCount !== initialWorkforceCount) {
    throw new Error(`WORKFORCE MISMATCH: Initial ${initialWorkforceCount} vs Final ${finalWorkforceCount}`);
  }

  console.log("\n=== ALL 5 TRUE HARD DELETE DESTRUCTIVE TESTS PASSED SUCCESSFULLY ===");
}

runTrueDeleteVerification()
  .catch((e) => {
    console.error("VERIFICATION FAILED:", e);
    process.exit(1);
  });
