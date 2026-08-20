import { AIProvider, AIGenerateOptions, AIGenerateResult, AIToolCall } from "./ai-provider";

const MOCK_MODEL = "local-deterministic-readonly-v1";

function result(
  startedAt: number,
  value: Omit<AIGenerateResult, "model" | "provider" | "httpStatus" | "latencyMs" | "remote">,
): AIGenerateResult {
  return {
    ...value,
    model: MOCK_MODEL,
    provider: "mock",
    httpStatus: 200,
    latencyMs: Date.now() - startedAt,
    remote: false,
  };
}

function parseContext(messages: AIGenerateOptions["messages"]): {
  activeProjectId?: string;
  activeProjectCode?: string;
} {
  const system = messages.find((message) => message.role === "system")?.content || "";
  const marker = system.match(/<AI_REQUEST_CONTEXT>([\s\S]*?)<\/AI_REQUEST_CONTEXT>/);
  if (!marker) return {};
  try {
    const parsed = JSON.parse(marker[1]);
    return {
      activeProjectId: typeof parsed.activeProjectId === "string" ? parsed.activeProjectId : undefined,
      activeProjectCode: typeof parsed.activeProjectCode === "string" ? parsed.activeProjectCode : undefined,
    };
  } catch {
    return {};
  }
}

function latestUserText(messages: AIGenerateOptions["messages"]): string {
  return [...messages].reverse().find((message) => message.role === "user")?.content || "";
}

function projectReference(text: string, context: ReturnType<typeof parseContext>): string | undefined {
  const code = text.match(/\b[A-Z]{2,10}-\d{4}-\d{3,8}\b/i)?.[0]?.toUpperCase();
  return code || context.activeProjectId || context.activeProjectCode;
}

/** Local-only deterministic provider for Gate A development and tests. */
export class MockAIProvider implements AIProvider {
  name = "mock";

  isAvailable(): boolean {
    return true;
  }

  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const startedAt = Date.now();
    const lastMessage = options.messages.at(-1);

    if (lastMessage?.role === "tool") {
      try {
        const toolResult = JSON.parse(lastMessage.content);
        if (!toolResult.success) {
          return result(startedAt, {
            content: toolResult.error?.message || "Không thể lấy dữ liệu ERP cho yêu cầu này.",
          });
        }
        if (toolResult.coverage?.status === "NO_DATA") {
          return result(startedAt, {
            content: `${toolResult.coverage.summary} Tôi không suy diễn số liệu khi nguồn ERP chưa có dữ liệu.`,
          });
        }

        const data = toolResult.data;
        if (Array.isArray(data)) {
          const lines = data.slice(0, 5).map((item, index) => {
            const label = item.code && item.name
              ? `[${item.code}] ${item.name}`
              : item.reportNo
                ? `Báo cáo ${item.reportNo} ngày ${item.reportDate}${item.summary ? ` — ${item.summary}` : item.issues ? ` — Vấn đề: ${item.issues}` : ""}`
                : item.title || item.name || "Bản ghi ERP";
            const stock = typeof item.stock === "number" ? ` — tồn ${item.stock} ${item.unit || ""} (${item.stockStatus})` : "";
            return `${index + 1}. ${label}${stock}`;
          });
          return result(startedAt, {
            content: lines.length > 0
              ? `Dữ liệu ERP mới nhất trong phạm vi được cấp quyền:\n${lines.join("\n")}`
              : "Chưa có bản ghi ERP phù hợp trong phạm vi được cấp quyền.",
          });
        }

        if (data && typeof data === "object") {
          const detail = data as Record<string, any>;
          const progress = detail.actualProgress?.status === "AVAILABLE"
            ? `${Number(detail.actualProgress.percent).toFixed(1)}%`
            : "chưa đủ dữ liệu tiến độ đã duyệt";
          return result(startedAt, {
            content: `[${detail.code || "ERP"}] ${detail.name || "Thông tin công trình"}\n- Trạng thái: ${detail.status || "chưa xác định"}\n- Tiến độ thực tế: ${progress}\n- Hạn hoàn thành: ${detail.deadline?.label || "chưa cập nhật"}\n- Việc chờ: ${detail.pendingItemsCount ?? "không truy vấn được"}\n- Rủi ro có bằng chứng: ${detail.riskFlags?.length ? detail.riskFlags.join(", ") : "chưa có signal"}${detail.budget ? `\n- Ngân sách theo quyền hiện tại: ${detail.budget}` : ""}\n- Chất lượng dữ liệu: ${detail.dataQuality?.summary || "xem các nguồn đính kèm"}`,
          });
        }
      } catch {
        return result(startedAt, { content: "Dữ liệu công cụ không hợp lệ; tôi đã dừng để tránh đưa ra kết luận không có căn cứ." });
      }
    }

    const userText = latestUserText(options.messages);
    const normalized = userText.toLowerCase();
    const context = parseContext(options.messages);
    const projectId = projectReference(userText, context);
    const toolCalls: AIToolCall[] = [];
    const push = (name: string, args: Record<string, unknown>) => toolCalls.push({
      id: `call_local_${name}_${toolCalls.length + 1}`,
      type: "function",
      function: { name, arguments: JSON.stringify(args) },
    });

    if (/phụ trách|công trình của tôi|danh sách công trình|danh sách các dự án|dự án đang chạy/.test(normalized)) {
      push("get_my_projects", { limit: 50 });
    } else if (/việc gì cần xử lý|chờ duyệt|chờ sếp|tờ trình|pending/.test(normalized)) {
      push("get_pending_items", projectId ? { projectId, limit: 20 } : { limit: 20 });
    } else if (/báo cáo|nhật ký/.test(normalized)) {
      if (projectId) push("get_latest_field_reports", { projectId, limit: 10 });
    } else if (/vật tư|tồn kho|xi măng|thép|kho công trình/.test(normalized)) {
      if (projectId) push("get_project_material_summary", { projectId, limit: 50 });
    } else if (/tóm tắt|thông tin công trình|tiến độ|tình hình|hôm nay|ngân sách|xem kỹ|vì sao|công trình đang mở/.test(normalized)) {
      if (projectId) push("get_project_summary", { projectId });
    }

    if (toolCalls.length > 0) return result(startedAt, { content: null, toolCalls });

    if (/báo cáo|nhật ký|vật tư|tồn kho|tóm tắt|tiến độ|tình hình|xem kỹ/.test(normalized) && !projectId) {
      return result(startedAt, {
        content: "Bạn muốn tra cứu công trình nào? Hãy chọn công trình trên màn hình hoặc cho tôi mã/tên công trình.",
      });
    }

    return result(startedAt, {
      content: "Đây là chế độ mô phỏng cục bộ Gate A (không phải OpenAI thật). Tôi có thể tra cứu read-only: công trình, tiến độ, báo cáo hiện trường, tồn kho vật tư và việc đang chờ xử lý trong phạm vi quyền của bạn.",
    });
  }
}
