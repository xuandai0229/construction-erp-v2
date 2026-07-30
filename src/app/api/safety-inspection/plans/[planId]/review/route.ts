import type { NextRequest } from "next/server";
import { decideSafetyPlan } from "@/lib/safety-inspection/api-service";
import { planDecisionSchema } from "@/lib/safety-inspection/api-schemas";
import { SafetyApiError } from "@/lib/safety-inspection/errors";
import { parseSafetyJsonBody } from "@/lib/safety-inspection/http-boundary";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

type Context = { params: Promise<{ planId: string }> };

export async function POST(request: NextRequest, route: Context) {
  const { planId } = await route.params;
  return withSafetyRoute(request, { mutation: true }, async (context) => {
    const body = await parseSafetyJsonBody(request, planDecisionSchema);
    if (body.decision === "SUBMIT") {
      throw new SafetyApiError(
        "SAFETY_VALIDATION_FAILED",
        "Quyết định rà soát không hợp lệ.",
      );
    }
    return { data: await decideSafetyPlan(context, planId, body) };
  });
}
