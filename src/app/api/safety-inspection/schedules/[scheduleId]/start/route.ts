import type { NextRequest } from "next/server";
import { startSafetySession } from "@/lib/safety-inspection/api-service";
import { startSafetySessionSchema } from "@/lib/safety-inspection/api-schemas";
import { parseSafetyJsonBody } from "@/lib/safety-inspection/http-boundary";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

type Context = { params: Promise<{ scheduleId: string }> };

export async function POST(request: NextRequest, route: Context) {
  const { scheduleId } = await route.params;
  return withSafetyRoute(request, { mutation: true }, async (context) => {
    const body = await parseSafetyJsonBody(
      request,
      startSafetySessionSchema,
    );
    return {
      data: await startSafetySession(context, {
        kind: "SCHEDULED",
        scheduleId,
        expectedVersion: body.expectedVersion,
        clientMutationId: body.clientMutationId,
        occurredAt: body.occurredAt,
        shift: body.shift,
        location: body.location,
      }),
      status: 201,
    };
  });
}
