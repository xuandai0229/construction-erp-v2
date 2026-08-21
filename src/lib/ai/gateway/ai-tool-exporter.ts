import { AI_TOOL_REGISTRY } from "../registry/ai-tool-registry";
import { AIToolExportDefinition } from "../provider/ai-provider";

/**
 * Standard JSON Schemas for the 5 active Read Tools
 * Enforces OpenAI Responses API Strict Mode (strict: true, additionalProperties: false, required)
 */
const STRICT_TOOL_JSON_SCHEMAS: Record<string, Record<string, unknown>> = {
  get_my_projects: {
    type: "object",
    properties: {
      limit: {
        type: ["integer", "null"],
        description: "Số lượng công trình tối đa cần lấy (1-100, mặc định 50)",
      },
      search: {
        type: ["string", "null"],
        description: "Từ khóa tìm kiếm theo mã, tên hoặc tên hiển thị của công trình",
      },
    },
    required: ["limit", "search"],
    additionalProperties: false,
  },
  get_project_summary: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Mã ID duy nhất hoặc mã code của công trình (bắt buộc, ví dụ: 'CT-2026-0002')",
      },
    },
    required: ["projectId"],
    additionalProperties: false,
  },
  get_latest_field_reports: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Mã ID duy nhất hoặc mã code của công trình (bắt buộc, ví dụ: 'CT-2026-0002')",
      },
      limit: {
        type: ["integer", "null"],
        description: "Số lượng nhật ký thi công gần nhất cần lấy (1-50, mặc định 10)",
      },
      status: {
        type: ["string", "null"],
        enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "REVISION_REQUESTED", "LOCKED", "CANCELLED", null],
        description: "Lọc theo trạng thái nhật ký thi công",
      },
    },
    required: ["projectId", "limit", "status"],
    additionalProperties: false,
  },
  get_project_material_summary: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Mã ID duy nhất hoặc mã code của công trình (bắt buộc, ví dụ: 'CT-2026-0002')",
      },
      limit: {
        type: ["integer", "null"],
        description: "Số lượng danh mục vật tư cần lấy (1-100, mặc định 50)",
      },
      search: {
        type: ["string", "null"],
        description: "Từ khóa tìm kiếm tên, mã hoặc mô tả vật tư",
      },
    },
    required: ["projectId", "limit", "search"],
    additionalProperties: false,
  },
  get_pending_items: {
    type: "object",
    properties: {
      projectId: {
        type: ["string", "null"],
        description: "Lọc theo ID hoặc mã code công trình cụ thể (tùy chọn)",
      },
      limit: {
        type: ["integer", "null"],
        description: "Số lượng mục chờ duyệt tối đa (1-50, mặc định 20)",
      },
    },
    required: ["projectId", "limit"],
    additionalProperties: false,
  },
};

/**
 * Exports executable AI Tools to standard Function Calling definitions.
 *
 * Security Invariants:
 * 1. Exactly 5 Read Tools allowed in Phase 1B (ACTIVE_EXECUTABLE_AI_TOOLS === 5).
 * 2. Zero Write, Mutation, Delete, or Raw SQL tools are ever exported.
 * 3. Enforces strict: true on OpenAI function calling format.
 * 4. Supports dynamic tool filtering to reduce prompt token footprint.
 */
export function exportAIToolDefinitions(allowedToolNames?: string[]): AIToolExportDefinition[] {
  const toolEntries = Object.entries(AI_TOOL_REGISTRY);

  // Assertion: Exactly 5 active tools allowed in registry
  if (toolEntries.length !== 5) {
    throw new Error(`SECURITY ASSERTION FAILED: Expected exactly 5 registered AI tools, found ${toolEntries.length}`);
  }

  const exported: AIToolExportDefinition[] = [];

  for (const [name, tool] of toolEntries) {
    if (allowedToolNames && !allowedToolNames.includes(name)) {
      continue;
    }

    if (tool.operation !== "READ" || tool.riskLevel !== "READ_SAFE" || !tool.aiAllowed) {
      throw new Error(`SECURITY VIOLATION: Tool '${name}' has non-read attributes and cannot be exported to LLM.`);
    }

    const parameters = STRICT_TOOL_JSON_SCHEMAS[name];
    if (!parameters) {
      throw new Error(`MISSING_SCHEMA: Tool '${name}' does not have a registered strict JSON schema.`);
    }

    exported.push({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters,
        strict: true,
      } as any,
    });
  }

  return exported;
}
