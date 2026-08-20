import { AIToolDefinition } from "../types";
import { getMyProjectsTool } from "../tools/get-my-projects";
import { getProjectSummaryTool } from "../tools/get-project-summary";
import { getLatestFieldReportsTool } from "../tools/get-latest-field-reports";
import { getProjectMaterialSummaryTool } from "../tools/get-project-material-summary";
import { getPendingItemsTool } from "../tools/get-pending-items";

/**
 * Authoritative Executable AI Tool Registry
 *
 * Only tools registered in this map can ever be executed by the AI Tool Gateway.
 */
export const AI_TOOL_REGISTRY: Record<string, AIToolDefinition> = {
  get_my_projects: getMyProjectsTool,
  get_project_summary: getProjectSummaryTool,
  get_latest_field_reports: getLatestFieldReportsTool,
  get_project_material_summary: getProjectMaterialSummaryTool,
  get_pending_items: getPendingItemsTool,
};

export function getRegisteredTool(toolName: string): AIToolDefinition | null {
  return AI_TOOL_REGISTRY[toolName] || null;
}

export function isToolRegistered(toolName: string): boolean {
  return Boolean(AI_TOOL_REGISTRY[toolName]);
}

export function listRegisteredTools(): Array<{ name: string; description: string; riskLevel: string }> {
  return Object.values(AI_TOOL_REGISTRY).map((tool) => ({
    name: tool.name,
    description: tool.description,
    riskLevel: tool.riskLevel,
  }));
}
