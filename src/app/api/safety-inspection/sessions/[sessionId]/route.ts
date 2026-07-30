import type { NextRequest } from "next/server";
import { getSafetySession } from "@/lib/safety-inspection/api-service";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

type Context = { params: Promise<{ sessionId: string }> };

export async function GET(request: NextRequest, route: Context) {
  const { sessionId } = await route.params;
  return withSafetyRoute(request, { mutation: false }, async (context) => ({
    data: await getSafetySession(context, sessionId),
  }));
}
