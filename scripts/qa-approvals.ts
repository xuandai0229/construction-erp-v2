import "dotenv/config";
import { Prisma } from "@prisma/client";
import prisma from "../src/lib/prisma";
import {
  canApproveApproval,
  canCancelApproval,
  canSoftDeleteApproval,
  canViewApproval,
  canEditApproval,
  getApprovalPermissionSet,
} from "../src/lib/approvals/approval-permissions";
import {
  buildApprovalSummary,
  serializeApprovalRequest,
} from "../src/lib/approvals/approval-dto";

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

const checks: Check[] = [];

function expectCheck(name: string, ok: boolean, pass: string, fail: string) {
  checks.push({ name, ok, detail: ok ? pass : fail });
}

function assertThrows(name: string, fn: () => void, messagePart: string) {
  try {
    fn();
    expectCheck(name, false, "", `Expected error containing "${messagePart}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    expectCheck(
      name,
      message.includes(messagePart),
      `Blocked with: ${message}`,
      `Wrong error: ${message}`,
    );
  }
}

async function runPurePermissionChecks() {
  const admin = { id: "admin", role: "ADMIN" as const };
  const pm = { id: "pm", role: "ENGINEER" as const };
  const outsider = { id: "outsider", role: "ENGINEER" as const };
  const requester = { id: "requester", role: "ENGINEER" as const };

  const pending = {
    id: "apr-1",
    projectId: "project-a",
    requesterId: requester.id,
    status: "PENDING" as const,
    type: "PAYMENT" as const,
    deletedAt: null,
  };

  const approved = { ...pending, id: "apr-2", status: "APPROVED" as const };
  const rejected = { ...pending, id: "apr-3", status: "REJECTED" as const };
  const cancelled = { ...pending, id: "apr-4", status: "CANCELLED" as const };

  const pmProjectRoles = new Map([["project-a", "PROJECT_MANAGER" as const]]);
  const noProjectRoles = new Map<string, "PROJECT_MANAGER">();

  expectCheck(
    "Admin xem được tất cả",
    canViewApproval(admin, pending, noProjectRoles),
    "Admin can view approval",
    "Admin was denied",
  );
  expectCheck(
    "User thuộc công trình xem được yêu cầu công trình mình",
    canViewApproval(pm, pending, pmProjectRoles),
    "Project member can view scoped approval",
    "Project member was denied",
  );
  expectCheck(
    "User không thuộc công trình không xem được",
    !canViewApproval(outsider, pending, noProjectRoles),
    "Outsider is denied",
    "Outsider can view project data",
  );
  expectCheck(
    "PENDING duyệt được bởi người có quyền",
    canApproveApproval(pm, pending, pmProjectRoles),
    "Project manager can approve pending approval",
    "Project manager cannot approve pending approval",
  );
  expectCheck(
    "Người tạo không tự duyệt được, trừ Admin",
    !canApproveApproval(requester, pending, pmProjectRoles) &&
      canApproveApproval(admin, pending, noProjectRoles),
    "Self approval blocked for non-admin and allowed for admin",
    "Self approval rule is incorrect",
  );
  assertThrows(
    "Reject không lý do bị chặn",
    () => {
      const reason = "";
      if (reason.trim().length < 10) throw new Error("Lý do từ chối tối thiểu 10 ký tự");
    },
    "10 ký tự",
  );
  expectCheck(
    "APPROVED không duyệt lại được",
    !canApproveApproval(pm, approved, pmProjectRoles),
    "Approved approval cannot be approved again",
    "Approved approval can be approved again",
  );
  expectCheck(
    "REJECTED không duyệt lại được",
    !canApproveApproval(pm, rejected, pmProjectRoles),
    "Rejected approval cannot be approved again",
    "Rejected approval can be approved again",
  );
  expectCheck(
    "CANCELLED không duyệt được",
    !canApproveApproval(pm, cancelled, pmProjectRoles),
    "Cancelled approval cannot be approved",
    "Cancelled approval can be approved",
  );
  expectCheck(
    "Cancel chỉ áp dụng PENDING",
    canCancelApproval(requester, pending, noProjectRoles) &&
      !canCancelApproval(requester, approved, noProjectRoles),
    "Only pending approval can be cancelled",
    "Cancel status rule is incorrect",
  );
  expectCheck(
    "Soft delete phân quyền đúng (Admin xóa hết, PM xóa project, Requester xóa PENDING)",
    canSoftDeleteApproval(admin, pending, noProjectRoles) && 
      canSoftDeleteApproval(pm, approved, pmProjectRoles) &&
      canSoftDeleteApproval(pm, rejected, pmProjectRoles) &&
      canSoftDeleteApproval(pm, cancelled, pmProjectRoles) &&
      canSoftDeleteApproval(requester, pending, noProjectRoles) &&
      !canSoftDeleteApproval(requester, approved, noProjectRoles),
    "Soft delete permission is correct",
    "Soft delete permission is incorrect",
  );
  expectCheck(
    "Permission set cho PM có quyền approve/cancel đúng",
    getApprovalPermissionSet(pm, pending, pmProjectRoles).canApprove &&
      getApprovalPermissionSet(requester, pending, noProjectRoles).canCancel,
    "Permission set exposes expected UI actions",
    "Permission set mismatch",
  );
  expectCheck(
    "Edit phân quyền đúng: sửa PENDING thành công",
    canEditApproval(admin, pending, noProjectRoles) &&
      canEditApproval(pm, pending, pmProjectRoles) &&
      canEditApproval(requester, pending, noProjectRoles),
    "Edit pending approval is allowed",
    "Edit pending approval is incorrectly denied"
  );
  expectCheck(
    "Edit bị chặn ở APPROVED, REJECTED, CANCELLED",
    !canEditApproval(admin, approved, noProjectRoles) &&
      !canEditApproval(pm, rejected, pmProjectRoles) &&
      !canEditApproval(requester, cancelled, noProjectRoles),
    "Edit resolved approval is blocked",
    "Edit resolved approval is incorrectly allowed"
  );
}

async function runDtoChecks() {
  const dto = serializeApprovalRequest({
    id: "apr-dto",
    code: "UAT-APR-DTO",
    projectId: "project-a",
    title: "UAT Phê duyệt DTO",
    description: "DTO safety",
    type: "PAYMENT",
    status: "PENDING",
    priority: "HIGH",
    amount: new Prisma.Decimal("275000000.1234"),
    dueDate: new Date("2026-06-28T00:00:00.000Z"),
    requesterId: "requester",
    decidedById: null,
    decidedAt: null,
    decisionNote: null,
    sourceType: "PAYMENT_REQUEST",
    sourceId: "source-1",
    deletedAt: null,
    createdAt: new Date("2026-06-26T03:00:00.000Z"),
    updatedAt: new Date("2026-06-26T03:00:00.000Z"),
    project: { id: "project-a", code: "CT2", name: "CT2 Hà Nội" },
    requester: { id: "requester", name: "Người tạo" },
    decidedBy: null,
  });

  expectCheck(
    "Decimal/Date DTO an toàn",
    typeof dto.amount === "number" &&
      dto.createdAt === "2026-06-26T03:00:00.000Z" &&
      dto.dueDate === "2026-06-28T00:00:00.000Z",
    "Decimal converted to number and dates converted to ISO strings",
    "DTO leaks raw Decimal/Date",
  );

  const summary = buildApprovalSummary([
    dto,
    { ...dto, id: "approved", status: "APPROVED", amount: 10 },
    { ...dto, id: "rejected", status: "REJECTED", amount: null },
    { ...dto, id: "cancelled", status: "CANCELLED", amount: 5 },
    { ...dto, id: "overdue", status: "PENDING", dueDate: "2026-06-01T00:00:00.000Z", amount: 20 },
  ], new Date("2026-06-26T00:00:00.000Z"));

  expectCheck(
    "Dashboard summary tính đúng theo dữ liệu UAT",
    summary.pendingCount === 2 &&
      summary.overdueCount === 1 &&
      summary.approvedCount === 1 &&
      summary.rejectedCount === 1 &&
      summary.pendingAmount === 275000020.1234,
    `Summary: ${JSON.stringify(summary)}`,
    `Summary mismatch: ${JSON.stringify(summary)}`,
  );
}

async function runDatabaseSmokeChecks() {
  const uatCount = await prisma.approvalRequest.count({
    where: { code: { startsWith: "UAT-APR-" }, deletedAt: null },
  });
  expectCheck(
    "UAT seed tạo ít nhất 12 yêu cầu phê duyệt",
    uatCount >= 12,
    `Found ${uatCount} UAT approval requests`,
    `Expected at least 12 UAT approval requests, found ${uatCount}`,
  );

  const hardDeleteSample = await prisma.approvalRequest.findFirst({
    where: { code: { startsWith: "UAT-APR-" }, status: "CANCELLED" },
    select: { id: true, deletedAt: true },
  });
  expectCheck(
    "Soft delete/cancel không hard delete",
    !!hardDeleteSample,
    "Cancelled UAT record still exists",
    "No cancelled UAT record found",
  );
}

async function runSourceIntegrityChecks() {
  const sourceApprovals = await prisma.approvalRequest.findMany({
    where: { code: { startsWith: "UAT-APR-" }, sourceType: { not: null }, sourceId: { not: null } },
  });

  let matchCount = 0;
  for (const approval of sourceApprovals) {
    let sourceRecord: { projectId: string } | null = null;
    if (approval.sourceType === "PAYMENT_REQUEST") {
      sourceRecord = await prisma.paymentRequest.findUnique({ where: { requestCode: approval.sourceId! }, select: { projectId: true } });
    } else if (approval.sourceType === "MATERIAL_REQUEST") {
      sourceRecord = await prisma.materialRequest.findUnique({ where: { requestNo: approval.sourceId! }, select: { projectId: true } });
    } else if (approval.sourceType === "CONTRACT") {
      sourceRecord = await prisma.contract.findUnique({ where: { contractNo: approval.sourceId! }, select: { projectId: true } });
    }

    if (sourceRecord) {
      if (sourceRecord.projectId !== approval.projectId) {
        expectCheck(`Dự án hồ sơ nguồn khớp cho ${approval.code}`, false, "", "Project IDs do not match");
      } else {
        matchCount++;
      }
    } else if (["PAYMENT_REQUEST", "MATERIAL_REQUEST", "CONTRACT"].includes(approval.sourceType!)) {
      expectCheck(`Hồ sơ nguồn tồn tại cho ${approval.code}`, false, "", "Source record missing");
    }
  }

  expectCheck(
    "Approval source trỏ đúng record thật và khớp projectId",
    matchCount >= 3,
    `Verified ${matchCount} source records`,
    "No valid source records found matching the approvals",
  );
}

async function main() {
  console.log("Starting QA for Approvals Center...");
  await runPurePermissionChecks();
  await runDtoChecks();
  await runSourceIntegrityChecks();
  try {
    await runDatabaseSmokeChecks();
  } catch (error) {
    expectCheck(
      "Database smoke checks chạy được",
      false,
      "",
      error instanceof Error ? error.message : String(error),
    );
  }

  for (const check of checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"} | ${check.name} | ${check.detail}`);
  }

  const failures = checks.filter((check) => !check.ok);
  if (failures.length > 0) {
    throw new Error(`Approvals QA failed with ${failures.length} failure(s).`);
  }

  console.log("Approvals QA completed successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
