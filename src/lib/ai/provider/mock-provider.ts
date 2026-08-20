import { AIProvider, AIGenerateOptions, AIGenerateResult, AIToolCall } from "./ai-provider";

/**
 * Deterministic Mock AI Provider
 *
 * Simulates intelligent LLM tool calling and text synthesis without external API dependencies.
 * Perfect for offline CI, automated regression, and deterministic red-team simulations.
 */
export class MockAIProvider implements AIProvider {
  name = "mock";

  isAvailable(): boolean {
    return true;
  }

  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const lastMessage = options.messages[options.messages.length - 1];

    // 1. If last message is a TOOL result, synthesize assistant answer
    if (lastMessage?.role === "tool") {
      try {
        const toolResult = JSON.parse(lastMessage.content);
        if (!toolResult.success && toolResult.policyDecision === "DENY") {
          return {
            content: "Bạn không có quyền truy cập thông tin của công trình này theo chính sách phân quyền của hệ thống.",
            model: "mock-gpt-4o",
            provider: "mock",
            usage: { promptTokens: 150, completionTokens: 40, totalTokens: 190 },
          };
        }

        const data = toolResult.data;
        if (Array.isArray(data) && data.length === 0) {
          return {
            content: "Chưa có dữ liệu phù hợp trong hệ thống cho yêu cầu này.",
            model: "mock-gpt-4o",
            provider: "mock",
            usage: { promptTokens: 120, completionTokens: 25, totalTokens: 145 },
          };
        }

        if (Array.isArray(data)) {
          const summaryList = data
            .slice(0, 5)
            .map((item, idx) => {
              if (item.code && item.name) return `${idx + 1}. [${item.code}] ${item.name} (${item.status || "Đang hoạt động"})`;
              if (item.reportNo) return `${idx + 1}. Báo cáo số ${item.reportNo} ngày ${item.reportDate} (${item.status})`;
              if (item.title) return `${idx + 1}. ${item.title} (${item.status})`;
              return `${idx + 1}. ${JSON.stringify(item)}`;
            })
            .join("\n");

          return {
            content: `Dưới đây là thông tin được cập nhật từ hệ thống ERP:\n\n${summaryList}\n\n*Nguồn dữ liệu: Hệ thống ERP Xây dựng construction-erp-v2*`,
            model: "mock-gpt-4o",
            provider: "mock",
            usage: { promptTokens: 200, completionTokens: 80, totalTokens: 280 },
          };
        }

        if (data && typeof data === "object") {
          const detail = data as any;
          return {
            content: `Thông tin công trình [${detail.code}] ${detail.name}:\n- Trạng thái: ${detail.status}\n- Địa điểm: ${detail.location || "Chưa cập nhật"}\n- Thành viên tích cực: ${detail.stats?.activeMembersCount || 0}\n- Số lượng báo cáo: ${detail.stats?.siteReportsCount || 0}\n\n*Nguồn: Dữ liệu công trình ${detail.code}*`,
            model: "mock-gpt-4o",
            provider: "mock",
            usage: { promptTokens: 180, completionTokens: 60, totalTokens: 240 },
          };
        }

        return {
          content: "Đã trích xuất thông tin thành công từ hệ thống.",
          model: "mock-gpt-4o",
          provider: "mock",
        };
      } catch {
        return {
          content: "Đã xử lý xong dữ liệu.",
          model: "mock-gpt-4o",
          provider: "mock",
        };
      }
    }

    // 2. If user message, interpret intent and return structured tool call
    const userText = (lastMessage?.content || "").toLowerCase();

    const toolCalls: AIToolCall[] = [];

    if (
      userText.includes("phụ trách") ||
      userText.includes("công trình của tôi") ||
      userText.includes("danh sách công trình") ||
      userText.includes("danh sách các dự án") ||
      userText.includes("dự án đang chạy")
    ) {
      toolCalls.push({
        id: "call_mock_projects_1",
        type: "function",
        function: {
          name: "get_my_projects",
          arguments: JSON.stringify({ limit: 50 }),
        },
      });
    } else if (userText.includes("báo cáo") || userText.includes("nhật ký")) {
      // Extract projectId if mentioned or match CT-2026-XXXX
      const match = userText.match(/ct-2026-\d{4}/i);
      const projectId = match ? match[0].toUpperCase() : "CT-2026-0002";
      toolCalls.push({
        id: "call_mock_reports_1",
        type: "function",
        function: {
          name: "get_latest_field_reports",
          arguments: JSON.stringify({ projectId, limit: 10 }),
        },
      });
    } else if (
      userText.includes("vật tư") ||
      userText.includes("tồn kho") ||
      userText.includes("xi măng") ||
      userText.includes("thép") ||
      userText.includes("kho công trình")
    ) {
      const match = userText.match(/ct-2026-\d{4}/i);
      const projectId = match ? match[0].toUpperCase() : "CT-2026-0002";
      toolCalls.push({
        id: "call_mock_materials_1",
        type: "function",
        function: {
          name: "get_project_material_summary",
          arguments: JSON.stringify({ projectId, limit: 50 }),
        },
      });
    } else if (
      userText.includes("việc gì cần xử lý") ||
      userText.includes("chờ duyệt") ||
      userText.includes("chờ sếp") ||
      userText.includes("tờ trình") ||
      userText.includes("pending")
    ) {
      toolCalls.push({
        id: "call_mock_pending_1",
        type: "function",
        function: {
          name: "get_pending_items",
          arguments: JSON.stringify({ limit: 20 }),
        },
      });
    } else if (
      userText.includes("tóm tắt") ||
      userText.includes("thông tin công trình") ||
      userText.includes("tài chính") ||
      userText.includes("dữ liệu") ||
      userText.includes("ngân sách")
    ) {
      const match = userText.match(/ct-2026-\d{4}/i);
      const projectId = match ? match[0].toUpperCase() : "CT-2026-0002";
      toolCalls.push({
        id: "call_mock_summary_1",
        type: "function",
        function: {
          name: "get_project_summary",
          arguments: JSON.stringify({ projectId }),
        },
      });
    }

    if (toolCalls.length > 0) {
      return {
        content: null,
        toolCalls,
        model: "mock-gpt-4o",
        provider: "mock",
        usage: { promptTokens: 80, completionTokens: 30, totalTokens: 110 },
      };
    }

    // Default general response if not matching 5 tools
    return {
      content: "Tôi là Trợ lý AI Read-Only nội bộ của hệ thống ERP Xây dựng construction-erp-v2. Tôi có thể hỗ trợ bạn tra cứu danh sách công trình, xem tóm tắt tiến độ, báo cáo hiện trường, tình hình vật tư và các công việc đang chờ xử lý trong phạm vi phân quyền của bạn.",
      model: "mock-gpt-4o",
      provider: "mock",
      usage: { promptTokens: 60, completionTokens: 50, totalTokens: 110 },
    };
  }
}
