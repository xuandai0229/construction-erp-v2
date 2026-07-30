import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import {
  assertCanUploadSafetyEvidence,
  assertCanViewSafetyEvidence,
  createPrismaSafetyEvidenceTraceRepository,
} from "../../src/lib/safety-inspection/evidence-permissions";
import { cancelSafetyEvidence } from "../../src/lib/safety-inspection/evidence-transactions";
import type { SafetyServerActor } from "../../src/lib/safety-inspection/mutation-actor";
import { getSafetyPermissionSet } from "../../src/lib/safety-inspection/permissions";
import {
  cancelSafetyReportEntryWithScope,
  cancelSafetyScheduleWithScope,
  createSafetyReportEntryWithScope,
  createSafetyScheduleWithScope,
} from "../../src/lib/safety-inspection/scope-transactions";
import { createSafetyInspectionSession } from "../../src/lib/safety-inspection/session-transactions";
import {
  activateSafetyChecklistTemplate,
  activateSafetyDocumentTemplate,
} from "../../src/lib/safety-inspection/template-transactions";
import {
  recordSafetyReinspection,
  saveInspectionResultWithFinding,
  type SaveInspectionResultInput,
} from "../../src/lib/safety-inspection/transactions";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";
import {
  createSafeQaPrismaClient,
  verifyQaPrismaFingerprint,
} from "./create-safe-qa-prisma-client";

type IntegrationManifest = {
  runId: string;
  database: string;
  fixtureIds: Record<string, string[]>;
  assertions: Record<string, boolean>;
  fixtureCleanup: "DATABASE_REHEARSAL_DROP";
  completedAtUtc: string | null;
};

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function addId(
  manifest: IntegrationManifest,
  category: string,
  id: string,
): void {
  manifest.fixtureIds[category] ??= [];
  manifest.fixtureIds[category].push(id);
}

function actor(input: {
  id: string;
  systemRole:
    | "ADMIN"
    | "DIRECTOR"
    | "DEPUTY_DIRECTOR"
    | "CHIEF_COMMANDER"
    | "MANAGER"
    | "ENGINEER"
    | "STAFF"
    | "SUPERVISION_HEAD"
    | "CONSTRUCTION_SUPERVISOR";
  projectRole:
    | "PROJECT_MANAGER"
    | "SITE_COMMANDER"
    | "CHIEF_COMMANDER"
    | "ASSISTANT_COMMANDER"
    | "QA_QC"
    | "HSE"
    | "SUPERVISOR"
    | "VIEWER"
    | null;
  projectIds: readonly string[];
  isCommandActor?: boolean;
  unitNames?: readonly string[];
}): SafetyServerActor {
  return {
    id: input.id,
    permissions: getSafetyPermissionSet({
      systemRole: input.systemRole,
      projectRole: input.projectRole,
    }),
    projectScope: {
      kind: "PROJECT_IDS",
      projectIds: input.projectIds,
    },
    isCommandActor: input.isCommandActor ?? false,
    unitNames: input.unitNames ?? [],
  };
}

