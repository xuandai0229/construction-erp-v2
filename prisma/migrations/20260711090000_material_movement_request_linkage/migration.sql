-- Add request linkage and immutable material snapshots to material ledger rows.
-- Existing rows stay valid because all new columns are nullable.

ALTER TABLE "MaterialMovement"
  ADD COLUMN "materialRequestId" TEXT,
  ADD COLUMN "materialRequestItemId" TEXT,
  ADD COLUMN "materialCodeSnapshot" TEXT,
  ADD COLUMN "materialNameSnapshot" TEXT,
  ADD COLUMN "unitSnapshot" TEXT;

UPDATE "MaterialMovement" AS movement
SET
  "materialCodeSnapshot" = item."code",
  "materialNameSnapshot" = item."name",
  "unitSnapshot" = item."unit"
FROM "MaterialItem" AS item
WHERE movement."materialItemId" = item."id";

ALTER TABLE "MaterialMovement"
  ADD CONSTRAINT "MaterialMovement_materialRequestId_fkey"
  FOREIGN KEY ("materialRequestId") REFERENCES "MaterialRequest"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaterialMovement"
  ADD CONSTRAINT "MaterialMovement_materialRequestItemId_fkey"
  FOREIGN KEY ("materialRequestItemId") REFERENCES "MaterialRequestItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "MaterialMovement_materialRequestId_idx" ON "MaterialMovement"("materialRequestId");
CREATE INDEX "MaterialMovement_materialRequestItemId_idx" ON "MaterialMovement"("materialRequestItemId");
CREATE INDEX "MaterialMovement_projectId_materialItemId_idx" ON "MaterialMovement"("projectId", "materialItemId");
CREATE INDEX "MaterialMovement_projectId_movementDate_idx" ON "MaterialMovement"("projectId", "movementDate");
