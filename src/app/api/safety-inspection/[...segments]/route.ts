import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import {
  assignSafetyFinding,
  completeSafetySession,
  configureSafetySchedule,
  createSafetyPlan,
  decideSafetyPlan,
  getActiveSafetyChecklist,
  getSafetyFinding,
  getSafetyPlan,
  getSafetySession,
  listSafetyFindings,
  listSafetyPlans,
  mutateSafetySchedule,
  reinspectSafetyFinding,
  saveSafetySessionResult,
  startSafetySession,
  submitSafetyRemediation,
  updateSafetyPlan,
} from "@/lib/safety-inspection/api-service";
import {
  assignSafetyFindingSchema,
  cancelSafetyScheduleSchema,
  completeSafetySessionSchema,
  constructionTypeSchema,
  createSafetyPlanSchema,
  planDecisionSchema,
  reinspectionSchema,
  safetyScheduleSchema,
  saveSafetyResultSchema,
  startSafetySessionSchema,
  submitSafetyRemediationSchema,
  unplannedSafetySessionSchema,
  updateSafetyPlanSchema,
} from "@/lib/safety-inspection/api-schemas";
import {
  SafetyApiError,
  mapSafetyError,
  safetyErrorHttpStatus,
} from "@/lib/safety-inspection/errors";
import { getSafetyServerActorContext } from "@/lib/safety-inspection/server-actor-context";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ segments: string[] }> };

async function parseBody<T>(
  request: NextRequest,
  schema: ZodType<T>,
): Promise<T> {
  return schema.parse(await request.json());
}

