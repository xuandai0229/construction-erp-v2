-- Additive storage for table-first result-report editing.
CREATE TYPE "SupervisionWeeklyDelayType" AS ENUM ('DAY', 'PERCENT');

ALTER TABLE "SupervisionWeeklyTransition"
ADD COLUMN "reportedQuantity" DECIMAL(19,4),
ADD COLUMN "reportedText" TEXT,
ADD COLUMN "reportedUnit" TEXT,
ADD COLUMN "verifiedQuantity" DECIMAL(19,4),
ADD COLUMN "verifiedText" TEXT,
ADD COLUMN "verifiedUnit" TEXT,
ADD COLUMN "varianceQuantity" DECIMAL(19,4),
ADD COLUMN "plannedProgress" TEXT;

ALTER TABLE "SupervisionWeeklyProgress"
ADD COLUMN "delayValue" DECIMAL(19,4),
ADD COLUMN "delayType" "SupervisionWeeklyDelayType";

CREATE TABLE "SupervisionWeeklyShiftSelection" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "documentType" "SupervisionWeeklyDocumentType" NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "shift" "SupervisionWeeklyShift" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupervisionWeeklyShiftSelection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupervisionWeeklyShiftSelection_dossierId_documentType_entryDate_shift_key"
ON "SupervisionWeeklyShiftSelection"("dossierId", "documentType", "entryDate", "shift");

CREATE INDEX "SupervisionWeeklyShiftSelection_lookup_idx"
ON "SupervisionWeeklyShiftSelection"("dossierId", "documentType", "entryDate");

ALTER TABLE "SupervisionWeeklyShiftSelection"
ADD CONSTRAINT "SupervisionWeeklyShiftSelection_dossierId_fkey"
FOREIGN KEY ("dossierId") REFERENCES "SupervisionWeeklyDossier"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
