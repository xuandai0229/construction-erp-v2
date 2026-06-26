import prisma from "../src/lib/prisma";
import { UserRole, ProjectRole } from "@prisma/client";
import { getMaterialPermissions } from "../src/lib/materials/materials-permissions";

const Module = require("module");
const originalRequire = Module.prototype.require;

let currentSession: any = null;

Module.prototype.require = function() {
  if (arguments[0] === "next/headers") {
    return {
      cookies: () => ({
        get: () => ({ value: "fake-token" })
      })
    };
  }
  if (arguments[0] === "@/lib/auth" || arguments[0].endsWith("lib/auth")) {
    const auth = originalRequire.apply(this, arguments as any);
    return {
      ...auth,
      getSession: async () => currentSession,
      requireSession: async () => {
        if (!currentSession) throw new Error("Unauthorized");
        return currentSession;
      }
    };
  }
  if (arguments[0] === "next/cache") {
    return { revalidatePath: () => {} };
  }
  return originalRequire.apply(this, arguments as any);
};

const { requireProjectPermissions, createMaterialItem, updateMaterialItem, deleteMaterialItem, createMaterialTransaction } = require("../src/app/(dashboard)/materials/actions");

const runId = Date.now();

async function createUser(emailPrefix: string, name: string, role: UserRole) {
  return await prisma.user.create({
    data: {
      email: `${emailPrefix}_${runId}@example.com`,
      password: "hash",
      name: name,
      role: role,
      isActive: true,
    }
  });
}

async function setupTestData() {
  const users = {
    admin: await createUser("admin", "Quản trị hệ thống", UserRole.ADMIN),
    director: await createUser("director", "Giám đốc", UserRole.DIRECTOR),
    deputyDirector: await createUser("deputy", "Phó giám đốc", UserRole.DEPUTY_DIRECTOR),
    chiefCmdSys: await createUser("chiefsys", "Chỉ huy trưởng hệ thống", UserRole.CHIEF_COMMANDER),
    manager: await createUser("manager", "Quản lý", UserRole.MANAGER),
    engineer: await createUser("engineer", "Kỹ sư", UserRole.ENGINEER),
    accountant: await createUser("accountant", "Kế toán", UserRole.ACCOUNTANT),
    staff: await createUser("staff", "Nhân viên", UserRole.STAFF),
    
    // Users for ProjectRoles tests
    pm: await createUser("pm", "Quản lý dự án", UserRole.ENGINEER),
    siteCmd: await createUser("sitecmd", "Chỉ huy công trường", UserRole.ENGINEER),
    chiefCmdPrj: await createUser("chiefcmdprj", "Chỉ huy trưởng công trình", UserRole.ENGINEER),
    assistCmd: await createUser("assist", "Chỉ huy phó", UserRole.ENGINEER),
    qaqc: await createUser("qaqc", "QA/QC", UserRole.STAFF),
    hse: await createUser("hse", "An toàn lao động", UserRole.STAFF),
    supervisor: await createUser("supervisor", "Giám sát", UserRole.STAFF),
    viewer: await createUser("viewer", "Chỉ xem", UserRole.STAFF),
  };

  const projectA = await prisma.project.create({
    data: { name: `Dự án Test RBAC A ${runId}`, code: `PRJ-RBAC-A-${runId}`, status: "ACTIVE" }
  });

  const projectB = await prisma.project.create({
    data: { name: `Dự án Test RBAC B ${runId}`, code: `PRJ-RBAC-B-${runId}`, status: "ACTIVE" }
  });

  await prisma.projectMember.createMany({
    data: [
      { projectId: projectA.id, userId: users.pm.id, role: ProjectRole.PROJECT_MANAGER },
      { projectId: projectA.id, userId: users.siteCmd.id, role: ProjectRole.SITE_COMMANDER },
      { projectId: projectA.id, userId: users.chiefCmdPrj.id, role: ProjectRole.CHIEF_COMMANDER },
      { projectId: projectA.id, userId: users.assistCmd.id, role: ProjectRole.ASSISTANT_COMMANDER },
      { projectId: projectA.id, userId: users.qaqc.id, role: ProjectRole.QA_QC },
      { projectId: projectA.id, userId: users.hse.id, role: ProjectRole.HSE },
      { projectId: projectA.id, userId: users.supervisor.id, role: ProjectRole.SUPERVISOR },
      { projectId: projectA.id, userId: users.viewer.id, role: ProjectRole.VIEWER },
      // Note: manager, director, etc. are NOT in the project.
    ]
  });

  const material = await prisma.materialItem.create({
    data: { projectId: projectA.id, code: `MAT-DEL-${runId}`, name: "Vật tư cần xóa", unit: "kg" }
  });

  await prisma.projectMaterialStock.create({
    data: { projectId: projectA.id, materialItemId: material.id, stock: 50, minStockLevel: 10 }
  });

  await prisma.materialMovement.create({
    data: { projectId: projectA.id, materialItemId: material.id, type: "IMPORT", quantity: 50, movementDate: new Date() }
  });

  return { users, projectA, projectB, material };
}