async function main(): Promise<void> {
  const safe = assertSafeQaDatabase();
  const qaUrl = process.env.QA_DATABASE_URL;
  if (!qaUrl) throw new Error("QA_DATABASE_URL is required");
  requireCondition(
    safe.database.includes("safety_migration_rehearsal"),
    "Integration Lát 1.5 chỉ chạy trên database rehearsal.",
  );
  const runId = randomUUID();
  const manifest: IntegrationManifest = {
    runId,
    database: safe.database,
    fixtureIds: {},
    assertions: {},
    fixtureCleanup: "DATABASE_REHEARSAL_DROP",
    completedAtUtc: null,
  };
  const { prisma, close } = createSafeQaPrismaClient(qaUrl);
  const raceClientOne = createSafeQaPrismaClient(qaUrl);
  const raceClientTwo = createSafeQaPrismaClient(qaUrl);
  await verifyQaPrismaFingerprint(prisma, safe.qaDatabase);
  await verifyQaPrismaFingerprint(raceClientOne.prisma, safe.qaDatabase);
  await verifyQaPrismaFingerprint(raceClientTwo.prisma, safe.qaDatabase);

  try {
    const suffix = runId.replaceAll("-", "").slice(0, 10);
    const users = await Promise.all(
      [
        ["inspector", "STAFF"],
        ["reviewer", "STAFF"],
        ["commander", "CHIEF_COMMANDER"],
        ["admin", "ADMIN"],
      ].map(([name, role]) =>
        prisma.user.create({
          data: {
            email: `safety15-${name}-${suffix}@qa.invalid`,
            username: `s15_${name}_${suffix}`,
            password: "QA_ONLY_NOT_A_REAL_CREDENTIAL",
            name: `QA Safety 1.5 ${name}`,
            role:
              role as
                | "STAFF"
                | "CHIEF_COMMANDER"
                | "ADMIN",
          },
        }),
      ),
    );
    const [inspector, reviewer, commander, admin] = users;
    users.forEach((user) => addId(manifest, "users", user.id));

    const [projectA, projectB] = await Promise.all([
      prisma.project.create({
        data: {
          code: `S15-A-${suffix}`,
          name: "QA Safety Project A",
          status: "ACTIVE",
        },
      }),
      prisma.project.create({
        data: {
          code: `S15-B-${suffix}`,
          name: "QA Safety Project B",
          status: "ACTIVE",
        },
      }),
    ]);
    [projectA, projectB].forEach((project) =>
      addId(manifest, "projects", project.id),
    );
    const memberships = await Promise.all([
      prisma.projectMember.create({
        data: {
          projectId: projectA.id,
          userId: inspector.id,
          role: "HSE",
        },
      }),
      prisma.projectMember.create({
        data: {
          projectId: projectA.id,
          userId: reviewer.id,
          role: "HSE",
        },
      }),
      prisma.projectMember.create({
        data: {
          projectId: projectA.id,
          userId: commander.id,
          role: "SITE_COMMANDER",
        },
      }),
      prisma.projectMember.create({
        data: {
          projectId: projectB.id,
          userId: commander.id,
          role: "SITE_COMMANDER",
        },
      }),
    ]);
    memberships.forEach((row) => addId(manifest, "memberships", row.id));

    const inspectorActor = actor({
      id: inspector.id,
      systemRole: "STAFF",
      projectRole: "HSE",
      projectIds: [projectA.id],
    });
    const reviewerActor = actor({
      id: reviewer.id,
      systemRole: "STAFF",
      projectRole: "HSE",
      projectIds: [projectA.id],
    });
    const commanderActor = actor({
      id: commander.id,
      systemRole: "CHIEF_COMMANDER",
      projectRole: "SITE_COMMANDER",
      projectIds: [projectA.id, projectB.id],
      isCommandActor: true,
      unitNames: ["BCH A"],
    });
    const adminActor = actor({
      id: admin.id,
      systemRole: "ADMIN",
      projectRole: null,
      projectIds: [projectA.id, projectB.id],
    });

    const checklistTemplates = await Promise.all([
      prisma.safetyChecklistTemplate.create({
        data: {
          code: `S15-CHECK-${suffix}`,
          name: "QA checklist version 1",
          version: 1,
          effectiveFrom: new Date("2026-07-01T00:00:00.000Z"),
          createdById: admin.id,
        },
      }),
      prisma.safetyChecklistTemplate.create({
        data: {
          code: `S15-CHECK-${suffix}`,
          name: "QA checklist version 2",
          version: 2,
          effectiveFrom: new Date("2026-07-01T00:00:00.000Z"),
          createdById: admin.id,
        },
      }),
    ]);
    checklistTemplates.forEach((row) =>
      addId(manifest, "checklistTemplates", row.id),
    );
    await Promise.all([
      activateSafetyChecklistTemplate(raceClientOne.prisma, adminActor, {
        templateId: checklistTemplates[0].id,
        clientMutationId: `${runId}-activate-check-0`,
      }),
      activateSafetyChecklistTemplate(raceClientTwo.prisma, adminActor, {
        templateId: checklistTemplates[1].id,
        clientMutationId: `${runId}-activate-check-1`,
      }),
    ]);
    const activeChecklistTemplates =
      await prisma.safetyChecklistTemplate.findMany({
        where: {
          code: checklistTemplates[0].code,
          isActive: true,
        },
      });
    requireCondition(
      activeChecklistTemplates.length === 1,
      "Có nhiều hơn một checklist active cùng code.",
    );
    manifest.assertions.singleActiveChecklist = true;
    const activeChecklist = activeChecklistTemplates[0];

    const section = await prisma.safetyChecklistSection.create({
      data: {
        templateId: activeChecklist.id,
        code: "A",
        title: "QA hồ sơ và hiện trường",
        sortOrder: 1,
        constructionTypes: ["BUILDING"],
      },
    });
    addId(manifest, "checklistSections", section.id);
    const checklistItems = await Promise.all(
      ["PASS", "RACE", "FAIL", "LOCKED"].map((code, index) =>
        prisma.safetyChecklistItem.create({
          data: {
            sectionId: section.id,
            code,
            sourceText: `QA sourceText ${code}`,
            normalizedLabel: `QA ${code}`,
            sortOrder: index + 1,
          },
        }),
      ),
    );
    checklistItems.forEach((row) => addId(manifest, "checklistItems", row.id));

    const documentTemplates = await Promise.all(
      [1, 2].map((version) =>
        prisma.safetyDocumentTemplate.create({
          data: {
            templateType: "WEEKLY_PLAN",
            version,
            sourceFileName: `qa-source-${version}.doc`,
            sourceSha256: `${version}`.repeat(64),
            sourceSizeBytes: version,
            exportDocxFileName: `qa-export-${version}.docx`,
            exportDocxSha256: `${version + 2}`.repeat(64),
            exportDocxSizeBytes: version,
            storagePath: `qa/safety/${suffix}/${version}`,
            baselinePageCount: 1,
            snapshotAt: new Date(),
            snapshotCreatedBy: "QA Slice 1.5",
            createdById: admin.id,
          },
        }),
      ),
    );
    documentTemplates.forEach((row) =>
      addId(manifest, "documentTemplates", row.id),
    );
    await Promise.all([
      activateSafetyDocumentTemplate(raceClientOne.prisma, adminActor, {
        templateId: documentTemplates[0].id,
        clientMutationId: `${runId}-activate-doc-0`,
      }),
      activateSafetyDocumentTemplate(raceClientTwo.prisma, adminActor, {
        templateId: documentTemplates[1].id,
        clientMutationId: `${runId}-activate-doc-1`,
      }),
    ]);
    requireCondition(
      (await prisma.safetyDocumentTemplate.count({
        where: { templateType: "WEEKLY_PLAN", isActive: true },
      })) === 1,
      "Có nhiều hơn một document template active cùng loại.",
    );
    manifest.assertions.singleActiveDocumentTemplate = true;

    const plan = await prisma.safetyInspectionPlan.create({
      data: {
        documentYear: 2026,
        sequenceNumber: 991,
        weekStart: new Date("2026-07-27T00:00:00.000Z"),
        weekEnd: new Date("2026-08-02T00:00:00.000Z"),
        createdDate: new Date("2026-07-27T00:00:00.000Z"),
        createdById: inspector.id,
      },
    });
    addId(manifest, "plans", plan.id);
    const scheduleData = {
      projectId: projectA.id,
      scheduledDate: new Date("2026-07-30T00:00:00.000Z"),
      shift: "MORNING" as const,
      kind: "INSPECTION" as const,
      constructionType: "BUILDING" as const,
      location: "Khu A",
      plannedFreeText: null,
      trainingContent: null,
      startAt: null,
      expectedEndAt: null,
      changeNote: null,
      sortOrder: 1,
    };
    const scheduleOne = await createSafetyScheduleWithScope(
      prisma,
      inspectorActor,
      {
        planId: plan.id,
        expectedPlanVersion: 1,
        clientMutationId: `${runId}-schedule-1`,
        data: scheduleData,
      },
    );
    addId(manifest, "schedules", scheduleOne.scheduleId);
    const scheduleTwo = await createSafetyScheduleWithScope(
      prisma,
      inspectorActor,
      {
        planId: plan.id,
        expectedPlanVersion: 2,
        clientMutationId: `${runId}-schedule-2`,
        data: { ...scheduleData, sortOrder: 2 },
      },
    );
    addId(manifest, "schedules", scheduleTwo.scheduleId);
    requireCondition(
      (await prisma.safetyInspectionPlanProject.count({
        where: { planId: plan.id, projectId: projectA.id },
      })) === 1,
      "Scope plan không đồng bộ trong transaction.",
    );

    const rollbackPlan = await prisma.safetyInspectionPlan.create({
      data: {
        documentYear: 2026,
        sequenceNumber: 992,
        weekStart: new Date("2026-07-27T00:00:00.000Z"),
        weekEnd: new Date("2026-08-02T00:00:00.000Z"),
        createdDate: new Date("2026-07-27T00:00:00.000Z"),
        createdById: inspector.id,
      },
    });
    addId(manifest, "plans", rollbackPlan.id);
    const invalidActor: SafetyServerActor = {
      ...inspectorActor,
      id: `missing-${suffix}`,
    };
    let planRollbackCaught = false;
    try {
      await createSafetyScheduleWithScope(prisma, invalidActor, {
        planId: rollbackPlan.id,
        expectedPlanVersion: 1,
        clientMutationId: `${runId}-scope-rollback`,
        data: scheduleData,
      });
    } catch {
      planRollbackCaught = true;
    }
    requireCondition(planRollbackCaught, "Không ép được lỗi sync scope plan.");
    requireCondition(
      (await prisma.safetyInspectionSchedule.count({
        where: { planId: rollbackPlan.id },
      })) === 0 &&
        (await prisma.safetyInspectionPlanProject.count({
          where: { planId: rollbackPlan.id },
        })) === 0,
      "Schedule không rollback khi scope plan thất bại.",
    );
    manifest.assertions.planScopeRollback = true;

    await prisma.safetyInspectionScheduleChecklistItem.createMany({
      data: checklistItems.map((item, index) => ({
        scheduleId: scheduleOne.scheduleId,
        checklistItemId: item.id,
        sortOrder: index + 1,
      })),
    });
    const session = await createSafetyInspectionSession(
      prisma,
      inspectorActor,
      {
        clientMutationId: `${runId}-session`,
        checklistTemplateId: activeChecklist.id,
        occurredAt: new Date("2026-07-30T03:00:00.000Z"),
        shift: "MORNING",
        location: "Khu A",
        source: {
          kind: "SCHEDULED",
          scheduleId: scheduleOne.scheduleId,
          expectedScheduleVersion: 1,
        },
      },
    );
    addId(manifest, "sessions", session.sessionId);

    const concurrentInput: SaveInspectionResultInput = {
      clientMutationId: `${runId}-same-id`,
      expectedSessionVersion: 1,
      expectedResultVersion: null,
      sessionId: session.sessionId,
      checklistItemId: checklistItems[0].id,
      status: "PASS",
      note: "QA concurrent",
      notApplicableReason: null,
      inspectedAt: new Date("2026-07-30T03:10:00.000Z"),
      findings: [],
    };
    const sameIdResults = await Promise.all([
      saveInspectionResultWithFinding(
        raceClientOne.prisma,
        inspectorActor,
        concurrentInput,
      ),
      saveInspectionResultWithFinding(
        raceClientTwo.prisma,
        inspectorActor,
        concurrentInput,
      ),
    ]);
    requireCondition(
      sameIdResults[0].resultId === sameIdResults[1].resultId &&
        sameIdResults.filter((result) => result.replayed).length === 1,
      "Idempotency race không trả cùng receipt.",
    );
    requireCondition(
      (await prisma.safetyInspectionResult.count({
        where: {
          sessionId: session.sessionId,
          checklistItemId: checklistItems[0].id,
        },
      })) === 1,
      "Idempotency race tạo trùng result.",
    );
    manifest.assertions.concurrentIdempotencyReplay = true;
    let differentHashBlocked = false;
    try {
      await saveInspectionResultWithFinding(prisma, inspectorActor, {
        ...concurrentInput,
        note: "Nội dung khác nhưng tái sử dụng mutation ID",
      });
    } catch (error) {
      differentHashBlocked =
        error instanceof Error &&
        error.message.includes("được dùng cho một nội dung khác");
    }
    requireCondition(
      differentHashBlocked,
      "Cùng clientMutationId nhưng khác request hash không bị chặn.",
    );
    manifest.assertions.idempotencyHashMismatchBlocked = true;

    const competingBase = {
      expectedSessionVersion: 2,
      expectedResultVersion: null,
      sessionId: session.sessionId,
      checklistItemId: checklistItems[1].id,
      note: null,
      inspectedAt: new Date("2026-07-30T03:20:00.000Z"),
      findings: [] as const,
    };
    const differentContent = await Promise.allSettled([
      saveInspectionResultWithFinding(raceClientOne.prisma, inspectorActor, {
        ...competingBase,
        clientMutationId: `${runId}-content-a`,
        status: "PASS",
        notApplicableReason: null,
      }),
      saveInspectionResultWithFinding(raceClientTwo.prisma, inspectorActor, {
        ...competingBase,
        clientMutationId: `${runId}-content-b`,
        status: "NOT_APPLICABLE",
        notApplicableReason: "Không có hạng mục",
      }),
    ]);
    requireCondition(
      differentContent.filter((result) => result.status === "fulfilled")
        .length === 1 &&
        differentContent.filter((result) => result.status === "rejected")
          .length === 1,
      "Hai nội dung cùng expectedVersion không tạo một conflict.",
    );
    const conflict = differentContent.find(
      (result) => result.status === "rejected",
    );
    requireCondition(
      conflict?.status === "rejected" &&
        conflict.reason instanceof Error &&
        !conflict.reason.message.includes("P2002"),
      "Conflict làm lộ lỗi unique thô.",
    );
    manifest.assertions.concurrentVersionConflictSafe = true;

    const failed = await saveInspectionResultWithFinding(
      prisma,
      inspectorActor,
      {
        clientMutationId: `${runId}-multi-finding`,
        expectedSessionVersion: 3,
        expectedResultVersion: null,
        sessionId: session.sessionId,
        checklistItemId: checklistItems[2].id,
        status: "FAIL",
        note: "Hai vị trí vi phạm",
        notApplicableReason: null,
        inspectedAt: new Date("2026-07-30T03:30:00.000Z"),
        findings: [
          {
            localReference: `S15-F1-${suffix}`,
            description: "Thiếu lan can vị trí 1",
            severity: "MEDIUM",
            violationGroup: "Làm việc trên cao",
            location: "Vị trí 1",
            workSuspended: false,
            temporaryMeasure: null,
            responsibleUnit: "BCH A",
            responsibleUserId: commander.id,
            dueAt: new Date("2026-07-31T10:00:00.000Z"),
          },
          {
            localReference: `S15-F2-${suffix}`,
            description: "Thiếu lan can vị trí 2",
            severity: "SERIOUS",
            violationGroup: "Làm việc trên cao",
            location: "Vị trí 2",
            workSuspended: false,
            temporaryMeasure: null,
            responsibleUnit: "BCH A",
            responsibleUserId: commander.id,
            dueAt: new Date("2026-07-31T10:00:00.000Z"),
          },
        ],
      },
    );
    failed.findingIds.forEach((id) => addId(manifest, "findings", id));
    requireCondition(
      failed.findingIds.length === 2,
      "Result FAIL không tạo được nhiều finding.",
    );
    manifest.assertions.multipleFindingsPerResult = true;

    const failedResult = await prisma.safetyInspectionResult.findUniqueOrThrow({
      where: { id: failed.resultId },
    });
    let failToPassBlocked = false;
    try {
      await saveInspectionResultWithFinding(prisma, inspectorActor, {
        ...concurrentInput,
        clientMutationId: `${runId}-fail-to-pass`,
        expectedSessionVersion: 4,
        expectedResultVersion: failedResult.version,
        checklistItemId: checklistItems[2].id,
      });
    } catch (error) {
      failToPassBlocked =
        error instanceof Error && error.message.includes("FAIL");
    }
    requireCondition(failToPassBlocked, "FAIL → PASS không bị chặn.");
    manifest.assertions.failToPassBlocked = true;

    await prisma.safetyInspectionSession.update({
      where: { id: session.sessionId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    let completedSessionBlocked = false;
    try {
      await saveInspectionResultWithFinding(prisma, inspectorActor, {
        ...concurrentInput,
        clientMutationId: `${runId}-completed-session`,
        expectedSessionVersion: 4,
        checklistItemId: checklistItems[3].id,
      });
    } catch (error) {
      completedSessionBlocked =
        error instanceof Error && error.message.includes("đã hoàn thành");
    }
    requireCondition(
      completedSessionBlocked,
      "Session COMPLETED vẫn sửa được.",
    );
    manifest.assertions.completedSessionBlocked = true;

    const primaryFindingId = failed.findingIds[0];
    await prisma.safetyFinding.update({
      where: { id: primaryFindingId },
      data: { status: "WAITING_REINSPECTION", assignedAt: new Date() },
    });
    const correctiveAction = await prisma.safetyCorrectiveAction.create({
      data: {
        findingId: primaryFindingId,
        projectId: projectA.id,
        requestText: "Lắp lan can đạt chuẩn",
        assigneeUserId: commander.id,
        assigneeUnit: "BCH A",
        requestedDueAtSnapshot: new Date("2026-07-31T10:00:00.000Z"),
        submittedResult: "Đã lắp",
        submittedAt: new Date(),
        submittedById: commander.id,
        status: "SUBMITTED",
        createdById: inspector.id,
      },
    });
    addId(manifest, "correctiveActions", correctiveAction.id);

    let selfReinspectionBlocked = false;
    try {
      await recordSafetyReinspection(
        prisma,
        { ...reviewerActor, id: commander.id },
        {
          clientMutationId: `${runId}-self-review`,
          expectedFindingVersion: 1,
          expectedActionVersion: 1,
          findingId: primaryFindingId,
          actionId: correctiveAction.id,
          decision: "ACCEPT_COMPLETION",
          conclusion: "Đạt",
          reason: null,
          inspectedAt: new Date(),
          newDueAt: null,
          newSeverity: null,
          suspensionReason: null,
        },
      );
    } catch (error) {
      selfReinspectionBlocked =
        error instanceof Error && error.message.includes("không được tự");
    }
    requireCondition(
      selfReinspectionBlocked,
      "Policy độc lập không được tính server-side.",
    );
    manifest.assertions.independentPolicyServerSide = true;

    const rejected = await recordSafetyReinspection(
      prisma,
      reviewerActor,
      {
        clientMutationId: `${runId}-reject`,
        expectedFindingVersion: 1,
        expectedActionVersion: 1,
        findingId: primaryFindingId,
        actionId: correctiveAction.id,
        decision: "REJECT_REWORK",
        conclusion: "Chưa đạt",
        reason: "Lan can còn thiếu thanh giữa",
        inspectedAt: new Date("2026-07-30T05:00:00.000Z"),
        newDueAt: null,
        newSeverity: null,
        suspensionReason: null,
      },
    );
    addId(manifest, "reinspections", rejected.reinspectionId);
    const afterReject = await prisma.safetyFinding.findUniqueOrThrow({
      where: { id: primaryFindingId },
    });
    requireCondition(
      afterReject.status === "IN_REMEDIATION" &&
        afterReject.completedAt === null,
      "Reject transition không đúng.",
    );
    await prisma.$transaction(async (tx) => {
      await tx.safetyFinding.update({
        where: { id: primaryFindingId },
        data: {
          status: "WAITING_REINSPECTION",
          version: { increment: 1 },
        },
      });
      await tx.safetyCorrectiveAction.update({
        where: { id: correctiveAction.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          submittedById: commander.id,
          version: { increment: 1 },
        },
      });
    });
    const accepted = await recordSafetyReinspection(
      prisma,
      reviewerActor,
      {
        clientMutationId: `${runId}-accept`,
        expectedFindingVersion: 3,
        expectedActionVersion: 3,
        findingId: primaryFindingId,
        actionId: correctiveAction.id,
        decision: "ACCEPT_COMPLETION",
        conclusion: "Đã đạt yêu cầu",
        reason: null,
        inspectedAt: new Date("2026-07-30T06:00:00.000Z"),
        newDueAt: null,
        newSeverity: null,
        suspensionReason: null,
      },
    );
    addId(manifest, "reinspections", accepted.reinspectionId);
    const completedFinding = await prisma.safetyFinding.findUniqueOrThrow({
      where: { id: primaryFindingId },
    });
    requireCondition(
      completedFinding.status === "COMPLETED" &&
        completedFinding.completedAt !== null,
      "Accept không hoàn thành finding.",
    );
    manifest.assertions.reinspectionMatrixRuntime = true;

    const folders = await Promise.all([
      prisma.documentFolder.create({
        data: { projectId: projectA.id, name: "QA Safety A" },
      }),
      prisma.documentFolder.create({
        data: { projectId: projectB.id, name: "QA Safety B" },
      }),
    ]);
    folders.forEach((row) => addId(manifest, "documentFolders", row.id));
    const documents = await Promise.all([
      prisma.document.create({
        data: {
          projectId: projectA.id,
          folderId: folders[0].id,
          originalName: "evidence-a.jpg",
          storedName: `evidence-a-${suffix}.jpg`,
          mimeType: "image/jpeg",
          extension: ".jpg",
          size: 1,
          storagePath: `qa/${suffix}/a.jpg`,
          uploadedById: inspector.id,
        },
      }),
      prisma.document.create({
        data: {
          projectId: projectB.id,
          folderId: folders[1].id,
          originalName: "evidence-b.jpg",
          storedName: `evidence-b-${suffix}.jpg`,
          mimeType: "image/jpeg",
          extension: ".jpg",
          size: 1,
          storagePath: `qa/${suffix}/b.jpg`,
          uploadedById: commander.id,
        },
      }),
    ]);
    documents.forEach((row) => addId(manifest, "documents", row.id));

    const invalidEvidence = await prisma.safetyCorrectiveEvidence.create({
      data: {
        projectId: projectA.id,
        findingId: primaryFindingId,
        actionId: correctiveAction.id,
        documentId: documents[1].id,
        kind: "PHOTO",
        uploadedById: commander.id,
      },
    });
    addId(manifest, "evidence", invalidEvidence.id);
    let crossDocumentBlocked = false;
    try {
      await assertCanViewSafetyEvidence(
        createPrismaSafetyEvidenceTraceRepository(prisma),
        { actor: inspectorActor, evidenceId: invalidEvidence.id },
      );
    } catch {
      crossDocumentBlocked = true;
    }
    requireCondition(
      crossDocumentBlocked,
      "Evidence A trỏ Document B không bị chặn.",
    );
    manifest.assertions.evidenceDocumentProjectBlocked = true;

    const secondaryFindingId = failed.findingIds[1];
    const secondaryAction = await prisma.safetyCorrectiveAction.create({
      data: {
        findingId: secondaryFindingId,
        projectId: projectA.id,
        requestText: "Khắc phục vị trí 2",
        assigneeUserId: commander.id,
        assigneeUnit: "BCH A",
        requestedDueAtSnapshot: new Date("2026-07-31T10:00:00.000Z"),
        status: "IN_PROGRESS",
        createdById: inspector.id,
      },
    });
    addId(manifest, "correctiveActions", secondaryAction.id);
    const validEvidence = await prisma.safetyCorrectiveEvidence.create({
      data: {
        projectId: projectA.id,
        findingId: secondaryFindingId,
        actionId: secondaryAction.id,
        documentId: documents[0].id,
        kind: "PHOTO",
        uploadedById: commander.id,
      },
    });
    addId(manifest, "evidence", validEvidence.id);
    let projectBViewBlocked = false;
    try {
      await assertCanViewSafetyEvidence(
        createPrismaSafetyEvidenceTraceRepository(prisma),
        {
          actor: {
            ...commanderActor,
            projectScope: {
              kind: "PROJECT_IDS",
              projectIds: [projectB.id],
            },
          },
          evidenceId: validEvidence.id,
        },
      );
    } catch {
      projectBViewBlocked = true;
    }
    requireCondition(
      projectBViewBlocked,
      "User chỉ có scope project B vẫn xem được evidence project A.",
    );
    let nonAssigneeBlocked = false;
    try {
      await assertCanUploadSafetyEvidence(
        createPrismaSafetyEvidenceTraceRepository(prisma),
        {
          actor: { ...commanderActor, id: inspector.id, unitNames: ["BCH B"] },
          findingId: secondaryFindingId,
          actionId: secondaryAction.id,
          targetProjectId: projectA.id,
          documentId: documents[0].id,
        },
      );
    } catch {
      nonAssigneeBlocked = true;
    }
    requireCondition(
      nonAssigneeBlocked,
      "BCH không được giao vẫn upload evidence.",
    );
    let completedUploadBlocked = false;
    try {
      await assertCanUploadSafetyEvidence(
        createPrismaSafetyEvidenceTraceRepository(prisma),
        {
          actor: commanderActor,
          findingId: primaryFindingId,
          actionId: correctiveAction.id,
          targetProjectId: projectA.id,
          documentId: null,
        },
      );
    } catch {
      completedUploadBlocked = true;
    }
    requireCondition(
      completedUploadBlocked,
      "Finding COMPLETED vẫn nhận evidence.",
    );
    await cancelSafetyEvidence(prisma, inspectorActor, {
      evidenceId: validEvidence.id,
      expectedVersion: 1,
      reason: "Tệp tải nhầm",
      clientMutationId: `${runId}-cancel-evidence`,
    });
    const cancelledEvidence =
      await prisma.safetyCorrectiveEvidence.findUniqueOrThrow({
        where: { id: validEvidence.id },
      });
    requireCondition(
      cancelledEvidence.cancelledAt !== null &&
        cancelledEvidence.cancelReason === "Tệp tải nhầm",
      "Evidence bị hard-delete hoặc không lưu lý do void.",
    );
    manifest.assertions.evidenceAssignmentStateAndVoid = true;
    manifest.assertions.crossProjectEvidenceViewBlocked = true;

    let geoConstraintBlocked = false;
    try {
      await prisma.safetyCorrectiveEvidence.create({
        data: {
          projectId: projectA.id,
          findingId: secondaryFindingId,
          actionId: secondaryAction.id,
          kind: "PHOTO",
          geoLat: 91,
          uploadedById: inspector.id,
        },
      });
    } catch {
      geoConstraintBlocked = true;
    }
    requireCondition(geoConstraintBlocked, "DB không chặn geoLat ngoài range.");
    manifest.assertions.databaseCheckConstraints = true;

    const report = await prisma.safetyWeeklyReport.create({
      data: {
        documentYear: 2026,
        sequenceNumber: 991,
        weekStart: new Date("2026-07-27T00:00:00.000Z"),
        weekEnd: new Date("2026-08-02T00:00:00.000Z"),
        createdById: inspector.id,
      },
    });
    addId(manifest, "reports", report.id);
    const entryOne = await createSafetyReportEntryWithScope(
      prisma,
      inspectorActor,
      {
        reportId: report.id,
        expectedReportVersion: 1,
        clientMutationId: `${runId}-report-entry-1`,
        data: {
          sessionId: session.sessionId,
          projectSnapshot: projectA.name,
          content: "Kiểm tra buổi sáng",
          assessment: null,
          request: null,
          implementationResult: null,
          sortOrder: 1,
        },
      },
    );
    addId(manifest, "reportEntries", entryOne.entryId);
    const unplannedSession = await createSafetyInspectionSession(
      prisma,
      inspectorActor,
      {
        clientMutationId: `${runId}-unplanned-session`,
        checklistTemplateId: activeChecklist.id,
        occurredAt: new Date("2026-07-30T07:00:00.000Z"),
        shift: "AFTERNOON",
        location: "Khu A",
        source: {
          kind: "UNPLANNED",
          projectId: projectA.id,
          constructionType: "BUILDING",
          reason: "Kiểm tra đột xuất theo phản ánh",
        },
      },
    );
    addId(manifest, "sessions", unplannedSession.sessionId);
    const entryTwo = await createSafetyReportEntryWithScope(
      prisma,
      inspectorActor,
      {
        reportId: report.id,
        expectedReportVersion: 2,
        clientMutationId: `${runId}-report-entry-2`,
        data: {
          sessionId: unplannedSession.sessionId,
          projectSnapshot: projectA.name,
          content: "Kiểm tra đột xuất",
          assessment: null,
          request: null,
          implementationResult: null,
          sortOrder: 2,
        },
      },
    );
    addId(manifest, "reportEntries", entryTwo.entryId);
    await cancelSafetyReportEntryWithScope(prisma, inspectorActor, {
      entryId: entryOne.entryId,
      expectedReportVersion: 3,
      reason: "Gộp dòng báo cáo",
      clientMutationId: `${runId}-cancel-entry-1`,
    });
    requireCondition(
      (await prisma.safetyWeeklyReportProject.count({
        where: { reportId: report.id, projectId: projectA.id },
      })) === 1,
      "Scope report bị xóa khi vẫn còn entry cùng project.",
    );
    await cancelSafetyReportEntryWithScope(prisma, inspectorActor, {
      entryId: entryTwo.entryId,
      expectedReportVersion: 4,
      reason: "Loại dòng đột xuất",
      clientMutationId: `${runId}-cancel-entry-2`,
    });
    requireCondition(
      (await prisma.safetyWeeklyReportProject.count({
        where: { reportId: report.id, projectId: projectA.id },
      })) === 0,
      "Scope report không xóa sau entry cuối.",
    );

    const rollbackReport = await prisma.safetyWeeklyReport.create({
      data: {
        documentYear: 2026,
        sequenceNumber: 992,
        weekStart: new Date("2026-07-27T00:00:00.000Z"),
        weekEnd: new Date("2026-08-02T00:00:00.000Z"),
        createdById: inspector.id,
      },
    });
    addId(manifest, "reports", rollbackReport.id);
    let reportRollbackCaught = false;
    try {
      await createSafetyReportEntryWithScope(prisma, invalidActor, {
        reportId: rollbackReport.id,
        expectedReportVersion: 1,
        clientMutationId: `${runId}-report-rollback`,
        data: {
          sessionId: session.sessionId,
          projectSnapshot: projectA.name,
          content: "Phải rollback",
          assessment: null,
          request: null,
          implementationResult: null,
          sortOrder: 1,
        },
      });
    } catch {
      reportRollbackCaught = true;
    }
    requireCondition(
      reportRollbackCaught &&
        (await prisma.safetyWeeklyReportEntry.count({
          where: { reportId: rollbackReport.id },
        })) === 0 &&
        (await prisma.safetyWeeklyReportProject.count({
          where: { reportId: rollbackReport.id },
        })) === 0,
      "Report entry không rollback khi audit/scope transaction thất bại.",
    );
    manifest.assertions.reportScopeRollback = true;

    await cancelSafetyScheduleWithScope(prisma, inspectorActor, {
      scheduleId: scheduleOne.scheduleId,
      expectedScheduleVersion: 1,
      expectedPlanVersion: 3,
      reason: "Hủy lịch một",
      clientMutationId: `${runId}-cancel-schedule-1`,
    });
    requireCondition(
      (await prisma.safetyInspectionPlanProject.count({
        where: { planId: plan.id, projectId: projectA.id },
      })) === 1,
      "Scope plan bị xóa khi vẫn còn schedule cùng project.",
    );
    await cancelSafetyScheduleWithScope(prisma, inspectorActor, {
      scheduleId: scheduleTwo.scheduleId,
      expectedScheduleVersion: 1,
      expectedPlanVersion: 4,
      reason: "Hủy lịch hai",
      clientMutationId: `${runId}-cancel-schedule-2`,
    });
    requireCondition(
      (await prisma.safetyInspectionPlanProject.count({
        where: { planId: plan.id, projectId: projectA.id },
      })) === 0,
      "Scope plan không xóa sau schedule cuối.",
    );
    manifest.assertions.scopeRetentionAndRemoval = true;

    manifest.completedAtUtc = new Date().toISOString();
    const artifactPath = path.resolve(
      "artifacts/safety-inspection-template-analysis/slice1.5-integration-manifest.json",
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
        assertions: manifest.assertions,
        fixtureCleanup: manifest.fixtureCleanup,
        artifactPath,
      }),
    );
  } finally {
    await close();
    await raceClientOne.close();
    await raceClientTwo.close();
  }
}

void main();
