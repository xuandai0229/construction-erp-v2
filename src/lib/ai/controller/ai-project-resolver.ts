import prisma from "@/lib/prisma";
import { projectScopeWhere } from "@/lib/rbac";
import { AIRequestContext } from "../types";

export interface ResolvedProjectResult {
  matchType: "EXACT" | "FUZZY" | "AMBIGUOUS" | "NOT_FOUND";
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

  // 1. Check exact match by code (e.g. "CT-2026-0002")
  const codeMatch = await prisma.project.findFirst({
    where: {
      ...scopeWhere,
      code: { equals: cleanMention, mode: "insensitive" },
      deletedAt: null,
    },
    select: { id: true, code: true, name: true },
  });

  if (codeMatch) {
    return {
      matchType: "EXACT",
      projectId: codeMatch.id,
      projectCode: codeMatch.code,
      projectName: codeMatch.name,
    };
  }

  // 2. Check exact match by ID
  const idMatch = await prisma.project.findFirst({
    where: {
      ...scopeWhere,
      id: cleanMention,
      deletedAt: null,
    },
    select: { id: true, code: true, name: true },
  });

  if (idMatch) {
    return {
      matchType: "EXACT",
      projectId: idMatch.id,
      projectCode: idMatch.code,
      projectName: idMatch.name,
    };
  }

  // 3. Search by name / displayName contains
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
