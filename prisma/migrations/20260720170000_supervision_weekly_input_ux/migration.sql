-- Additive metadata for the supervision weekly source picker and smart quantity inputs.
-- All columns are nullable to preserve existing dossiers without inferred backfill.

ALTER TABLE "SupervisionWeeklyEntry"
  ADD COLUMN "locationId" TEXT,
  ADD COLUMN "locationNameSnapshot" TEXT,
  ADD COLUMN "manualLocation" TEXT;

ALTER TABLE "SupervisionWeeklyTransition"
  ADD COLUMN "locationId" TEXT,
  ADD COLUMN "locationNameSnapshot" TEXT,
  ADD COLUMN "manualLocation" TEXT,
  ADD COLUMN "reportedRaw" TEXT,
  ADD COLUMN "reportedUnitCode" TEXT,
  ADD COLUMN "verifiedRaw" TEXT,
  ADD COLUMN "verifiedUnitCode" TEXT;

ALTER TABLE "SupervisionWeeklyQuantity"
  ADD COLUMN "locationId" TEXT,
  ADD COLUMN "locationNameSnapshot" TEXT,
  ADD COLUMN "manualLocation" TEXT,
  ADD COLUMN "unitCode" TEXT,
  ADD COLUMN "reportedRaw" TEXT,
  ADD COLUMN "reportedText" TEXT,
  ADD COLUMN "reportedUnit" TEXT,
  ADD COLUMN "reportedUnitCode" TEXT,
  ADD COLUMN "verifiedRaw" TEXT,
  ADD COLUMN "verifiedText" TEXT,
  ADD COLUMN "verifiedUnit" TEXT,
  ADD COLUMN "verifiedUnitCode" TEXT;

ALTER TABLE "SupervisionWeeklyProgress"
  ADD COLUMN "locationId" TEXT,
  ADD COLUMN "locationNameSnapshot" TEXT,
  ADD COLUMN "manualLocation" TEXT;

ALTER TABLE "SupervisionWeeklyObservation"
  ADD COLUMN "locationId" TEXT,
  ADD COLUMN "locationNameSnapshot" TEXT,
  ADD COLUMN "manualLocation" TEXT;
