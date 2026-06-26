import "dotenv/config";
import prisma from "../src/lib/prisma";
import * as bcrypt from "bcryptjs";
import type {
  ApprovalPriority,
  ApprovalRequestType,
  ApprovalRequestStatus,
  ProjectRole,
  UserRole,
} from "@prisma/client";

type UatUserSeed = {
  email: string;
  name: string;
  role: UserRole;
};

type UatApprovalSeed = {
  code: string;
  title: string;
  description: string;
  type: ApprovalRequestType;
  status: ApprovalRequestStatus;
  priority: ApprovalPriority;
  amount: number | null;
  dueOffsetDays: number | null;
  projectCode: string;
  requesterEmail: string;
  deciderEmail?: string;
  decisionNote?: string;
  sourceType?: string;
  sourceId?: string;
};

function offsetDate(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

async function upsertUsers() {
  const password = process.env.SEED_DEV_TEST_PASSWORD || "TestPassword123#";
  const hashedPassword = await bcrypt.hash(password, 10);
  const seeds: UatUserSeed[] = [
    { email: "uat.admin@ct2.local", name: "UAT Admin", role: "ADMIN" },
    { email: "uat.director@ct2.local", name: "UAT Giám đốc", role: "DIRECTOR" },
    { email: "uat.accountant@ct2.local", name: "UAT Kế toán", role: "ACCOUNTANT" },
    { email: "uat.pm@ct2.local", name: "UAT Project Manager", role: "ENGINEER" },
    { email: "uat.site@ct2.local", name: "UAT Chỉ huy trưởng", role: "ENGINEER" },
    { email: "uat.engineer@ct2.local", name: "UAT Kỹ sư hiện trường", role: "ENGINEER" },
    { email: "uat.outsider@ct2.local", name: "UAT Người ngoài công trình", role: "ENGINEER" },
  ];

  const users: Record<string, { id: string }> = {};
  for (const seed of seeds) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        name: seed.name,
        role: seed.role,
        isActive: true,
        deletedAt: null,
      },
      create: {
        email: seed.email,
        name: seed.name,
        role: seed.role,
        password: hashedPassword,
        isActive: true,
      },
    });
    users[seed.email] = { id: user.id };
  }
  return users;
}

async function upsertProjects() {
  const seeds = [
    {
      code: "UAT-PAY-CT2-HANOI",
      name: "UAT - CT2 Hà Nội - Khối văn phòng",
      description: "Dự án UAT dùng cho thanh toán và phê duyệt.",
    },
    {
      code: "UAT-PAY-TUHIEP-5F",
      name: "UAT - Nhà văn phòng Diên Hồng 5F",
      description: "Dự án UAT thứ hai để kiểm tra project scope.",
    },
  ];

  const projects: Record<string, { id: string }> = {};
  for (const seed of seeds) {
    const project = await prisma.project.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        description: seed.description,
        status: "ACTIVE",
        deletedAt: null,
      },
      create: {
        code: seed.code,
        name: seed.name,
        description: seed.description,
        status: "ACTIVE",
      },
    });
    projects[seed.code] = { id: project.id };
  }
  return projects;
}

async function assignMembers(
  users: Record<string, { id: string }>,
  projects: Record<string, { id: string }>,
) {
  const setup: { projectCode: string; email: string; role: ProjectRole }[] = [
    { projectCode: "UAT-PAY-CT2-HANOI", email: "uat.pm@ct2.local", role: "PROJECT_MANAGER" },
    { projectCode: "UAT-PAY-CT2-HANOI", email: "uat.site@ct2.local", role: "SITE_COMMANDER" },
    { projectCode: "UAT-PAY-CT2-HANOI", email: "uat.engineer@ct2.local", role: "SUPERVISOR" },
    { projectCode: "UAT-PAY-TUHIEP-5F", email: "uat.pm@ct2.local", role: "PROJECT_MANAGER" },
    { projectCode: "UAT-PAY-TUHIEP-5F", email: "uat.site@ct2.local", role: "SITE_COMMANDER" },
  ];

  for (const item of setup) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: projects[item.projectCode].id,
          userId: users[item.email].id,
        },
      },
      update: {
        role: item.role,
        isActive: true,
        leftAt: null,
        deletedAt: null,
      },
      create: {
        projectId: projects[item.projectCode].id,
        userId: users[item.email].id,
        role: item.role,
        isActive: true,
      },
    });
  }
}

