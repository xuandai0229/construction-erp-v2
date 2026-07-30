import type { NextRequest } from "next/server";
import { mutateSafetySchedule } from "@/lib/safety-inspection/api-service";
import { cancelSafetyScheduleSchema } from "@/lib/safety-inspection/api-schemas";
import { parseSafetyJsonBody } from "@/lib/safety-inspection/http-boundary";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

type Context = { params: Promise<{ scheduleId: string }> };

export async function POST(request: NextRequest, route: Context) {
  const { scheduleId } = await route.params;
  return withSafetyRoute(request, { mutation: true }, async (context) => {
    const body = await parseSafetyJsonBody(
      request,
      cancelSafetyScheduleSchema,
    );
    return {
      data: await mutateSafetySchedule(context, {
        mode: "CANCEL",
        scheduleId,
        expectedScheduleVersion: body.expectedVersion,
        expectedPlanVersion: body.expectedPlanVersion,
        clientMutationId: body.clientMutationId,
        reason: body.reason,
      }),
    };
  });
}
