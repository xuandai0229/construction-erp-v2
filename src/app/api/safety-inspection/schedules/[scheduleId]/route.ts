import type { NextRequest } from "next/server";
import { mutateSafetySchedule } from "@/lib/safety-inspection/api-service";
import { safetyScheduleSchema } from "@/lib/safety-inspection/api-schemas";
import { SafetyApiError } from "@/lib/safety-inspection/errors";
import { parseSafetyJsonBody } from "@/lib/safety-inspection/http-boundary";
import { configuredScheduleDataFromBody } from "@/lib/safety-inspection/route-inputs";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

type Context = { params: Promise<{ scheduleId: string }> };

export async function PATCH(request: NextRequest, route: Context) {
  const { scheduleId } = await route.params;
  return withSafetyRoute(request, { mutation: true }, async (context) => {
    const body = await parseSafetyJsonBody(request, safetyScheduleSchema);
    if (!body.expectedScheduleVersion) {
      throw new SafetyApiError(
        "SAFETY_VALIDATION_FAILED",
        "Thiếu phiên bản lịch kiểm tra.",
      );
    }
    return {
      data: await mutateSafetySchedule(context, {
        mode: "UPDATE",
        scheduleId,
        expectedScheduleVersion: body.expectedScheduleVersion,
        expectedPlanVersion: body.expectedPlanVersion,
        clientMutationId: body.clientMutationId,
        data: configuredScheduleDataFromBody(body),
      }),
    };
  });
}
