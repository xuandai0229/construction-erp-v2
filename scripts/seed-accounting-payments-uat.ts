import "dotenv/config";
import prisma from "../src/lib/prisma";
import * as bcrypt from "bcryptjs";

async function runSeed() {
  console.log("Starting UAT Seed for Accounting & Payments...");

  // 1. Create/Upsert Users
  const testPassword = process.env.SEED_DEV_TEST_PASSWORD || "TestPassword123#";
  const hashedPassword = await bcrypt.hash(testPassword, 10);

  const usersData = [
    { email: "uat.admin@ct2.local", name: "UAT Admin", role: "ADMIN" as const },
    { email: "uat.accountant@ct2.local", name: "UAT Accountant", role: "ACCOUNTANT" as const },
    { email: "uat.pm@ct2.local", name: "UAT Project Manager", role: "ENGINEER" as const },
    { email: "uat.site@ct2.local", name: "UAT Site Commander", role: "ENGINEER" as const },
    { email: "uat.engineer@ct2.local", name: "UAT Site Engineer", role: "ENGINEER" as const },
  ];

  const seededUsers: Record<string, any> = {};

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: hashedPassword,
        isActive: true,
      },
    });
    seededUsers[u.email] = user;
    console.log(`Seeded user: ${u.email}`);
  }

  // 2. Create Projects
  const projectsData = [
    {
      code: "UAT-PAY-CT2-HANOI",
      name: "UAT - CT2 Hà Nội - Khối văn phòng",
      status: "ACTIVE" as const,
      description: "Dự án văn phòng cao tầng UAT tại Hà Nội"
    },
    {
      code: "UAT-PAY-TUHIEP-5F",
      name: "UAT - Nhà văn phòng Diên Hồng 5F",
      status: "ACTIVE" as const,
      description: "Dự án nhà văn phòng Diên Hồng 5 tầng UAT"
    }
  ];

  const seededProjects: Record<string, any> = {};
  for (const p of projectsData) {
    const proj = await prisma.project.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        status: p.status,
        description: p.description
      },
      create: {
        code: p.code,
        name: p.name,
        status: p.status,
        description: p.description
      }
    });
    seededProjects[p.code] = proj;
    console.log(`Seeded project: ${p.code}`);
  }

  // 3. Assign Project Members
  // PM & Site Commander belong to both projects
  // Engineer only belongs to UAT-PAY-CT2-HANOI
  const membersSetup = [
    { project: "UAT-PAY-CT2-HANOI", userEmail: "uat.pm@ct2.local", role: "PROJECT_MANAGER" as const },
    { project: "UAT-PAY-CT2-HANOI", userEmail: "uat.site@ct2.local", role: "SITE_COMMANDER" as const },
    { project: "UAT-PAY-CT2-HANOI", userEmail: "uat.engineer@ct2.local", role: "SUPERVISOR" as const },

    { project: "UAT-PAY-TUHIEP-5F", userEmail: "uat.pm@ct2.local", role: "PROJECT_MANAGER" as const },
    { project: "UAT-PAY-TUHIEP-5F", userEmail: "uat.site@ct2.local", role: "SITE_COMMANDER" as const },
  ];

  for (const m of membersSetup) {
    const projectId = seededProjects[m.project].id;
    const userId = seededUsers[m.userEmail].id;
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      update: {
        role: m.role,
        isActive: true,
        leftAt: null,
        deletedAt: null
      },
      create: {
        projectId,
        userId,
        role: m.role,
        isActive: true
      }
    });
    console.log(`Assigned member ${m.userEmail} to ${m.project} as ${m.role}`);
  }

  // 4. Create/Upsert Suppliers
  const suppliersData = [
    { code: "UAT-NCC-HOAPHAT", name: "UAT NCC Thép Hòa Phát", taxCode: "0100154619", phone: "02439763699", email: "hoaphat@uat-erp.local" },
    { code: "UAT-NCC-BIMSON", name: "UAT NCC Xi măng Bỉm Sơn", taxCode: "2800100762", phone: "02373824242", email: "bimson@uat-erp.local" },
    { code: "UAT-NCC-SONGHONG", name: "UAT NCC Cát đá Sông Hồng", taxCode: "0102030405", phone: "02431234567", email: "songhong@uat-erp.local" },
    { code: "UAT-NCC-COPPHA", name: "UAT Đội nhân công cốp pha", taxCode: "0102030406", phone: "0987654321", email: "coppha@uat-erp.local" },
    { code: "UAT-NCC-ANPHAT", name: "UAT Nhà thầu MEP An Phát", taxCode: "0102030407", phone: "0912345678", email: "mepanphat@uat-erp.local" },
  ];

  const seededSuppliers: Record<string, any> = {};
  for (const s of suppliersData) {
    const sup = await prisma.supplier.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        taxCode: s.taxCode,
        phone: s.phone,
        email: s.email,
        deletedAt: null
      },
      create: {
        code: s.code,
        name: s.name,
        taxCode: s.taxCode,
        phone: s.phone,
        email: s.email
      }
    });
    seededSuppliers[s.code] = sup;
    console.log(`Seeded supplier: ${s.code}`);
  }

  // 5. Create/Upsert Contracts
  const contractsData = [
    {
      contractNo: "UAT-HD-PAY-001",
      name: "Hợp đồng cung cấp thép xây dựng đợt 1",
      project: "UAT-PAY-CT2-HANOI",
      supplier: "UAT-NCC-HOAPHAT",
      value: 1500000000,
      type: "SUPPLIER" as const,
      status: "ACTIVE" as const
    },
    {
      contractNo: "UAT-HD-PAY-002",
      name: "Hợp đồng nhân công cốp pha tầng 1-5",
      project: "UAT-PAY-CT2-HANOI",
      supplier: "UAT-NCC-COPPHA",
      value: 850000000,
      type: "SUBCONTRACTOR" as const,
      status: "ACTIVE" as const
    },
    {
      contractNo: "UAT-HD-PAY-003",
      name: "Hợp đồng cung cấp xi măng và phụ gia",
      project: "UAT-PAY-TUHIEP-5F",
      supplier: "UAT-NCC-BIMSON",
      value: 620000000,
      type: "SUPPLIER" as const,
      status: "ACTIVE" as const
    },
    {
      contractNo: "UAT-HD-PAY-004",
      name: "Hợp đồng thi công hệ thống điện nước",
      project: "UAT-PAY-TUHIEP-5F",
      supplier: "UAT-NCC-ANPHAT",
      value: 1200000000,
      type: "SUBCONTRACTOR" as const,
      status: "ACTIVE" as const
    }
  ];

  const seededContracts: Record<string, any> = {};
  for (const c of contractsData) {
    const projectId = seededProjects[c.project].id;
    const supplierId = seededSuppliers[c.supplier].id;
    const con = await prisma.contract.upsert({
      where: { contractNo: c.contractNo },
      update: {
        name: c.name,
        projectId,
        supplierId,
        value: c.value,
        type: c.type,
        status: c.status,
        deletedAt: null
      },
      create: {
        contractNo: c.contractNo,
        name: c.name,
        projectId,
        supplierId,
        value: c.value,
        type: c.type,
        status: c.status
      }
    });
    seededContracts[c.contractNo] = con;
    console.log(`Seeded contract: ${c.contractNo}`);
  }

  // 6. Create Payment Requests (12 records)
  const today = new Date();
  const getOffsetDate = (days: number) => {
    const d = new Date();
    d.setDate(today.getDate() + days);
    return d;
  };

  const requestsData = [
    {
      requestCode: "UAT-PR-001",
      title: "UAT Thanh toán thép đợt 1",
      projectCode: "UAT-PAY-CT2-HANOI",
      contractNo: "UAT-HD-PAY-001",
      supplierCode: "UAT-NCC-HOAPHAT",
      type: "PROGRESS" as const,
      status: "DRAFT" as const,
      subTotal: 180000000,
      vatAmount: 18000000,
      totalAmount: 198000000,
      dueDate: getOffsetDate(7),
      creator: "uat.pm@ct2.local"
    },
    {
      requestCode: "UAT-PR-002",
      title: "UAT Thanh toán thép đợt 2 - chờ duyệt",
      projectCode: "UAT-PAY-CT2-HANOI",
      contractNo: "UAT-HD-PAY-001",
      supplierCode: "UAT-NCC-HOAPHAT",
      type: "PROGRESS" as const,
      status: "SUBMITTED" as const,
      subTotal: 250000000,
      vatAmount: 25000000,
      totalAmount: 275000000,
      dueDate: getOffsetDate(5),
      creator: "uat.pm@ct2.local"
    },
    {
      requestCode: "UAT-PR-003",
      title: "UAT Thanh toán cốp pha tầng 1",
      projectCode: "UAT-PAY-CT2-HANOI",
      contractNo: "UAT-HD-PAY-002",
      supplierCode: "UAT-NCC-COPPHA",
      type: "PROGRESS" as const,
      status: "APPROVED" as const,
      subTotal: 120000000,
      vatAmount: 0,
      totalAmount: 120000000,
      dueDate: getOffsetDate(2),
      creator: "uat.pm@ct2.local",
      approver: "uat.admin@ct2.local",
      approvedAt: getOffsetDate(-1)
    },
    {
      requestCode: "UAT-PR-004",
      title: "UAT Đã thanh toán nhân công cốp pha tầng hầm",
      projectCode: "UAT-PAY-CT2-HANOI",
      contractNo: "UAT-HD-PAY-002",
      supplierCode: "UAT-NCC-COPPHA",
      type: "PROGRESS" as const,
      status: "PAID" as const,
      subTotal: 90000000,
      vatAmount: 0,
      totalAmount: 90000000,
      dueDate: getOffsetDate(-5),
      paidAt: getOffsetDate(-3),
      creator: "uat.pm@ct2.local",
      approver: "uat.admin@ct2.local",
      approvedAt: getOffsetDate(-4)
    },
    {
      requestCode: "UAT-PR-005",
      title: "UAT Hồ sơ bị từ chối - thiếu biên bản nghiệm thu",
      projectCode: "UAT-PAY-CT2-HANOI",
      contractNo: "UAT-HD-PAY-002",
      supplierCode: "UAT-NCC-COPPHA",
      type: "PROGRESS" as const,
      status: "REJECTED" as const,
      subTotal: 75000000,
      vatAmount: 0,
      totalAmount: 75000000,
      dueDate: getOffsetDate(4),
      creator: "uat.pm@ct2.local",
      approver: "uat.admin@ct2.local",
      rejectedReason: "Thiếu biên bản nghiệm thu khối lượng và xác nhận chỉ huy trưởng."
    },
    {
      requestCode: "UAT-PR-006",
      title: "UAT Hồ sơ đã hủy - nhập sai hợp đồng",
      projectCode: "UAT-PAY-CT2-HANOI",
      contractNo: "UAT-HD-PAY-002",
      supplierCode: "UAT-NCC-COPPHA",
      type: "PROGRESS" as const,
      status: "CANCELLED" as const,
      subTotal: 50000000,
      vatAmount: 5000000,
      totalAmount: 55000000,
      dueDate: getOffsetDate(10),
      creator: "uat.pm@ct2.local"
    },
    {
      requestCode: "UAT-PR-007",
      title: "UAT Thanh toán xi măng đợt 1",
      projectCode: "UAT-PAY-TUHIEP-5F",
      contractNo: "UAT-HD-PAY-003",
      supplierCode: "UAT-NCC-BIMSON",
      type: "PROGRESS" as const,
      status: "SUBMITTED" as const,
      subTotal: 95000000,
      vatAmount: 9500000,
      totalAmount: 104500000,
      dueDate: getOffsetDate(10),
      creator: "uat.pm@ct2.local"
    },
    {
      requestCode: "UAT-PR-008",
      title: "UAT Thanh toán xi măng quá hạn",
      projectCode: "UAT-PAY-TUHIEP-5F",
      contractNo: "UAT-HD-PAY-003",
      supplierCode: "UAT-NCC-BIMSON",
      type: "PROGRESS" as const,
      status: "APPROVED" as const,
      subTotal: 130000000,
      vatAmount: 13000000,
      totalAmount: 143000000,
      dueDate: getOffsetDate(-7),
      creator: "uat.pm@ct2.local",
      approver: "uat.admin@ct2.local",
      approvedAt: getOffsetDate(-8)
    },
    {
      requestCode: "UAT-PR-009",
      title: "UAT Tạm ứng MEP An Phát",
      projectCode: "UAT-PAY-TUHIEP-5F",
      contractNo: "UAT-HD-PAY-004",
      supplierCode: "UAT-NCC-ANPHAT",
      type: "ADVANCE" as const,
      status: "DRAFT" as const,
      subTotal: 200000000,
      vatAmount: 20000000,
      totalAmount: 220000000,
      dueDate: getOffsetDate(15),
      creator: "uat.pm@ct2.local"
    },
    {
      requestCode: "UAT-PR-010",
      title: "UAT MEP đã duyệt chờ chi",
      projectCode: "UAT-PAY-TUHIEP-5F",
      contractNo: "UAT-HD-PAY-004",
      supplierCode: "UAT-NCC-ANPHAT",
      type: "PROGRESS" as const,
      status: "APPROVED" as const,
      subTotal: 300000000,
      vatAmount: 30000000,
      totalAmount: 330000000,
      dueDate: getOffsetDate(2),
      creator: "uat.pm@ct2.local",
      approver: "uat.admin@ct2.local",
      approvedAt: getOffsetDate(-1)
    },
    {
      requestCode: "UAT-PR-011",
      title: "UAT MEP đã thanh toán",
      projectCode: "UAT-PAY-TUHIEP-5F",
      contractNo: "UAT-HD-PAY-004",
      supplierCode: "UAT-NCC-ANPHAT",
      type: "PROGRESS" as const,
      status: "PAID" as const,
      subTotal: 150000000,
      vatAmount: 15000000,
      totalAmount: 165000000,
      dueDate: getOffsetDate(-2),
      paidAt: getOffsetDate(-1),
      creator: "uat.pm@ct2.local",
      approver: "uat.admin@ct2.local",
      approvedAt: getOffsetDate(-3)
    },
    {
      requestCode: "UAT-PR-012",
      title: "UAT Hồ sơ không gắn hợp đồng - chi phí nhỏ",
      projectCode: "UAT-PAY-TUHIEP-5F",
      contractNo: null,
      supplierCode: "UAT-NCC-SONGHONG",
      type: "OTHER" as const,
      status: "SUBMITTED" as const,
      subTotal: 35000000,
      vatAmount: 3500000,
      totalAmount: 38500000,
      dueDate: getOffsetDate(4),
      creator: "uat.pm@ct2.local"
    }
  ];

  for (const r of requestsData) {
    const projectId = seededProjects[r.projectCode].id;
    const supplierId = r.supplierCode ? seededSuppliers[r.supplierCode].id : null;
    const contractId = r.contractNo ? seededContracts[r.contractNo].id : null;
    const createdById = seededUsers[r.creator].id;
    const approvedById = r.approver ? seededUsers[r.approver].id : null;

    await prisma.paymentRequest.upsert({
      where: { requestCode: r.requestCode },
      update: {
        title: r.title,
        projectId,
        supplierId,
        contractId,
        type: r.type,
        status: r.status,
        subTotal: r.subTotal,
        vatAmount: r.vatAmount,
        totalAmount: r.totalAmount,
        dueDate: r.dueDate,
        createdById,
        approvedById,
        approvedAt: r.approvedAt || null,
        paidAt: r.paidAt || null,
        rejectedReason: r.rejectedReason || null,
        deletedAt: null
      },
      create: {
        requestCode: r.requestCode,
        title: r.title,
        projectId,
        supplierId,
        contractId,
        type: r.type,
        status: r.status,
        subTotal: r.subTotal,
        vatAmount: r.vatAmount,
        totalAmount: r.totalAmount,
        dueDate: r.dueDate,
        createdById,
        approvedById,
        approvedAt: r.approvedAt || null,
        paidAt: r.paidAt || null,
        rejectedReason: r.rejectedReason || null
      }
    });
    console.log(`Seeded PaymentRequest: ${r.requestCode}`);
  }

  console.log("🎉 UAT Seed Completed Successfully!");
}

runSeed()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
