import type { NextRequest } from "next/server";
import { getSafetyFinding } from "@/lib/safety-inspection/api-service";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

type Context = { params: Promise<{ findingId: string }> };

export async function GET(request: NextRequest, route: Context) {
  const { findingId } = await route.params;
  return withSafetyRoute(request, { mutation: false }, async (context) => ({
    data: await getSafetyFinding(context, findingId),
  }));
}
