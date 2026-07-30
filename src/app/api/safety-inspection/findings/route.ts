import type { NextRequest } from "next/server";
import { listSafetyFindings } from "@/lib/safety-inspection/api-service";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

export function GET(request: NextRequest) {
  return withSafetyRoute(request, { mutation: false }, async (context) => ({
    data: await listSafetyFindings(
      context,
      request.nextUrl.searchParams.get("projectId") ?? undefined,
    ),
  }));
}
