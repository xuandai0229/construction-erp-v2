import type { Project, UserRole } from "@prisma/client";
import { createHash } from "node:crypto";
import {
  BUSINESS_PREFIX,
  DATASET_ID,
  REFERENCE_DATE,
  SEQUENCE_YEAR,
  STORAGE_RELATIVE_ROOT,
  TEST_EMAIL_DOMAIN,
  businessCode,
  daysFromReference,
  makeId,
  projectKey,
  type TestUserKey,
} from "./constants";
import { CREATED_ID_MODELS, type CreatedIdModel } from "./model-registry";
import { selectConstructionProfile } from "./profiles";

export type SourceProject = Pick<
  Project,
  "id" | "code" | "name" | "location" | "investor" | "startDate" | "endDate"
> & {
  existingTemplateId: string | null;
};

export type DatasetRows = Record<CreatedIdModel, Array<Record<string, unknown>>>;

export type DatasetFile = {
  relativePath: string;
  content: Buffer;
};

export type BuiltDataset = {
  rows: DatasetRows;
  files: DatasetFile[];
  reusedTemplateIds: string[];
  userIds: Record<TestUserKey, string>;
  sequenceYears: {
    safetyPlan: number;
    safetyAssessment: number;
    employee: number;
  };
};

function emptyRows(): DatasetRows {
  return Object.fromEntries(CREATED_ID_MODELS.map((model) => [model, []])) as unknown as DatasetRows;
}

function minimalPdf(label: string): Buffer {
  const safeLabel = label.replace(/[^A-Za-z0-9 .:_-]/g, " ").slice(0, 80);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${45 + safeLabel.length} >>\nstream\nBT /F1 12 Tf 72 760 Td (${safeLabel}) Tj ET\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let output = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(output, "ascii"));
    output += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(output, "ascii");
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    output += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(output, "ascii");
}

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function addFile(
  files: DatasetFile[],
  relativePath: string,
  content: Buffer,
): { size: number; hash: string } {
  files.push({ relativePath, content });
  return {
    size: content.length,
    hash: createHash("sha256").update(content).digest("hex"),
  };
}

function userId(key: TestUserKey): string {
  return makeId("user", key);
}

function employeeId(key: TestUserKey): string {
  return makeId("employee", key);
}

