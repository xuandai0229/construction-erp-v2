-- Additive split of the weekly source into project, GROUP category and WORK inspection item.
ALTER TABLE "SupervisionWeeklyEntry"
  ADD COLUMN "categoryItemId" TEXT,
  ADD COLUMN "categoryNameSnapshot" TEXT,
  ADD COLUMN "manualCategoryName" TEXT,
  ADD COLUMN "inspectionWorkItemId" TEXT,
  ADD COLUMN "inspectionWorkNameSnapshot" TEXT;

ALTER TABLE "SupervisionWeeklyTransition"
  ADD COLUMN "categoryItemId" TEXT,
  ADD COLUMN "categoryNameSnapshot" TEXT,
  ADD COLUMN "manualCategoryName" TEXT;

ALTER TABLE "SupervisionWeeklyQuantity"
  ADD COLUMN "categoryItemId" TEXT,
  ADD COLUMN "categoryNameSnapshot" TEXT,
  ADD COLUMN "manualCategoryName" TEXT;

ALTER TABLE "SupervisionWeeklyProgress"
  ADD COLUMN "categoryItemId" TEXT,
  ADD COLUMN "categoryNameSnapshot" TEXT,
  ADD COLUMN "manualCategoryName" TEXT;

ALTER TABLE "SupervisionWeeklyObservation"
  ADD COLUMN "categoryItemId" TEXT,
  ADD COLUMN "categoryNameSnapshot" TEXT,
  ADD COLUMN "manualCategoryName" TEXT;
