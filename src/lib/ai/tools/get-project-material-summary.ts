import { z } from "zod";
import prisma from "@/lib/prisma";
import { AIToolDefinition, AIToolPayload } from "../types";

export const getProjectMaterialSummaryInputSchema = z
  .object({
    projectId: z.string().min(1, "Mã ID hoặc mã Code của công trình không được để trống"),
    limit: z.number().int().min(1).max(100).optional().default(50),
    search: z.string().max(100).optional(),
  })
  .strict();

export type GetProjectMaterialSummaryInput = z.infer<typeof getProjectMaterialSummaryInputSchema>;

export interface ProjectMaterialStockDTO {
  stockId: string;
  materialItemId: string;
  code: string;
  name: string;
  unit: string;
  stock: number;
  minStockLevel: number;
  stockStatus: "OUT_OF_STOCK" | "LOW_STOCK" | "AVAILABLE";
  lastUpdated: string;
  lastMovement: {
    type: string;
    quantity: number;
    movementDate: string;
  } | null;
}

export const getProjectMaterialSummaryTool: AIToolDefinition<
  GetProjectMaterialSummaryInput,
  AIToolPayload<ProjectMaterialStockDTO[]>
> = {
  name: "get_project_material_summary",
  version: "2.0.0",
  description: "Lấy tồn kho vật tư thực tế của công trình; không dùng danh mục vật tư thay thế cho số liệu tồn kho.",
  riskLevel: "READ_SAFE",
  operation: "READ",
  aiAllowed: true,
  requiresProjectScopeCheck: true,
  inputSchema: getProjectMaterialSummaryInputSchema,
  execute: async (input: GetProjectMaterialSummaryInput) => {
    const asOf = new Date();
    const stocks = await prisma.projectMaterialStock.findMany({
      where: {
        projectId: input.projectId,
        materialItem: {
          is: {
            isActive: true,
            ...(input.search?.trim()
              ? {
                  OR: [
                    { name: { contains: input.search.trim(), mode: "insensitive" as const } },
                    { code: { contains: input.search.trim(), mode: "insensitive" as const } },
                  ],
                }
              : {}),
          },
        },
      },
      take: Math.min(input.limit || 50, 100),
      orderBy: { materialItem: { code: "asc" } },
      select: {
        id: true,
        projectId: true,
        stock: true,
        minStockLevel: true,
        lastUpdated: true,
        materialItem: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true,
            movements: {
              where: { projectId: input.projectId },
              take: 1,
              orderBy: { movementDate: "desc" },
              select: { type: true, quantity: true, movementDate: true },
            },
          },
        },
      },
    });

    const data: ProjectMaterialStockDTO[] = stocks.map((row) => {
      const stock = Number(row.stock);
      const minStockLevel = Number(row.minStockLevel);
      const latestMovement = row.materialItem.movements[0];
      return {
        stockId: row.id,
        materialItemId: row.materialItem.id,
        code: row.materialItem.code,
        name: row.materialItem.name,
        unit: row.materialItem.unit,
        stock,
        minStockLevel,
        stockStatus: stock <= 0 ? "OUT_OF_STOCK" : stock <= minStockLevel ? "LOW_STOCK" : "AVAILABLE",
        lastUpdated: row.lastUpdated.toISOString(),
        lastMovement: latestMovement
          ? {
              type: latestMovement.type,
              quantity: Number(latestMovement.quantity),
              movementDate: latestMovement.movementDate.toISOString(),
            }
          : null,
      };
    });
    const lowStockCount = data.filter((item) => item.stockStatus !== "AVAILABLE").length;

    return {
      data,
      asOf: asOf.toISOString(),
      coverage: {
        status: data.length > 0 ? "AVAILABLE" : "NO_DATA",
        summary: data.length > 0
          ? `${data.length} dòng tồn kho thực tế; ${lowStockCount} dòng hết hoặc dưới ngưỡng.`
          : "Chưa có dữ liệu tồn kho cho công trình; danh mục vật tư không được dùng làm số tồn thay thế.",
        domains: { materialStock: data.length > 0 ? "AVAILABLE" : "NO_DATA" },
      },
      qualityFlags: [
        ...(data.length === 0 ? ["NO_MATERIAL_STOCK_DATA"] : []),
        ...(data.some((item) => item.lastMovement === null) ? ["MISSING_MOVEMENT_HISTORY"] : []),
      ],
      warnings: data.length === 0
        ? ["Không thể kết luận tình hình tồn kho khi chưa có ProjectMaterialStock."]
        : [],
      sources: data.map((item) => ({
        sourceType: "MATERIAL_STOCK" as const,
        recordId: item.stockId,
        projectId: input.projectId,
        title: `${item.code} — ${item.name}`,
        route: `/materials?projectId=${encodeURIComponent(input.projectId)}`,
        asOf: item.lastUpdated,
        label: item.code,
      })),
    };
  },
};
