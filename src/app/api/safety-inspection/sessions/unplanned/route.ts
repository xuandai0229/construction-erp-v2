import type { NextRequest } from "next/server";
import { startSafetySession } from "@/lib/safety-inspection/api-service";
import { unplannedSafetySessionSchema } from "@/lib/safety-inspection/api-schemas";
import { parseSafetyJsonBody } from "@/lib/safety-inspection/http-boundary";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

export function POST(request: NextRequest) {
  return withSafetyRoute(request, { mutation: true }, async (context) => ({
    data: await startSafetySession(context, {
      kind: "UNPLANNED",
      ...(await parseSafetyJsonBody(request, unplannedSafetySessionSchema)),
    }),
    status: 201,
  }));
}
