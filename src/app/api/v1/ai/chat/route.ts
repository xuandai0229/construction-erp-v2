import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { executeAIChatTurn } from "@/lib/ai/controller/ai-chat-controller";
import { evaluateAIGuards } from "@/lib/ai/controller/ai-guard";
import { isUserInPilotCohort } from "@/lib/ai/pilot/ai-pilot-cohort";
import { getAIProviderStatus } from "@/lib/ai/provider/provider-mode";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.id) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    pilotEligible: isUserInPilotCohort(session),
    providerStatus: getAIProviderStatus(),
  });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication Check (Server-side Session)
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.",
          },
        },
        { status: 401 }
      );
    }

    // 2. Pilot Cohort Gate Check (Only the 4 enrolled pilot users can access during Phase 1B)
    if (!isUserInPilotCohort(session)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PILOT_COHORT_RESTRICTED",
            message: "Tính năng Trợ lý AI hiện đang trong giai đoạn thử nghiệm giới hạn (Internal Pilot). Tài khoản của bạn chưa nằm trong danh sách thử nghiệm đợt này.",
          },
        },
        { status: 403 }
      );
    }

    // 3. 2-Layer Kill-Switch & Per-User Rate Limit Guard
    const guardResult = await evaluateAIGuards(session.id);
    if (!guardResult.allowed) {
      const statusCode = guardResult.code === "RATE_LIMITED" ? 429 : 503;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: guardResult.code || "FEATURE_DISABLED",
            message: guardResult.message || "Dịch vụ AI hiện không khả dụng.",
          },
        },
        {
          status: statusCode,
          headers: guardResult.retryAfterSeconds
            ? { "Retry-After": String(guardResult.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    // 3. Parse and Validate Body
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body.messages)
      ? body.messages
          .filter((message: unknown): message is { role: "user" | "assistant"; content: string } => {
            if (!message || typeof message !== "object") return false;
            const candidate = message as Record<string, unknown>;
            return (candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string";
          })
          .slice(-12)
      : [];
    const activeProjectId = typeof body.activeProjectId === "string" ? body.activeProjectId : undefined;
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
    const uiContext = body.uiContext && typeof body.uiContext === "object"
      ? {
          route: typeof body.uiContext.route === "string" ? body.uiContext.route : undefined,
          recordType: typeof body.uiContext.recordType === "string" ? body.uiContext.recordType : undefined,
          recordId: typeof body.uiContext.recordId === "string" ? body.uiContext.recordId : undefined,
        }
      : undefined;

    if (messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Danh sách tin nhắn không được để trống.",
          },
        },
        { status: 400 }
      );
    }

    // 4. Execute AI Turn
    const result = await executeAIChatTurn({
      messages,
      activeProjectId,
      conversationId,
      uiContext,
      contextOptions: {
        explicitUser: session,
      },
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : result.httpStatus || 500,
      headers: result.error?.retryAfterSeconds
        ? { "Retry-After": String(result.error.retryAfterSeconds) }
        : undefined,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Không thể hoàn thành yêu cầu AI lúc này. Vui lòng thử lại sau.",
        },
      },
      { status: 500 }
    );
  }
}
