import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const checks: Array<[string, boolean]> = [];

const registry = read("src/lib/roles/role-registry.ts");
const rbac = read("src/lib/rbac.ts");
const page = read("src/app/(dashboard)/users/page.tsx");
const actions = read("src/app/(dashboard)/users/actions.ts");
const client = read("src/components/users/user-management-client.tsx");
const header = read("src/components/layout/header.tsx");

checks.push(["ADMIN có nhãn Quản trị viên hệ thống", registry.includes('ADMIN: {\n    category: "SYSTEM",\n    label: "Quản trị viên hệ thống"')]);
checks.push(["DIRECTOR có nhãn Giám đốc điều hành", registry.includes('DIRECTOR: {\n    category: "SYSTEM",\n    label: "Giám đốc điều hành"')]);
checks.push(["RBAC dùng registry chung cho nhãn system role", rbac.includes("SYSTEM_ROLE_DISPLAY_NAMES")]);
checks.push(["KPI lãnh đạo chỉ đếm DIRECTOR và DEPUTY_DIRECTOR", page.includes('u.role === "DIRECTOR" || u.role === "DEPUTY_DIRECTOR"')]);
checks.push(["KPI loại soft-deleted trước khi đếm", page.includes("const activeAndLockedUsers = users.filter(u => u.deletedAt === null)" )]);
checks.push(["KPI nêu rõ phạm vi toàn hệ thống", page.includes("KPI dưới đây tính trên toàn hệ thống" )]);
checks.push(["Trang truyền system role và project role riêng", page.includes("roleDisplay: PROJECT_ROLE_DISPLAY_NAMES[pm.role]")]);
checks.push(["Update user không còn suy luận system role thành project role", !actions.includes('updatedUser.role === "CHIEF_COMMANDER"')]);
checks.push(["Project role là input explicit đã được kiểm tra", actions.includes("getExplicitProjectRole") && actions.includes("projectRoles?: Record<string, ProjectRole>" )]);
checks.push(["Gán công trình nhận project role explicit", actions.includes("projectRole: ProjectRole = \"VIEWER\"" )]);
checks.push(["Drawer phân biệt role hệ thống và role công trình", client.includes("Vai trò hệ thống") && client.includes("Vai trò tại công trình:" )]);
checks.push(["Header dùng nhãn role đã map, không map ADMIN thành Giám đốc", !header.includes("userRole === 'ADMIN' ? 'Giám đốc điều hành'" )]);

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} - ${label}`);
  if (!passed) failed = true;
}

if (failed) process.exitCode = 1;
