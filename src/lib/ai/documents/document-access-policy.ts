/**
 * DOCUMENT ACCESS POLICY & AUTHORIZATION GATEWAY
 * Server-authoritative document security for Construction RAG
 */

import { AIRequestContext } from '../types';
import { DocumentIntelligenceStatus } from './document-brain-contracts';
import { UserRole, DocumentStatus } from '@prisma/client';

export interface DocumentRetrievalScope {
  userId: string;
  userRole: string;
  isGlobal: boolean;
  allowedProjectIds: string[];
  allowedProjectCodes?: string[];
  allowedStatuses: DocumentIntelligenceStatus[];
  includeDrafts: boolean;
  canAccessSensitiveContracts: boolean;
}

/**
 * Resolves the server-authoritative document retrieval scope for a given AI context.
 * Invariant: Never allow vector or keyword retrieval to search outside this scope.
 */
export function resolveDocumentRetrievalScope(
  context: AIRequestContext,
  targetProjectId?: string | null,
  targetProjectCode?: string | null
): DocumentRetrievalScope {
  const role = (context.role || context.userRole) as UserRole;
  const isGlobalManager =
    context.projectScope.kind === "ALL_PROJECTS" ||
    role === UserRole.ADMIN ||
    role === UserRole.DIRECTOR ||
    role === UserRole.DEPUTY_DIRECTOR;

  let allowedProjectIds: string[] = [];
  let allowedProjectCodes: string[] = [];

  if (isGlobalManager) {
    // Global managers can access all documents across authorized projects
    if (targetProjectId) {
      allowedProjectIds = [targetProjectId];
      if (targetProjectCode) allowedProjectCodes = [targetProjectCode];
    } else {
      allowedProjectIds = ["ALL_AUTHORIZED_PROJECTS"];
    }
  } else if (context.projectScope.kind === "PROJECT_IDS") {
    // Scoped users can only access their explicitly assigned projects
    const userProjects = context.projectScope.projectIds;
    if (targetProjectId) {
      if (userProjects.includes(targetProjectId)) {
        allowedProjectIds = [targetProjectId];
        if (targetProjectCode) allowedProjectCodes = [targetProjectCode];
      } else {
        // Hard deny if project is outside scope
        allowedProjectIds = [];
        allowedProjectCodes = [];
      }
    } else {
      allowedProjectIds = userProjects;
    }
  } else {
    allowedProjectIds = [];
    allowedProjectCodes = [];
  }

  // Determine allowed document statuses based on role
  const isCommanderOrManager =
    isGlobalManager ||
    role === UserRole.CHIEF_COMMANDER ||
    role === UserRole.MANAGER ||
    role === UserRole.ENGINEER;

  const allowedStatuses: DocumentIntelligenceStatus[] = [
    "APPROVED",
    "SUBMITTED",
    "UNDER_REVIEW",
  ];

  if (isCommanderOrManager) {
    allowedStatuses.push("DRAFT");
    allowedStatuses.push("SUPERSEDED");
  }

  const canAccessSensitiveContracts = isGlobalManager || role === UserRole.CHIEF_COMMANDER;

  return {
    userId: context.userId,
    userRole: role,
    isGlobal: isGlobalManager,
    allowedProjectIds,
    allowedProjectCodes,
    allowedStatuses,
    includeDrafts: isCommanderOrManager,
    canAccessSensitiveContracts,
  };
}

/**
 * Validates whether a specific document chunk can be returned to the user.
 * Provides defense-in-depth even after hybrid retrieval.
 */
export function isDocumentChunkAuthorized(
  chunkProjectId: string,
  chunkStatus: DocumentIntelligenceStatus,
  scope: DocumentRetrievalScope,
  chunkProjectCode?: string
): boolean {
  let isProjectAllowed = false;

  if (scope.isGlobal) {
    if (scope.allowedProjectIds.includes("ALL_AUTHORIZED_PROJECTS")) {
      isProjectAllowed = true;
    } else if (scope.allowedProjectIds.includes(chunkProjectId) || (chunkProjectCode && scope.allowedProjectCodes?.includes(chunkProjectCode))) {
      isProjectAllowed = true;
    }
  } else {
    isProjectAllowed =
      scope.allowedProjectIds.includes(chunkProjectId) ||
      (!!chunkProjectCode && (scope.allowedProjectCodes || []).includes(chunkProjectCode));
  }

  if (!isProjectAllowed) {
    return false;
  }

  if (!scope.allowedStatuses.includes(chunkStatus)) {
    return false;
  }

  return true;
}
