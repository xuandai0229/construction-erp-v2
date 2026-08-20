import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { executeAIChatTurn } from "@/lib/ai/controller/ai-chat-controller";
import { evaluateAIGuards } from "@/lib/ai/controller/ai-guard";
import { isUserInPilotCohort } from "@/lib/ai/pilot/ai-pilot-cohort";

export const dynamic = "force-dynamic";

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
        { status: statusCode }
      );
    }

    // 3. Parse and Validate Body
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const activeProjectId = typeof body.activeProjectId === "string" ? body.activeProjectId : undefined;
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;

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
      contextOptions: {
        explicitUser: session,
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
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