async function upsertSources(
  users: Record<string, { id: string }>,
  projects: Record<string, { id: string }>,
) {
  await prisma.paymentRequest.upsert({
    where: { requestCode: "UAT-PR-002" },
    update: { projectId: projects["UAT-PAY-CT2-HANOI"].id, deletedAt: null },
    create: {
      requestCode: "UAT-PR-002",
      projectId: projects["UAT-PAY-CT2-HANOI"].id,
      title: "UAT PR 002",
      createdById: users["uat.pm@ct2.local"].id,
    },
  });

  await prisma.materialRequest.upsert({
    where: { requestNo: "UAT-MR-001" },
    update: { projectId: projects["UAT-PAY-CT2-HANOI"].id, deletedAt: null },
    create: {
      requestNo: "UAT-MR-001",
      projectId: projects["UAT-PAY-CT2-HANOI"].id,
      requestedById: users["uat.engineer@ct2.local"].id,
      requestDate: new Date(),
    },
  });

  await prisma.contract.upsert({
    where: { contractNo: "UAT-HD-PAY-004" },
    update: { projectId: projects["UAT-PAY-TUHIEP-5F"].id, deletedAt: null },
    create: {
      contractNo: "UAT-HD-PAY-004",
      projectId: projects["UAT-PAY-TUHIEP-5F"].id,
      name: "UAT HD 004",
      type: "SUBCONTRACTOR",
      value: 1200000000,
    },
  });
}