async function cleanupTestData(ids: any) {
  if (!ids) return;
  const { users, projectA, projectB } = ids;
  const projectIds = [projectA?.id, projectB?.id].filter(Boolean);
  
  if (projectIds.length > 0) {
    await prisma.materialMovement.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.projectMaterialStock.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.materialItem.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.projectMember.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  }

  if (users) {
    const userIds = Object.values(users).map((u: any) => u.id);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

function assertThrow(fn: () => Promise<any>, expectedMessagePart?: string) {
  return fn().then(
    () => { throw new Error("Hàm không báo lỗi như mong đợi"); },
    (err) => {
      if (expectedMessagePart && !err.message.includes(expectedMessagePart)) {
        throw new Error(`Mong đợi lỗi chứa "${expectedMessagePart}", nhưng nhận được "${err.message}"`);
      }
    }
  );
}

async function assertFullWriteAccess(session: any, projectId: string, materialId: string) {
  currentSession = session;
  // Test if they can read/write without throwing
  await updateMaterialItem(materialId, { name: "Test update", unit: "kg" });
}

async function assertViewOnlyAccess(session: any, projectId: string, materialId: string) {
  currentSession = session;
  await assertThrow(() => createMaterialItem({ projectId, name: "Test", unit: "kg" }), "không có quyền");
  await assertThrow(() => updateMaterialItem(materialId, { name: "Test", unit: "kg" }), "không có quyền");
  await assertThrow(() => deleteMaterialItem(materialId), "không có quyền");
  await assertThrow(() => createMaterialTransaction({ projectId, materialItemId: materialId, type: "IMPORT", quantity: 10, movementDate: new Date() }), "không có quyền");
  await assertThrow(() => createMaterialTransaction({ projectId, materialItemId: materialId, type: "EXPORT", quantity: 10, movementDate: new Date() }), "không có quyền");
}

async function runTests() {
  console.log("Đang thiết lập dữ liệu test...");
  let ids: any = null;
  try {
    ids = await setupTestData();
    const { users, projectA, projectB, material } = ids;

    // --- PHASE 2: UserRole ---
    let perms = await requireProjectPermissions({ id: users.admin.id, role: UserRole.ADMIN }, projectA.id);
    if (!perms.canCreate || !perms.canDelete || !perms.canImport || !perms.canExport || !perms.canUpdate || !perms.canViewTransactions) throw new Error("Admin thiếu quyền");
    await assertFullWriteAccess({ id: users.admin.id, role: UserRole.ADMIN }, projectA.id, material.id);
    console.log("[PASS] Quản trị hệ thống có toàn quyền vật tư");

    // All other System roles without project access
    const sysRoles = [
      { user: users.director, name: "Giám đốc" },
      { user: users.deputyDirector, name: "Phó giám đốc" },
      { user: users.chiefCmdSys, name: "Chỉ huy trưởng cấp hệ thống" },
      { user: users.manager, name: "Quản lý" },
      { user: users.engineer, name: "Kỹ sư" },
      { user: users.accountant, name: "Kế toán" },
      { user: users.staff, name: "Nhân viên" }
    ];

    for (const r of sysRoles) {
      await assertThrow(() => requireProjectPermissions({ id: r.user.id, role: r.user.role }, projectA.id), "không có quyền");
      console.log(`[PASS] ${r.name} không thuộc công trình bị chặn theo đúng thiết kế`);
    }
    console.log("[PASS] User không thuộc công trình bị chặn");

    // --- PHASE 3: ProjectRole ---
    
    // Project Manager
    perms = await requireProjectPermissions({ id: users.pm.id, role: users.pm.role }, projectA.id);
    if (!perms.canCreate) throw new Error("PM thiếu quyền");
    await assertFullWriteAccess({ id: users.pm.id, role: users.pm.role }, projectA.id, material.id);
    console.log("[PASS] Quản lý dự án có toàn quyền trong công trình");

    // Site Commander
    perms = await requireProjectPermissions({ id: users.siteCmd.id, role: users.siteCmd.role }, projectA.id);
    if (!perms.canCreate) throw new Error("Site Commander thiếu quyền");
    await assertFullWriteAccess({ id: users.siteCmd.id, role: users.siteCmd.role }, projectA.id, material.id);
    console.log("[PASS] Chỉ huy công trường có toàn quyền trong công trình");

    // Chief Commander Prj
    perms = await requireProjectPermissions({ id: users.chiefCmdPrj.id, role: users.chiefCmdPrj.role }, projectA.id);
    if (!perms.canCreate) throw new Error("Chief Commander thiếu quyền");
    await assertFullWriteAccess({ id: users.chiefCmdPrj.id, role: users.chiefCmdPrj.role }, projectA.id, material.id);
    console.log("[PASS] Chỉ huy trưởng công trình có toàn quyền trong công trình");

    // Assistant Commander
    perms = await requireProjectPermissions({ id: users.assistCmd.id, role: users.assistCmd.role }, projectA.id);
    if (!perms.canCreate) throw new Error("Assistant Commander thiếu quyền");
    await assertFullWriteAccess({ id: users.assistCmd.id, role: users.assistCmd.role }, projectA.id, material.id);
    console.log("[PASS] Chỉ huy phó có quyền đúng theo ma trận");

    // QA_QC
    perms = await requireProjectPermissions({ id: users.qaqc.id, role: users.qaqc.role }, projectA.id);
    if (perms.canCreate || !perms.canView) throw new Error("QAQC matrix wrong");
    await assertViewOnlyAccess({ id: users.qaqc.id, role: users.qaqc.role }, projectA.id, material.id);
    console.log("[PASS] QA/QC chỉ được xem và bị chặn thao tác ghi");

    // HSE
    perms = await requireProjectPermissions({ id: users.hse.id, role: users.hse.role }, projectA.id);
    if (perms.canCreate || !perms.canView) throw new Error("HSE matrix wrong");
    await assertViewOnlyAccess({ id: users.hse.id, role: users.hse.role }, projectA.id, material.id);
    console.log("[PASS] An toàn lao động chỉ được xem và bị chặn thao tác ghi");

    // SUPERVISOR
    perms = await requireProjectPermissions({ id: users.supervisor.id, role: users.supervisor.role }, projectA.id);
    if (perms.canCreate || !perms.canView) throw new Error("SUPERVISOR matrix wrong");
    await assertViewOnlyAccess({ id: users.supervisor.id, role: users.supervisor.role }, projectA.id, material.id);
    console.log("[PASS] Giám sát chỉ được xem và bị chặn thao tác ghi");

    // VIEWER
    perms = await requireProjectPermissions({ id: users.viewer.id, role: users.viewer.role }, projectA.id);
    if (perms.canCreate || !perms.canView) throw new Error("VIEWER matrix wrong");
    await assertViewOnlyAccess({ id: users.viewer.id, role: users.viewer.role }, projectA.id, material.id);
    console.log("[PASS] Chỉ xem không thể thêm/sửa/xóa/nhập/xuất");

    // --- PHASE 4: Cross project payload ---
    currentSession = { id: users.pm.id, role: users.pm.role };
    await assertThrow(() => createMaterialItem({ projectId: projectB.id, name: "Test", unit: "kg" }), "không có quyền thao tác");
    console.log("[PASS] Payload xuyên công trình bị chặn");

    await assertThrow(
      () => createMaterialTransaction({
        projectId: projectA.id,
        materialItemId: material.id,
        type: "RETURN",
        quantity: 1,
        movementDate: new Date(),
      } as any),
      "Loại giao dịch không hợp lệ"
    );
    console.log("[PASS] Payload loại giao dịch ngoài Nhập/Xuất bị chặn");

    // --- PHASE 5: Delete and update logic ---
    currentSession = { id: users.pm.id, role: users.pm.role };
    await updateMaterialItem(material.id, { name: "Updated Name", unit: "tons" });
    const updated = await prisma.materialItem.findUnique({ where: { id: material.id } });
    if (updated?.unit !== "tons") throw new Error("Không sửa được đơn vị tính");
    console.log("[PASS] Người có quyền sửa sửa được toàn bộ field kể cả đơn vị tính");

    await deleteMaterialItem(material.id);
    const deletedMaterial = await prisma.materialItem.findUnique({ where: { id: material.id } });
    const deletedStock = await prisma.projectMaterialStock.findFirst({ where: { materialItemId: material.id } });
    const deletedMovement = await prisma.materialMovement.findFirst({ where: { materialItemId: material.id } });
    if (deletedMaterial || deletedStock || deletedMovement) throw new Error("Hard delete thất bại, còn orphan data");
    console.log("[PASS] Người có quyền xóa xóa thẳng vật tư có tồn kho/giao dịch");

  } finally {
    console.log("Đang dọn dẹp dữ liệu test...");
    await cleanupTestData(ids);
  }
}

runTests().catch(e => {
  console.error("Test thất bại:", e);
  process.exit(1);
});
