import prisma from "@/lib/prisma";
import { projectScopeWhere } from "@/lib/rbac";
import { AIRequestContext } from "../types";

export interface ResolvedProjectResult {
  matchType: "EXACT" | "FUZZY" | "AMBIGUOUS" | "NOT_FOUND" | "SCOPE_DENIED";
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  ambiguousCandidates?: Array<{ id: string; code: string; name: string }>;
}

/**
 * Safe Server-Side Entity & Project Resolver
 *
 * Resolves natural language project names or codes against authorized projects.
 * Prevents LLM from fabricating non-existent IDs.
 */
export async function resolveProjectMention(
  mention: string,
  context: AIRequestContext
): Promise<ResolvedProjectResult> {
  const cleanMention = mention.trim().toLowerCase();
  if (!cleanMention) {
    return { matchType: "NOT_FOUND" };
  }

  const scopeWhere = projectScopeWhere(context.projectScope);

  // 1. Resolve exact ID/code inside the authoritative project scope.
  const exactMatch = await prisma.project.findFirst({
    where: {
      ...scopeWhere,
      OR: [
        { id: cleanMention },
        { code: { equals: cleanMention, mode: "insensitive" } },
      ],
      deletedAt: null,
    },
    select: { id: true, code: true, name: true },
  });

  if (exactMatch) {
    return {
      matchType: "EXACT",
      projectId: exactMatch.id,
      projectCode: exactMatch.code,
      projectName: exactMatch.name,
    };
  }

  // 2. Distinguish an exact but unauthorized entity without exposing its details.
  const exactOutsideScope = await prisma.project.findFirst({
    where: {
      OR: [
        { id: cleanMention },
        { code: { equals: cleanMention, mode: "insensitive" } },
      ],
      deletedAt: null,
    },
    select: { id: true },
  });

  if (exactOutsideScope) return { matchType: "SCOPE_DENIED" };

  // 3. Search by name/displayName only inside scope.
  const matchingProjects = await prisma.project.findMany({
    where: {
      ...scopeWhere,
      OR: [
        { name: { contains: cleanMention, mode: "insensitive" } },
        { displayName: { contains: cleanMention, mode: "insensitive" } },
      ],
      deletedAt: null,
    },
    take: 5,
    select: { id: true, code: true, name: true },
  });

  if (matchingProjects.length === 1) {
    const single = matchingProjects[0];
    return {
      matchType: "FUZZY",
      projectId: single.id,
      projectCode: single.code,
      projectName: single.name,
    };
  }

  if (matchingProjects.length > 1) {
    return {
      matchType: "AMBIGUOUS",
      ambiguousCandidates: matchingProjects,
    };
  }

  return { matchType: "NOT_FOUND" };
}
