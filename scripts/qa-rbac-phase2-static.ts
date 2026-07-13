import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PERMISSIONS } from "../src/lib/permissions/permission-types";
import { PERMISSION_REGISTRY } from "../src/lib/permissions/permission-registry";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const approvals = read("src/app/(dashboard)/approvals/actions.ts");
const approvalPermissions = read("src/lib/approvals/approval-permissions.ts");
const users = read("src/app/(dashboard)/users/actions.ts");
const search = read("src/app/actions/global-search.ts");
const notificationActions = read("src/app/actions/notifications.ts");

const required = [
  "users.view", "projects.view", "documents.download", "reports.export", "payments.approve", "approvals.decide", "audit.view_global", "settings.system",
] as const;

const checks: Array<[string, boolean]> = [
  ["Registry có toàn bộ permission bắt buộc", required.every((permission) => PERMISSIONS.includes(permission))],
  ["Registry gán ACCOUNTANT/payment theo công trình", PERMISSION_REGISTRY["payments.create"].defaultScope === "ASSIGNED_PROJECTS"],
  ["Approval không còn cho ACCOUNTANT PAYMENT global", !approvalPermissions.includes('actor.role === "ACCOUNTANT" && approval.type === "PAYMENT"')],
  ["Approval không còn cho MANAGER global", !approvalPermissions.includes('"MANAGER",\n];') && !approvals.includes('role === "MANAGER";')],
  ["Create approval gọi resolver", approvals.includes('assertPermission(actor, "approvals.create"')],
  ["Decision approval gọi resolver", approvals.includes('assertPermission(actor, "approvals.decide"')],
  ["Users bắt buộc project role explicit", !users.includes('projectRoles?.[projectId] ?? "VIEWER"') && users.includes("Vui lòng chọn vai trò tại công trình")],
  ["Reactivate giữ role cũ khi không gửi role mới", users.includes(': existingRecord.role')],
  ["Global search xác nhận project thuộc scope", search.includes("selectedProjectId") && search.includes("accessibleProjectIds.includes(globalProjectId)")],
  ["Notification write kiểm tra project scope", notificationActions.includes('assertPermission(session, "projects.view"')],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} - ${label}`);
  if (!passed) failed = true;
}
if (failed) process.exitCode = 1;
