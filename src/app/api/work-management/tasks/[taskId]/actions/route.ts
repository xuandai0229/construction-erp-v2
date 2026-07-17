import { NextRequest, NextResponse } from "next/server";
import { WorkManagementDomainError } from "@/lib/work-management/errors/codes";
import { executeProductTaskAction } from "@/lib/work-management/application/product-composition";
import { TASK_ACTIONS, type TaskAction } from "@/lib/work-management/domain/types";

const messages: Record<string, string> = {
  TASK_ACCESS_DENIED: "Bạn không có quyền thực hiện thao tác này.",
  TASK_PROJECT_ACCESS_REQUIRED: "Nhiệm vụ không thuộc công trình bạn được phép truy cập.",
  TASK_CONFIDENTIAL_ACCESS_DENIED: "Bạn không có quyền truy cập nhiệm vụ bảo mật.",
  TASK_CONCURRENCY_CONFLICT: "Dữ liệu nhiệm vụ đã thay đổi. Vui lòng tải lại trước khi thao tác tiếp.",
  TASK_INVALID_TRANSITION: "Trạng thái hiện tại không cho phép thao tác này.",
  TASK_NOT_FOUND: "Không tìm thấy nhiệm vụ hoặc bạn không có quyền truy cập.",
  TASK_COMMAND_INVALID: "Dữ liệu thao tác không hợp lệ.",
};

const isAction = (value: unknown): value is TaskAction => typeof value === "string" && (TASK_ACTIONS as readonly string[]).includes(value);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export async function POST(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey) return NextResponse.json({ error: "Thiếu khóa chống lặp thao tác." }, { status: 400 });
  try {
    const body: unknown = await request.json();
    if (!isRecord(body) || !isAction(body.action) || !isRecord(body.command) || body.action === "CREATE_DRAFT") {
      return NextResponse.json({ error: "Dữ liệu thao tác không hợp lệ." }, { status: 400 });
    }
    if (body.command.taskId !== taskId) return NextResponse.json({ error: "Nhiệm vụ không hợp lệ." }, { status: 400 });
    const result = await executeProductTaskAction({ action: body.action, command: body.command, idempotencyKey });
    return NextResponse.json({ task: result.task, effects: result.effects });
  } catch (error) {
    if (error instanceof WorkManagementDomainError) {
      return NextResponse.json({ code: error.code, error: messages[error.code] ?? "Không thể thực hiện thao tác nhiệm vụ." }, { status: error.code === "TASK_NOT_FOUND" ? 404 : error.code.includes("ACCESS") || error.code.includes("PROJECT") ? 403 : 409 });
    }
    return NextResponse.json({ error: "Không thể thực hiện thao tác nhiệm vụ." }, { status: 500 });
  }
}
