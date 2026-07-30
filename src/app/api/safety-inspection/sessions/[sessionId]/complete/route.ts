import type { NextRequest } from "next/server";
import { completeSafetySession } from "@/lib/safety-inspection/api-service";
import { completeSafetySessionSchema } from "@/lib/safety-inspection/api-schemas";
import { parseSafetyJsonBody } from "@/lib/safety-inspection/http-boundary";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

type Context = { params: Promise<{ sessionId: string }> };

export async function POST(request: NextRequest, route: Context) {
  const { sessionId } = await route.params;
  return withSafetyRoute(request, { mutation: true }, async (context) => ({
    data: await completeSafetySession(
      context,
      sessionId,
      await parseSafetyJsonBody(request, completeSafetySessionSchema),
    ),
  }));
}
