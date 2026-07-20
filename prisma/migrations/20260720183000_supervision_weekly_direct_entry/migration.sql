ALTER TABLE "SupervisionWeeklyEntry"
  ADD COLUMN "manualProjectName" TEXT,
  ADD COLUMN "manualWorkItemName" TEXT;

ALTER TABLE "SupervisionWeeklyTransition"
  ADD COLUMN "manualProjectName" TEXT,
  ADD COLUMN "manualWorkItemName" TEXT;

ALTER TABLE "SupervisionWeeklyQuantity"
  ADD COLUMN "manualProjectName" TEXT,
  ADD COLUMN "manualWorkItemName" TEXT;

ALTER TABLE "SupervisionWeeklyProgress"
  ADD COLUMN "manualProjectName" TEXT,
  ADD COLUMN "manualWorkItemName" TEXT;

ALTER TABLE "SupervisionWeeklyObservation"
  ADD COLUMN "manualProjectName" TEXT,
  ADD COLUMN "manualWorkItemName" TEXT;
