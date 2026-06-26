/**
 * QA Script: Suppliers CRUD & RBAC
 * Test trực tiếp server actions cho module Suppliers.
 *
 * Chạy: npx tsx --env-file=.env scripts/qa-suppliers-crud-rbac.ts
 */

import prisma from "../src/lib/prisma";
import { UserRole } from "@prisma/client";
import { getSupplierPermissions } from "../src/lib/suppliers/suppliers-permissions";

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
    return { revalidatePath: () => {} };
  }
  return originalRequire.apply(this, args);
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSuppliers, createSupplier, updateSupplier, deleteSupplier } = require("../src/app/(dashboard)/suppliers/actions");

const runId = Date.now();
const PREFIX = `QA-SUPPLIER-${runId}`;

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

// ========================
// Setup / Cleanup
// ========================
async function createTestUser(emailPrefix: string, name: string, role: UserRole) {
  return prisma.user.create({
    data: {
      email: `${emailPrefix}_${runId}@qa.test`,
      password: "hash",
      name,
      role,
      isActive: true,
    },
  });
}

async function setupTestData() {
  const admin = await createTestUser("admin", "QA Admin", UserRole.ADMIN);
  const staff = await createTestUser("staff", "QA Nhân viên", UserRole.STAFF);
  const engineer = await createTestUser("engineer", "QA Kỹ sư", UserRole.ENGINEER);
  const manager = await createTestUser("manager", "QA Quản lý", UserRole.MANAGER);

  return { admin, staff, engineer, manager };
}

