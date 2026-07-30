import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import {
  mapSafetyError,
  safetyErrorStatus,
} from "./errors";
import { assertSafetySameOrigin } from "./http-boundary";
import {
  getSafetyServerActorContext,
  type SafetyServerActorContext,
} from "./server-actor-context";

export async function withSafetyRoute(
  request: NextRequest,
  options: { mutation: boolean },
  handler: (
    context: SafetyServerActorContext,
  ) => Promise<{ data: unknown; status?: number }>,
): Promise<NextResponse> {
  let correlationId =
    request.headers.get("x-correlation-id") ?? "safety-pending";
  try {
    if (options.mutation) assertSafetySameOrigin(request);
    const context = await getSafetyServerActorContext();
    correlationId = context.correlationId;
    const result = await handler(context);
    return NextResponse.json(
      { data: result.data, correlationId },
      { status: result.status ?? 200 },
    );
  } catch (error) {
    const dto = mapSafetyError(error, correlationId);
    console.error(
      JSON.stringify({
        component: "safety-api",
        correlationId,
        code: dto.code,
        error: error instanceof Error ? error.message : "Lỗi không xác định",
      }),
    );
    return NextResponse.json(
      { error: dto },
      { status: safetyErrorStatus(error, dto.code) },
    );
  }
}
