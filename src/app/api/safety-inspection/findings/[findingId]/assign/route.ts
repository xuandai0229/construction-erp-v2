import type { NextRequest } from "next/server";
import { assignSafetyFinding } from "@/lib/safety-inspection/api-service";
import { assignSafetyFindingSchema } from "@/lib/safety-inspection/api-schemas";
import { parseSafetyJsonBody } from "@/lib/safety-inspection/http-boundary";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

type Context = { params: Promise<{ findingId: string }> };

export async function POST(request: NextRequest, route: Context) {
  const { findingId } = await route.params;
  return withSafetyRoute(request, { mutation: true }, async (context) => ({
    data: await assignSafetyFinding(
      context,
      findingId,
      await parseSafetyJsonBody(request, assignSafetyFindingSchema),
    ),
  }));
}
