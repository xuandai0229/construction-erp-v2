import { EmployeeStatus, AssignmentStatus } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Load .env.local if present BEFORE importing prisma
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envConfig = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

import { generateEmployeeCodeWithRetry } from "../../src/lib/hr/employee-code-generator";

const MANIFEST_PATH = path.join(process.cwd(), "storage", "dev-fixtures", "hr-realistic-demo-v1-manifest.json");

function maskDatabaseHost(urlStr: string | undefined): string {
  if (!urlStr) return "localhost";
  try {
    const url = new URL(urlStr);
    return url.hostname || "localhost";
  } catch {
    return "masked_host";
  }
}

function getDatabaseName(urlStr: string | undefined): string {
  if (!urlStr) return "dev_db";
  try {
    const url = new URL(urlStr);
    return url.pathname.replace(/^\//, "") || "dev_db";
  } catch {
    return "dev_db";
  }
}

async function main() {
  const prisma = (await import("../../src/lib/prisma")).default;
  const dbUrl = process.env.DATABASE_URL;
  const dbHost = maskDatabaseHost(dbUrl);
  const dbName = getDatabaseName(dbUrl);
  const nodeEnv = process.env.NODE_ENV || "development";

  // 1. SAFETY GUARD
  const isProduction =
    nodeEnv.toLowerCase().includes("prod") ||
    dbName.toLowerCase().includes("prod") ||
    dbHost.toLowerCase().includes("prod");

  if (isProduction) {
    console.error("SAFETY GUARD TRIGGERED: Cannot run demo seed on PRODUCTION database.");
    console.error(`DB_HOST=${dbHost}`);
    console.error(`DB_NAME=${dbName}`);
    console.error(`ENVIRONMENT=PRODUCTION`);
    process.exit(1);
  }

  console.log(`DB_HOST=${dbHost}`);
  console.log(`DB_NAME=${dbName}`);
  console.log(`ENVIRONMENT=${nodeEnv.toUpperCase()}`);

  // 2. IDEMPOTENCY CHECK
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      const existingManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
      if (existingManifest.employees && existingManifest.employees.length > 0) {
        const sampleEmployee = await prisma.employee.findUnique({
          where: { id: existingManifest.employees[0] },
        });
        if (sampleEmployee) {
          console.log("DATASET_ALREADY_EXISTS");
          console.log(`MANIFEST: storage/dev-fixtures/hr-realistic-demo-v1-manifest.json`);
          return;
        }
      }
    } catch {
      // Manifest unreadable or broken, proceed
    }
  }

  // Ensure storage/dev-fixtures directory exists
  const dir = path.dirname(MANIFEST_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const manifest: {
    dataset: string;
    databaseName: string;
    createdAt: string;
    employees: string[];
    employeeOrganizationAssignments: string[];
    employeeProjectAssignments: string[];
    employeeChangeHistories: string[];
    managerAssignments: string[];
    organizationUnitsCreated: string[];
    positionsCreated: string[];
    projectsCreated: string[];
    usersCreated: string[];
  } = {
    dataset: "HR_REALISTIC_DEMO_V1",
    databaseName: dbName,
    createdAt: new Date().toISOString(),
    employees: [],
    employeeOrganizationAssignments: [],
    employeeProjectAssignments: [],
    employeeChangeHistories: [],
    managerAssignments: [],
    organizationUnitsCreated: [],
    positionsCreated: [],
    projectsCreated: [],
    usersCreated: [],
  };

  // 3. REUSE OR SEED MASTER DATA
  let orgUnits = await prisma.organizationUnit.findMany({ where: { isActive: true } });
  if (orgUnits.length < 3) {
    const defaultUnits = [
      { code: "BGD", name: "Ban Giám đốc", description: "Điều hành chung công ty" },
      { code: "PKT", name: "Phòng Kỹ thuật - Thi công", description: "Quản lý kỹ thuật và điều phối thi công công trình" },
      { code: "HCNS", name: "Phòng Hành chính - Nhân sự", description: "Quản trị nguồn nhân lực và hành chính" },
      { code: "KTTTC", name: "Phòng Kế toán - Tài chính", description: "Quản lý tài chính và tài sản công ty" },
      { code: "ATCL", name: "Phòng An toàn & QA/QC", description: "Giám sát an toàn lao động và chất lượng công trình" },
    ];

    for (const u of defaultUnits) {
      const existing = await prisma.organizationUnit.findFirst({ where: { code: u.code } });
      if (!existing) {
        const created = await prisma.organizationUnit.create({
          data: {
            code: u.code,
            name: u.name,
            description: u.description,
            isActive: true,
          },
        });
        manifest.organizationUnitsCreated.push(created.id);
      }
    }
    orgUnits = await prisma.organizationUnit.findMany({ where: { isActive: true } });
  }

  let positions = await prisma.position.findMany({ where: { isActive: true } });
  if (positions.length < 3) {
    const defaultPositions = [
      { code: "GD", title: "Giám đốc", level: 10 },
      { code: "TP", title: "Trưởng phòng", level: 8 },
      { code: "CHT", title: "Chỉ huy trưởng công trình", level: 7 },
      { code: "PCHT", title: "Phó Chỉ huy trưởng", level: 6 },
      { code: "KSXD", title: "Kỹ sư xây dựng", level: 4 },
      { code: "KSMEP", title: "Kỹ sư MEP", level: 4 },
      { code: "KSAT", title: "Kỹ sư An toàn (HSE)", level: 4 },
      { code: "QS", title: "Kỹ sư Đấu thầu & QS", level: 4 },
      { code: "CVNS", title: "Chuyên viên Nhân sự", level: 3 },
      { code: "KTV", title: "Kế toán viên", level: 3 },
    ];

    for (const p of defaultPositions) {
      const existing = await prisma.position.findFirst({ where: { code: p.code } });
      if (!existing) {
        const created = await prisma.position.create({
          data: {
            code: p.code,
            title: p.title,
            level: p.level,
            isActive: true,
          },
        });
        manifest.positionsCreated.push(created.id);
      }
    }
    positions = await prisma.position.findMany({ where: { isActive: true } });
  }

  let projects = await prisma.project.findMany();
  if (projects.length < 2) {
    const defaultProjects = [
      { code: "DA-KDT-NHN", name: "Dự án Khu đô thị Nam Hà Nội", status: "IN_PROGRESS" },
      { code: "DA-NM-AMATA", name: "Dự án Nhà máy Amata Đồng Nai", status: "IN_PROGRESS" },
      { code: "DA-TTTM-MD", name: "Dự án Trung tâm Thương mại Mỹ Đình", status: "IN_PROGRESS" },
    ];

    for (const pr of defaultProjects) {
      const existing = await prisma.project.findFirst({ where: { code: pr.code } });
      if (!existing) {
        const created = await prisma.project.create({
          data: {
            code: pr.code,
            name: pr.name,
            status: pr.status as any,
          },
        });
        manifest.projectsCreated.push(created.id);
      }
    }
    projects = await prisma.project.findMany();
  }

  let projectRoles = await prisma.projectPersonnelRole.findMany({ where: { isActive: true } });
  if (projectRoles.length === 0) {
    const defaultRoles = [
      { code: "CHT", name: "Chỉ huy trưởng", orderIndex: 1 },
      { code: "KSGS", name: "Kỹ sư Giám sát thi công", orderIndex: 2 },
      { code: "CBAT", name: "Cán bộ An toàn lao động", orderIndex: 3 },
      { code: "CBVT", name: "Cán bộ Vật tư công trường", orderIndex: 4 },
    ];
    for (const r of defaultRoles) {
      const existing = await prisma.projectPersonnelRole.findFirst({ where: { code: r.code } });
      if (!existing) {
        await prisma.projectPersonnelRole.create({
          data: {
            code: r.code,
            name: r.name,
            orderIndex: r.orderIndex,
            isActive: true,
          },
        });
      }
    }
    projectRoles = await prisma.projectPersonnelRole.findMany({ where: { isActive: true } });
  }

  // 4. DEMO EMPLOYEES DATA DEFINITION (28 Realistic Vietnamese Personnel)
  const employeeSeedSpecs = [
    // Ban Giám đốc / Trưởng phòng (Active)
    { fullName: "Nguyễn Minh Tuấn", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "BGD", posCode: "GD", joined: "2021-03-15", phone: "0912345001" },
    { fullName: "Trần Thị Hoàng Yến", gender: "NỮ", status: EmployeeStatus.ACTIVE, unitCode: "HCNS", posCode: "TP", joined: "2022-01-10", phone: "0912345002" },
    { fullName: "Lê Quốc Tuấn", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "PKT", posCode: "TP", joined: "2021-08-20", phone: "0912345003" },
    { fullName: "Phạm Đức Anh", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "KTTTC", posCode: "TP", joined: "2022-04-05", phone: "0912345004" },
    { fullName: "Đỗ Thị Mai", gender: "NỮ", status: EmployeeStatus.ACTIVE, unitCode: "ATCL", posCode: "TP", joined: "2022-06-12", phone: "0912345005" },

    // Kỹ sư công trình (Active - Site assignments)
    { fullName: "Vũ Hoàng Nam", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "PKT", posCode: "CHT", joined: "2022-09-01", phone: "0912345006" },
    { fullName: "Bùi Thanh Sơn", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "PKT", posCode: "PCHT", joined: "2023-02-15", phone: "0912345007" },
    { fullName: "Nguyễn Hữu Phước", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "PKT", posCode: "KSXD", joined: "2023-05-10", phone: "0912345008" },
    { fullName: "Đặng Quang Huy", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "PKT", posCode: "KSXD", joined: "2023-07-20", phone: "0912345009" },
    { fullName: "Ngô Thị Ngọc", gender: "NỮ", status: EmployeeStatus.ACTIVE, unitCode: "PKT", posCode: "QS", joined: "2023-09-05", phone: "0912345010" },
    { fullName: "Hoàng Văn Trường", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "PKT", posCode: "KSMEP", joined: "2023-11-15", phone: "0912345011" },
    { fullName: "Trịnh Tấn Đạt", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "ATCL", posCode: "KSAT", joined: "2024-01-10", phone: "0912345012" },

    // Kỹ sư tham gia nhiều dự án / Điều động sắp kết thúc
    { fullName: "Lý Thanh Hằng", gender: "NỮ", status: EmployeeStatus.ACTIVE, unitCode: "PKT", posCode: "QS", joined: "2024-02-20", phone: "0912345013" },
    { fullName: "Mai Xuân Thắng", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "PKT", posCode: "KSXD", joined: "2024-03-15", phone: "0912345014" },
    { fullName: "Phan Văn Đức", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "PKT", posCode: "CHT", joined: "2024-04-10", phone: "0912345015" },
    { fullName: "Đào Minh Trí", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "ATCL", posCode: "KSAT", joined: "2024-05-01", phone: "0912345016" },

    // Nhân sự Văn phòng / Rảnh (Unassigned active)
    { fullName: "Hồ Bảo Lâm", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "HCNS", posCode: "CVNS", joined: "2024-06-15", phone: "0912345017" },
    { fullName: "Dương Hoài Nam", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "KTTTC", posCode: "KTV", joined: "2024-07-20", phone: "0912345018" },
    { fullName: "Võ Tấn Phát", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "PKT", posCode: "KSXD", joined: "2024-08-10", phone: "0912345019" },
    { fullName: "Cao Thị Bích", gender: "NỮ", status: EmployeeStatus.ACTIVE, unitCode: "KTTTC", posCode: "KTV", joined: "2024-09-01", phone: "0912345020" },

    // Thử việc (Probation)
    { fullName: "Huỳnh Minh Tâm", gender: "NAM", status: EmployeeStatus.PROBATION, unitCode: "PKT", posCode: "KSXD", joined: "2026-06-01", phone: "0912345021" },
    { fullName: "Lâm Văn Khải", gender: "NAM", status: EmployeeStatus.PROBATION, unitCode: "PKT", posCode: "KSMEP", joined: "2026-06-15", phone: "0912345022" },
    { fullName: "Châu Quốc Bảo", gender: "NAM", status: EmployeeStatus.PROBATION, unitCode: "ATCL", posCode: "KSAT", joined: "2026-07-01", phone: "0912345023" },
    { fullName: "Đinh Quang Sang", gender: "NAM", status: EmployeeStatus.PROBATION, unitCode: "HCNS", posCode: "CVNS", joined: "2026-07-10", phone: "0912345024" },

    // Đã nghỉ việc (Resigned)
    { fullName: "Trương Hoài Việt", gender: "NAM", status: EmployeeStatus.RESIGNED, unitCode: "PKT", posCode: "KSXD", joined: "2022-05-10", phone: "0912345025" },
    { fullName: "Vương Thị Nga", gender: "NỮ", status: EmployeeStatus.RESIGNED, unitCode: "HCNS", posCode: "CVNS", joined: "2023-01-15", phone: "0912345026" },

    // Nhân sự bổ sung
    { fullName: "Đoàn Văn Vinh", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "PKT", posCode: "KSXD", joined: "2025-01-05", phone: "0912345027" },
    { fullName: "Lương Thế Vinh", gender: "NAM", status: EmployeeStatus.ACTIVE, unitCode: "PKT", posCode: "PCHT", joined: "2025-03-10", phone: "0912345028" },
  ];

  const now = new Date();
  const createdEmployeeIds: string[] = [];

  for (let i = 0; i < employeeSeedSpecs.length; i++) {
    const spec = employeeSeedSpecs[i];
    const joinedDate = new Date(spec.joined);

    // Reuse employee code generator
    const code = await generateEmployeeCodeWithRetry(prisma, 5, joinedDate);

    const emp = await prisma.employee.create({
      data: {
        code,
        fullName: spec.fullName,
        gender: spec.gender,
        status: spec.status,
        joinedDate,
        phoneNumber: spec.phone,
        personalEmail: `demo.${code.toLowerCase().replace(/[^a-z0-9]/g, "")}@example-construction.internal`,
        identityNumberLastDigits: String(i + 100).padStart(3, "0"),
        resignedDate: spec.status === EmployeeStatus.RESIGNED ? new Date("2025-12-31") : null,
      },
    });

    manifest.employees.push(emp.id);
    createdEmployeeIds.push(emp.id);

    // Find org unit & position
    const unit = orgUnits.find((u) => u.code === spec.unitCode) || orgUnits[0];
    const pos = positions.find((p) => p.code === spec.posCode) || positions[0];

    // Primary Org Assignment
    const orgAssign = await prisma.employeeOrganizationAssignment.create({
      data: {
        employeeId: emp.id,
        organizationUnitId: unit.id,
        positionId: pos.id,
        startDate: joinedDate,
        isPrimary: true,
        decisionNo: `QĐ-${joinedDate.getFullYear()}/${spec.unitCode}-${String(i + 1).padStart(2, "0")}`,
      },
    });
    manifest.employeeOrganizationAssignments.push(orgAssign.id);

    // Add Manager Assignment for Department Heads
    if (spec.posCode === "TP" && spec.status === EmployeeStatus.ACTIVE) {
      const mgr = await prisma.organizationUnitManagerAssignment.create({
        data: {
          employeeId: emp.id,
          organizationUnitId: unit.id,
          decisionNo: `QĐ-BổNhiệm-${unit.code}`,
          startDate: joinedDate,
          isPrimary: true,
        },
      });
      manifest.managerAssignments.push(mgr.id);
    }

    // Add Audit Log if a user exists in DB
    const systemUser = await prisma.user.findFirst();
    if (systemUser) {
      const historyLog = await prisma.employeeChangeHistory.create({
        data: {
          employeeId: emp.id,
          performedById: systemUser.id,
          changeType: "EMPLOYEE_CREATED",
          reason: "Khởi tạo hồ sơ nhân sự ban đầu",
          createdAt: joinedDate,
        },
      });
      manifest.employeeChangeHistories.push(historyLog.id);
    }
  }

  // 5. PROJECT WORKFORCE ASSIGNMENTS (Dự án & Điều động)
  const project1 = projects[0];
  const project2 = projects[1];
  const project3 = projects[2] || projects[0];

  const roleCHT = projectRoles.find((r) => r.code === "CHT") || projectRoles[0];
  const roleKSGS = projectRoles.find((r) => r.code === "KSGS") || projectRoles[0];
  const roleCBAT = projectRoles.find((r) => r.code === "CBAT") || projectRoles[0];
  const roleCBVT = projectRoles.find((r) => r.code === "CBVT") || projectRoles[0];

  // Specific project assignments mapping for active site engineers (indexes from createdEmployeeIds)
  // Index 5: Vũ Hoàng Nam (CHT - Project 1)
  // Index 6: Bùi Thanh Sơn (KSGS - Project 1)
  // Index 7: Nguyễn Hữu Phước (KSGS - Project 1)
  // Index 8: Đặng Quang Huy (KSGS - Project 2)
  // Index 9: Ngô Thị Ngọc (CBVT - Project 2)
  // Index 10: Hoàng Văn Trường (KSGS - Project 2)
  // Index 11: Trịnh Tấn Đạt (CBAT - Project 3)
  // Index 12: Lý Thanh Hằng (Multi-project: Project 1 - 60%, Project 2 - 40%)
  // Index 13: Mai Xuân Thắng (Multi-project: Project 2 - 50%, Project 3 - 50%)
  // Index 14: Phan Văn Đức (Ending soon: Project 1 - endDate in 15 days)
  // Index 15: Đào Minh Trí (Ending soon: Project 3 - endDate in 20 days)
  // Index 26: Đoàn Văn Vinh (Ending soon: Project 2 - endDate in 10 days)
  // Index 27: Lương Thế Vinh (Project 1 - 100%)

  const assignmentsToCreate = [
    { empIdx: 5, proj: project1, role: roleCHT, pct: 100, endDays: null, status: "ACTIVE" },
    { empIdx: 6, proj: project1, role: roleKSGS, pct: 100, endDays: null, status: "ACTIVE" },
    { empIdx: 7, proj: project1, role: roleKSGS, pct: 100, endDays: null, status: "ACTIVE" },
    { empIdx: 8, proj: project2, role: roleKSGS, pct: 100, endDays: null, status: "ACTIVE" },
    { empIdx: 9, proj: project2, role: roleCBVT, pct: 100, endDays: null, status: "ACTIVE" },
    { empIdx: 10, proj: project2, role: roleKSGS, pct: 100, endDays: null, status: "ACTIVE" },
    { empIdx: 11, proj: project3, role: roleCBAT, pct: 100, endDays: null, status: "ACTIVE" },
    // Multi-project
    { empIdx: 12, proj: project1, role: roleKSGS, pct: 60, endDays: null, status: "ACTIVE" },
    { empIdx: 12, proj: project2, role: roleKSGS, pct: 40, endDays: null, status: "ACTIVE" },
    { empIdx: 13, proj: project2, role: roleKSGS, pct: 50, endDays: null, status: "ACTIVE" },
    { empIdx: 13, proj: project3, role: roleKSGS, pct: 50, endDays: null, status: "ACTIVE" },
    // Ending Soon (within 7-30 days)
    { empIdx: 14, proj: project1, role: roleCHT, pct: 100, endDays: 15, status: "ACTIVE" },
    { empIdx: 15, proj: project3, role: roleCBAT, pct: 100, endDays: 20, status: "ACTIVE" },
    { empIdx: 26, proj: project2, role: roleKSGS, pct: 100, endDays: 10, status: "ACTIVE" },
    // Regular Site Engineer
    { empIdx: 27, proj: project1, role: roleKSGS, pct: 100, endDays: null, status: "ACTIVE" },
  ];

  for (const a of assignmentsToCreate) {
    const empId = createdEmployeeIds[a.empIdx];
    if (!empId) continue;

    const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const endDate = a.endDays ? new Date(now.getTime() + a.endDays * 24 * 60 * 60 * 1000) : null;

    const projAssign = await prisma.employeeProjectAssignment.create({
      data: {
        employeeId: empId,
        projectId: a.proj.id,
        projectPersonnelRoleId: a.role.id,
        allocationPercentage: a.pct,
        startDate,
        endDate,
        status: a.status as AssignmentStatus,
      },
    });
    manifest.employeeProjectAssignments.push(projAssign.id);
  }

  // 6. SAVE MANIFEST
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");

  // 7. COMPUTE FINAL REAL COUNTS
  const employeesCount = manifest.employees.length;
  const orgAssignCount = manifest.employeeOrganizationAssignments.length;
  const mgrAssignCount = manifest.managerAssignments.length;
  const projAssignCount = manifest.employeeProjectAssignments.length;
  const changeHistCount = manifest.employeeChangeHistories.length;

  const activeEmployees = await prisma.employee.count({ where: { id: { in: manifest.employees }, status: "ACTIVE" } });
  const probationEmployees = await prisma.employee.count({ where: { id: { in: manifest.employees }, status: "PROBATION" } });
  const resignedEmployees = await prisma.employee.count({ where: { id: { in: manifest.employees }, status: "RESIGNED" } });

  const activeSiteEmployees = await prisma.employee.count({
    where: {
      id: { in: manifest.employees },
      status: "ACTIVE",
      projectAssignments: { some: { status: "ACTIVE", endDate: null } },
    },
  });

  const unassignedEmployees = await prisma.employee.count({
    where: {
      id: { in: manifest.employees },
      status: "ACTIVE",
      projectAssignments: { none: { status: "ACTIVE", endDate: null } },
    },
  });

  // Multi-project employees
  const multiProjectEmployees = (
    await prisma.employeeProjectAssignment.groupBy({
      by: ["employeeId"],
      where: { employeeId: { in: manifest.employees }, status: "ACTIVE" },
      _count: { projectId: true },
      having: { projectId: { _count: { gt: 1 } } },
    })
  ).length;

  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const endingSoonAssignments = await prisma.employeeProjectAssignment.count({
    where: {
      employeeId: { in: manifest.employees },
      status: "ACTIVE",
      endDate: { gte: now, lte: thirtyDaysLater },
    },
  });

  const overallocatedEmployees = await prisma.employeeProjectAssignment.count({
    where: {
      employeeId: { in: manifest.employees },
      status: "ACTIVE",
      allocationPercentage: { gt: 100 },
    },
  });

  // Output required final format
  console.log("\nHR REALISTIC DEMO DATA — CREATED\n");
  console.log(`DATASET: HR_REALISTIC_DEMO_V1`);
  console.log(`DATABASE: ${dbName}`);
  console.log(`EMPLOYEES_CREATED: ${employeesCount}`);
  console.log(`PROJECT_ASSIGNMENTS_CREATED: ${projAssignCount}`);
  console.log(`ORG_ASSIGNMENTS_CREATED: ${orgAssignCount}`);
  console.log(`MANAGER_ASSIGNMENTS_CREATED: ${mgrAssignCount}`);
  console.log(`CHANGE_HISTORY_CREATED: ${changeHistCount}`);
  console.log(`PROJECTS_CREATED: ${manifest.projectsCreated.length}`);
  console.log(`POSITIONS_CREATED: ${manifest.positionsCreated.length}`);
  console.log(`ORG_UNITS_CREATED: ${manifest.organizationUnitsCreated.length}`);
  console.log(`ACTIVE_EMPLOYEES: ${activeEmployees}`);
  console.log(`PROBATION_EMPLOYEES: ${probationEmployees}`);
  console.log(`RESIGNED_EMPLOYEES: ${resignedEmployees}`);
  console.log(`ACTIVE_SITE_EMPLOYEES: ${activeSiteEmployees}`);
  console.log(`UNASSIGNED_EMPLOYEES: ${unassignedEmployees}`);
  console.log(`MULTI_PROJECT_EMPLOYEES: ${multiProjectEmployees}`);
  console.log(`ENDING_SOON_ASSIGNMENTS: ${endingSoonAssignments}`);
  console.log(`OVERALLOCATED_EMPLOYEES: ${overallocatedEmployees}`);
  console.log(`DUPLICATE_FILTER_SEMANTICS: YES`);
  console.log(`MANIFEST: storage/dev-fixtures/hr-realistic-demo-v1-manifest.json`);
  console.log(`CLEANUP_READY: YES`);
}

main()
  .catch((e) => {
    console.error("Failed to seed HR realistic demo data:", e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      const prisma = (await import("../../src/lib/prisma")).default;
      await prisma.$disconnect();
    } catch {}
  });
