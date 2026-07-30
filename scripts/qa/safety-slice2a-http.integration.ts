import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import { bootstrapSafetyOperationalV2 } from "../../src/lib/safety-inspection/checklist-operational-bootstrap";
import { getSafetyPermissionSet } from "../../src/lib/safety-inspection/permissions";
import { createSessionToken } from "../../src/lib/session-token";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";
import {
  createSafeQaPrismaClient,
  verifyQaPrismaFingerprint,
} from "./create-safe-qa-prisma-client";

type RequestEvidence = {
  request: string;
  actorRole: string;
  projectScope: string[];
  expectedStatus: number | number[];
  actualStatus: number;
};

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function waitForServer(baseUrl: string): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/safety-inspection/plans`);
      if (response.status === 401) return;
    } catch {
      // Server chưa sẵn sàng.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Next server QA không khởi động đúng hạn.");
}

async function main(): Promise<void> {
  const safe = assertSafeQaDatabase();
  requireCondition(
    safe.database.includes("safety_migration_rehearsal"),
    "HTTP suite chỉ chạy trên database rehearsal sạch.",
  );
  const qaUrl = process.env.QA_DATABASE_URL;
  if (!qaUrl) throw new Error("Thiếu QA_DATABASE_URL.");
  const runId = randomUUID();
  const suffix = runId.replaceAll("-", "").slice(0, 10);
  const client = createSafeQaPrismaClient(qaUrl);
  await verifyQaPrismaFingerprint(client.prisma, safe.qaDatabase);
  const evidence: RequestEvidence[] = [];
  let server: ChildProcess | null = null;
  const port = 33000 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const users = {
      creator: await client.prisma.user.create({
        data: {
          email: `s2a-creator-${suffix}@qa.invalid`,
          username: `s2a_creator_${suffix}`,
          password: "QA_ONLY_NOT_A_REAL_CREDENTIAL",
          name: "QA HSE Creator",
          role: "STAFF",
        },
      }),
      projectA: await client.prisma.user.create({
        data: {
          email: `s2a-a-${suffix}@qa.invalid`,
          username: `s2a_a_${suffix}`,
          password: "QA_ONLY_NOT_A_REAL_CREDENTIAL",
          name: "QA HSE Project A",
          role: "STAFF",
        },
      }),
      projectB: await client.prisma.user.create({
        data: {
          email: `s2a-b-${suffix}@qa.invalid`,
          username: `s2a_b_${suffix}`,
          password: "QA_ONLY_NOT_A_REAL_CREDENTIAL",
          name: "QA HSE Project B",
          role: "STAFF",
        },
      }),
      director: await client.prisma.user.create({
        data: {
          email: `s2a-director-${suffix}@qa.invalid`,
          username: `s2a_director_${suffix}`,
          password: "QA_ONLY_NOT_A_REAL_CREDENTIAL",
          name: "QA Director",
          role: "DIRECTOR",
        },
      }),
      admin: await client.prisma.user.create({
        data: {
          email: `s2a-admin-${suffix}@qa.invalid`,
          username: `s2a_admin_${suffix}`,
          password: "QA_ONLY_NOT_A_REAL_CREDENTIAL",
          name: "QA Admin",
          role: "ADMIN",
        },
      }),
    };
    const projectA = await client.prisma.project.create({
      data: {
        code: `S2A-A-${suffix}`,
        name: "QA Safety 2A Project A",
        status: "ACTIVE",
      },
    });
    const projectB = await client.prisma.project.create({
      data: {
        code: `S2A-B-${suffix}`,
        name: "QA Safety 2A Project B SECRET",
        status: "ACTIVE",
      },
    });
    await client.prisma.projectMember.createMany({
      data: [
        { projectId: projectA.id, userId: users.creator.id, role: "HSE" },
        { projectId: projectB.id, userId: users.creator.id, role: "HSE" },
        { projectId: projectA.id, userId: users.projectA.id, role: "HSE" },
        { projectId: projectB.id, userId: users.projectB.id, role: "HSE" },
      ],
    });
    const adminActor = {
      id: users.admin.id,
      permissions: getSafetyPermissionSet({
        systemRole: users.admin.role,
        projectRole: null,
      }),
      projectScope: { kind: "NO_PROJECTS" as const },
      isCommandActor: false,
      unitNames: [] as const,
    };
    const bootstrapOne = await bootstrapSafetyOperationalV2(
      client.prisma,
      adminActor,
      {
        correlationId: `${runId}-bootstrap-1`,
        processName: "safety-slice2a-http.integration.ts",
      },
    );
    const bootstrapTwo = await bootstrapSafetyOperationalV2(
      client.prisma,
      adminActor,
      {
        correlationId: `${runId}-bootstrap-2`,
        processName: "safety-slice2a-http.integration.ts",
      },
    );
    requireCondition(
      bootstrapOne.created && !bootstrapTwo.created,
      "Bootstrap không idempotent.",
    );
    const template = await client.prisma.safetyChecklistTemplate.findUniqueOrThrow({
      where: {
        code_version: { code: "SAFETY_COMPANY_V1", version: 2 },
      },
    });
    await client.prisma.safetyChecklistTemplate.update({
      where: { id: template.id },
      data: { canonicalHash: "0".repeat(64) },
    });
    let mismatchBlocked = false;
    try {
      await bootstrapSafetyOperationalV2(client.prisma, adminActor, {
        correlationId: `${runId}-bootstrap-mismatch`,
        processName: "safety-slice2a-http.integration.ts",
      });
    } catch {
      mismatchBlocked = true;
    }
    await client.prisma.safetyChecklistTemplate.update({
      where: { id: template.id },
      data: { canonicalHash: bootstrapOne.canonicalHash },
    });
    requireCondition(mismatchBlocked, "Bootstrap khác hash không bị chặn.");

    const nextBin = path.resolve("node_modules/next/dist/bin/next");
    server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: "ignore",
      env: {
        ...process.env,
        PORT: String(port),
        DATABASE_URL: qaUrl,
      },
    });
    await waitForServer(baseUrl);

    const tokens = Object.fromEntries(
      Object.entries(users).map(([key, user]) => [
        key,
        createSessionToken(user.id),
      ]),
    ) as Record<keyof typeof users, string>;
    const call = async (
      actor: keyof typeof users | null,
      scope: string[],
      method: string,
      pathname: string,
      body: unknown,
      expected: number | number[],
      correlationId = `${runId}-${evidence.length + 1}`,
    ) => {
      const response = await fetch(`${baseUrl}${pathname}`, {
        method,
        headers: {
          "content-type": "application/json",
          origin: baseUrl,
          "x-correlation-id": correlationId,
          ...(actor
            ? { cookie: `auth_session=${tokens[actor]}` }
            : {}),
        },
        ...(body === null ? {} : { body: JSON.stringify(body) }),
      });
      const text = await response.text();
      evidence.push({
        request: `${method} ${pathname}`,
        actorRole: actor ? users[actor].role : "UNAUTHENTICATED",
        projectScope: scope,
        expectedStatus: expected,
        actualStatus: response.status,
      });
      const expectedList = Array.isArray(expected) ? expected : [expected];
      requireCondition(
        expectedList.includes(response.status),
        `${method} ${pathname}: expected ${expectedList.join("/")} actual=${response.status} body=${text}`,
      );
      requireCondition(
        !text.includes("Prisma") &&
          !text.includes("P2002") &&
          !text.includes("stack"),
        "HTTP response làm lộ lỗi nội bộ.",
      );
      const parsed = text
        ? (JSON.parse(text) as Record<string, unknown>)
        : {};
      return { ...parsed, __status: response.status };
    };

    await call(null, [], "GET", "/api/safety-inspection/plans", null, 401);
    const rawMutation = async (
      label: string,
      headers: Record<string, string>,
      body: string,
      expectedStatus: number,
    ) => {
      const response = await fetch(
        `${baseUrl}/api/safety-inspection/plans`,
        {
          method: "POST",
          headers: {
            cookie: `auth_session=${tokens.creator}`,
            ...headers,
          },
          body,
        },
      );
      evidence.push({
        request: label,
        actorRole: users.creator.role,
        projectScope: [projectA.id, projectB.id],
        expectedStatus,
        actualStatus: response.status,
      });
      requireCondition(
        response.status === expectedStatus,
        `${label}: expected=${expectedStatus} actual=${response.status}`,
      );
    };
    await rawMutation(
      "POST plans cross-origin",
      {
        "content-type": "application/json",
        origin: "https://attacker.invalid",
      },
      "{}",
      403,
    );
    await rawMutation(
      "POST plans malformed-json",
      { "content-type": "application/json", origin: baseUrl },
      "{",
      400,
    );
    await rawMutation(
      "POST plans wrong-content-type",
      { "content-type": "text/plain", origin: baseUrl },
      "{}",
      415,
    );
    await rawMutation(
      "POST plans oversized",
      { "content-type": "application/json", origin: baseUrl },
      JSON.stringify({ value: "x".repeat(300_000) }),
      413,
    );
    const checklist = await call(
      "creator",
      [projectA.id, projectB.id],
      "GET",
      "/api/safety-inspection/checklists/active?constructionType=BUILDING",
      null,
      200,
    );
    const checklistData = checklist.data as {
      sections: Array<{ items: Array<{ id: string }> }>;
    };
    const itemIds = checklistData.sections.flatMap((section) =>
      section.items.map((item) => item.id),
    );
    const createdPlan = await call(
      "creator",
      [projectA.id, projectB.id],
      "POST",
      "/api/safety-inspection/plans",
      {
        clientMutationId: `${runId}-plan-create`,
        documentYear: 2026,
        weekStart: "2026-07-27",
        weekEnd: "2026-08-02",
        isWeekException: false,
        createdDate: "2026-07-27",
        legalBases: [],
        recipients: [],
        actorId: users.admin.id,
        role: "ADMIN",
        projectScope: ["ALL"],
      },
      201,
    );
    const plan = createdPlan.data as { id: string; version: number };
    const planRecord = await client.prisma.safetyInspectionPlan.findUniqueOrThrow({
      where: { id: plan.id },
    });
    requireCondition(
      planRecord.createdById === users.creator.id,
      "Actor giả mạo đã ảnh hưởng mutation.",
    );

    const scheduleBody = (
      projectId: string,
      expectedPlanVersion: number,
      mutation: string,
    ) => ({
      clientMutationId: mutation,
      expectedPlanVersion,
      projectId,
      scheduledDate: "2026-07-28",
      shift: "MORNING",
      kind: "INSPECTION",
      constructionType: "BUILDING",
      sortOrder: 0,
      collaboratorUserIds: [],
      checklistItemIds: itemIds.slice(0, 3),
      actorId: users.admin.id,
      role: "ADMIN",
    });
    const scheduleAResponse = await call(
      "creator",
      [projectA.id, projectB.id],
      "POST",
      `/api/safety-inspection/plans/${plan.id}/schedules`,
      scheduleBody(projectA.id, 1, `${runId}-schedule-a`),
      201,
    );
    const scheduleA = scheduleAResponse.data as {
      scheduleId: string;
      scheduleVersion: number;
      planVersion: number;
    };
    const scheduleReplay = await call(
      "creator",
      [projectA.id, projectB.id],
      "POST",
      `/api/safety-inspection/plans/${plan.id}/schedules`,
      scheduleBody(projectA.id, 1, `${runId}-schedule-a`),
      201,
    );
    requireCondition(
      (scheduleReplay.data as { scheduleId: string }).scheduleId ===
        scheduleA.scheduleId &&
        (await client.prisma.safetyInspectionSchedule.count({
          where: { planId: plan.id, projectId: projectA.id },
        })) === 1,
      "Retry aggregate schedule không trả đúng biên nhận bất biến.",
    );
    const beforeRollbackCount =
      await client.prisma.safetyInspectionSchedule.count({
        where: { planId: plan.id },
      });
    await call(
      "creator",
      [projectA.id, projectB.id],
      "POST",
      `/api/safety-inspection/plans/${plan.id}/schedules`,
      {
        ...scheduleBody(
          projectA.id,
          2,
          `${runId}-schedule-invalid-checklist`,
        ),
        checklistItemIds: ["checklist-item-khong-ton-tai"],
      },
      400,
    );
    await call(
      "creator",
      [projectA.id, projectB.id],
      "POST",
      `/api/safety-inspection/plans/${plan.id}/schedules`,
      {
        ...scheduleBody(
          projectA.id,
          2,
          `${runId}-schedule-invalid-collaborator`,
        ),
        collaboratorUserIds: [users.projectB.id],
      },
      400,
    );
    requireCondition(
      (await client.prisma.safetyInspectionSchedule.count({
        where: { planId: plan.id },
      })) === beforeRollbackCount &&
        (
          await client.prisma.safetyInspectionPlan.findUniqueOrThrow({
            where: { id: plan.id },
          })
        ).version === 2,
      "Schedule/configuration lỗi không rollback toàn aggregate.",
    );
    await call(
      "creator",
      [projectA.id, projectB.id],
      "POST",
      `/api/safety-inspection/plans/${plan.id}/schedules`,
      scheduleBody(projectB.id, 2, `${runId}-schedule-b`),
      201,
    );
    const scopedPlan = await call(
      "projectA",
      [projectA.id],
      "GET",
      `/api/safety-inspection/plans/${plan.id}`,
      null,
      200,
    );
    const scopedText = JSON.stringify(scopedPlan);
    requireCondition(
      scopedText.includes(projectA.id) &&
        !scopedText.includes(projectB.id) &&
        !scopedText.includes("Project B SECRET") &&
        scopedText.includes("Nội dung được giới hạn theo quyền"),
      "Plan DTO làm lộ dữ liệu ngoài scope.",
    );
    await call(
      "projectA",
      [projectA.id],
      "POST",
      `/api/safety-inspection/plans/${plan.id}/schedules`,
      scheduleBody(projectB.id, 3, `${runId}-cross-project-schedule`),
      404,
    );
    const updateBody = {
      ...scheduleBody(projectA.id, 3, `${runId}-schedule-update-a`),
      expectedScheduleVersion: 1,
      shift: "AFTERNOON",
    };
    const scheduleCompetition = await Promise.all([
      call(
        "creator",
        [projectA.id, projectB.id],
        "PATCH",
        `/api/safety-inspection/schedules/${scheduleA.scheduleId}`,
        updateBody,
        [200, 409],
      ),
      call(
        "creator",
        [projectA.id, projectB.id],
        "PATCH",
        `/api/safety-inspection/schedules/${scheduleA.scheduleId}`,
        {
          ...updateBody,
          clientMutationId: `${runId}-schedule-update-b`,
          shift: "EVENING",
        },
        [200, 409],
      ),
    ]);
    requireCondition(
      scheduleCompetition
        .map((response) => response.__status)
        .sort()
        .join(",") === "200,409",
      "Cạnh tranh aggregate schedule không tạo đúng một version conflict.",
    );
    await call(
      "creator",
      [projectA.id, projectB.id],
      "POST",
      `/api/safety-inspection/plans/${plan.id}/submit`,
      {
        clientMutationId: `${runId}-submit`,
        expectedVersion: 4,
        decision: "SUBMIT",
      },
      200,
    );
    const submittedEnvelopes =
      await client.prisma.approvalRequest.findMany({
        where: {
          sourceType: "SAFETY_INSPECTION_PLAN",
          sourceId: plan.id,
        },
        orderBy: { projectId: "asc" },
      });
    requireCondition(
      submittedEnvelopes.length === 2,
      "Submit plan chưa tạo đủ approval envelope.",
    );
    const sabotagedEnvelope = submittedEnvelopes[1];
    await client.prisma.approvalRequest.update({
      where: { id: sabotagedEnvelope.id },
      data: { sourceId: `${plan.id}-qa-missing-envelope` },
    });
    await call(
      "director",
      ["ALL_PROJECTS"],
      "POST",
      `/api/safety-inspection/plans/${plan.id}/review`,
      {
        clientMutationId: `${runId}-approve-partial-blocked`,
        expectedVersion: 5,
        decision: "APPROVE",
      },
      409,
    );
    requireCondition(
      (
        await client.prisma.safetyInspectionPlan.findUniqueOrThrow({
          where: { id: plan.id },
        })
      ).status === "PENDING_APPROVAL" &&
        (
          await client.prisma.approvalRequest.findUniqueOrThrow({
            where: { id: submittedEnvelopes[0].id },
          })
        ).status === "PENDING",
      "Approval thiếu envelope không rollback toàn aggregate.",
    );
    await client.prisma.approvalRequest.update({
      where: { id: sabotagedEnvelope.id },
      data: { sourceId: plan.id },
    });
    await call(
      "director",
      ["ALL_PROJECTS"],
      "POST",
      `/api/safety-inspection/plans/${plan.id}/review`,
      {
        clientMutationId: `${runId}-approve`,
        expectedVersion: 5,
        decision: "APPROVE",
      },
      200,
    );
    const approvedAggregate =
      await client.prisma.safetyInspectionPlan.findUniqueOrThrow({
        where: { id: plan.id },
      });
    const approvalEnvelopes = await client.prisma.approvalRequest.findMany({
      where: {
        sourceType: "SAFETY_INSPECTION_PLAN",
        sourceId: plan.id,
      },
    });
    requireCondition(
      approvedAggregate.status === "APPROVED" &&
        approvalEnvelopes.length === 2 &&
        approvalEnvelopes.every((item) => item.status === "APPROVED"),
      "Approval envelope làm lệch trạng thái Safety aggregate.",
    );

    const started = await call(
      "creator",
      [projectA.id, projectB.id],
      "POST",
      `/api/safety-inspection/schedules/${scheduleA.scheduleId}/start`,
      {
        clientMutationId: `${runId}-start`,
        expectedVersion: scheduleA.scheduleVersion + 1,
        occurredAt: "2026-07-28T02:00:00.000Z",
        shift: "MORNING",
      },
      201,
    );
    const session = started.data as { sessionId: string };
    await call(
      "creator",
      [projectA.id, projectB.id],
      "POST",
      `/api/safety-inspection/sessions/${session.sessionId}/results`,
      {
        clientMutationId: `${runId}-outside-template`,
        expectedSessionVersion: 1,
        expectedResultVersion: null,
        checklistItemId: "checklist-item-khong-ton-tai",
        status: "PASS",
        note: null,
        notApplicableReason: null,
        inspectedAt: "2026-07-28T02:05:00.000Z",
        findings: [],
      },
      404,
    );
    await call(
      "creator",
      [projectA.id, projectB.id],
      "POST",
      `/api/safety-inspection/sessions/${session.sessionId}/results`,
      {
        clientMutationId: `${runId}-client-finding-code`,
        expectedSessionVersion: 1,
        expectedResultVersion: null,
        checklistItemId: itemIds[0],
        status: "FAIL",
        note: null,
        notApplicableReason: null,
        inspectedAt: "2026-07-28T02:08:00.000Z",
        findings: [
          {
            code: "CLIENT-MUST-NOT-CONTROL",
            description: "Payload thử giả mã tồn tại",
            severity: "MEDIUM",
            workSuspended: false,
          },
        ],
      },
      400,
    );
    const failBody = {
      clientMutationId: `${runId}-result-fail`,
      expectedSessionVersion: 1,
      expectedResultVersion: null,
      checklistItemId: itemIds[0],
      status: "FAIL",
      note: null,
      notApplicableReason: null,
      inspectedAt: "2026-07-28T02:10:00.000Z",
      findings: [1, 2].map((index) => ({
        localReference: `S2A-LOCAL-${suffix}-${index}`,
        description: `Tồn tại QA ${index}`,
        severity: "MEDIUM",
        workSuspended: false,
        location: `Vị trí ${index}`,
      })),
      actorId: users.admin.id,
      role: "ADMIN",
    };
    const [retryOne, retryTwo] = await Promise.all([
      call(
        "creator",
        [projectA.id, projectB.id],
        "POST",
        `/api/safety-inspection/sessions/${session.sessionId}/results`,
        failBody,
        200,
      ),
      call(
        "creator",
        [projectA.id, projectB.id],
        "POST",
        `/api/safety-inspection/sessions/${session.sessionId}/results`,
        failBody,
        200,
      ),
    ]);
    requireCondition(
      JSON.stringify(retryOne).includes(
        (retryTwo.data as { resultId: string }).resultId,
      ),
      "HTTP idempotency replay không nhất quán.",
    );
    const resultData = retryOne.data as {
      findingIds: string[];
      findingCodes: string[];
    };
    requireCondition(
      resultData.findingCodes.length === 2 &&
        new Set(resultData.findingCodes).size === 2 &&
        resultData.findingCodes.every((code) =>
          /^ATLD-2026-\d{6}$/.test(code),
        ),
      "Mã finding không do server sinh duy nhất theo định dạng cấu hình.",
    );
    await call(
      "projectB",
      [projectB.id],
      "GET",
      `/api/safety-inspection/findings/${resultData.findingIds[0]}`,
      null,
      404,
    );
    await call(
      "admin",
      ["ALL_PROJECTS"],
      "POST",
      `/api/safety-inspection/findings/${resultData.findingIds[0]}/assign`,
      {
        clientMutationId: `${runId}-admin-assign`,
        expectedVersion: 1,
        assigneeUnit: "BCH",
        requestText: "Khắc phục",
      },
      404,
    );
    const competingBase = {
      expectedSessionVersion: 2,
      expectedResultVersion: null,
      status: "PASS",
      note: null,
      notApplicableReason: null,
      inspectedAt: "2026-07-28T02:20:00.000Z",
      findings: [],
    };
    const competing = await Promise.all([
      call(
        "creator",
        [projectA.id, projectB.id],
        "POST",
        `/api/safety-inspection/sessions/${session.sessionId}/results`,
        {
          ...competingBase,
          clientMutationId: `${runId}-version-a`,
          checklistItemId: itemIds[1],
        },
        [200, 409],
      ),
      call(
        "creator",
        [projectA.id, projectB.id],
        "POST",
        `/api/safety-inspection/sessions/${session.sessionId}/results`,
        {
          ...competingBase,
          clientMutationId: `${runId}-version-b`,
          checklistItemId: itemIds[2],
        },
        [200, 409],
      ),
    ]);
    requireCondition(
      competing.map((item) => item.__status).sort().join(",") === "200,409",
      "Hai HTTP request cùng expectedVersion không tạo đúng một conflict.",
    );
    await call(
      "creator",
      [projectA.id, projectB.id],
      "POST",
      `/api/safety-inspection/sessions/${session.sessionId}/complete`,
      {
        clientMutationId: `${runId}-complete`,
        expectedVersion: 3,
      },
      200,
      `${runId}-complete-correlation`,
    );
    await call(
      "creator",
      [projectA.id, projectB.id],
      "POST",
      `/api/safety-inspection/sessions/${session.sessionId}/results`,
      {
        ...failBody,
        clientMutationId: `${runId}-after-complete`,
        expectedSessionVersion: 3,
        checklistItemId: itemIds[1],
        status: "PASS",
        findings: [],
      },
      409,
    );
    requireCondition(
      (await client.prisma.safetyAuditLog.count({
        where: { correlationId: `${runId}-complete-correlation` },
      })) === 1,
      "Audit không lưu correlationId HTTP.",
    );
    requireCondition(
      (await client.prisma.safetyChecklistTemplate.count({
        where: { code: "SAFETY_COMPANY_V1", isActive: true },
      })) === 1,
      "Không bảo đảm single-active checklist.",
    );

    const manifest = {
      runId,
      database: safe.database,
      checklistBootstrap: {
        firstCreated: bootstrapOne.created,
        secondCreated: bootstrapTwo.created,
        hashMismatchBlocked: mismatchBlocked,
        canonicalHash: bootstrapOne.canonicalHash,
      },
      requests: evidence,
      assertions: {
        unauthenticatedRejected: true,
        tamperedActorIgnored: true,
        crossProjectPlanFiltered: true,
        crossProjectFindingDenied: true,
        checklistActiveRead: true,
        planSubmitApproveRealRoles: true,
        failCreatesMultipleFindings: resultData.findingIds.length === 2,
        concurrentIdempotencyReplay: true,
        concurrentVersionConflictSafe: true,
        checklistOutsideTemplateRejected: true,
        crossProjectMutationDenied: true,
        completedSessionLocked: true,
        adminCannotEditFinding: true,
        approvalEnvelopeFollowsAggregate: true,
        approvalEnvelopeFailureRollsBackAggregate: true,
        auditCorrelationId: true,
        noPrismaOrStackLeak: true,
        bootstrapIdempotentAndHashSafe: true,
        operationalChecklistV2Active: true,
        scheduleAggregateAtomicRollback: true,
        scheduleAggregateIdempotentReplay: true,
        scheduleAggregateVersionConflict: true,
        findingCodeServerGenerated: true,
        malformedJsonReturns400: true,
        wrongContentTypeReturns415: true,
        oversizedPayloadReturns413: true,
        crossOriginMutationRejected: true,
        sameOriginMutationAccepted: true,
      },
      cleanup: "DATABASE_REHEARSAL_DROP",
      completedAtUtc: new Date().toISOString(),
    };
    const artifactPath = path.resolve(
      "artifacts/safety-inspection-template-analysis/slice2a5-runtime-request-manifest.json",
    );
    await writeFile(
      artifactPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    console.log(
      JSON.stringify({
        runId,
        database: safe.database,
        requestCount: evidence.length,
        assertions: manifest.assertions,
        artifactPath,
      }),
    );
  } finally {
    if (server && !server.killed) server.kill();
    await client.close();
  }
}

void main();
