import type { NextRequest } from "next/server";
import { getActiveSafetyChecklist } from "@/lib/safety-inspection/api-service";
import { constructionTypeSchema } from "@/lib/safety-inspection/api-schemas";
import { SafetyApiError } from "@/lib/safety-inspection/errors";
import { withSafetyRoute } from "@/lib/safety-inspection/route-runtime";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return withSafetyRoute(request, { mutation: false }, async (context) => {
    const parsed = constructionTypeSchema.safeParse(
      request.nextUrl.searchParams.get("constructionType"),
    );
    if (!parsed.success) {
      throw new SafetyApiError(
        "SAFETY_VALIDATION_FAILED",
        "Loại công trình không hợp lệ.",
      );
    }
    return { data: await getActiveSafetyChecklist(context, parsed.data) };
  });
}
