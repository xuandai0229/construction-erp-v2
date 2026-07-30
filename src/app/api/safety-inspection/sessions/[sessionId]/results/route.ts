import type { NextRequest } from "next/server";
import { saveSafetySessionResult } from "@/lib/safety-inspection/api-service";
import { saveSafetyResultSchema } from "@/lib/safety-inspection/api-schemas";
import { parseSafetyJsonBody } from "@/lib/safety-inspection/http-boundary";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

type Context = { params: Promise<{ sessionId: string }> };

export async function POST(request: NextRequest, route: Context) {
  const { sessionId } = await route.params;
  return withSafetyRoute(request, { mutation: true }, async (context) => {
    const body = await parseSafetyJsonBody(request, saveSafetyResultSchema);
    return {
      data: await saveSafetySessionResult(context, sessionId, {
        clientMutationId: body.clientMutationId,
        expectedSessionVersion: body.expectedSessionVersion,
        expectedResultVersion: body.expectedResultVersion,
        checklistItemId: body.checklistItemId,
        status: body.status,
        note: body.note ?? null,
        notApplicableReason: body.notApplicableReason ?? null,
        inspectedAt: body.inspectedAt,
        findings: body.findings.map((finding) => ({
          localReference: finding.localReference ?? null,
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
    };
  });
}