async function seedApprovals(
  users: Record<string, { id: string }>,
  projects: Record<string, { id: string }>,
) {
  const approvals: UatApprovalSeed[] = [
    {
      code: "UAT-APR-001",
      title: "Phê duyệt thanh toán thép đợt 2",
      description: "Thanh toán khối lượng thép đã nhập về công trường đợt 2 theo hợp đồng.",
      type: "PAYMENT",
      projectCode: "UAT-PAY-CT2-HANOI",
      amount: 275000000,
      status: "PENDING",
      priority: "HIGH",
      dueOffsetDays: 2,
      requesterEmail: "uat.pm@ct2.local",
      sourceType: "PAYMENT_REQUEST",
      sourceId: "UAT-PR-002",
    },
    {
      code: "UAT-APR-002",
      title: "Duyệt yêu cầu mua xi măng bổ sung",
      description: "Bổ sung xi măng cho khu vực lõi thang và tường bao do hao hụt.",
      type: "MATERIAL",
      projectCode: "UAT-PAY-CT2-HANOI",
      amount: 95000000,
      status: "PENDING",
      priority: "NORMAL",
      dueOffsetDays: 4,
      requesterEmail: "uat.engineer@ct2.local",
      sourceType: "MATERIAL_REQUEST",
      sourceId: "UAT-MR-001",
    },
    {
      code: "UAT-APR-003",
      title: "Duyệt phát sinh nhân công cốp pha",
      description: "Phát sinh nhân công cốp pha do thay đổi biện pháp thi công khu vực dầm chuyển.",
      type: "CHANGE_ORDER",
      projectCode: "UAT-PAY-CT2-HANOI",
      amount: 120000000,
      status: "PENDING",
      priority: "URGENT",
      dueOffsetDays: -2,
      requesterEmail: "uat.site@ct2.local",
      sourceType: "CHANGE_ORDER",
      sourceId: "UAT-CO-001", // No real model yet, will be Tham chiếu nội bộ
    },
    {
      code: "UAT-APR-004",
      title: "Duyệt báo cáo nghiệm thu tầng 1",
      description: "Báo cáo nghiệm thu tầng 1 cần phê duyệt trước khi đổ bê tông sàn tầng 2.",
      type: "REPORT",
      projectCode: "UAT-PAY-CT2-HANOI",
      amount: null,
      status: "PENDING",
      priority: "NORMAL",
      dueOffsetDays: 1,
      requesterEmail: "uat.engineer@ct2.local",
      sourceType: "SITE_REPORT",
      sourceId: "UAT-RPT-001", // No real model link configured
    },
    {
      code: "UAT-APR-005",
      title: "Duyệt hợp đồng MEP An Phát",
      description: "Hợp đồng thi công hệ thống MEP An Phát cho dự án Diên Hồng.",
      type: "CONTRACT",
      projectCode: "UAT-PAY-TUHIEP-5F",
      amount: 1200000000,
      status: "PENDING",
      priority: "HIGH",
      dueOffsetDays: 5,
      requesterEmail: "uat.pm@ct2.local",
      sourceType: "CONTRACT",
      sourceId: "UAT-HD-PAY-004",
    },
    {
      code: "UAT-APR-006",
      title: "Phê duyệt thanh toán cốp pha đã duyệt",
      description: "Hồ sơ thanh toán nhân công cốp pha tháng 5.",
      type: "PAYMENT",
      projectCode: "UAT-PAY-CT2-HANOI",
      amount: 180000000,
      status: "APPROVED",
      priority: "NORMAL",
      dueOffsetDays: -1,
      requesterEmail: "uat.pm@ct2.local",
      deciderEmail: "uat.admin@ct2.local",
      decisionNote: "Đủ hồ sơ nghiệm thu và xác nhận khối lượng.",
      sourceType: "PAYMENT_REQUEST",
    },
    {
      code: "UAT-APR-007",
      title: "Từ chối thanh toán thiết bị bơm",
      description: "Hồ sơ thiếu biên bản nghiệm thu nên bị từ chối.",
      type: "PAYMENT",
      projectCode: "UAT-PAY-CT2-HANOI",
      amount: 75000000,
      status: "REJECTED",
      priority: "HIGH",
      dueOffsetDays: 3,
      requesterEmail: "uat.pm@ct2.local",
      deciderEmail: "uat.admin@ct2.local",
      decisionNote: "Thiếu biên bản nghiệm thu có chữ ký chỉ huy trưởng.",
      sourceType: "PAYMENT_REQUEST",
    },
    {
      code: "UAT-APR-008",
      title: "Hủy yêu cầu mua cáp điện",
      description: "Hủy yêu cầu do nhập sai thông số cáp.",
      type: "MATERIAL",
      projectCode: "UAT-PAY-CT2-HANOI",
      amount: 50000000,
      status: "CANCELLED",
      priority: "LOW",
      dueOffsetDays: 10,
      requesterEmail: "uat.engineer@ct2.local",
      deciderEmail: "uat.engineer@ct2.local",
      decisionNote: "Người tạo hủy do nhầm mã vật tư.",
      sourceType: "MATERIAL_REQUEST",
    },
    {
      code: "UAT-APR-009",
      title: "Duyệt nghiệm thu khối lượng tầng 3",
      description: "Nghiệm thu khối lượng cốt thép và ván khuôn cột tầng 3.",
      type: "OTHER",
      projectCode: "UAT-PAY-TUHIEP-5F",
      amount: null,
      status: "PENDING",
      priority: "URGENT",
      dueOffsetDays: -5,
      requesterEmail: "uat.site@ct2.local",
      sourceType: "FIELD_PROGRESS",
      sourceId: "UAT-FP-002",
    },
    {
      code: "UAT-APR-010",
      title: "Duyệt báo cáo hiện trường tuần 24",
      description: "Báo cáo tổng hợp tiến độ và ATLĐ tuần 24.",
      type: "REPORT",
      projectCode: "UAT-PAY-TUHIEP-5F",
      amount: null,
      status: "PENDING",
      priority: "NORMAL",
      dueOffsetDays: 6,
      requesterEmail: "uat.pm@ct2.local",
      sourceType: "SITE_REPORT",
    },
    {
      code: "UAT-APR-011",
      title: "Duyệt biên bản nghiệm thu đưa vào sử dụng",
      description: "Biên bản nghiệm thu bàn giao hệ thống PCCC.",
      type: "OTHER",
      projectCode: "UAT-PAY-TUHIEP-5F",
      amount: null,
      status: "APPROVED",
      priority: "NORMAL",
      dueOffsetDays: -4,
      requesterEmail: "uat.pm@ct2.local",
      deciderEmail: "uat.director@ct2.local",
      decisionNote: "Hồ sơ PCCC đã đầy đủ chữ ký CĐT.",
      sourceType: "DOCUMENT",
    },
    {
      code: "UAT-APR-012",
      title: "Duyệt mua cát đá đổ bê tông lót",
      description: "Yêu cầu cung cấp cát đá phục vụ đổ lót móng khu B.",
      type: "MATERIAL",
      projectCode: "UAT-PAY-TUHIEP-5F",
      amount: 38500000,
      status: "PENDING",
      priority: "LOW",
      dueOffsetDays: 7,
      requesterEmail: "uat.site@ct2.local",
      sourceType: "MATERIAL_REQUEST",
    },
    {
      code: "UAT-APR-013",
      title: "Đề xuất mua máy thủy bình",
      description: "Mua mới 01 máy thủy bình tự động cho tổ trắc đạc.",
      type: "OTHER",
      projectCode: "UAT-PAY-TUHIEP-5F",
      amount: 15000000,
      status: "PENDING",
      priority: "NORMAL",
      dueOffsetDays: 2,
      requesterEmail: "uat.site@ct2.local",
      sourceType: "PURCHASE_REQUEST",
    },
    {
      code: "UAT-APR-014",
      title: "Duyệt thanh toán tiền điện tháng 5",
      description: "Thanh toán tiền điện sinh hoạt và thi công tháng 5.",
      type: "PAYMENT",
      projectCode: "UAT-PAY-TUHIEP-5F",
      amount: 22000000,
      status: "PENDING",
      priority: "NORMAL",
      dueOffsetDays: 1,
      requesterEmail: "uat.site@ct2.local",
      sourceType: "PAYMENT_REQUEST",
    },
    {
      code: "UAT-APR-015",
      title: "Xác nhận báo cáo đổ bê tông móng M1",
      description: "Báo cáo chi tiết mác bê tông và độ sụt.",
      type: "REPORT",
      projectCode: "UAT-PAY-CT2-HANOI",
      amount: null,
      status: "REJECTED",
      priority: "HIGH",
      dueOffsetDays: -1,
      requesterEmail: "uat.engineer@ct2.local",
      deciderEmail: "uat.pm@ct2.local",
      decisionNote: "Cần bổ sung phiếu giao nhận bê tông của trạm trộn.",
      sourceType: "SITE_REPORT",
    }
  ];

  for (const approval of approvals) {
    const decidedById = approval.deciderEmail ? users[approval.deciderEmail].id : null;
    const decidedAt = approval.status === "APPROVED" || approval.status === "REJECTED" || approval.status === "CANCELLED"
      ? offsetDate(-1)
      : null;

    await prisma.approvalRequest.upsert({
      where: { code: approval.code },
      update: {
        projectId: projects[approval.projectCode].id,
        title: approval.title,
        description: approval.description,
        type: approval.type,
        status: approval.status,
        priority: approval.priority,
        amount: approval.amount,
        dueDate: approval.dueOffsetDays === null ? null : offsetDate(approval.dueOffsetDays),
        requesterId: users[approval.requesterEmail].id,
        decidedById,
        decidedAt,
        decisionNote: approval.decisionNote ?? null,
        sourceType: approval.sourceType ?? null,
        sourceId: approval.sourceId ?? null,
        deletedAt: null,
      },
      create: {
        code: approval.code,
        projectId: projects[approval.projectCode].id,
        title: approval.title,
        description: approval.description,
        type: approval.type,
        status: approval.status,
        priority: approval.priority,
        amount: approval.amount,
        dueDate: approval.dueOffsetDays === null ? null : offsetDate(approval.dueOffsetDays),
        requesterId: users[approval.requesterEmail].id,
        decidedById,
        decidedAt,
        decisionNote: approval.decisionNote ?? null,
        sourceType: approval.sourceType ?? null,
        sourceId: approval.sourceId ?? null,
      },
    });
    console.log(`Seeded approval: ${approval.code}`);
  }
}

async function main() {
  console.log("Starting UAT seed for Approvals Center...");
  const users = await upsertUsers();
  const projects = await upsertProjects();
  await assignMembers(users, projects);
  await upsertSources(users, projects);
  await seedApprovals(users, projects);
  console.log("UAT Approvals seed completed. Prefix: UAT-APR-");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
