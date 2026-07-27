import { NextRequest, NextResponse } from "next/server";
import { WorkManagementDomainError } from "@/lib/work-management/errors/codes";
import { executeProductTaskAction } from "@/lib/work-management/application/product-composition";
import { getSession } from "@/lib/auth";
import { writeSecurityAuditEvent } from "@/lib/audit";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập để tạo nhiệm vụ." }, { status: 401 });
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey) return NextResponse.json({ error: "Thiếu khóa chống lặp thao tác." }, { status: 400 });
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) return NextResponse.json({ error: "Dữ liệu tạo nhiệm vụ không hợp lệ." }, { status: 400 });
    const result = await executeProductTaskAction({ action: "CREATE_DRAFT", command: body, idempotencyKey });
    return NextResponse.json({ task: result.task, effects: result.effects }, { status: 201 });
  } catch (error) {
    if (error instanceof WorkManagementDomainError) {
      if (session.role === "CONSTRUCTION_SUPERVISOR") {
        await writeSecurityAuditEvent({ eventType: "SOURCE_MUTATION_DENIED", actorId: session.id, role: session.role, action: "tasks.create", resourceType: "WorkTask", resourceId: "NEW", reasonCode: error.code });
      }
      return NextResponse.json({ code: error.code, error: "Không thể tạo nhiệm vụ với quyền hoặc trạng thái hiện tại." }, { status: error.code.includes("ACCESS") || error.code.includes("PROJECT") || error.code.includes("PERMISSION") ? 403 : 409 });
    }
    return NextResponse.json({ error: "Không thể tạo nhiệm vụ." }, { status: 500 });
  }
}