async function cleanupTestData(users: { admin: { id: string }; staff: { id: string }; engineer: { id: string }; manager: { id: string } } | null) {
  // Delete QA suppliers (hard cleanup)
  await prisma.supplier.deleteMany({
    where: { code: { startsWith: PREFIX } },
  });

  if (users) {
    const ids = Object.values(users).map((u) => u.id);
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
}

// ========================
// Tests
// ========================
async function runTests() {
  console.log("\n==============================");
  console.log("QA Suppliers CRUD & RBAC");
  console.log("==============================\n");

  let users: Awaited<ReturnType<typeof setupTestData>> | null = null;

  try {
    console.log("Đang thiết lập dữ liệu test...\n");
    users = await setupTestData();

    // ----- PHASE 1: Permissions Matrix Unit Test -----
    console.log("--- Phase 1: Kiểm tra ma trận quyền ---");

    const adminPerms = getSupplierPermissions(UserRole.ADMIN);
    if (!adminPerms.canView || !adminPerms.canCreate || !adminPerms.canUpdate || !adminPerms.canDelete) {
      fail("ADMIN thiếu quyền");
    } else {
      pass("ADMIN có toàn quyền");
    }

    const staffPerms = getSupplierPermissions(UserRole.STAFF);
    if (!staffPerms.canView) fail("STAFF không thể xem");
    else if (staffPerms.canCreate || staffPerms.canUpdate || staffPerms.canDelete) fail("STAFF có quyền ghi");
    else pass("STAFF chỉ được xem");

    const engineerPerms = getSupplierPermissions(UserRole.ENGINEER);
    if (!engineerPerms.canView) fail("ENGINEER không thể xem");
    else if (engineerPerms.canCreate) fail("ENGINEER có quyền tạo");
    else pass("ENGINEER chỉ được xem");

    const managerPerms = getSupplierPermissions(UserRole.MANAGER);
    if (!managerPerms.canView || !managerPerms.canCreate || !managerPerms.canUpdate) fail("MANAGER thiếu quyền");
    else if (managerPerms.canDelete) fail("MANAGER không nên xóa được");
    else pass("MANAGER có quyền tạo/sửa, không xóa");

    const directorPerms = getSupplierPermissions(UserRole.DIRECTOR);
    if (!directorPerms.canDelete) fail("DIRECTOR thiếu quyền xóa");
    else pass("DIRECTOR có toàn quyền");

    // ----- PHASE 2: CRUD qua Server Actions -----
    console.log("\n--- Phase 2: CRUD qua server actions ---");

    // Test 1: Admin tạo supplier
    currentSession = { id: users.admin.id, role: UserRole.ADMIN };
    const createResult = await createSupplier({
      code: `${PREFIX}-01`,
      name: `${PREFIX} Công ty Thép`,
      phone: "0912345678",
      taxCode: "0100112345",
      contactPerson: "Nguyễn Văn Test",
      email: "test@qa.com",
      address: "123 Đường Test, HN",
    });
    if (createResult?.ok) pass("Admin tạo supplier thành công");
    else fail("Admin không tạo được supplier");

    // Verify it exists in list
    const list1 = await getSuppliers();
    const found = list1.find((s: { code: string }) => s.code === `${PREFIX}-01`);
    if (found) pass("Supplier mới xuất hiện trong getSuppliers()");
    else fail("Supplier mới không xuất hiện trong getSuppliers()");

    // Test 2: Admin sửa supplier
    if (found) {
      const updateResult = await updateSupplier(found.id, {
        name: `${PREFIX} Công ty Thép Cập nhật`,
        phone: "0987654321",
      });
      if (updateResult?.ok) pass("Admin sửa supplier thành công");
      else fail("Admin không sửa được supplier");

      // Verify updated data
      const list2 = await getSuppliers();
      const updated = list2.find((s: { id: string }) => s.id === found.id);
      if (updated && updated.name.includes("Cập nhật") && updated.phone === "0987654321") {
        pass("Dữ liệu cập nhật đúng");
      } else {
        fail("Dữ liệu cập nhật không khớp");
      }
    }

    // Test 3: Tạo supplier thứ 2 (auto-code)
    const createResult2 = await createSupplier({
      name: `${PREFIX} NCC Tự sinh mã`,
    });
    if (createResult2?.ok) pass("Tạo supplier với mã tự sinh thành công");
    else fail("Không tạo được supplier tự sinh mã");

    // Test 4: Admin xóa supplier không có contract
    if (found) {
      const deleteResult = await deleteSupplier(found.id);
      if (deleteResult?.ok) pass("Admin xóa supplier không có hợp đồng thành công (soft delete)");
      else fail("Admin không xóa được supplier");

      // Verify soft delete - not in list
      const list3 = await getSuppliers();
      const shouldBeGone = list3.find((s: { id: string }) => s.id === found.id);
      if (!shouldBeGone) pass("Supplier đã xóa không còn trong getSuppliers()");
      else fail("Supplier đã xóa vẫn xuất hiện trong getSuppliers()");

      // Verify still in DB (soft delete)
      const inDb = await prisma.supplier.findUnique({ where: { id: found.id } });
      if (inDb && inDb.deletedAt !== null) pass("Supplier xóa mềm đúng (deletedAt != null)");
      else fail("Soft delete không hoạt động đúng");
    }

    // ----- PHASE 3: RBAC enforcement qua Server Actions -----
    console.log("\n--- Phase 3: Chặn quyền qua server actions ---");

    // STAFF không tạo được
    currentSession = { id: users.staff.id, role: UserRole.STAFF };
    try {
      await assertThrow(
        () => createSupplier({ name: `${PREFIX} STAFF Hack` }),
        "không có quyền"
      );
      pass("STAFF bị chặn khi tạo supplier");
    } catch (e) {
      fail(`STAFF tạo supplier lọt: ${e instanceof Error ? e.message : e}`);
    }

    // STAFF không sửa được
    const anySupplier = await prisma.supplier.findFirst({ where: { code: { startsWith: PREFIX }, deletedAt: null } });
    if (anySupplier) {
      try {
        await assertThrow(
          () => updateSupplier(anySupplier.id, { name: "Hack update" }),
          "không có quyền"
        );
        pass("STAFF bị chặn khi sửa supplier");
      } catch (e) {
        fail(`STAFF sửa supplier lọt: ${e instanceof Error ? e.message : e}`);
      }

      // STAFF không xóa được
      try {
        await assertThrow(
          () => deleteSupplier(anySupplier.id),
          "không có quyền"
        );
        pass("STAFF bị chặn khi xóa supplier");
      } catch (e) {
        fail(`STAFF xóa supplier lọt: ${e instanceof Error ? e.message : e}`);
      }

      // ENGINEER không tạo/sửa/xóa
      currentSession = { id: users.engineer.id, role: UserRole.ENGINEER };
      try {
        await assertThrow(
          () => createSupplier({ name: `${PREFIX} ENG Hack` }),
          "không có quyền"
        );
        pass("ENGINEER bị chặn khi tạo supplier");
      } catch (e) {
        fail(`ENGINEER tạo supplier lọt: ${e instanceof Error ? e.message : e}`);
      }
    }

    // MANAGER không xóa được
    currentSession = { id: users.manager.id, role: UserRole.MANAGER };
    if (anySupplier) {
      try {
        await assertThrow(
          () => deleteSupplier(anySupplier.id),
          "không có quyền"
        );
        pass("MANAGER bị chặn khi xóa supplier");
      } catch (e) {
        fail(`MANAGER xóa supplier lọt: ${e instanceof Error ? e.message : e}`);
      }
    }

    // ----- PHASE 4: Contract protection -----
    console.log("\n--- Phase 4: Chặn xóa supplier có hợp đồng ---");

    currentSession = { id: users.admin.id, role: UserRole.ADMIN };

    // Create a supplier with a contract
    const protectedSupplier = await prisma.supplier.create({
      data: {
        code: `${PREFIX}-PROTECTED`,
        name: `${PREFIX} Có HĐ`,
      },
    });

    // Need a project for the contract
    const testProject = await prisma.project.create({
      data: {
        name: `${PREFIX} Dự án test`,
        code: `${PREFIX}-PRJ`,
        status: "ACTIVE",
      },
    });

    const testContract = await prisma.contract.create({
      data: {
        projectId: testProject.id,
        supplierId: protectedSupplier.id,
        contractNo: `${PREFIX}-HD-01`,
        name: "Hợp đồng test",
        type: "SUPPLIER",
        value: 1000000,
      },
    });

    try {
      await assertThrow(
        () => deleteSupplier(protectedSupplier.id),
        "hợp đồng liên kết"
      );
      pass("Supplier có hợp đồng không thể xóa");
    } catch (e) {
      fail(`Xóa supplier có hợp đồng lọt: ${e instanceof Error ? e.message : e}`);
    }

    // Cleanup contract + project
    await prisma.contract.delete({ where: { id: testContract.id } });
    await prisma.project.delete({ where: { id: testProject.id } });
    // Now supplier can be deleted (or cleaned up below)

    // ----- PHASE 5: Validate empty name -----
    console.log("\n--- Phase 5: Validate dữ liệu ---");

    currentSession = { id: users.admin.id, role: UserRole.ADMIN };
    try {
      await assertThrow(
        () => createSupplier({ name: "" }),
        "Tên đối tác là bắt buộc"
      );
      pass("Tên rỗng bị chặn");
    } catch (e) {
      fail(`Tên rỗng không bị chặn: ${e instanceof Error ? e.message : e}`);
    }

    try {
      await assertThrow(
        () => createSupplier({ name: "   " }),
        "Tên đối tác là bắt buộc"
      );
      pass("Tên chỉ khoảng trắng bị chặn");
    } catch (e) {
      fail(`Tên khoảng trắng không bị chặn: ${e instanceof Error ? e.message : e}`);
    }

    // Duplicate code
    await createSupplier({ code: `${PREFIX}-DUP`, name: `${PREFIX} DUP test` });
    try {
      await assertThrow(
        () => createSupplier({ code: `${PREFIX}-DUP`, name: "Khác" }),
        "Mã đối tác đã tồn tại"
      );
      pass("Mã trùng bị chặn");
    } catch (e) {
      fail(`Mã trùng không bị chặn: ${e instanceof Error ? e.message : e}`);
    }

    // ----- PHASE 6: Unauthenticated -----
    console.log("\n--- Phase 6: Không đăng nhập ---");

    currentSession = null;
    try {
      await assertThrow(
        () => createSupplier({ name: "Hack" }),
        "đăng nhập"
      );
      pass("User không đăng nhập bị chặn tạo");
    } catch (e) {
      fail(`User không đăng nhập tạo lọt: ${e instanceof Error ? e.message : e}`);
    }

    const unauthList = await getSuppliers();
    if (Array.isArray(unauthList) && unauthList.length === 0) {
      pass("User không đăng nhập getSuppliers() trả rỗng");
    } else {
      fail("User không đăng nhập vẫn xem được supplier");
    }

  } finally {
    console.log("\nĐang dọn dẹp dữ liệu test...");
    await cleanupTestData(users);
    await prisma.$disconnect();
  }

  // Summary
  console.log("\n==============================");
  console.log(`Kết quả: ${passed} PASS / ${failed} FAIL`);
  console.log("==============================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test thất bại:", e);
  process.exit(1);
});
