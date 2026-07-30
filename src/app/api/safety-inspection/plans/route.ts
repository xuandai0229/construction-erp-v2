import type { NextRequest } from "next/server";
import {
  createSafetyPlan,
  listSafetyPlans,
} from "@/lib/safety-inspection/api-service";
import { createSafetyPlanSchema } from "@/lib/safety-inspection/api-schemas";
import { parseSafetyJsonBody } from "@/lib/safety-inspection/http-boundary";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

export function GET(request: NextRequest) {
  return withSafetyRoute(request, { mutation: false }, async (context) => ({
    data: await listSafetyPlans(context),
  }));
}

export function POST(request: NextRequest) {
  return withSafetyRoute(request, { mutation: true }, async (context) => ({
    data: await createSafetyPlan(
      context,
      await parseSafetyJsonBody(request, createSafetyPlanSchema),
    ),
    status: 201,
  }));
}