async function handle(
  request: NextRequest,
  params: RouteParams,
  method: "GET" | "POST" | "PATCH",
): Promise<NextResponse> {
  let correlationId = request.headers.get("x-correlation-id") ?? "pending";
  try {
    const context = await getSafetyServerActorContext();
    correlationId = context.correlationId;
    const { segments } = await params.params;
    const path = segments.join("/");

    if (method === "GET" && path === "checklists/active") {
      const parsed = constructionTypeSchema.safeParse(
        request.nextUrl.searchParams.get("constructionType"),
      );
      if (!parsed.success) {
        throw new SafetyApiError(
          "SAFETY_VALIDATION_FAILED",
          "Loại công trình không hợp lệ.",
        );
      }
      return NextResponse.json({
        data: await getActiveSafetyChecklist(context, parsed.data),
        correlationId,
      });
    }

    if (method === "GET" && path === "plans") {
      return NextResponse.json({
        data: await listSafetyPlans(context),
        correlationId,
      });
    }
    if (method === "POST" && path === "plans") {
      const body = await parseBody(request, createSafetyPlanSchema);
      return NextResponse.json(
        { data: await createSafetyPlan(context, body), correlationId },
        { status: 201 },
      );
    }

    const planMatch = path.match(/^plans\/([^/]+)$/);
    if (method === "GET" && planMatch) {
      return NextResponse.json({
        data: await getSafetyPlan(context, planMatch[1]),
        correlationId,
      });
    }
    if (method === "PATCH" && planMatch) {
      const body = await parseBody(request, updateSafetyPlanSchema);
      return NextResponse.json({
        data: await updateSafetyPlan(context, planMatch[1], body),
        correlationId,
      });
    }

    const createScheduleMatch = path.match(/^plans\/([^/]+)\/schedules$/);
    if (method === "POST" && createScheduleMatch) {
      const body = await parseBody(request, safetyScheduleSchema);
      const created = await mutateSafetySchedule(context, {
        mode: "CREATE",
        planId: createScheduleMatch[1],
        expectedPlanVersion: body.expectedPlanVersion,
        clientMutationId: body.clientMutationId,
        data: {
          projectId: body.projectId,
          scheduledDate: body.scheduledDate,
          shift: body.shift,
          kind: body.kind,
          constructionType: body.constructionType,
          location: body.location ?? null,
          plannedFreeText: body.plannedFreeText ?? null,
          trainingContent: body.trainingContent ?? null,
          startAt: body.startAt ?? null,
          expectedEndAt: body.expectedEndAt ?? null,
          changeNote: body.changeNote ?? null,
          sortOrder: body.sortOrder,
        },
      });
      const configured = await configureSafetySchedule(
        context,
        created.scheduleId,
        {
          expectedVersion: 1,
          clientMutationId: `${body.clientMutationId}:config`,
          collaboratorUserIds: body.collaboratorUserIds,
          checklistItemIds: body.checklistItemIds,
        },
      );
      return NextResponse.json(
        { data: configured, correlationId },
        { status: 201 },
      );
    }

    const scheduleMatch = path.match(/^schedules\/([^/]+)$/);
    if (method === "PATCH" && scheduleMatch) {
      const body = await parseBody(request, safetyScheduleSchema);
      if (!body.expectedScheduleVersion) {
        throw new SafetyApiError(
          "SAFETY_VALIDATION_FAILED",
          "Thiếu phiên bản lịch kiểm tra.",
        );
      }
      await mutateSafetySchedule(context, {
        mode: "UPDATE",
        scheduleId: scheduleMatch[1],
        expectedScheduleVersion: body.expectedScheduleVersion,
        expectedPlanVersion: body.expectedPlanVersion,
        clientMutationId: body.clientMutationId,
        data: {
          projectId: body.projectId,
          scheduledDate: body.scheduledDate,
          shift: body.shift,
          kind: body.kind,
          constructionType: body.constructionType,
          location: body.location ?? null,
          plannedFreeText: body.plannedFreeText ?? null,
          trainingContent: body.trainingContent ?? null,
          startAt: body.startAt ?? null,
          expectedEndAt: body.expectedEndAt ?? null,
          changeNote: body.changeNote ?? null,
          sortOrder: body.sortOrder,
        },
      });
      const configured = await configureSafetySchedule(
        context,
        scheduleMatch[1],
        {
          expectedVersion: body.expectedScheduleVersion + 1,
          clientMutationId: `${body.clientMutationId}:config`,
          collaboratorUserIds: body.collaboratorUserIds,
          checklistItemIds: body.checklistItemIds,
        },
      );
      return NextResponse.json({ data: configured, correlationId });
    }

    const cancelScheduleMatch = path.match(
      /^schedules\/([^/]+)\/cancel$/,
    );
    if (method === "POST" && cancelScheduleMatch) {
      const body = await parseBody(request, cancelSafetyScheduleSchema);
      return NextResponse.json({
        data: await mutateSafetySchedule(context, {
          mode: "CANCEL",
          scheduleId: cancelScheduleMatch[1],
          expectedScheduleVersion: body.expectedVersion,
          expectedPlanVersion: body.expectedPlanVersion,
          clientMutationId: body.clientMutationId,
          reason: body.reason,
        }),
        correlationId,
      });
    }

    const planDecisionMatch = path.match(
      /^plans\/([^/]+)\/(submit|review)$/,
    );
    if (method === "POST" && planDecisionMatch) {
      const body = await parseBody(request, planDecisionSchema);
      const endpointDecision =
        planDecisionMatch[2] === "submit" ? "SUBMIT" : body.decision;
      if (
        (planDecisionMatch[2] === "submit" &&
          endpointDecision !== "SUBMIT") ||
        (planDecisionMatch[2] === "review" &&
          endpointDecision === "SUBMIT")
      ) {
        throw new SafetyApiError(
          "SAFETY_VALIDATION_FAILED",
          "Quyết định duyệt kế hoạch không hợp lệ.",
        );
      }
      return NextResponse.json({
        data: await decideSafetyPlan(context, planDecisionMatch[1], {
          ...body,
          decision: endpointDecision,
        }),
        correlationId,
      });
    }

    const startScheduleMatch = path.match(
      /^schedules\/([^/]+)\/start$/,
    );
    if (method === "POST" && startScheduleMatch) {
      const body = await parseBody(request, startSafetySessionSchema);
      return NextResponse.json(
        {
          data: await startSafetySession(context, {
            kind: "SCHEDULED",
            scheduleId: startScheduleMatch[1],
            expectedVersion: body.expectedVersion,
            clientMutationId: body.clientMutationId,
            occurredAt: body.occurredAt,
            shift: body.shift,
            location: body.location,
          }),
          correlationId,
        },
        { status: 201 },
      );
    }

    if (method === "POST" && path === "sessions/unplanned") {
      const body = await parseBody(request, unplannedSafetySessionSchema);
      return NextResponse.json(
        {
          data: await startSafetySession(context, {
            kind: "UNPLANNED",
            ...body,
          }),
          correlationId,
        },
        { status: 201 },
      );
    }

    const sessionMatch = path.match(/^sessions\/([^/]+)$/);
    if (method === "GET" && sessionMatch) {
      return NextResponse.json({
        data: await getSafetySession(context, sessionMatch[1]),
        correlationId,
      });
    }
    const resultMatch = path.match(/^sessions\/([^/]+)\/results$/);
    if (method === "POST" && resultMatch) {
      const body = await parseBody(request, saveSafetyResultSchema);
      return NextResponse.json({
        data: await saveSafetySessionResult(context, resultMatch[1], {
          clientMutationId: body.clientMutationId,
          expectedSessionVersion: body.expectedSessionVersion,
          expectedResultVersion: body.expectedResultVersion,
          checklistItemId: body.checklistItemId,
          status: body.status,
          note: body.note ?? null,
          notApplicableReason: body.notApplicableReason ?? null,
          inspectedAt: body.inspectedAt,
          findings: body.findings.map((finding) => ({
            code: finding.code,
            description: finding.description,
            severity: finding.severity,
            violationGroup: finding.violationGroup ?? null,
            location: finding.location ?? null,
            workSuspended: finding.workSuspended,
            temporaryMeasure: finding.temporaryMeasure ?? null,
            responsibleUnit: finding.responsibleUnit ?? null,
            responsibleUserId: finding.responsibleUserId ?? null,
            dueAt: finding.dueAt ?? null,
          })),
        }),
        correlationId,
      });
    }
    const completeMatch = path.match(/^sessions\/([^/]+)\/complete$/);
    if (method === "POST" && completeMatch) {
      const body = await parseBody(request, completeSafetySessionSchema);
      return NextResponse.json({
        data: await completeSafetySession(context, completeMatch[1], body),
        correlationId,
      });
    }

    if (method === "GET" && path === "findings") {
      return NextResponse.json({
        data: await listSafetyFindings(
          context,
          request.nextUrl.searchParams.get("projectId") ?? undefined,
        ),
        correlationId,
      });
    }
    const findingMatch = path.match(/^findings\/([^/]+)$/);
    if (method === "GET" && findingMatch) {
      return NextResponse.json({
        data: await getSafetyFinding(context, findingMatch[1]),
        correlationId,
      });
    }
    const assignMatch = path.match(/^findings\/([^/]+)\/assign$/);
    if (method === "POST" && assignMatch) {
      const body = await parseBody(request, assignSafetyFindingSchema);
      return NextResponse.json({
        data: await assignSafetyFinding(context, assignMatch[1], body),
        correlationId,
      });
    }
    const remediationMatch = path.match(
      /^findings\/([^/]+)\/remediation$/,
    );
    if (method === "POST" && remediationMatch) {
      const body = await parseBody(request, submitSafetyRemediationSchema);
      return NextResponse.json({
        data: await submitSafetyRemediation(
          context,
          remediationMatch[1],
          body,
        ),
        correlationId,
      });
    }
    const reinspectionMatch = path.match(
      /^findings\/([^/]+)\/reinspect$/,
    );
    if (method === "POST" && reinspectionMatch) {
      const body = await parseBody(request, reinspectionSchema);
      return NextResponse.json({
        data: await reinspectSafetyFinding(
          context,
          reinspectionMatch[1],
          {
            actionId: body.actionId,
            clientMutationId: body.clientMutationId,
            expectedFindingVersion: body.expectedVersion,
            expectedActionVersion: body.expectedActionVersion,
            decision: body.decision,
            conclusion: body.conclusion ?? "",
            reason: body.reason ?? null,
            newDueAt: body.newDueAt ?? null,
            newSeverity: body.newSeverity ?? null,
            suspensionReason: body.suspensionReason ?? null,
            inspectedAt: body.inspectedAt,
          },
        ),
        correlationId,
      });
    }

    throw new SafetyApiError(
      "SAFETY_FORBIDDEN_OR_NOT_FOUND",
      "Không thể truy cập dữ liệu ATLĐ được yêu cầu.",
    );
  } catch (error) {
    const normalized =
      error instanceof ZodError
        ? new SafetyApiError(
            "SAFETY_VALIDATION_FAILED",
            "Dữ liệu ATLĐ gửi lên không hợp lệ.",
          )
        : error;
    const dto = mapSafetyError(normalized, correlationId);
    console.error(
      JSON.stringify({
        component: "safety-api",
        correlationId,
        code: dto.code,
        error:
          normalized instanceof Error
            ? normalized.message
            : "Lỗi không xác định",
      }),
    );
    return NextResponse.json(
      { error: dto },
      { status: safetyErrorHttpStatus(dto.code) },
    );
  }
}

export function GET(request: NextRequest, params: RouteParams) {
  return handle(request, params, "GET");
}

export function POST(request: NextRequest, params: RouteParams) {
  return handle(request, params, "POST");
}

export function PATCH(request: NextRequest, params: RouteParams) {
  return handle(request, params, "PATCH");
}
