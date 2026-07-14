-- Generated from the QA schema with `prisma migrate diff`; this migration is
-- intentionally additive and leaves the legacy WBSItem data untouched.

CREATE TYPE "ProjectLocationNodeType" AS ENUM ('PROJECT', 'ZONE', 'BLOCK', 'BUILDING', 'BASEMENT', 'FLOOR', 'AREA', 'ROOM', 'AXIS', 'ELEVATION', 'OTHER');
CREATE TYPE "FieldProgressItemAssignmentRole" AS ENUM ('RESPONSIBLE', 'COORDINATOR');

CREATE TABLE "ProjectLocationNode" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nodeType" "ProjectLocationNodeType" NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ProjectLocationNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FieldProgressItemAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fieldProgressItemId" TEXT NOT NULL,
    "projectMemberId" TEXT NOT NULL,
    "role" "FieldProgressItemAssignmentRole" NOT NULL DEFAULT 'RESPONSIBLE',
    "note" TEXT,
    "assignedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "FieldProgressItemAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FieldProgressItemLocation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fieldProgressItemId" TEXT NOT NULL,
    "locationNodeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldProgressItemLocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectLocationNode_projectId_deletedAt_idx" ON "ProjectLocationNode"("projectId", "deletedAt");
CREATE INDEX "ProjectLocationNode_projectId_parentId_sortOrder_idx" ON "ProjectLocationNode"("projectId", "parentId", "sortOrder");
CREATE INDEX "ProjectLocationNode_parentId_idx" ON "ProjectLocationNode"("parentId");
CREATE UNIQUE INDEX "ProjectLocationNode_projectId_parentId_code_key" ON "ProjectLocationNode"("projectId", "parentId", "code");

CREATE INDEX "FieldProgressItemAssignment_projectId_deletedAt_idx" ON "FieldProgressItemAssignment"("projectId", "deletedAt");
CREATE INDEX "FieldProgressItemAssignment_fieldProgressItemId_deletedAt_idx" ON "FieldProgressItemAssignment"("fieldProgressItemId", "deletedAt");
CREATE INDEX "FieldProgressItemAssignment_projectMemberId_deletedAt_idx" ON "FieldProgressItemAssignment"("projectMemberId", "deletedAt");
CREATE UNIQUE INDEX "FieldProgressItemAssignment_fieldProgressItemId_projectMemberId_role_key" ON "FieldProgressItemAssignment"("fieldProgressItemId", "projectMemberId", "role");

CREATE INDEX "FieldProgressItemLocation_projectId_fieldProgressItemId_idx" ON "FieldProgressItemLocation"("projectId", "fieldProgressItemId");
CREATE INDEX "FieldProgressItemLocation_projectId_locationNodeId_idx" ON "FieldProgressItemLocation"("projectId", "locationNodeId");
CREATE UNIQUE INDEX "FieldProgressItemLocation_fieldProgressItemId_locationNodeId_key" ON "FieldProgressItemLocation"("fieldProgressItemId", "locationNodeId");

-- PostgreSQL unique constraints treat NULL parent IDs as distinct. This partial
-- expression index makes active root and child sibling codes equally unique.
CREATE UNIQUE INDEX "FieldProgressItem_active_sibling_code_key"
  ON "FieldProgressItem" ("templateId", COALESCE("parentId", ''), "code")
  WHERE "deletedAt" IS NULL AND "code" IS NOT NULL;

ALTER TABLE "ProjectLocationNode" ADD CONSTRAINT "ProjectLocationNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectLocationNode" ADD CONSTRAINT "ProjectLocationNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProjectLocationNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectLocationNode" ADD CONSTRAINT "ProjectLocationNode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectLocationNode" ADD CONSTRAINT "ProjectLocationNode_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FieldProgressItemAssignment" ADD CONSTRAINT "FieldProgressItemAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldProgressItemAssignment" ADD CONSTRAINT "FieldProgressItemAssignment_fieldProgressItemId_fkey" FOREIGN KEY ("fieldProgressItemId") REFERENCES "FieldProgressItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldProgressItemAssignment" ADD CONSTRAINT "FieldProgressItemAssignment_projectMemberId_fkey" FOREIGN KEY ("projectMemberId") REFERENCES "ProjectMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FieldProgressItemAssignment" ADD CONSTRAINT "FieldProgressItemAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FieldProgressItemLocation" ADD CONSTRAINT "FieldProgressItemLocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldProgressItemLocation" ADD CONSTRAINT "FieldProgressItemLocation_fieldProgressItemId_fkey" FOREIGN KEY ("fieldProgressItemId") REFERENCES "FieldProgressItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldProgressItemLocation" ADD CONSTRAINT "FieldProgressItemLocation_locationNodeId_fkey" FOREIGN KEY ("locationNodeId") REFERENCES "ProjectLocationNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