export function buildDataset(projects: SourceProject[], passwordHash: string): BuiltDataset {
  const rows = emptyRows();
  const files: DatasetFile[] = [];
  const reusedTemplateIds: string[] = [];
  const userIds = Object.fromEntries(
    ([
      "admin",
      "director",
      "deputy",
      "commander",
      "manager",
      "engineer",
      "staff",
      "supervision-head",
      "construction-supervisor",
    ] as TestUserKey[]).map((key) => [key, userId(key)]),
  ) as Record<TestUserKey, string>;

  const testUsers: Array<{
    key: TestUserKey;
    username: string;
    name: string;
    role: UserRole;
    phone: string;
  }> = [
    { key: "admin", username: "tdv1_admin", name: "Nguyễn Minh Quân — Quản trị Test", role: "ADMIN", phone: "0901000001" },
    { key: "director", username: "tdv1_director", name: "Trần Hoàng Nam — Giám đốc Test", role: "DIRECTOR", phone: "0901000002" },
    { key: "deputy", username: "tdv1_deputy", name: "Lê Thu Hà — Phó giám đốc Test", role: "DEPUTY_DIRECTOR", phone: "0901000003" },
    { key: "commander", username: "tdv1_commander", name: "Phạm Đức Long — Chỉ huy trưởng Test", role: "CHIEF_COMMANDER", phone: "0901000004" },
    { key: "manager", username: "tdv1_manager", name: "Vũ Anh Tuấn — Quản lý dự án Test", role: "MANAGER", phone: "0901000005" },
    { key: "engineer", username: "tdv1_engineer", name: "Đặng Quốc Việt — Kỹ sư hiện trường Test", role: "ENGINEER", phone: "0901000006" },
    { key: "staff", username: "tdv1_hse", name: "Bùi Hải Yến — Cán bộ HSE Test", role: "STAFF", phone: "0901000007" },
    { key: "supervision-head", username: "tdv1_supervision_head", name: "Đỗ Văn Thành — Trưởng bộ phận giám sát Test", role: "SUPERVISION_HEAD", phone: "0901000008" },
    { key: "construction-supervisor", username: "tdv1_supervisor", name: "Ngô Minh Khôi — Giám sát công trình Test", role: "CONSTRUCTION_SUPERVISOR", phone: "0901000009" },
  ];

  for (const user of testUsers) {
    rows.User.push({
      id: userIds[user.key],
      email: `${user.key}@${TEST_EMAIL_DOMAIN}`,
      username: user.username,
      password: passwordHash,
      name: user.name,
      role: user.role,
      phone: user.phone,
      isActive: true,
      mustChangePassword: false,
      passwordChangedAt: REFERENCE_DATE,
      createdAt: daysFromReference(-45),
      updatedAt: REFERENCE_DATE,
    });
  }

  const rootOrgId = makeId("org", "test-operations");
  const technicalOrgId = makeId("org", "technical");
  const hseOrgId = makeId("org", "hse");
  rows.OrganizationUnit.push(
    { id: rootOrgId, code: `${BUSINESS_PREFIX}-BĐH`, name: "Ban điều hành dữ liệu test", description: DATASET_ID, orderIndex: 900, isActive: true },
    { id: technicalOrgId, code: `${BUSINESS_PREFIX}-KTTC`, name: "Phòng Kỹ thuật - Thi công Test", parentId: rootOrgId, description: DATASET_ID, orderIndex: 901, isActive: true },
    { id: hseOrgId, code: `${BUSINESS_PREFIX}-HSE`, name: "Phòng An toàn - Chất lượng Test", parentId: rootOrgId, description: DATASET_ID, orderIndex: 902, isActive: true },
  );

  const positionSpecs = [
    ["GD", "Giám đốc điều hành Test", 10],
    ["QLDA", "Quản lý dự án Test", 8],
    ["CHT", "Chỉ huy trưởng Test", 7],
    ["KSHT", "Kỹ sư hiện trường Test", 5],
    ["HSE", "Cán bộ HSE Test", 5],
  ] as const;
  for (const [code, title, level] of positionSpecs) {
    rows.Position.push({ id: makeId("position", code), code: `${BUSINESS_PREFIX}-${code}`, title, description: DATASET_ID, level, isActive: true });
  }

  const personnelRoles = [
    ["CHT", "Chỉ huy trưởng"],
    ["KSGS", "Kỹ sư giám sát"],
    ["HSE", "Cán bộ an toàn"],
    ["QLDA", "Quản lý dự án"],
  ] as const;
  for (const [code, name] of personnelRoles) {
    rows.ProjectPersonnelRole.push({ id: makeId("personnel-role", code), code: `${BUSINESS_PREFIX}-${code}`, name: `${name} Test`, description: DATASET_ID, orderIndex: 900, isActive: true });
  }

  const permissionCode = `${BUSINESS_PREFIX}.HR.TEST_DATA.READ`;
  rows.HrPermissionDefinition.push({
    id: makeId("hr-permission", "read"),
    code: permissionCode,
    name: "Đọc dữ liệu nhân sự Test",
    module: "HR",
    description: DATASET_ID,
  });

  const employeeStatuses = ["ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "PROBATION", "SUSPENDED", "RESIGNED"];
  const positionByUser: Record<TestUserKey, string> = {
    admin: makeId("position", "GD"),
    director: makeId("position", "GD"),
    deputy: makeId("position", "GD"),
    commander: makeId("position", "CHT"),
    manager: makeId("position", "QLDA"),
    engineer: makeId("position", "KSHT"),
    staff: makeId("position", "HSE"),
    "supervision-head": makeId("position", "QLDA"),
    "construction-supervisor": makeId("position", "KSHT"),
  };

  testUsers.forEach((user, index) => {
    const empId = employeeId(user.key);
    const status = employeeStatuses[index];
    rows.Employee.push({
      id: empId,
      code: `${BUSINESS_PREFIX}-NV-${String(index + 1).padStart(3, "0")}`,
      userId: userIds[user.key],
      fullName: user.name.replace(/ — .+$/, ""),
      gender: index % 3 === 1 ? "Nữ" : "Nam",
      dateOfBirth: new Date(Date.UTC(1982 + index, index % 12, 10 + index)),
      phoneNumber: user.phone,
      personalEmail: `${user.key}.personal@${TEST_EMAIL_DOMAIN}`,
      joinedDate: daysFromReference(-900 + index * 30),
      resignedDate: status === "RESIGNED" ? daysFromReference(-15) : null,
      status,
      createdById: userIds.admin,
      updatedById: userIds.admin,
    });
    rows.EmployeeOrganizationAssignment.push({
      id: makeId("employee-org", user.key),
      employeeId: empId,
      organizationUnitId: user.key === "staff" ? hseOrgId : technicalOrgId,
      positionId: positionByUser[user.key],
      startDate: daysFromReference(-800 + index * 20),
      endDate: status === "RESIGNED" ? daysFromReference(-15) : null,
      isPrimary: true,
      decisionNo: `${BUSINESS_PREFIX}-QĐNS-${String(index + 1).padStart(3, "0")}`,
      notes: DATASET_ID,
      createdById: userIds.admin,
    });
    rows.UserAccessGrant.push({
      id: makeId("access-grant", user.key),
      userId: userIds[user.key],
      permissionCode,
      effect: user.key === "construction-supervisor" ? "DENY" : "ALLOW",
      scope: user.key === "admin" || user.key === "director" ? "ALL_EMPLOYEES" : user.key === "staff" ? "OWN_ORGANIZATION_UNIT" : "OWN_PROJECTS",
      sensitiveFieldPolicy: user.key === "admin" ? "FULL" : user.key === "director" ? "CONTACT" : "BASIC_ONLY",
      organizationUnitId: user.key === "staff" ? hseOrgId : technicalOrgId,
      projectId: null,
      validFrom: daysFromReference(-30),
      validUntil: daysFromReference(365),
      grantedById: userIds.admin,
      reason: DATASET_ID,
    });
    rows.EmployeeChangeHistory.push(
      {
        id: makeId("employee-history", user.key, "created"),
        employeeId: empId,
        changeType: "EMPLOYEE_CREATED",
        performedById: userIds.admin,
        reason: "Khởi tạo hồ sơ nhân sự phục vụ kiểm thử",
        details: { datasetId: DATASET_ID, status },
        createdAt: daysFromReference(-45),
      },
      {
        id: makeId("employee-history", user.key, "assigned"),
        employeeId: empId,
        changeType: "EMPLOYEE_ORGANIZATION_TRANSFERRED",
        performedById: userIds.admin,
        reason: "Gán đơn vị tổ chức phục vụ kiểm thử",
        details: { datasetId: DATASET_ID, organizationUnitId: user.key === "staff" ? hseOrgId : technicalOrgId },
        createdAt: daysFromReference(-44),
      },
    );
  });

  rows.OrganizationUnitManagerAssignment.push(
    { id: makeId("org-manager", "technical"), organizationUnitId: technicalOrgId, employeeId: employeeId("manager"), startDate: daysFromReference(-400), isPrimary: true, appointedById: userIds.admin, decisionNo: `${BUSINESS_PREFIX}-QĐQL-001` },
    { id: makeId("org-manager", "hse"), organizationUnitId: hseOrgId, employeeId: employeeId("staff"), startDate: daysFromReference(-300), isPrimary: true, appointedById: userIds.admin, decisionNo: `${BUSINESS_PREFIX}-QĐQL-002` },
  );

  const memberRoles: Array<[TestUserKey, string, boolean]> = [
    ["admin", "PROJECT_MANAGER", true],
    ["manager", "PROJECT_MANAGER", true],
    ["commander", "CHIEF_COMMANDER", true],
    ["engineer", "ASSISTANT_COMMANDER", false],
    ["staff", "HSE", false],
    ["supervision-head", "VIEWER", false],
    ["construction-supervisor", "SUPERVISOR", false],
  ];

  projects.forEach((project, projectIndex) => {
    const pKey = projectKey(projectIndex);
    const profile = selectConstructionProfile(project.name);
    const templateId = project.existingTemplateId ?? makeId(pKey, "field-template");
    if (project.existingTemplateId) reusedTemplateIds.push(project.existingTemplateId);

    if (!project.existingTemplateId) {
      rows.FieldProgressTemplate.push({
        id: templateId,
        projectId: project.id,
        name: `[${BUSINESS_PREFIX}] Bảng khối lượng kiểm thử — ${project.code}`,
        description: `${DATASET_ID} · ${profile.label}`,
        status: "ACTIVE",
        createdById: userIds.manager,
        createdAt: daysFromReference(-35),
        updatedAt: REFERENCE_DATE,
      });
    }

    const rootLocationId = makeId(pKey, "location", "root");
    const zoneLocationId = makeId(pKey, "location", "zone");
    const areaLocationId = makeId(pKey, "location", "area");
    const storageLocationId = makeId(pKey, "location", "storage");
    rows.ProjectLocationNode.push(
      { id: rootLocationId, projectId: project.id, parentId: null, code: `${BUSINESS_PREFIX}-ROOT`, name: project.name, nodeType: "PROJECT", description: DATASET_ID, level: 0, sortOrder: 900, createdById: userIds.manager, updatedById: userIds.manager },
      { id: zoneLocationId, projectId: project.id, parentId: rootLocationId, code: `${BUSINESS_PREFIX}-ZONE-01`, name: profile.locationLabels[0], nodeType: profile.key === "BUILDING" ? "BUILDING" : "ZONE", description: DATASET_ID, level: 1, sortOrder: 901, createdById: userIds.manager, updatedById: userIds.engineer },
      { id: areaLocationId, projectId: project.id, parentId: zoneLocationId, code: `${BUSINESS_PREFIX}-AREA-01`, name: profile.locationLabels[1], nodeType: profile.key === "BUILDING" ? "FLOOR" : "AREA", description: DATASET_ID, level: 2, sortOrder: 902, createdById: userIds.manager, updatedById: userIds.engineer },
      { id: storageLocationId, projectId: project.id, parentId: zoneLocationId, code: `${BUSINESS_PREFIX}-STORE-01`, name: profile.locationLabels[2], nodeType: "OTHER", description: DATASET_ID, level: 2, sortOrder: 903, createdById: userIds.manager, updatedById: userIds.staff },
    );

    const projectMemberIds = new Map<TestUserKey, string>();
    for (const [key, role, technicalApproval] of memberRoles) {
      const id = makeId(pKey, "member", key);
      const resolvedRole = key === "commander"
        ? (projectIndex % 2 === 0 ? "CHIEF_COMMANDER" : "SITE_COMMANDER")
        : key === "staff"
          ? (projectIndex % 2 === 0 ? "HSE" : "QA_QC")
          : role;
      projectMemberIds.set(key, id);
      rows.ProjectMember.push({
        id,
        projectId: project.id,
        userId: userIds[key],
        role: resolvedRole,
        assignedById: userIds.admin,
        isActive: true,
        note: DATASET_ID,
        joinedAt: daysFromReference(-60),
        canApproveMaterialProposalTechnical: technicalApproval,
      });
    }

    const groupNames = [...new Set(profile.works.map((work) => work.group))];
    const fieldGroupIds = new Map<string, string>();
    const wbsGroupIds = new Map<string, string>();
    groupNames.forEach((group, groupIndex) => {
      const fieldGroupId = makeId(pKey, "field-group", groupIndex + 1);
      const wbsGroupId = makeId(pKey, "wbs-group", groupIndex + 1);
      fieldGroupIds.set(group, fieldGroupId);
      wbsGroupIds.set(group, wbsGroupId);
      rows.FieldProgressItem.push({
        id: fieldGroupId,
        projectId: project.id,
        templateId,
        parentId: null,
        sortOrder: 900 + groupIndex * 10,
        level: 0,
        itemType: "GROUP",
        code: businessCode(project.code, `G${groupIndex + 1}`),
        categoryName: group,
        status: "IN_PROGRESS",
        isLocked: false,
        note: DATASET_ID,
        createdById: userIds.manager,
      });
      rows.WBSItem.push({
        id: wbsGroupId,
        projectId: project.id,
        parentId: null,
        code: businessCode(project.code, `WBS-G${groupIndex + 1}`),
        name: group,
        unit: "Nhóm",
        description: DATASET_ID,
        progress: 28 + groupIndex * 4,
        status: "IN_PROGRESS",
        createdById: userIds.manager,
      });
    });

    const workItemIds: string[] = [];
    const wbsWorkIds: string[] = [];
    profile.works.forEach((work, workIndex) => {
      const fieldItemId = makeId(pKey, "field-work", workIndex + 1);
      const wbsItemId = makeId(pKey, "wbs-work", workIndex + 1);
      workItemIds.push(fieldItemId);
      wbsWorkIds.push(wbsItemId);
      rows.FieldProgressItem.push({
        id: fieldItemId,
        projectId: project.id,
        templateId,
        parentId: fieldGroupIds.get(work.group),
        sortOrder: 901 + workIndex,
        level: 1,
        itemType: "WORK",
        code: businessCode(project.code, work.code),
        workContent: work.name,
        constructionCrew: work.crew,
        designQuantity: work.designQuantity,
        unit: work.unit,
        status: workIndex < 4 ? "IN_PROGRESS" : "PLANNED",
        isLocked: false,
        note: DATASET_ID,
        createdById: userIds.manager,
      });
      rows.WBSItem.push({
        id: wbsItemId,
        projectId: project.id,
        parentId: wbsGroupIds.get(work.group),
        code: businessCode(project.code, `WBS-${work.code}`),
        name: work.name,
        unit: work.unit,
        designQuantity: work.designQuantity,
        description: DATASET_ID,
        plannedStartDate: daysFromReference(-120 + workIndex * 20),
        plannedEndDate: daysFromReference(-45 + workIndex * 22),
        progress: 18 + workIndex * 7,
        budget: 450_000_000 + workIndex * 125_000_000,
        status: workIndex < 4 ? "IN_PROGRESS" : "PLANNED",
        note: DATASET_ID,
        createdById: userIds.manager,
      });
      rows.FieldProgressItemAssignment.push({
        id: makeId(pKey, "field-assignment", workIndex + 1),
        projectId: project.id,
        fieldProgressItemId: fieldItemId,
        projectMemberId: projectMemberIds.get(workIndex % 2 === 0 ? "commander" : "engineer"),
        role: workIndex % 2 === 0 ? "RESPONSIBLE" : "COORDINATOR",
        note: `${DATASET_ID} · ${work.crew}`,
        assignedById: userIds.manager,
      });
      rows.FieldProgressItemLocation.push({
        id: makeId(pKey, "field-location", workIndex + 1),
        projectId: project.id,
        fieldProgressItemId: fieldItemId,
        locationNodeId: workIndex === 5 ? storageLocationId : areaLocationId,
        createdById: userIds.manager,
      });
    });

    const folderSpecs = [
      ["contract", "[TDV1] 01. Hợp đồng & pháp lý"],
      ["drawing", "[TDV1] 02. Bản vẽ & biện pháp"],
      ["quality", "[TDV1] 03. Nghiệm thu & chất lượng"],
      ["photo", "[TDV1] 04. Hình ảnh hiện trường"],
    ] as const;
    const folderIds = new Map<string, string>();
    folderSpecs.forEach(([key, name]) => {
      const id = makeId(pKey, "folder", key);
      folderIds.set(key, id);
      rows.DocumentFolder.push({ id, projectId: project.id, parentId: null, name });
    });

    const documentSpecs = [
      { key: "contract", name: `${businessCode(project.code, "HĐ")}_Hop-dong-goi-thau.pdf`, displayName: "Hợp đồng gói thầu — bản kiểm thử", type: "CONTRACT", status: "APPROVED", workIndex: 0 },
      { key: "drawing", name: `${businessCode(project.code, "BV")}_Ban-ve-bien-phap.pdf`, displayName: "Bản vẽ và biện pháp thi công — bản kiểm thử", type: "DRAWING", status: "SUBMITTED", workIndex: 1 },
      { key: "quality", name: `${businessCode(project.code, "NT")}_Bien-ban-nghiem-thu.pdf`, displayName: "Biên bản nghiệm thu nội bộ — bản kiểm thử", type: "QUALITY_RECORD", status: "DRAFT", workIndex: 2 },
    ];
    const documentStatusCycle = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "ARCHIVED", "SUPERSEDED"] as const;
    documentSpecs.forEach((spec, docIndex) => {
      const resolvedStatus = documentStatusCycle[(projectIndex + docIndex) % documentStatusCycle.length];
      const storedName = `${pKey}-${spec.key}.pdf`;
      const relativePath = `${STORAGE_RELATIVE_ROOT}/${project.code}/documents/${storedName}`;
      const file = minimalPdf(`${DATASET_ID} ${project.code} ${spec.type}`);
      const fileMeta = addFile(files, relativePath, file);
      rows.Document.push({
        id: makeId(pKey, "document", spec.key),
        projectId: project.id,
        folderId: folderIds.get(spec.key),
        originalName: spec.name,
        storedName,
        mimeType: "application/pdf",
        extension: "pdf",
        size: fileMeta.size,
        storagePath: relativePath,
        uploadedById: userIds.engineer,
        displayName: spec.displayName,
        documentType: spec.type,
        status: resolvedStatus,
        metadata: { datasetId: DATASET_ID, projectCode: project.code, profile: profile.key },
        fileHash: fileMeta.hash,
        reviewedById: ["APPROVED", "ARCHIVED", "SUPERSEDED"].includes(resolvedStatus) ? userIds.director : null,
        reviewedAt: ["APPROVED", "ARCHIVED", "SUPERSEDED"].includes(resolvedStatus) ? daysFromReference(-10) : null,
        rejectedReason: resolvedStatus === "REJECTED" ? "Bổ sung chữ ký và bằng chứng nghiệm thu." : null,
        fieldProgressItemId: workItemIds[spec.workIndex],
        locationNodeId: areaLocationId,
        version: docIndex + 1,
      });
    });
    const photoStoredName = `${pKey}-site-photo.png`;
    const photoPath = `${STORAGE_RELATIVE_ROOT}/${project.code}/documents/${photoStoredName}`;
    const photoMeta = addFile(files, photoPath, ONE_PIXEL_PNG);
    rows.Document.push({
      id: makeId(pKey, "document", "photo"),
      projectId: project.id,
      folderId: folderIds.get("photo"),
      originalName: `${businessCode(project.code, "ẢNH")}_Hien-truong.png`,
      storedName: photoStoredName,
      mimeType: "image/png",
      extension: "png",
      size: photoMeta.size,
      storagePath: photoPath,
      uploadedById: userIds.engineer,
      displayName: "Ảnh hiện trường kiểm thử",
      documentType: "SITE_PHOTO",
      status: "APPROVED",
      metadata: { datasetId: DATASET_ID, projectCode: project.code },
      fileHash: photoMeta.hash,
      reviewedById: userIds.manager,
      reviewedAt: daysFromReference(-2),
      fieldProgressItemId: workItemIds[3],
      locationNodeId: areaLocationId,
      version: 1,
    });

    const reportDefinitions = [
      { key: "d1", day: -12, status: "APPROVED", weather: "SUNNY", workIndexes: [0, 1, 2] },
      { key: "d2", day: -7, status: "APPROVED", weather: "CLOUDY", workIndexes: [1, 2, 3, 4] },
      { key: "d3", day: -3, status: "SUBMITTED", weather: "LIGHT_RAIN", workIndexes: [3, 4, 5] },
      { key: "d4", day: -1, status: "DRAFT", weather: "OVERCAST", workIndexes: [4, 5] },
    ] as const;

    reportDefinitions.forEach((reportDef, reportIndex) => {
      const reportId = makeId(pKey, "report", reportDef.key);
      const reportDate = daysFromReference(reportDef.day);
      const terminalStatusCycle = ["DRAFT", "REJECTED", "REVISION_REQUESTED", "CANCELLED"] as const;
      const reportStatus = reportDef.key === "d4"
        ? terminalStatusCycle[projectIndex % terminalStatusCycle.length]
        : reportDef.status;
      const fieldEntryStatus = reportStatus === "REJECTED" || reportStatus === "REVISION_REQUESTED"
        ? "REVISION_REQUESTED"
        : reportStatus;
      const isApproved = reportStatus === "APPROVED";
      const isSubmitted = reportStatus !== "DRAFT";
      rows.SiteReport.push({
        id: reportId,
        reportNo: businessCode(project.code, `BCN-${String(reportIndex + 1).padStart(2, "0")}`),
        type: "DAILY",
        projectId: project.id,
        title: `Báo cáo hiện trường ${project.code} ngày ${reportDate.toLocaleDateString("vi-VN", { timeZone: "UTC" })}`,
        reportDate,
        weatherCondition: reportDef.weather,
        weatherTemperature: 28 + (projectIndex + reportIndex) % 7,
        weatherNote: reportDef.weather === "LIGHT_RAIN" ? "Mưa nhẹ cuối ca, đã che phủ vật tư và kiểm tra thoát nước tạm." : "Thời tiết thuận lợi cho thi công theo kế hoạch.",
        gpsLat: 21.0 + projectIndex * 0.001,
        gpsLng: 105.8 + projectIndex * 0.001,
        summary: `Tổ chức thi công ${profile.label.toLowerCase()} theo kế hoạch ngày; các mũi thi công được nghiệm thu nội bộ trước khi chuyển bước.`,
        materials: `Vật tư chính đã cấp gồm ${profile.materials.slice(0, 3).map((item) => item.name).join(", ")}.`,
        labor: `${32 + projectIndex % 18} công nhân, 2 kỹ sư hiện trường, 1 cán bộ HSE và 1 chỉ huy trưởng.`,
        equipment: profile.key === "BUILDING" ? "01 cẩu tháp, 02 máy trộn, 04 đầm dùi, 01 máy toàn đạc." : "02 máy đào, 04 xe ben, 01 lu rung và 01 máy toàn đạc.",
        quality: "Đã kiểm tra cao độ, kích thước hình học, vật liệu đầu vào và lập biên bản nghiệm thu nội bộ.",
        issues: reportIndex === 2 ? "Một lô vật tư giao chậm 01 ngày; mặt bằng cục bộ cần phối hợp giải phóng trước ca sáng." : null,
        recommendations: reportIndex === 2 ? "Đề nghị nhà cung cấp xác nhận lịch giao và Ban điều hành duyệt phương án tăng ca bù tiến độ." : "Tiếp tục duy trì kiểm tra chất lượng và an toàn đầu ca.",
        reporterName: "Đặng Quốc Việt",
        weather: reportDef.weather,
        manpowerCount: 36 + projectIndex % 12,
        equipmentNote: profile.label,
        generalNote: DATASET_ID,
        status: reportStatus,
        createdById: userIds.engineer,
        submittedAt: isSubmitted ? new Date(reportDate.getTime() + 17 * 3_600_000) : null,
        approvedById: isApproved ? userIds.director : null,
        approvedAt: isApproved ? new Date(reportDate.getTime() + 20 * 3_600_000) : null,
        rejectedReason: reportStatus === "REJECTED" || reportStatus === "REVISION_REQUESTED" ? "Bổ sung ảnh nghiệm thu và xác nhận khối lượng." : null,
      });

      reportDef.workIndexes.forEach((workIndex, lineIndex) => {
        const work = profile.works[workIndex];
        const lineId = makeId(pKey, "report-line", reportDef.key, lineIndex + 1);
        const percent = reportIndex === 0 ? 0.08 : reportIndex === 1 ? 0.12 : reportIndex === 2 ? 0.05 : 0.02;
        const quantityToday = Number((work.designQuantity * percent).toFixed(4));
        const quantityBefore = reportIndex === 0 ? 0 : Number((work.designQuantity * 0.08).toFixed(4));
        const cumulative = quantityBefore + quantityToday;
        rows.SiteReportLine.push({
          id: lineId,
          siteReportId: reportId,
          projectId: project.id,
          wbsItemId: wbsWorkIds[workIndex],
          fieldProgressItemId: workItemIds[workIndex],
          locationNodeId: areaLocationId,
          workName: work.name,
          workContent: work.name,
          area: profile.locationLabels[1],
          constructionCrew: work.crew,
          unit: work.unit,
          designQuantity: work.designQuantity,
          quantityToday,
          quantityBefore,
          quantityCumulative: cumulative,
          progressPercent: Number(((cumulative / work.designQuantity) * 100).toFixed(2)),
          note: DATASET_ID,
          issueNote: reportIndex === 2 && lineIndex === 0 ? "Chậm vật tư đầu ca." : null,
          proposalNote: reportIndex === 2 && lineIndex === 0 ? "Bổ sung giao hàng trước 07:00 ngày kế tiếp." : null,
          sortOrder: lineIndex,
        });
        rows.FieldProgressEntry.push({
          id: makeId(pKey, "progress-entry", reportDef.key, lineIndex + 1),
          projectId: project.id,
          templateId,
          itemId: workItemIds[workIndex],
          entryDate: reportDate,
          quantity: quantityToday,
          issueNote: reportIndex === 2 && lineIndex === 0 ? "Chậm vật tư đầu ca." : null,
          proposalNote: reportIndex === 2 && lineIndex === 0 ? "Điều phối giao sớm." : null,
          note: DATASET_ID,
          status: fieldEntryStatus,
          createdById: userIds.engineer,
          submittedAt: isSubmitted ? new Date(reportDate.getTime() + 17 * 3_600_000) : null,
          approvedById: isApproved ? userIds.director : null,
          approvedAt: isApproved ? new Date(reportDate.getTime() + 20 * 3_600_000) : null,
          sourceType: "SITE_REPORT",
          sourceId: reportId,
          sourceLineId: lineId,
          sourceReportId: reportId,
          sourceMeta: { datasetId: DATASET_ID, reportNo: businessCode(project.code, `BCN-${String(reportIndex + 1).padStart(2, "0")}`) },
          locationNodeId: areaLocationId,
        });
      });
    });

    const weeklyReportId = makeId(pKey, "report", "weekly");
    rows.SiteReport.push({
      id: weeklyReportId,
      reportNo: businessCode(project.code, "BCT-01"),
      type: "WEEKLY",
      projectId: project.id,
      title: `Báo cáo tuần kiểm thử — ${project.code}`,
      reportDate: daysFromReference(-1),
      weekStartDate: daysFromReference(-7),
      weekEndDate: daysFromReference(-1),
      weatherCondition: "CLOUDY",
      weatherTemperature: 30,
      summary: "Khối lượng thi công trong tuần bám kế hoạch; công tác nghiệm thu nội bộ và an toàn được duy trì.",
      materials: `Đã kiểm soát nhập - xuất ${profile.materials.length} nhóm vật tư chính.`,
      labor: "Nhân lực trung bình 42 người/ngày.",
      equipment: "Thiết bị vận hành ổn định, có nhật ký kiểm tra đầu ca.",
      quality: "Các công việc chuyển bước đều có kiểm tra nội bộ.",
      issues: "Cần theo dõi lịch giao vật tư và mặt bằng cục bộ.",
      recommendations: "Duy trì họp điều độ 16:30 hằng ngày và chốt kế hoạch vật tư trước 48 giờ.",
      reporterName: "Phạm Đức Long",
      status: projectIndex % 7 === 0 ? "LOCKED" : "APPROVED",
      createdById: userIds.commander,
      submittedAt: daysFromReference(-1),
      approvedById: userIds.director,
      approvedAt: REFERENCE_DATE,
      generalNote: DATASET_ID,
    });
    profile.works.forEach((work, workIndex) => {
      rows.SiteReportLine.push({
        id: makeId(pKey, "report-line", "weekly", workIndex + 1),
        siteReportId: weeklyReportId,
        projectId: project.id,
        wbsItemId: wbsWorkIds[workIndex],
        fieldProgressItemId: workItemIds[workIndex],
        locationNodeId: areaLocationId,
        workName: work.name,
        workContent: work.name,
        area: profile.locationLabels[1],
        constructionCrew: work.crew,
        unit: work.unit,
        designQuantity: work.designQuantity,
        quantityToday: 0,
        quantityBefore: Number((work.designQuantity * 0.08).toFixed(4)),
        quantityCumulative: Number((work.designQuantity * 0.2).toFixed(4)),
        progressPercent: 20,
        note: `${DATASET_ID} · Dòng tổng hợp tuần, không sinh thêm FieldProgressEntry.`,
        sortOrder: workIndex,
      });
    });

    const reportPdfName = `${pKey}-report-attachment.pdf`;
    const reportPdfPath = `${STORAGE_RELATIVE_ROOT}/${project.code}/reports/${reportPdfName}`;
    const reportPdfMeta = addFile(files, reportPdfPath, minimalPdf(`${DATASET_ID} ${project.code} WEEKLY REPORT`));
    rows.SiteReportAttachment.push({
      id: makeId(pKey, "report-attachment", "pdf"),
      reportId: weeklyReportId,
      kind: "FILE",
      fileName: reportPdfName,
      originalName: `${businessCode(project.code, "BCT")}_Bao-cao-tuan.pdf`,
      mimeType: "application/pdf",
      sizeBytes: reportPdfMeta.size,
      storagePath: reportPdfPath,
      caption: `Tệp báo cáo tuần · ${DATASET_ID}`,
    });
    const reportPhotoName = `${pKey}-report-photo.png`;
    const reportPhotoPath = `${STORAGE_RELATIVE_ROOT}/${project.code}/reports/${reportPhotoName}`;
    const reportPhotoMeta = addFile(files, reportPhotoPath, ONE_PIXEL_PNG);
    rows.SiteReportAttachment.push({
      id: makeId(pKey, "report-attachment", "photo"),
      reportId: weeklyReportId,
      kind: "PHOTO",
      fileName: reportPhotoName,
      originalName: `${businessCode(project.code, "ẢNH")}_Tien-do.png`,
      mimeType: "image/png",
      sizeBytes: reportPhotoMeta.size,
      storagePath: reportPhotoPath,
      caption: `Ảnh tiến độ · ${DATASET_ID}`,
    });
    rows.SiteReportPhoto.push({
      id: makeId(pKey, "site-report-photo"),
      reportId: weeklyReportId,
      storageKey: reportPhotoPath,
      description: `Ảnh hiện trường ${project.code} · ${DATASET_ID}`,
    });

    const materialIds: string[] = [];
    profile.materials.forEach((material, materialIndex) => {
      const materialId = makeId(pKey, "material", materialIndex + 1);
      materialIds.push(materialId);
      rows.MaterialItem.push({
        id: materialId,
        projectId: project.id,
        code: businessCode(project.code, material.code),
        name: material.name,
        unit: material.unit,
        manufacturer: material.manufacturer,
        origin: material.origin,
        group: material.group,
        description: DATASET_ID,
        isActive: true,
      });
      const importQuantity = material.importQuantity;
      const exportQuantity = Number((importQuantity * (0.32 + (materialIndex % 3) * 0.04)).toFixed(4));
      const thirdType = materialIndex % 2 === 0 ? "RETURN" : "TRANSFER";
      const thirdQuantity = Number((importQuantity * 0.04).toFixed(4));
      const stock = thirdType === "RETURN"
        ? importQuantity - exportQuantity + thirdQuantity
        : importQuantity - exportQuantity - thirdQuantity;
      rows.MaterialMovement.push(
        { id: makeId(pKey, "movement", materialIndex + 1, "import"), projectId: project.id, materialItemId: materialId, materialCodeSnapshot: businessCode(project.code, material.code), materialNameSnapshot: material.name, unitSnapshot: material.unit, type: "IMPORT", quantity: importQuantity, unitPrice: material.unitPrice, movementDate: daysFromReference(-28 + materialIndex), notes: `${DATASET_ID} · Phiếu nhập đầu kỳ` },
        { id: makeId(pKey, "movement", materialIndex + 1, "export"), projectId: project.id, materialItemId: materialId, materialCodeSnapshot: businessCode(project.code, material.code), materialNameSnapshot: material.name, unitSnapshot: material.unit, type: "EXPORT", quantity: exportQuantity, unitPrice: material.unitPrice, movementDate: daysFromReference(-14 + materialIndex), notes: `${DATASET_ID} · Xuất cho mũi thi công` },
        { id: makeId(pKey, "movement", materialIndex + 1, thirdType.toLowerCase()), projectId: project.id, materialItemId: materialId, materialCodeSnapshot: businessCode(project.code, material.code), materialNameSnapshot: material.name, unitSnapshot: material.unit, type: thirdType, quantity: thirdQuantity, unitPrice: material.unitPrice, movementDate: daysFromReference(-5 + materialIndex), notes: `${DATASET_ID} · ${thirdType === "RETURN" ? "Hoàn trả vật tư thừa" : "Điều chuyển nội bộ"}` },
      );
      rows.ProjectMaterialStock.push({
        id: makeId(pKey, "stock", materialIndex + 1),
        projectId: project.id,
        materialItemId: materialId,
        stock: Number(stock.toFixed(4)),
        minStockLevel: materialIndex === 0 ? Number((stock * 1.1).toFixed(4)) : material.minStock,
        lastUpdated: daysFromReference(-1),
      });
    });

    const allRequestStatuses = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "ISSUED", "RECEIVED", "CANCELLED"];
    const requestStatuses = [
      allRequestStatuses[projectIndex % allRequestStatuses.length],
      allRequestStatuses[(projectIndex + 4) % allRequestStatuses.length],
    ];
    requestStatuses.forEach((status, requestIndex) => {
      const requestId = makeId(pKey, "field-request", requestIndex + 1);
      rows.FieldMaterialRequest.push({
        id: requestId,
        projectId: project.id,
        templateId,
        itemId: workItemIds[requestIndex + 2],
        entryId: rows.FieldProgressEntry.find((entry) => entry.projectId === project.id && entry.itemId === workItemIds[requestIndex + 2] && entry.status === "APPROVED")?.id ?? null,
        requestDate: daysFromReference(-8 + requestIndex * 5),
        neededDate: daysFromReference(-5 + requestIndex * 6),
        requestedById: userIds.engineer,
        status,
        priority: ["LOW", "MEDIUM", "HIGH", "URGENT"][(projectIndex + requestIndex) % 4],
        note: `${DATASET_ID} · Cấp vật tư theo kế hoạch 03 ngày`,
      });
      [0, 1].forEach((offset) => {
        const material = profile.materials[requestIndex * 2 + offset];
        rows.FieldMaterialRequestItem.push({
          id: makeId(pKey, "field-request-item", requestIndex + 1, offset + 1),
          requestId,
          materialName: material.name,
          unit: material.unit,
          requestedQuantity: Number((material.importQuantity * 0.08).toFixed(4)),
          reason: "Phục vụ kế hoạch thi công trong 03 ngày tới",
          note: DATASET_ID,
        });
      });
    });

    const proposalStatusGroups = [
      ["DRAFT", "APPROVED"],
      ["SUBMITTED", "REJECTED"],
      ["REVISION_REQUESTED", "CANCELLED"],
    ] as const;
    proposalStatusGroups[projectIndex % proposalStatusGroups.length].forEach((status, proposalIndex) => {
      const proposalId = makeId(pKey, "material-proposal", proposalIndex + 1);
      const proposalNo = businessCode(project.code, `ĐXVT-${proposalIndex + 1}`);
      rows.MaterialProposal.push({
        id: proposalId,
        proposalNo,
        projectId: project.id,
        projectNameSnapshot: project.name,
        projectLocationSnapshot: project.location,
        requestedById: userIds.commander,
        requesterNameSnapshot: "Phạm Đức Long",
        requesterRoleSnapshot: "Chỉ huy trưởng",
        proposalDate: daysFromReference(-10 + proposalIndex * 6),
        purchaseReason: `${DATASET_ID} · Bổ sung vật tư theo tiến độ thi công và mức tồn kho tối thiểu.`,
        requiredDeliveryDate: daysFromReference(-4 + proposalIndex * 7),
        status,
      });
      [0, 1, 2].forEach((materialOffset) => {
        const materialIndex = proposalIndex * 3 + materialOffset;
        const material = profile.materials[materialIndex];
        rows.MaterialProposalItem.push({
          id: makeId(pKey, "material-proposal-item", proposalIndex + 1, materialOffset + 1),
          proposalId,
          sequence: materialOffset + 1,
          sectionName: material.group,
          materialItemId: materialIds[materialIndex],
          materialCodeSnapshot: businessCode(project.code, material.code),
          materialName: material.name,
          unit: material.unit,
          contractQuantityText: `${material.importQuantity.toLocaleString("vi-VN")} ${material.unit}`,
          actualQuantity: Number((material.importQuantity * 0.22).toFixed(4)),
          specification: `${material.manufacturer} · ${material.origin}`,
          manufacturerOrigin: `${material.manufacturer} / ${material.origin}`,
          note: DATASET_ID,
        });
      });
      ["TECHNICAL", "FINAL"].forEach((stage, stageIndex) => {
        const approved = status === "APPROVED";
        const rejected = status === "REJECTED" || status === "REVISION_REQUESTED";
        const cancelled = status === "CANCELLED";
        rows.MaterialProposalApproval.push({
          id: makeId(pKey, "material-proposal-approval", proposalIndex + 1, stageIndex + 1),
          proposalId,
          stage,
          status: approved
            ? "APPROVED"
            : rejected && stage === "TECHNICAL"
              ? "REJECTED"
              : cancelled || stage === "FINAL"
                ? "CANCELLED"
                : "PENDING",
          approverId: stage === "TECHNICAL" ? userIds.manager : userIds.director,
          decidedAt: approved || rejected || cancelled ? daysFromReference(-2) : null,
          decisionNote: approved
            ? `Đủ điều kiện ${stage === "TECHNICAL" ? "kỹ thuật" : "phê duyệt cuối"}.`
            : rejected && stage === "TECHNICAL"
              ? "Bổ sung chứng chỉ xuất xưởng và mẫu vật liệu."
              : cancelled
                ? "Hồ sơ đã được hủy theo kế hoạch điều chỉnh."
                : null,
          idempotencyKey: `${DATASET_ID}:${pKey}:${proposalIndex + 1}:${stage}`,
        });
      });
    });

    const approvalDefinitions = [
      { key: "material", type: "MATERIAL", status: "PENDING", priority: "HIGH", entityType: "MaterialProposal", entityId: makeId(pKey, "material-proposal", 1) },
      { key: "report", type: "REPORT", status: "APPROVED", priority: "NORMAL", entityType: "SiteReport", entityId: weeklyReportId },
      { key: "safety", type: "SAFETY", status: "REJECTED", priority: "URGENT", entityType: "SafetyReportPlanEntry", entityId: makeId("safety-plan-entry", pKey) },
      { key: "change", type: "CHANGE_ORDER", status: "CANCELLED", priority: "LOW", entityType: "Project", entityId: project.id },
    ] as const;
    const approvalTypes = ["MATERIAL", "REPORT", "VOLUME", "INSPECTION", "PLAN", "DRAWING", "METHOD_STATEMENT", "SAFETY", "QUALITY", "SITE_ISSUE", "CHANGE_ORDER", "OTHER"] as const;
    approvalDefinitions.forEach((approval, approvalIndex) => {
      const resolvedType = approvalTypes[(projectIndex * approvalDefinitions.length + approvalIndex) % approvalTypes.length];
      const resolvedStatus = approval.key === "safety" && projectIndex === 0 ? "APPROVED" : approval.status;
      const decided = resolvedStatus === "APPROVED" || resolvedStatus === "REJECTED";
      rows.ApprovalRequest.push({
        id: makeId(pKey, "approval", approval.key),
        code: businessCode(project.code, `PD-${approvalIndex + 1}`),
        projectId: project.id,
        title: `Hồ sơ ${resolvedType} — ${project.code}`,
        description: `${DATASET_ID} · Hồ sơ phục vụ kiểm thử workflow ${resolvedStatus}.`,
        type: resolvedType,
        status: resolvedStatus,
        priority: approval.priority,
        dueDate: daysFromReference(approvalIndex - 1),
        requesterId: userIds.commander,
        decidedById: decided ? userIds.director : null,
        decidedAt: decided ? daysFromReference(-1) : null,
        decisionNote: resolvedStatus === "REJECTED" ? "Yêu cầu bổ sung biện pháp kiểm soát rủi ro." : resolvedStatus === "APPROVED" ? "Đồng ý phê duyệt." : null,
        sourceType: approval.entityType,
        sourceId: approval.entityId,
        entityType: approval.entityType,
        entityId: approval.entityId,
      });
    });

    [
      ["APPROVAL_PENDING", "WARNING", "Có hồ sơ chờ phê duyệt", `/approvals?projectId=${project.id}`],
      ["MATERIAL_LOW_STOCK", "ERROR", "Một vật tư dưới ngưỡng tồn tối thiểu", `/materials?projectId=${project.id}`],
      ["REPORT_APPROVED", "SUCCESS", "Báo cáo tuần đã được phê duyệt", `/reports/field/${weeklyReportId}`],
    ].forEach(([type, severity, title, href], notificationIndex) => {
      rows.Notification.push({
        id: makeId(pKey, "notification", notificationIndex + 1),
        userId: notificationIndex === 0 ? userIds.director : notificationIndex === 1 ? userIds.commander : userIds.engineer,
        projectId: project.id,
        type,
        severity,
        title: `${title} · ${project.code}`,
        message: DATASET_ID,
        href,
        isRead: notificationIndex === 2,
        readAt: notificationIndex === 2 ? REFERENCE_DATE : null,
      });
    });

    for (let auditIndex = 0; auditIndex < 5; auditIndex += 1) {
      rows.AuditLog.push({
        id: makeId(pKey, "audit", auditIndex + 1),
        userId: auditIndex % 2 === 0 ? userIds.engineer : userIds.director,
        projectId: project.id,
        action: ["CREATE_TEST_PROGRESS", "SUBMIT_TEST_REPORT", "APPROVE_TEST_REPORT", "CREATE_TEST_MATERIAL_PROPOSAL", "VERIFY_TEST_STOCK"][auditIndex],
        entityType: ["FieldProgressEntry", "SiteReport", "SiteReport", "MaterialProposal", "ProjectMaterialStock"][auditIndex],
        entityId: [workItemIds[0], makeId(pKey, "report", "d3"), weeklyReportId, makeId(pKey, "material-proposal", 1), makeId(pKey, "stock", 1)][auditIndex],
        beforeData: auditIndex === 2 ? JSON.stringify({ status: "SUBMITTED", datasetId: DATASET_ID }) : null,
        afterData: JSON.stringify({ datasetId: DATASET_ID, projectCode: project.code }),
        ipAddress: "127.0.0.1",
        userAgent: "complete-real-projects-test-data-v1",
        createdAt: daysFromReference(-5 + auditIndex),
      });
    }

    rows.EmployeeProjectAssignment.push(
      {
        id: makeId(pKey, "employee-project", "commander"),
        employeeId: employeeId("commander"),
        projectId: project.id,
        projectPersonnelRoleId: makeId("personnel-role", "CHT"),
        startDate: project.startDate ?? daysFromReference(-180),
        expectedEndDate: project.endDate ?? daysFromReference(180),
        allocationPercentage: 70,
        status: "ACTIVE",
        assignmentDecisionNo: businessCode(project.code, "ĐĐ-CHT"),
        notes: DATASET_ID,
        sourceOrgUnitId: technicalOrgId,
        sourceOrgUnitCodeSnapshot: `${BUSINESS_PREFIX}-KTTC`,
        sourceOrgUnitNameSnapshot: "Phòng Kỹ thuật - Thi công Test",
        createdById: userIds.admin,
      },
      {
        id: makeId(pKey, "employee-project", "engineer"),
        employeeId: employeeId("engineer"),
        projectId: project.id,
        projectPersonnelRoleId: makeId("personnel-role", "KSGS"),
        startDate: project.startDate ?? daysFromReference(-120),
        expectedEndDate: project.endDate ?? daysFromReference(150),
        allocationPercentage: 30,
        status: "ACTIVE",
        assignmentDecisionNo: businessCode(project.code, "ĐĐ-KS"),
        notes: DATASET_ID,
        sourceOrgUnitId: technicalOrgId,
        sourceOrgUnitCodeSnapshot: `${BUSINESS_PREFIX}-KTTC`,
        sourceOrgUnitNameSnapshot: "Phòng Kỹ thuật - Thi công Test",
        createdById: userIds.admin,
      },
    );
  });

  const specialAssignmentStatuses = ["COMPLETED", "RELEASED", "CANCELLED"] as const;
  specialAssignmentStatuses.forEach((status, index) => {
    const project = projects[index];
    rows.EmployeeProjectAssignment.push({
      id: makeId("employee-project", "historical", status.toLowerCase()),
      employeeId: employeeId("construction-supervisor"),
      projectId: project.id,
      projectPersonnelRoleId: makeId("personnel-role", "KSGS"),
      startDate: daysFromReference(-365 + index * 30),
      expectedEndDate: daysFromReference(-180 + index * 30),
      endDate: daysFromReference(-170 + index * 30),
      allocationPercentage: 100,
      status,
      endReason: status === "COMPLETED" ? "COMPLETED" : status === "RELEASED" ? "EARLY_RELEASE" : "ALLOCATION_CHANGE",
      assignmentDecisionNo: `${BUSINESS_PREFIX}-LỊCHSỬ-${index + 1}`,
      notes: DATASET_ID,
      sourceOrgUnitId: technicalOrgId,
      sourceOrgUnitCodeSnapshot: `${BUSINESS_PREFIX}-KTTC`,
      sourceOrgUnitNameSnapshot: "Phòng Kỹ thuật - Thi công Test",
      createdById: userIds.admin,
    });
  });

  rows.ChatMessage.push(
    { id: makeId("chat", 1), senderId: userIds.manager, content: `[${DATASET_ID}] Đã chốt kế hoạch điều độ tuần cho 21 công trình.` , createdAt: daysFromReference(-3) },
    { id: makeId("chat", 2), senderId: userIds.commander, content: `[${DATASET_ID}] Các chỉ huy trưởng cập nhật nhu cầu vật tư trước 15:00.` , createdAt: daysFromReference(-2) },
    { id: makeId("chat", 3), senderId: userIds.staff, content: `[${DATASET_ID}] Đã hoàn thành kiểm tra an toàn đầu tuần.` , createdAt: daysFromReference(-2) },
    { id: makeId("chat", 4), senderId: userIds.engineer, content: `[${DATASET_ID}] Nhật ký hiện trường và ảnh tiến độ đã được đồng bộ.` , createdAt: daysFromReference(-1) },
    { id: makeId("chat", 5), senderId: userIds.director, content: `[${DATASET_ID}] Ưu tiên xử lý các hồ sơ quá hạn trong ngày.` , createdAt: daysFromReference(-1) },
    { id: makeId("chat", 6), senderId: userIds["supervision-head"], content: `[${DATASET_ID}] Báo cáo giám sát tuần đã sẵn sàng để rà soát.` , createdAt: REFERENCE_DATE },
  );

  const scopeId = makeId("supervision-scope");
  rows.SupervisionScope.push({
    id: scopeId,
    userId: userIds["construction-supervisor"],
    scopeType: "SELECTED_PROJECTS",
    createdById: userIds["supervision-head"],
  });
  projects.forEach((project, index) => {
    rows.SupervisionScopeProject.push({ id: makeId("supervision-scope-project", index + 1), scopeId, projectId: project.id });
  });

  const legacyPackageId = makeId("legacy-supervision-package");
  rows.SupervisionWeeklyPackage.push({
    id: legacyPackageId,
    reportNumber: `${BUSINESS_PREFIX}-GS-LEGACY-001`,
    weekStart: daysFromReference(-14),
    weekEnd: daysFromReference(-8),
    issuedAt: daysFromReference(-7),
    place: "Hà Nội",
    recipientName: "Ban Giám đốc",
    recipientTitle: "Giám đốc",
    status: "CONFIRMED",
    version: 1,
    submittedAt: daysFromReference(-7),
    confirmedAt: daysFromReference(-6),
    createdById: userIds["supervision-head"],
    reviewedById: userIds.director,
  });
  rows.SupervisionWorkflowHistory.push(
    { id: makeId("legacy-supervision-history", 1), packageId: legacyPackageId, actorId: userIds["supervision-head"], action: "SUBMIT", previousStatus: "DRAFT", nextStatus: "SUBMITTED", version: 1, idempotencyKey: `${DATASET_ID}:LEGACY:SUBMIT`, createdAt: daysFromReference(-7) },
    { id: makeId("legacy-supervision-history", 2), packageId: legacyPackageId, actorId: userIds.director, action: "CONFIRM", previousStatus: "UNDER_REVIEW", nextStatus: "CONFIRMED", version: 1, idempotencyKey: `${DATASET_ID}:LEGACY:CONFIRM`, createdAt: daysFromReference(-6) },
  );
  rows.SupervisionAttachment.push({
    id: makeId("legacy-supervision-attachment"),
    packageId: legacyPackageId,
    documentId: makeId(projectKey(0), "document", "quality"),
    projectId: projects[0].id,
    evidenceType: "QUALITY_RECORD",
    createdById: userIds["supervision-head"],
  });

  projects.forEach((project, index) => {
    const pKey = projectKey(index);
    const profile = selectConstructionProfile(project.name);
    const visitId = makeId(pKey, "legacy-supervision-visit");
    rows.SupervisionFinding.push({ id: makeId(pKey, "legacy-finding"), packageId: legacyPackageId, projectId: project.id, code: businessCode(project.code, "GS-TỒN-01"), workItem: profile.works[2].name, category: index % 3 === 0 ? "Chất lượng" : "Tiến độ", description: index % 3 === 0 ? "Cần bổ sung biển nhận diện khu vực chờ nghiệm thu." : "Một mũi thi công chưa đạt năng suất theo kế hoạch ca.", severity: index % 5 === 0 ? "HIGH" : "MEDIUM", responsibleParty: profile.works[2].crew, detectedAt: daysFromReference(-10), dueDate: daysFromReference(-2), status: index % 4 === 0 ? "RESOLVED" : index % 4 === 1 ? "IN_PROGRESS" : index % 4 === 2 ? "OVERDUE" : "PENDING_VERIFICATION", remediationResponse: "Đã phân công khắc phục và cập nhật ảnh bằng chứng.", remediationResult: index % 4 === 0 ? "PASSED" : "NOT_CHECKED", verifiedAt: index % 4 === 0 ? daysFromReference(-1) : null, verifiedById: index % 4 === 0 ? userIds["construction-supervisor"] : null, verificationNote: DATASET_ID, createdById: userIds["construction-supervisor"] });
    rows.SupervisionPlanItem.push({ id: makeId(pKey, "legacy-plan-item"), packageId: legacyPackageId, projectId: project.id, plannedDate: daysFromReference(1 + (index % 5)), shift: index % 2 === 0 ? "MORNING" : "AFTERNOON", plannedTime: index % 2 === 0 ? "08:00" : "14:00", workItem: profile.works[3].name, inspectionContent: "Kiểm tra điều kiện chuyển bước, hồ sơ nghiệm thu và an toàn khu vực.", objective: "Xác nhận đủ điều kiện thi công bước tiếp theo.", source: index % 3 === 0 ? "PREVIOUS_FINDING" : "SUPERVISION_HEAD", proposer: "Trưởng bộ phận giám sát", collaborators: "Chỉ huy trưởng; Kỹ sư hiện trường; HSE", priority: index % 5 === 0 ? "HIGH" : "MEDIUM", expectedResult: "Đủ hồ sơ và điều kiện hiện trường.", note: DATASET_ID });
    rows.SupervisionProgressAssessment.push({ id: makeId(pKey, "legacy-progress"), packageId: legacyPackageId, projectId: project.id, workItem: profile.works[3].name, plannedProgress: 35 + (index % 10), actualProgress: 30 + (index % 8), variancePercent: -5, delayedDays: index % 4, delayReason: index % 4 ? "Điều phối mặt bằng và lịch giao vật tư." : null, impactLevel: index % 4 ? "MEDIUM" : "LOW", proposedMeasure: "Tổ chức bù ca và khóa lịch giao vật tư 48 giờ.", responsibleParty: "Ban điều hành công trình" });
    rows.SupervisionQuantityVerification.push({ id: makeId(pKey, "legacy-quantity"), packageId: legacyPackageId, projectId: project.id, workItem: profile.works[1].name, unit: profile.works[1].unit, reportedQuantity: 120 + index, verifiedQuantity: 118 + index, varianceQuantity: -2, variancePercent: -1.67, sourceType: "SITE_REPORT", sourceId: makeId(pKey, "report", "d2"), sourceRecordedAt: daysFromReference(-7), checkedAt: daysFromReference(-6), conclusion: "Chấp nhận sau khi hiệu chỉnh số liệu đo đạc.", note: DATASET_ID });
    rows.SupervisionRecommendation.push({ id: makeId(pKey, "legacy-recommendation"), packageId: legacyPackageId, projectId: project.id, workItem: profile.works[4].name, group: index % 2 === 0 ? "PROGRESS_DIRECTION" : "QUALITY_ISSUE", content: "Khóa kế hoạch nhân lực, vật tư và nghiệm thu trước 48 giờ; cập nhật bằng chứng theo ca.", priority: index % 5 === 0 ? "HIGH" : "MEDIUM", decisionMaker: "Ban Giám đốc", desiredDueDate: daysFromReference(3), boardComment: "Theo dõi trên báo cáo điều độ ngày.", status: index % 3 === 0 ? "APPROVED" : "PENDING" });
    rows.SupervisionTransitionCheck.push({ id: makeId(pKey, "legacy-transition"), packageId: legacyPackageId, projectId: project.id, workItem: profile.works[2].name, currentStep: "Nghiệm thu nội bộ", proposedStep: "Thi công bước kế tiếp", reportedQuantity: 120 + index, verifiedQuantity: 118 + index, varianceQuantity: -2, unit: profile.works[2].unit, plannedProgress: "35%", conclusion: "Đủ điều kiện có kiểm soát", reason: "Đã bổ sung hồ sơ đo đạc.", requiredAction: "Hoàn tất chữ ký biên bản trước ca kế tiếp." });
    rows.SupervisionVisit.push({ id: visitId, packageId: legacyPackageId, projectId: project.id, visitDate: daysFromReference(-6 + (index % 4)), shift: index % 2 === 0 ? "MORNING" : "AFTERNOON", startedAt: daysFromReference(-6 + (index % 4)), endedAt: new Date(daysFromReference(-6 + (index % 4)).getTime() + 2 * 3_600_000), workItem: profile.works[2].name, inspectionContent: "Kiểm tra hiện trường, hồ sơ nghiệm thu, vật tư đầu vào và biện pháp an toàn.", result: "Đạt có điều kiện; theo dõi một nội dung khắc phục.", collaborators: "Chỉ huy trưởng; Kỹ sư; HSE", note: DATASET_ID, createdById: userIds["construction-supervisor"] });
    rows.SupervisionInspectionSchedule.push({ id: makeId(pKey, "legacy-schedule"), projectId: project.id, supervisorId: userIds["construction-supervisor"], workItemId: makeId(pKey, "field-work", 3), workItemText: profile.works[2].name, plannedDate: daysFromReference(-6 + (index % 4)), shift: index % 2 === 0 ? "MORNING" : "AFTERNOON", startTime: "08:00", endTime: "10:00", inspectionContent: "Kiểm tra chuyển bước và hồ sơ chất lượng.", status: "COMPLETED", linkedVisitId: visitId });
  });

  const dossierId = makeId("weekly-dossier", "approved");
  rows.SupervisionWeeklyDossier.push({ id: dossierId, reportNumber: `${BUSINESS_PREFIX}-GST-2026-001`, weekStart: daysFromReference(-7), weekEnd: daysFromReference(-1), nextWeekStart: REFERENCE_DATE, nextWeekEnd: daysFromReference(6), place: "Hà Nội", recipientName: "Ban Giám đốc", recipientTitle: "Giám đốc", companyNameSnapshot: "Công ty xây dựng — Dữ liệu Test", templateVersion: "weekly-supervision-v1", status: "APPROVED", version: 1, lockVersion: 2, submittedAt: daysFromReference(-1), reviewedAt: REFERENCE_DATE, createdById: userIds["construction-supervisor"], reviewedById: userIds["supervision-head"] });
  ["MORNING", "AFTERNOON", "EVENING"].forEach((shift, index) => {
    rows.SupervisionWeeklyShiftSelection.push({ id: makeId("weekly-shift", "result", index + 1), dossierId, documentType: "RESULT", entryDate: daysFromReference(-7 + index), shift });
    rows.SupervisionWeeklyShiftSelection.push({ id: makeId("weekly-shift", "plan", index + 1), dossierId, documentType: "NEXT_WEEK_PLAN", entryDate: daysFromReference(index), shift });
  });
  projects.forEach((project, index) => {
    const pKey = projectKey(index);
    const profile = selectConstructionProfile(project.name);
    rows.SupervisionWeeklyEntry.push({ id: makeId(pKey, "weekly-entry"), dossierId, documentType: "RESULT", entryDate: daysFromReference(-7 + (index % 7)), shift: index % 2 === 0 ? "MORNING" : "AFTERNOON", sortOrder: index, inputMode: "PROJECT_WORK_ITEM", projectId: project.id, projectNameSnapshot: project.name, locationId: makeId(pKey, "location", "area"), locationNameSnapshot: profile.locationLabels[1], workItemId: makeId(pKey, "field-work", 3), workItemNameSnapshot: profile.works[2].name, displayText: `${project.code} — ${profile.works[2].name}`, inspectionContent: "Kiểm tra chất lượng, khối lượng và điều kiện chuyển bước.", result: index % 5 === 0 ? "Cần khắc phục biển nhận diện." : "Đạt yêu cầu.", commanderProposal: "Xác nhận nghiệm thu trong ngày." });
    rows.SupervisionWeeklyQuantity.push({ id: makeId(pKey, "weekly-quantity"), dossierId, sortOrder: index, projectId: project.id, projectNameSnapshot: project.name, locationId: makeId(pKey, "location", "area"), locationNameSnapshot: profile.locationLabels[1], workItemId: makeId(pKey, "field-work", 2), workItemNameSnapshot: profile.works[1].name, displayText: `${project.code} — Đối chiếu khối lượng`, unit: profile.works[1].unit, unitCode: profile.works[1].unit, reportedRaw: `${120 + index}`, reportedText: `${120 + index} ${profile.works[1].unit}`, reportedUnit: profile.works[1].unit, reportedUnitCode: profile.works[1].unit, reportedQuantity: 120 + index, verifiedRaw: `${118 + index}`, verifiedText: `${118 + index} ${profile.works[1].unit}`, verifiedUnit: profile.works[1].unit, verifiedUnitCode: profile.works[1].unit, verifiedQuantity: 118 + index, verificationMode: "MEASURED", varianceQuantity: -2, varianceReason: "Hiệu chỉnh theo biên bản đo đạc.", plannedProgress: "35%", conclusion: "Chấp nhận khối lượng đã hiệu chỉnh." });
    rows.SupervisionWeeklyTransition.push({ id: makeId(pKey, "weekly-transition"), dossierId, sortOrder: index, projectId: project.id, projectNameSnapshot: project.name, locationId: makeId(pKey, "location", "area"), locationNameSnapshot: profile.locationLabels[1], workItemId: makeId(pKey, "field-work", 3), workItemNameSnapshot: profile.works[2].name, displayText: `${project.code} — Chuyển bước ${profile.works[2].code}`, reportedQuantity: 120 + index, reportedText: `${120 + index}`, reportedRaw: `${120 + index}`, reportedUnit: profile.works[2].unit, reportedUnitCode: profile.works[2].unit, verifiedQuantity: 118 + index, verifiedText: `${118 + index}`, verifiedRaw: `${118 + index}`, verifiedUnit: profile.works[2].unit, verifiedUnitCode: profile.works[2].unit, verificationMode: "MEASURED", varianceQuantity: -2, varianceReason: "Sai số đo đạc trong giới hạn.", plannedProgress: "35%", currentStep: "Nghiệm thu nội bộ", proposedStep: "Thi công bước tiếp theo", conclusion: "Đủ điều kiện chuyển bước có kiểm soát." });
    rows.SupervisionWeeklyProgress.push({ id: makeId(pKey, "weekly-progress"), dossierId, sortOrder: index, projectId: project.id, projectNameSnapshot: project.name, locationId: makeId(pKey, "location", "area"), locationNameSnapshot: profile.locationLabels[1], workItemId: makeId(pKey, "field-work", 4), workItemNameSnapshot: profile.works[3].name, displayText: `${project.code} — Theo dõi tiến độ`, plannedProgress: `${35 + (index % 8)}%`, actualProgress: `${31 + (index % 7)}%`, delayValue: index % 4, delayType: index % 2 === 0 ? "DAY" : "PERCENT", delayReason: index % 4 ? "Điều phối mặt bằng và vật tư." : null });
    rows.SupervisionWeeklyObservation.push({ id: makeId(pKey, "weekly-observation"), dossierId, documentType: index % 2 === 0 ? "RESULT" : "NEXT_WEEK_PLAN", category: index % 3 === 0 ? "QUALITY" : index % 3 === 1 ? "PROGRESS" : "SAFETY", sortOrder: index, projectId: project.id, projectNameSnapshot: project.name, locationId: makeId(pKey, "location", "area"), locationNameSnapshot: profile.locationLabels[1], workItemId: makeId(pKey, "field-work", 5), workItemNameSnapshot: profile.works[4].name, displayText: `${project.code} — Ghi nhận giám sát`, content: "Duy trì kiểm tra đầu ca, khóa kế hoạch vật tư 48 giờ và cập nhật bằng chứng nghiệm thu." });
  });
  rows.SupervisionWeeklyAttachment.push({ id: makeId("weekly-dossier-attachment"), dossierId, documentId: makeId(projectKey(0), "document", "quality"), entryId: makeId(projectKey(0), "weekly-entry"), createdById: userIds["construction-supervisor"] });
  rows.SupervisionWeeklyRevision.push(
    { id: makeId("weekly-revision", 1), dossierId, actorId: userIds["construction-supervisor"], action: "SUBMIT", fromStatus: "DRAFT", toStatus: "SUBMITTED", version: 1, changedFields: "status,submittedAt", reason: DATASET_ID, createdAt: daysFromReference(-1) },
    { id: makeId("weekly-revision", 2), dossierId, actorId: userIds["supervision-head"], action: "APPROVE", fromStatus: "SUBMITTED", toStatus: "APPROVED", version: 2, changedFields: "status,reviewedAt", reason: "Đủ hồ sơ kiểm thử.", createdAt: REFERENCE_DATE },
  );

  const weeklyFileId = makeId("safety-weekly-file");
  const safetyPlanId = makeId("safety-plan", "approved");
  const safetyAssessmentId = makeId("safety-assessment", "approved");
  rows.SafetyWeeklyFile.push({ id: weeklyFileId, fileCode: `${BUSINESS_PREFIX}-AT-2026-W34`, officialDocumentNumber: `${BUSINESS_PREFIX}/ATLD-W34`, periodStart: daysFromReference(-7), periodEnd: daysFromReference(-1), createdById: userIds.staff, updatedById: userIds.staff });
  rows.SafetyReportPlan.push(
    { id: safetyPlanId, documentYear: 2026, sequenceNumber: 990001, documentNumber: `${BUSINESS_PREFIX}-KHAT-990001`, officialDocumentNumber: `${BUSINESS_PREFIX}/KH-ATLD-01`, title: "Kế hoạch kiểm tra ATLĐ - PCCC - VSMT toàn bộ công trình — Dữ liệu Test", createdDate: daysFromReference(-9), periodStart: daysFromReference(-7), periodEnd: daysFromReference(-1), legalBases: ["Luật An toàn, vệ sinh lao động", DATASET_ID], recipients: ["Ban Giám đốc", "Các Ban chỉ huy công trình"], purpose: "Kiểm tra điều kiện làm việc, PCCC, vệ sinh môi trường và khắc phục tồn tại.", note: DATASET_ID, status: "APPROVED", createdById: userIds.staff, submittedById: userIds.staff, submittedAt: daysFromReference(-8), approvedById: userIds.director, approvedAt: daysFromReference(-7), version: 1, weeklyFileId },
    { id: makeId("safety-plan", "revision"), documentYear: 2026, sequenceNumber: 990002, documentNumber: `${BUSINESS_PREFIX}-KHAT-990002`, officialDocumentNumber: `${BUSINESS_PREFIX}/KH-ATLD-02`, title: "Kế hoạch kiểm tra chuyên đề làm việc trên cao — Dữ liệu Test", createdDate: daysFromReference(-2), periodStart: REFERENCE_DATE, periodEnd: daysFromReference(6), legalBases: [DATASET_ID], recipients: ["Ban chỉ huy công trình"], purpose: "Kiểm tra chuyên đề làm việc trên cao.", note: DATASET_ID, status: "REVISION_REQUIRED", createdById: userIds.staff, submittedById: userIds.staff, submittedAt: daysFromReference(-1), revisionReason: "Bổ sung danh sách vị trí làm việc trên cao.", version: 2, weeklyFileId },
  );
  projects.forEach((project, index) => {
    const profile = selectConstructionProfile(project.name);
    rows.SafetyReportPlanEntry.push({ id: makeId("safety-plan-entry", projectKey(index)), planId: safetyPlanId, inspectionDate: daysFromReference(-7 + (index % 7)), shift: index % 3 === 0 ? "MORNING" : index % 3 === 1 ? "AFTERNOON" : "EVENING", projectId: project.id, projectNameSnapshot: project.name, constructionType: profile.constructionType, inspectionContent: "Kiểm tra biện pháp thi công, PPE, điện tạm, PCCC, lối đi và vệ sinh công trường.", trainingContent: "Nhắc việc đầu ca và nhận diện rủi ro theo công việc.", collaborators: "Chỉ huy trưởng; HSE; Kỹ sư hiện trường; Tổ trưởng thi công", location: project.location ?? profile.locationLabels[0], note: DATASET_ID, sortOrder: index, version: 1 });
  });
  rows.SafetyReportPlanEntry.push({ id: makeId("safety-plan-entry", "revision"), planId: makeId("safety-plan", "revision"), inspectionDate: daysFromReference(2), shift: "MORNING", projectId: projects[0].id, projectNameSnapshot: projects[0].name, constructionType: selectConstructionProfile(projects[0].name).constructionType, inspectionContent: "Kiểm tra chuyên đề làm việc trên cao.", trainingContent: "Sử dụng dây đai toàn thân và điểm neo.", collaborators: "HSE; Chỉ huy trưởng", location: projects[0].location, note: DATASET_ID, sortOrder: 0, version: 2 });

  rows.SafetySelfAssessmentReport.push(
    { id: safetyAssessmentId, weeklyFileId, sourcePlanId: safetyPlanId, documentYear: 2026, sequenceNumber: 990001, documentNumber: `${BUSINESS_PREFIX}-BCAT-990001`, officialDocumentNumber: `${BUSINESS_PREFIX}/BC-ATLD-01`, documentPlace: "Hà Nội", documentDate: REFERENCE_DATE, createdDate: daysFromReference(-1), title: "Báo cáo tự đánh giá ATLĐ - PCCC - VSMT — Dữ liệu Test", periodStart: daysFromReference(-7), periodEnd: daysFromReference(-1), legalBases: [DATASET_ID], recipients: ["Ban Giám đốc", "Phòng Kỹ thuật"], recipientText: "Ban Giám đốc; Phòng Kỹ thuật; Các Ban chỉ huy", reporterName: "Bùi Hải Yến", reporterTitle: "Cán bộ HSE Test", reporterDepartment: "Phòng An toàn - Chất lượng Test", internalNote: DATASET_ID, previousWeekRemediation: "Đã khắc phục 18/21 tồn tại, 03 nội dung đang theo dõi.", reinspectionConfirmation: "Các nội dung đã đóng có ảnh và biên bản kiểm tra lại.", managementRecommendation: "Duy trì kiểm tra điện tạm và làm việc trên cao theo ca.", otherOpinion: "Không.", status: "APPROVED", createdById: userIds.staff, submittedById: userIds.staff, submittedAt: daysFromReference(-1), approvedById: userIds.director, approvedAt: REFERENCE_DATE, version: 1 },
    { id: makeId("safety-assessment", "draft"), weeklyFileId, sourcePlanId: safetyPlanId, documentYear: 2026, sequenceNumber: 990002, documentNumber: `${BUSINESS_PREFIX}-BCAT-990002`, officialDocumentNumber: `${BUSINESS_PREFIX}/BC-ATLD-02`, documentPlace: "Hà Nội", documentDate: REFERENCE_DATE, createdDate: REFERENCE_DATE, title: "Báo cáo bổ sung chuyên đề an toàn — Dữ liệu Test", periodStart: REFERENCE_DATE, periodEnd: daysFromReference(6), legalBases: [DATASET_ID], recipients: ["Phòng Kỹ thuật"], internalNote: DATASET_ID, status: "DRAFT", createdById: userIds.staff, version: 1 },
  );
  projects.forEach((project, index) => {
    rows.SafetySelfAssessmentEntry.push({ id: makeId("safety-assessment-entry", projectKey(index)), reportId: safetyAssessmentId, inspectionDate: daysFromReference(-7 + (index % 7)), shift: index % 2 === 0 ? "MORNING" : "AFTERNOON", projectId: project.id, projectNameSnapshot: project.name, inspectionContent: "Kiểm tra PPE, điện tạm, PCCC, vệ sinh và khu vực nguy hiểm.", assessment: index % 5 === 0 ? "Còn tồn tại nhỏ cần theo dõi." : "Đạt yêu cầu.", recommendation: index % 5 === 0 ? "Bổ sung biển cảnh báo và hoàn tất trong ngày." : "Tiếp tục duy trì.", implementationResult: index % 5 === 0 ? "Đang thực hiện" : "Đã duy trì", sortOrder: index, version: 1 });
  });
  rows.SafetySelfAssessmentEntry.push({ id: makeId("safety-assessment-entry", "manual"), reportId: makeId("safety-assessment", "draft"), inspectionDate: REFERENCE_DATE, shift: "EVENING", projectId: null, projectNameSnapshot: "Khu vực kho trung tâm Test", customProjectName: "Kho trung tâm Test", inspectionContent: "Kiểm tra PCCC cuối ca.", assessment: "Đạt yêu cầu.", recommendation: "Duy trì lối thoát nạn thông thoáng.", implementationResult: "Đã thực hiện", sortOrder: 0, version: 1 });

  rows.SafetyReportApprovalHistory.push(
    { id: makeId("safety-history", 1), reportType: "PLAN", reportId: safetyPlanId, fromStatus: "DRAFT", toStatus: "PENDING_APPROVAL", actorId: userIds.staff, reason: DATASET_ID, approvalRequestId: makeId(projectKey(0), "approval", "safety"), occurredAt: daysFromReference(-8) },
    { id: makeId("safety-history", 2), reportType: "PLAN", reportId: safetyPlanId, fromStatus: "PENDING_APPROVAL", toStatus: "APPROVED", actorId: userIds.director, reason: "Đồng ý kế hoạch kiểm tra.", approvalRequestId: makeId(projectKey(0), "approval", "safety"), occurredAt: daysFromReference(-7) },
    { id: makeId("safety-history", 3), reportType: "SELF_ASSESSMENT", reportId: safetyAssessmentId, fromStatus: "DRAFT", toStatus: "PENDING_APPROVAL", actorId: userIds.staff, reason: DATASET_ID, occurredAt: daysFromReference(-1) },
    { id: makeId("safety-history", 4), reportType: "SELF_ASSESSMENT", reportId: safetyAssessmentId, fromStatus: "PENDING_APPROVAL", toStatus: "APPROVED", actorId: userIds.director, reason: "Đủ bằng chứng kiểm tra.", occurredAt: REFERENCE_DATE },
  );
  rows.SafetyReportAuditLog.push(
    { id: makeId("safety-audit", 1), reportType: "PLAN", reportId: safetyPlanId, action: "CREATE", beforeData: null, afterData: { datasetId: DATASET_ID, status: "DRAFT" }, actorId: userIds.staff, occurredAt: daysFromReference(-9), correlationId: `${DATASET_ID}:SAFETY:PLAN:CREATE` },
    { id: makeId("safety-audit", 2), reportType: "PLAN", reportId: safetyPlanId, action: "APPROVE", beforeData: { status: "PENDING_APPROVAL" }, afterData: { status: "APPROVED" }, actorId: userIds.director, occurredAt: daysFromReference(-7), correlationId: `${DATASET_ID}:SAFETY:PLAN:APPROVE` },
    { id: makeId("safety-audit", 3), reportType: "SELF_ASSESSMENT", reportId: safetyAssessmentId, action: "CREATE", beforeData: null, afterData: { datasetId: DATASET_ID, status: "DRAFT" }, actorId: userIds.staff, occurredAt: daysFromReference(-1), correlationId: `${DATASET_ID}:SAFETY:REPORT:CREATE` },
    { id: makeId("safety-audit", 4), reportType: "SELF_ASSESSMENT", reportId: safetyAssessmentId, action: "APPROVE", beforeData: { status: "PENDING_APPROVAL" }, afterData: { status: "APPROVED" }, actorId: userIds.director, occurredAt: REFERENCE_DATE, correlationId: `${DATASET_ID}:SAFETY:REPORT:APPROVE` },
  );

  return {
    rows,
    files,
    reusedTemplateIds,
    userIds,
    sequenceYears: {
      safetyPlan: SEQUENCE_YEAR,
      safetyAssessment: SEQUENCE_YEAR,
      employee: SEQUENCE_YEAR,
    },
  };
}
