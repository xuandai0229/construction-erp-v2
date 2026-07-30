import type { NextRequest } from "next/server";
import { reinspectSafetyFinding } from "@/lib/safety-inspection/api-service";
import { reinspectionSchema } from "@/lib/safety-inspection/api-schemas";
import { parseSafetyJsonBody } from "@/lib/safety-inspection/http-boundary";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

type Context = { params: Promise<{ findingId: string }> };

export async function POST(request: NextRequest, route: Context) {
  const { findingId } = await route.params;
  return withSafetyRoute(request, { mutation: true }, async (context) => {
    const body = await parseSafetyJsonBody(request, reinspectionSchema);
    return {
      data: await reinspectSafetyFinding(context, findingId, {
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
      }),
    };
  });
}
