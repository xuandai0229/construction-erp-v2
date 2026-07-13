DO $$ BEGIN
  CREATE TYPE "ApprovalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalRequestType" AS ENUM ('PAYMENT', 'MATERIAL', 'REPORT', 'CONTRACT', 'CHANGE_ORDER', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ApprovalRequest" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "ApprovalRequestType" NOT NULL DEFAULT 'OTHER',
  "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
  "priority" "ApprovalPriority" NOT NULL DEFAULT 'NORMAL',
  "amount" DECIMAL(19,4),
  "dueDate" TIMESTAMP(3),
  "requesterId" TEXT NOT NULL,
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "decisionNote" TEXT,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ApprovalRequest"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "projectId" TEXT,
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "type" "ApprovalRequestType" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN IF NOT EXISTS "priority" "ApprovalPriority" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "amount" DECIMAL(19,4),
  ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "decidedById" TEXT,
  ADD COLUMN IF NOT EXISTS "decidedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "decisionNote" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceId" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ApprovalRequest'
      AND column_name = 'status'
      AND udt_name = 'ApprovalStatus'
  ) THEN
    ALTER TABLE "ApprovalRequest"
      ALTER COLUMN "status" DROP DEFAULT,
      ALTER COLUMN "status" TYPE "ApprovalRequestStatus"
      USING CASE
        WHEN "status"::text = 'DRAFT' THEN 'PENDING'::"ApprovalRequestStatus"
        ELSE "status"::text::"ApprovalRequestStatus"
      END,
      ALTER COLUMN "status" SET DEFAULT 'PENDING';
  END IF;
END $$;

UPDATE "ApprovalRequest"
SET
  "code" = COALESCE(NULLIF("code", ''), 'LEGACY-APR-' || "id"),
  "projectId" = COALESCE("projectId", (
    SELECT "id" FROM "Project" WHERE "deletedAt" IS NULL ORDER BY "createdAt" ASC LIMIT 1
  )),
  "title" = COALESCE(NULLIF("title", ''), 'Legacy approval request')
WHERE "code" IS NULL OR "code" = '' OR "projectId" IS NULL OR "title" IS NULL OR "title" = '';

ALTER TABLE "ApprovalRequest"
  ALTER COLUMN "code" SET NOT NULL,
  ALTER COLUMN "projectId" SET NOT NULL,
  ALTER COLUMN "title" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ApprovalRequest_code_key" ON "ApprovalRequest"("code");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_projectId_idx" ON "ApprovalRequest"("projectId");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_requesterId_idx" ON "ApprovalRequest"("requesterId");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_decidedById_idx" ON "ApprovalRequest"("decidedById");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_type_idx" ON "ApprovalRequest"("type");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_priority_idx" ON "ApprovalRequest"("priority");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_sourceType_sourceId_idx" ON "ApprovalRequest"("sourceType", "sourceId");

DO $$ BEGIN
  ALTER TABLE "ApprovalRequest"
    ADD CONSTRAINT "ApprovalRequest_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ApprovalRequest"
    ADD CONSTRAINT "ApprovalRequest_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ApprovalRequest"
    ADD CONSTRAINT "ApprovalRequest_decidedById_fkey"
    FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
