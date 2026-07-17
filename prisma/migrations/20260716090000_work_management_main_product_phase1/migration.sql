-- Additive persistence for the canonical Work Management product slice.
-- This migration is intentionally not applied by this change set.
CREATE TYPE "WorkTaskIdempotencyState" AS ENUM ('IN_PROGRESS', 'COMPLETED');

CREATE TABLE "WorkTask" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "primaryAssigneeId" TEXT,
  "reviewerId" TEXT,
  "approverId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "confidentiality" TEXT NOT NULL DEFAULT 'NORMAL',
  "lifecycle" TEXT NOT NULL,
  "acceptance" TEXT NOT NULL,
  "execution" TEXT NOT NULL,
  "review" TEXT NOT NULL,
  "handover" TEXT NOT NULL,
  "waitingReason" TEXT,
  "deadlineAt" TIMESTAMP(3),
  "progressPercent" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkTaskAction" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "effects" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkTaskAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkTaskOutboxMessage" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "aggregateVersion" INTEGER NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "message" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkTaskOutboxMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkTaskIdempotency" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "projectId" TEXT,
  "taskId" TEXT,
  "fingerprint" TEXT NOT NULL,
  "state" "WorkTaskIdempotencyState" NOT NULL,
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "WorkTaskIdempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkTaskIdempotency_key_scopeKey_key" ON "WorkTaskIdempotency"("key", "scopeKey");
CREATE INDEX "WorkTask_projectId_updatedAt_idx" ON "WorkTask"("projectId", "updatedAt");
CREATE INDEX "WorkTask_primaryAssigneeId_updatedAt_idx" ON "WorkTask"("primaryAssigneeId", "updatedAt");
CREATE INDEX "WorkTask_creatorId_updatedAt_idx" ON "WorkTask"("creatorId", "updatedAt");
CREATE INDEX "WorkTask_lifecycle_updatedAt_idx" ON "WorkTask"("lifecycle", "updatedAt");
CREATE INDEX "WorkTaskAction_taskId_occurredAt_idx" ON "WorkTaskAction"("taskId", "occurredAt");
CREATE INDEX "WorkTaskAction_actorId_occurredAt_idx" ON "WorkTaskAction"("actorId", "occurredAt");
CREATE INDEX "WorkTaskOutboxMessage_taskId_aggregateVersion_idx" ON "WorkTaskOutboxMessage"("taskId", "aggregateVersion");
CREATE INDEX "WorkTaskOutboxMessage_idempotencyKey_idx" ON "WorkTaskOutboxMessage"("idempotencyKey");
CREATE INDEX "WorkTaskIdempotency_taskId_idx" ON "WorkTaskIdempotency"("taskId");
CREATE INDEX "WorkTaskIdempotency_actorId_projectId_idx" ON "WorkTaskIdempotency"("actorId", "projectId");

ALTER TABLE "WorkTask" ADD CONSTRAINT "WorkTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkTask" ADD CONSTRAINT "WorkTask_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkTask" ADD CONSTRAINT "WorkTask_primaryAssigneeId_fkey" FOREIGN KEY ("primaryAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkTask" ADD CONSTRAINT "WorkTask_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkTask" ADD CONSTRAINT "WorkTask_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkTaskAction" ADD CONSTRAINT "WorkTaskAction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "WorkTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkTaskAction" ADD CONSTRAINT "WorkTaskAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkTaskOutboxMessage" ADD CONSTRAINT "WorkTaskOutboxMessage_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "WorkTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkTaskIdempotency" ADD CONSTRAINT "WorkTaskIdempotency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "WorkTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
