import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, EmployeeStatus } from "@prisma/client";
import {
  createEmployee,
  updateEmployee,
  findEmployeeByIdentityNumber,
} from "../employee-service";
import {
  decryptIdentityNumber,
  deserializeEnvelope,
} from "../pii-encryption";

describe("Employee Master Service - CRUD & PII Tests", () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let prisma: PrismaClient;

  beforeAll(() => {
    const connectionString = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;
    pool = new Pool({ connectionString });
    adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("creates employee with auto-generated code NV-YYYY-NNNN", async () => {
    const emp = await createEmployee(prisma, {
      fullName: "Nguyễn Văn A",
      joinedDate: new Date("2026-01-15"),
      gender: "Nam",
      phoneNumber: "0912345678",
    });

    expect(emp.code).toMatch(/^NV-\d{4}-\d{4}$/);
    expect(emp.fullName).toBe("Nguyễn Văn A");
    expect(emp.status).toBe(EmployeeStatus.ACTIVE);

    // Cleanup
    await prisma.employee.delete({ where: { id: emp.id } });
  });

  it("encrypts CCCD on creation and decrypts correctly", async () => {
    const rawCccd = "001204008899";

    const emp = await createEmployee(prisma, {
      fullName: "Trần Thị B",
      joinedDate: new Date("2026-02-01"),
      identityNumber: rawCccd,
    });

    // Verify stored data is encrypted, not plain text
    expect(emp.identityNumberEncrypted).not.toContain(rawCccd);
    expect(emp.identityNumberBlindIndex).toBeDefined();
    expect(emp.identityNumberBlindIndex).toHaveLength(64);
    expect(emp.identityNumberLastDigits).toBe("8899");

    // Verify decryption roundtrip
    const envelope = deserializeEnvelope(emp.identityNumberEncrypted!);
    const decrypted = decryptIdentityNumber(envelope);
    expect(decrypted).toBe(rawCccd);

    // Cleanup
    await prisma.employee.delete({ where: { id: emp.id } });
  });

  it("rejects duplicate identity numbers via blind index", async () => {
    const rawCccd = "079203012345";

    const emp1 = await createEmployee(prisma, {
      fullName: "Lê Văn C",
      joinedDate: new Date("2026-03-01"),
      identityNumber: rawCccd,
    });

    await expect(
      createEmployee(prisma, {
        fullName: "Phạm Văn D",
        joinedDate: new Date("2026-03-15"),
        identityNumber: rawCccd,
      })
    ).rejects.toThrow("An employee with this identity number already exists");

    // Cleanup
    await prisma.employee.delete({ where: { id: emp1.id } });
  });

  it("finds employee by plaintext identity number via blind index lookup", async () => {
    const rawCccd = "038299001122";

    const emp = await createEmployee(prisma, {
      fullName: "Hoàng Văn E",
      joinedDate: new Date("2026-04-01"),
      identityNumber: rawCccd,
    });

    const found = await findEmployeeByIdentityNumber(prisma, rawCccd);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(emp.id);
    expect(found!.fullName).toBe("Hoàng Văn E");

    // Also works with spaces/dashes in input
    const found2 = await findEmployeeByIdentityNumber(prisma, "038 299 001 122");
    expect(found2!.id).toBe(emp.id);

    // Cleanup
    await prisma.employee.delete({ where: { id: emp.id } });
  });

  it("updates employee profile and records audit history", async () => {
    // Create a dedicated test user for FK references
    const testUser = await prisma.user.create({
      data: {
        email: `hr_emp_test_${Date.now()}@example.com`,
        username: `hr_emp_test_${Date.now()}`,
        password: "dummy",
        name: "HR Employee Test Actor",
        role: "STAFF",
      },
    });

    try {
      const emp = await createEmployee(prisma, {
        fullName: "Vũ Thị F",
        joinedDate: new Date("2026-05-01"),
        createdById: testUser.id,
      });

      const updated = await updateEmployee(prisma, emp.id, {
        fullName: "Vũ Thị F (Updated)",
        phoneNumber: "0987654321",
        updatedById: testUser.id,
      });

      expect(updated.fullName).toBe("Vũ Thị F (Updated)");
      expect(updated.phoneNumber).toBe("0987654321");

      // Verify audit history
      const history = await prisma.employeeChangeHistory.findMany({
        where: { employeeId: emp.id },
        orderBy: { createdAt: "asc" },
      });

      expect(history).toHaveLength(2); // CREATED + UPDATED
      expect(history[0].changeType).toBe("EMPLOYEE_CREATED");
      expect(history[1].changeType).toBe("EMPLOYEE_PROFILE_UPDATED");

      // Cleanup employee data
      await prisma.employeeChangeHistory.deleteMany({ where: { employeeId: emp.id } });
      await prisma.employee.delete({ where: { id: emp.id } });
    } finally {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  });

  it("changes employment status with audit trail", async () => {
    const emp = await createEmployee(prisma, {
      fullName: "Đỗ Văn G",
      joinedDate: new Date("2026-01-01"),
      status: EmployeeStatus.PROBATION,
    });

    expect(emp.status).toBe(EmployeeStatus.PROBATION);

    const activated = await updateEmployee(prisma, emp.id, {
      status: EmployeeStatus.ACTIVE,
    });
    expect(activated.status).toBe(EmployeeStatus.ACTIVE);

    const resigned = await updateEmployee(prisma, emp.id, {
      status: EmployeeStatus.RESIGNED,
      resignedDate: new Date("2026-07-31"),
    });
    expect(resigned.status).toBe(EmployeeStatus.RESIGNED);
    expect(resigned.resignedDate).toEqual(new Date("2026-07-31"));

    // Cleanup
    await prisma.employeeChangeHistory.deleteMany({ where: { employeeId: emp.id } });
    await prisma.employee.delete({ where: { id: emp.id } });
  });
});

