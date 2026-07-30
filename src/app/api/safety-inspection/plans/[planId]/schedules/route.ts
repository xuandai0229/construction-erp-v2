import type { NextRequest } from "next/server";
import { mutateSafetySchedule } from "@/lib/safety-inspection/api-service";
import { safetyScheduleSchema } from "@/lib/safety-inspection/api-schemas";
import { parseSafetyJsonBody } from "@/lib/safety-inspection/http-boundary";
import { configuredScheduleDataFromBody } from "@/lib/safety-inspection/route-inputs";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

type Context = { params: Promise<{ planId: string }> };

export async function POST(request: NextRequest, route: Context) {
  const { planId } = await route.params;
  return withSafetyRoute(request, { mutation: true }, async (context) => {
    const body = await parseSafetyJsonBody(request, safetyScheduleSchema);
    return {
      data: await mutateSafetySchedule(context, {
        mode: "CREATE",
        planId,
        expectedPlanVersion: body.expectedPlanVersion,
        clientMutationId: body.clientMutationId,
        data: configuredScheduleDataFromBody(body),
      }),
      status: 201,
    };
  });
}
