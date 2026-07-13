import { getMaterialPermissions } from "../src/lib/materials/materials-permissions";

function assertResult(condition: boolean, label: string) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`PASS: ${label}`);
}

function main() {
  console.log("=== KIỂM TRA LOGIC RBAC VẬT TƯ ===");

  const admin = getMaterialPermissions("ADMIN");
  assertResult(admin.canImport && admin.canExport, "ADMIN có quyền thao tác vật tư");

  const directorWithoutProject = getMaterialPermissions("DIRECTOR", null);
  assertResult(directorWithoutProject.canView, "DIRECTOR có quyền xem theo chính sách công ty");

  const supervisor = getMaterialPermissions("STAFF", "SUPERVISOR");
  assertResult(!supervisor.canImport && !supervisor.canExport, "SUPERVISOR chỉ được xem khi không có vai trò quản lý kho");

  const viewer = getMaterialPermissions("STAFF", "VIEWER");
  assertResult(viewer.canView && !viewer.canCreate && !viewer.canUpdate, "VIEWER chỉ đọc vật tư");

  const chief = getMaterialPermissions("CHIEF_COMMANDER", "CHIEF_COMMANDER");
  assertResult(chief.canImport && chief.canExport, "CHIEF_COMMANDER quản lý vật tư trong công trình");
}

main();
