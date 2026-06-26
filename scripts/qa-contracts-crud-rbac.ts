/**
 * QA Script: Contracts CRUD, RBAC & Security Isolation
 * Test trực tiếp server actions cho module Contracts.
 *
 * Chạy: npx tsx --env-file=.env scripts/qa-contracts-crud-rbac.ts
 */

import prisma from "../src/lib/prisma";
import { UserRole, ProjectRole, ContractType, ContractStatus } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require("module");
const originalRequire = Module.prototype.require;

let currentSession: { id: string; role: UserRole } | null = null;

// Mock Next.js server-only modules
Module.prototype.require = function (...args: [string]) {
  if (args[0] === "next/headers") {
    return {
      cookies: () => ({
        get: () => ({ value: "fake-token" }),
      }),
    };
  }
  if (args[0] === "@/lib/auth" || args[0].endsWith("lib/auth")) {
    const auth = originalRequire.apply(this, args);
    return {
      ...auth,
      getSession: async () => currentSession,
    };
  }
  if (args[0] === "next/cache") {
    return { revalidatePath: () => { } };
  }
  return originalRequire.apply(this, args);
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getContractsData, createContract, updateContract, deleteContract } = require("../src/app/(dashboard)/contracts/actions");
import { getContractDisplayStatus } from "../src/lib/contracts/contracts-permissions";

const runId = Date.now();
const PREFIX_ISOLATION = `QA-CONTRACT-ISOLATION-${runId}`;
const PREFIX_PAYMENT = `QA-CONTRACT-PAYMENT-${runId}`;

let passed = 0;
let failed = 0;

function pass(msg: string) {
  passed++;
  console.log(`  [PASS] ${msg}`);
}

function fail(msg: string) {
  failed++;
  console.error(`  [FAIL] ${msg}`);
}

async function assertThrow(fn: () => Promise<unknown>, expectedPart?: string): Promise<void> {
  try {
    await fn();
    throw new Error("__NO_THROW__");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "__NO_THROW__") throw new Error("Hàm không báo lỗi như mong đợi");
    if (expectedPart && !msg.includes(expectedPart)) {
      throw new Error(`Mong đợi lỗi chứa "${expectedPart}", nhận được "${msg}"`);
    }
  }
}

async function setupTestData() {
  // Create projects
  const projectA = await prisma.project.create({
    data: {
      code: `${PREFIX_ISOLATION}-A`,
      name: `Project Isolation A ${runId}`,
      status: "ACTIVE",
    }
  });

  const projectB = await prisma.project.create({
    data: {
      code: `${PREFIX_ISOLATION}-B`,
      name: `Project Isolation B ${runId}`,
      status: "ACTIVE",
    }
  });

  const projectPayment = await prisma.project.create({
    data: {
      code: `${PREFIX_PAYMENT}`,
      name: `Project Payment Protection ${runId}`,
      status: "ACTIVE",
    }
  });

  // Create users
  const admin = await prisma.user.create({
    data: {
      email: `qa.contract.admin_${runId}@test.local`,
      username: `qa_admin_${runId}`,
      password: "hash",
      name: "Admin Isolation",
      role: UserRole.ADMIN,
      isActive: true,
    }
  });

  const userA = await prisma.user.create({
    data: {
      email: `qa.contract.pm.a_${runId}@test.local`,
      username: `qa_pm_a_${runId}`,
      password: "hash",
      name: "User Isolation A",
      role: UserRole.ENGINEER,
      isActive: true,
    }
  });

  const userB = await prisma.user.create({
    data: {
      email: `qa.contract.pm.b_${runId}@test.local`,
      username: `qa_pm_b_${runId}`,
      password: "hash",
      name: "User Isolation B",
      role: UserRole.ENGINEER,
      isActive: true,
    }
  });

  // Assign user A to Project A with PROJECT_MANAGER
  await prisma.projectMember.create({
    data: {
      projectId: projectA.id,
      userId: userA.id,
      role: ProjectRole.PROJECT_MANAGER,
      isActive: true,
    }
  });

  // Assign user B to Project B with PROJECT_MANAGER
  await prisma.projectMember.create({
    data: {
      projectId: projectB.id,
      userId: userB.id,
      role: ProjectRole.PROJECT_MANAGER,
      isActive: true,
    }
  });

  return { projectA, projectB, projectPayment, admin, userA, userB };
}

