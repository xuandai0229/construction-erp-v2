import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logAIAuditEvent } from "@/lib/ai/audit/ai-audit-logger";

const ALLOWED_FEEDBACK = new Set(["HELPFUL", "UNHELPFUL", "WRONG_DATA", "MISSING_DATA", "INCORRECT_PERMISSION", "OTHER"]);

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.id) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const traceId = typeof body.traceId === "string" && /^run_[a-zA-Z0-9-]{8,80}$/.test(body.traceId)
    ? body.traceId
    : null;
  const conversationId = typeof body.conversationId === "string" && /^conv_[a-zA-Z0-9-]{8,80}$/.test(body.conversationId)
    ? body.conversationId
    : undefined;
  const type = typeof body.type === "string" && ALLOWED_FEEDBACK.has(body.type) ? body.type : null;
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 500) : undefined;
  if (!traceId || !type) {
    return NextResponse.json({ success: false, error: { code: "INVALID_REQUEST" } }, { status: 400 });
  }

  await logAIAuditEvent({
    eventType: "USER_FEEDBACK",
    aiRunId: traceId,
    conversationId,
    requestId: crypto.randomUUID(),
    userId: session.id,
    role: session.role,
    toolName: "ai_feedback",
    toolVersion: "1.0.0",
    operation: "READ",
    riskLevel: "READ_SAFE",
    policyDecision: "ALLOW",
    confirmationRequired: false,
    rawInput: { type, commentLength: comment?.length || 0 },
    outputSummary: "Feedback stored in sanitized AI audit trail.",
    executionStatus: "SUCCESS",
    durationMs: 0,
    modelProvider: null,
    modelName: null,
    userFeedback: {
      type: type as any,
      comment,
      submittedAt: new Date().toISOString(),
    },
  });
  return NextResponse.json({ success: true });
}
