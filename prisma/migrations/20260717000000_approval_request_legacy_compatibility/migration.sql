-- Keep existing installations and fresh databases compatible with the
-- ApprovalRequest write path. The legacy fields are required by older
-- databases, while current application code uses sourceType/sourceId.
ALTER TABLE "ApprovalRequest"
  ADD COLUMN IF NOT EXISTS "entityType" TEXT,
  ADD COLUMN IF NOT EXISTS "entityId" TEXT;

UPDATE "ApprovalRequest"
SET
  "entityType" = COALESCE(NULLIF("entityType", ''), NULLIF("sourceType", ''), "type"::text, 'OTHER'),
  "entityId" = COALESCE(NULLIF("entityId", ''), NULLIF("sourceId", ''), NULLIF("code", ''), "id")
WHERE "entityType" IS NULL OR "entityType" = '' OR "entityId" IS NULL OR "entityId" = '';

ALTER TABLE "ApprovalRequest"
  ALTER COLUMN "entityType" SET NOT NULL,
  ALTER COLUMN "entityId" SET NOT NULL;