async function cleanupTestData(data: Awaited<ReturnType<typeof setupTestData>> | null) {
  if (!data) return;
  const { projectA, projectB, projectPayment, admin, userA, userB } = data;

  const projectIds = [projectA.id, projectB.id, projectPayment.id];
  const userIds = [admin.id, userA.id, userB.id];

  try {
    // 1. Delete PaymentPlans
    await prisma.paymentPlan.deleteMany({
      where: { projectId: { in: projectIds } }
    });

    // 2. Delete Contracts
    await prisma.contract.deleteMany({
      where: { projectId: { in: projectIds } }
    });

    // 3. Delete ProjectMembers
    await prisma.projectMember.deleteMany({
      where: { projectId: { in: projectIds } }
    });

    // 4. Delete Projects
    await prisma.project.deleteMany({
      where: { id: { in: projectIds } }
    });

    // 5. Delete Users
    await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });

    console.log("  [+] Dọn dẹp dữ liệu test thành công.");
  } catch (error) {
    console.error("  [!] Lỗi khi dọn dẹp dữ liệu test:", error);
  }
}

async function runTests() {
  console.log("=== BẮT ĐẦU KIỂM TRA HẬU KIỂM BẢO MẬT & ISOLATION HỢP ĐỒNG ===");
  let testData: Awaited<ReturnType<typeof setupTestData>> | null = null;

  try {
    console.log("\n[+] Đang tạo dữ liệu test...");
    testData = await setupTestData();
    const { projectA, projectB, projectPayment, admin, userA, userB } = testData;

    // Create contract A in project A via prisma directly so we have initial data
    const contractA = await prisma.contract.create({
      data: {
        projectId: projectA.id,
        contractNo: `${PREFIX_ISOLATION}-A-C1`,
        name: "Hợp đồng Isolation A",
        type: ContractType.SUBCONTRACTOR,
        status: ContractStatus.ACTIVE,
        value: 100000000,
      }
    });

    const contractB = await prisma.contract.create({
      data: {
        projectId: projectB.id,
        contractNo: `${PREFIX_ISOLATION}-B-C1`,
        name: "Hợp đồng Isolation B",
        type: ContractType.SUBCONTRACTOR,
        status: ContractStatus.ACTIVE,
        value: 200000000,
      }
    });

    // ========================================================
    // NHÓM A - PROJECT ISOLATION / RBAC THEO CÔNG TRÌNH
    // ========================================================
    console.log("\n--- NHÓM A: PROJECT ISOLATION ---");

    // 1. User A xem danh sách hợp đồng
    currentSession = { id: userA.id, role: UserRole.ENGINEER };
    const userAData = await getContractsData();
    const foundA = userAData.contracts.some((c: any) => c.id === contractA.id);
    const foundB = userAData.contracts.some((c: any) => c.id === contractB.id);

    if (foundA && !foundB) {
      pass("User A thấy Contract A và KHÔNG thấy Contract B trong danh sách");
    } else {
      fail(`User A xem danh sách bị lỗi: thấy A? ${foundA}, thấy B? ${foundB}`);
    }

    // 2. User A update Contract A (Thành công)
    try {
      const updateResA = await updateContract(contractA.id, {
        projectId: projectA.id,
        contractNo: `${PREFIX_ISOLATION}-A-C1`,
        name: "Hợp đồng Isolation A Cập nhật",
        type: ContractType.SUBCONTRACTOR,
        status: ContractStatus.ACTIVE,
        value: 150000000,
      });
      if (updateResA.ok) {
        pass("User A cập nhật thành công Contract A của dự án mình");
      } else {
        fail("User A cập nhật Contract A thất bại");
      }
    } catch (err: any) {
      fail(`User A cập nhật Contract A báo lỗi: ${err.message}`);
    }

    // 3. User A update Contract B (Bị chặn)
    try {
      await assertThrow(
        () => updateContract(contractB.id, {
          projectId: projectB.id,
          contractNo: `${PREFIX_ISOLATION}-B-C1`,
          name: "Hợp đồng Isolation B Cập nhật hack",
          type: ContractType.SUBCONTRACTOR,
          status: ContractStatus.ACTIVE,
          value: 250000000,
        }),
        "Bạn không có quyền sửa hợp đồng này"
      );
      pass("User A bị chặn đúng khi cố tình sửa Contract B của dự án khác");
    } catch (err: any) {
      fail(`Chặn sửa Contract B thất bại hoặc sai lỗi: ${err.message}`);
    }

    // 4. User A delete Contract B (Bị chặn)
    try {
      await assertThrow(
        () => deleteContract(contractB.id),
        "Bạn không có quyền xóa hợp đồng này"
      );
      pass("User A bị chặn đúng khi cố tình xóa Contract B của dự án khác");
    } catch (err: any) {
      fail(`Chặn xóa Contract B thất bại hoặc sai lỗi: ${err.message}`);
    }

    // 5. User A create contract vào Project B (Bị chặn)
    try {
      await assertThrow(
        () => createContract({
          projectId: projectB.id,
          contractNo: `${PREFIX_ISOLATION}-B-C2`,
          name: "Hợp đồng hack tạo vào B",
          type: ContractType.SUBCONTRACTOR,
          status: ContractStatus.DRAFT,
          value: 50000000,
        }),
        "Bạn không có quyền tạo hợp đồng cho công trình này"
      );
      pass("User A bị chặn đúng khi cố tình tạo hợp đồng vào Project B");
    } catch (err: any) {
      fail(`Chặn tạo hợp đồng vào Project B thất bại hoặc sai lỗi: ${err.message}`);
    }

    // 6. User A create contract vào Project A (Thành công)
    let contractA2Id = "";
    try {
      const createResA = await createContract({
        projectId: projectA.id,
        contractNo: `${PREFIX_ISOLATION}-A-C2`,
        name: "Hợp đồng A2 hợp lệ",
        type: ContractType.SUBCONTRACTOR,
        status: ContractStatus.DRAFT,
        value: 50000000,
      });
      if (createResA.ok) {
        pass("User A tạo hợp đồng thành công trong Project A của mình");
        // Tìm ID để cleanup/test
        const latestContracts = await prisma.contract.findMany({
          where: { projectId: projectA.id, contractNo: `${PREFIX_ISOLATION}-A-C2` }
        });
        if (latestContracts.length > 0) {
          contractA2Id = latestContracts[0].id;
        }
      } else {
        fail("User A tạo hợp đồng trong Project A thất bại");
      }
    } catch (err: any) {
      fail(`User A tạo hợp đồng trong Project A báo lỗi: ${err.message}`);
    }
    // 7. Admin thấy cả Contract A và Contract B, thao tác được cả hai
    currentSession = { id: admin.id, role: UserRole.ADMIN };
    const adminData = await getContractsData();
    const adminFoundA = adminData.contracts.some((c: any) => c.id === contractA.id);
    const adminFoundB = adminData.contracts.some((c: any) => c.id === contractB.id);

    if (adminFoundA && adminFoundB) {
      pass("Admin thấy đầy đủ cả Contract A và Contract B trong danh sách");
    } else {
      fail(`Admin không thấy đủ hợp đồng: thấy A? ${adminFoundA}, thấy B? ${adminFoundB}`);
    }

    // Admin update Contract B (Thành công)
    try {
      const adminUpdateRes = await updateContract(contractB.id, {
        projectId: projectB.id,
        contractNo: `${PREFIX_ISOLATION}-B-C1`,
        name: "Hợp đồng B sửa bởi Admin",
        type: ContractType.SUBCONTRACTOR,
        status: ContractStatus.ACTIVE,
        value: 300000000,
      });
      if (adminUpdateRes.ok) {
        pass("Admin cập nhật thành công hợp đồng thuộc dự án bất kỳ");
      } else {
        fail("Admin cập nhật Contract B thất bại");
      }
    } catch (err: any) {
      fail(`Admin cập nhật Contract B báo lỗi: ${err.message}`);
    }

    // 8. User A delete Contract A (Thành công bằng soft delete)
    currentSession = { id: userA.id, role: UserRole.ENGINEER };
    try {
      const deleteResA = await deleteContract(contractA.id);
      if (deleteResA.ok) {
        const deletedContract = await prisma.contract.findUnique({
          where: { id: contractA.id }
        });
        if (deletedContract && deletedContract.deletedAt !== null) {
          pass("User A xóa thành công Contract A (soft delete hoạt động)");
        } else {
          fail("Hợp đồng bị xóa cứng hoặc không gán deletedAt");
        }
      } else {
        fail("User A xóa Contract A thất bại");
      }
    } catch (err: any) {
      fail(`User A xóa Contract A báo lỗi: ${err.message}`);
    }
    // NHÓM B - PAYMENTPLAN DELETE PROTECTION
    // ========================================================
    console.log("\n--- NHÓM B: PAYMENTPLAN DELETE PROTECTION ---");

    // 1. Admin tạo contract thành công
    currentSession = { id: admin.id, role: UserRole.ADMIN };
    let contractPaymentId = "";
    try {
      const createPaymentContractRes = await createContract({
        projectId: projectPayment.id,
        contractNo: `${PREFIX_PAYMENT}-001`,
        name: "Hợp đồng QA Payment Protection",
        type: ContractType.CLIENT,
        status: ContractStatus.ACTIVE,
        value: 500000000,
      });
      if (createPaymentContractRes.ok) {
        const created = await prisma.contract.findFirst({
          where: { contractNo: `${PREFIX_PAYMENT}-001` }
        });
        if (created) {
          contractPaymentId = created.id;
          pass("Admin tạo contract thành công để test PaymentPlan");
        }
      }
    } catch (err: any) {
      fail(`Admin tạo contract test PaymentPlan thất bại: ${err.message}`);
    }

    // 2. Tạo PaymentPlan gắn vào contract
    if (contractPaymentId) {
      const paymentPlan = await prisma.paymentPlan.create({
        data: {
          projectId: projectPayment.id,
          contractId: contractPaymentId,
          name: "Kế hoạch đợt 1",
          amount: 100000000,
          plannedDate: new Date(),
          status: "PENDING"
        }
      });
      pass(`Đã tạo PaymentPlan gắn kết với contract (ID: ${paymentPlan.id})`);

      // 3. Admin gọi deleteContract(contractPaymentId) và kỳ vọng bị chặn
      try {
        await assertThrow(
          () => deleteContract(contractPaymentId),
          "Không thể xóa hợp đồng đã có kế hoạch thanh toán"
        );
        pass("Hệ thống chặn đúng và báo lỗi: 'Không thể xóa hợp đồng đã có kế hoạch thanh toán'");
      } catch (err: any) {
        fail(`Chặn xóa hợp đồng có kế hoạch thanh toán thất bại: ${err.message}`);
      }

      // 4. Kiểm tra contract vẫn active (deletedAt = null) và PaymentPlan vẫn tồn tại
      const contractCheck = await prisma.contract.findUnique({
        where: { id: contractPaymentId }
      });
      const paymentPlanCheck = await prisma.paymentPlan.findUnique({
        where: { id: paymentPlan.id }
      });

      if (contractCheck && contractCheck.deletedAt === null && paymentPlanCheck) {
        pass("Dữ liệu hợp đồng và kế hoạch thanh toán hoàn toàn được bảo toàn");
      } else {
        fail(`Dữ liệu bị lỗi sau khi chặn xóa: contract deletedAt? ${contractCheck?.deletedAt}, paymentPlan exists? ${!!paymentPlanCheck}`);
      }
    } else {
      fail("Không thể chạy test PaymentPlan protection vì không tạo được contract");
    }

    // ========================================================
    // NHÓM C - DEADLINE/STATUS HELPER TESTS
    // ========================================================
    console.log("\n--- NHÓM C: DEADLINE/STATUS HELPER ---");

    const today = new Date();

    // 1. Test ACTIVE + endDate hôm qua => OVERDUE
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const statusOverdue = getContractDisplayStatus(ContractStatus.ACTIVE, yesterday);
    if (statusOverdue === "OVERDUE") {
      pass("ACTIVE + ngày kết thúc hôm qua -> OVERDUE (Quá hạn) thành công");
    } else {
      fail(`ACTIVE + ngày kết thúc hôm qua -> trả về ${statusOverdue}`);
    }

    // 2. Test ACTIVE + endDate sau 20 ngày => EXPIRING
    const in20Days = new Date(today);
    in20Days.setDate(today.getDate() + 20);
    const statusExpiring = getContractDisplayStatus(ContractStatus.ACTIVE, in20Days);
    if (statusExpiring === "EXPIRING") {
      pass("ACTIVE + ngày kết thúc sau 20 ngày -> EXPIRING (Sắp hết hạn) thành công");
    } else {
      fail(`ACTIVE + ngày kết thúc sau 20 ngày -> trả về ${statusExpiring}`);
    }

    // 3. Test ACTIVE + endDate sau 90 ngày => ACTIVE
    const in90Days = new Date(today);
    in90Days.setDate(today.getDate() + 90);
    const statusActive = getContractDisplayStatus(ContractStatus.ACTIVE, in90Days);
    if (statusActive === "ACTIVE") {
      pass("ACTIVE + ngày kết thúc sau 90 ngày -> ACTIVE (Đang thực hiện) thành công");
    } else {
      fail(`ACTIVE + ngày kết thúc sau 90 ngày -> trả về ${statusActive}`);
    }

    // 4. Test DRAFT => DRAFT
    const statusDraft = getContractDisplayStatus(ContractStatus.DRAFT, yesterday);
    if (statusDraft === "DRAFT") {
      pass("DRAFT -> DRAFT thành công");
    } else {
      fail(`DRAFT -> trả về ${statusDraft}`);
    }

    // 5. Test COMPLETED => COMPLETED
    const statusCompleted = getContractDisplayStatus(ContractStatus.COMPLETED, yesterday);
    if (statusCompleted === "COMPLETED") {
      pass("COMPLETED -> COMPLETED thành công");
    } else {
      fail(`COMPLETED -> trả về ${statusCompleted}`);
    }

    // 6. Test TERMINATED => TERMINATED
    const statusTerminated = getContractDisplayStatus(ContractStatus.TERMINATED, yesterday);
    if (statusTerminated === "TERMINATED") {
      pass("TERMINATED -> TERMINATED thành công");
    } else {
      fail(`TERMINATED -> trả về ${statusTerminated}`);
    }

    // ========================================================
    // NHÓM D - HIGH VALUE & FORMATTING TESTS
    // ========================================================
    console.log("\n--- NHÓM D: HIGH VALUE & FORMATTING TESTS ---");

    // 1. Tạo hợp đồng trị giá 4.444.444.444 (4,4 tỷ)
    currentSession = { id: admin.id, role: UserRole.ADMIN };
    let contractDId = "";
    try {
      const createResD = await createContract({
        projectId: projectA.id,
        contractNo: `${PREFIX_ISOLATION}-D-C1`,
        name: "Hợp đồng QA Giá trị lớn 1",
        type: ContractType.SUBCONTRACTOR,
        status: ContractStatus.ACTIVE,
        value: 4444444444,
      });

      if (createResD.ok) {
        const checkC = await prisma.contract.findFirst({
          where: { contractNo: `${PREFIX_ISOLATION}-D-C1`, deletedAt: null }
        });
        if (checkC && Number(checkC.value) === 4444444444) {
          pass("Tạo hợp đồng trị giá 4.444.444.444 VNĐ thành công và lưu đúng giá trị");
          contractDId = checkC.id;
        } else {
          fail(`Lưu sai giá trị hợp đồng: ${checkC ? checkC.value : "không tìm thấy"}`);
        }
      } else {
        fail("Tạo hợp đồng trị giá lớn 1 thất bại");
      }
    } catch (err: any) {
      fail(`Tạo hợp đồng trị giá lớn 1 báo lỗi: ${err.message}`);
    }

    // 2. Cập nhật hợp đồng lên trị giá 250.000.000.000 (250 tỷ)
    if (contractDId) {
      try {
        const updateResD = await updateContract(contractDId, {
          projectId: projectA.id,
          contractNo: `${PREFIX_ISOLATION}-D-C1`,
          name: "Hợp đồng QA Giá trị lớn 1 cập nhật",
          type: ContractType.SUBCONTRACTOR,
          status: ContractStatus.ACTIVE,
          value: 250000000000,
        });

        if (updateResD.ok) {
          const checkC = await prisma.contract.findUnique({
            where: { id: contractDId }
          });
          if (checkC && Number(checkC.value) === 250000000000) {
            pass("Cập nhật hợp đồng lên trị giá 250.000.000.000 VNĐ thành công và lưu đúng giá trị");
          } else {
            fail(`Lưu sai giá trị cập nhật: ${checkC ? checkC.value : "không tìm thấy"}`);
          }
        } else {
          fail("Cập nhật hợp đồng trị giá lớn 2 thất bại");
        }
      } catch (err: any) {
        fail(`Cập nhật hợp đồng trị giá lớn 2 báo lỗi: ${err.message}`);
      }
    } else {
      fail("Bỏ qua test cập nhật do tạo thất bại");
    }

    // 3. Test value <= 0 (Bị chặn)
    try {
      await assertThrow(
        () => createContract({
          projectId: projectA.id,
          contractNo: `${PREFIX_ISOLATION}-D-C2`,
          name: "Hợp đồng giá trị âm",
          type: ContractType.SUBCONTRACTOR,
          status: ContractStatus.ACTIVE,
          value: -100,
        }),
        "Giá trị hợp đồng phải lớn hơn 0."
      );
      pass("Hệ thống chặn đúng khi tạo hợp đồng với giá trị âm");
    } catch (err: any) {
      fail(`Không chặn được giá trị âm hoặc sai lỗi: ${err.message}`);
    }

    // 4. Test logic ngày kết thúc trước ngày bắt đầu (Bị chặn)
    try {
      const todayStr = new Date().toISOString().substring(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
      await assertThrow(
        () => createContract({
          projectId: projectA.id,
          contractNo: `${PREFIX_ISOLATION}-D-C3`,
          name: "Hợp đồng sai ngày",
          type: ContractType.SUBCONTRACTOR,
          status: ContractStatus.ACTIVE,
          value: 1000000,
          startDate: todayStr,
          endDate: yesterdayStr,
        }),
        "Ngày kết thúc không được trước ngày bắt đầu."
      );
      pass("Hệ thống chặn đúng khi ngày kết thúc trước ngày bắt đầu");
    } catch (err: any) {
      fail(`Không chặn được ngày kết thúc trước ngày bắt đầu hoặc sai lỗi: ${err.message}`);
    }

  } finally {
    console.log("\n[+] Đang dọn dẹp dữ liệu test...");
    await cleanupTestData(testData);
  }

  // Summary
  console.log("\n==============================");
  console.log(`TỔNG KẾT: ${passed} PASS / ${failed} FAIL`);
  console.log("==============================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Lỗi khi chạy bộ QA:", err);
  process.exit(1);
});
