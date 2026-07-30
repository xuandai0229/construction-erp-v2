import type { NextRequest } from "next/server";
import {
  getSafetyPlan,
  updateSafetyPlan,
} from "@/lib/safety-inspection/api-service";
import { updateSafetyPlanSchema } from "@/lib/safety-inspection/api-schemas";
import { parseSafetyJsonBody } from "@/lib/safety-inspection/http-boundary";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

type Context = { params: Promise<{ planId: string }> };

export async function GET(request: NextRequest, route: Context) {
  const { planId } = await route.params;
  return withSafetyRoute(request, { mutation: false }, async (context) => ({
    data: await getSafetyPlan(context, planId),
  }));
}

export async function PATCH(request: NextRequest, route: Context) {
  const { planId } = await route.params;
  return withSafetyRoute(request, { mutation: true }, async (context) => ({
    data: await updateSafetyPlan(
      context,
      planId,
      await parseSafetyJsonBody(request, updateSafetyPlanSchema),
    ),
  }));
}
