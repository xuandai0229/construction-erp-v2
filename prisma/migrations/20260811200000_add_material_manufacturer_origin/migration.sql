-- Add structured master metadata without interpreting legacy category values.
-- Existing MaterialItem.group data is intentionally preserved and is not copied.
ALTER TABLE "MaterialItem"
  ADD COLUMN "manufacturer" TEXT,
  ADD COLUMN "origin" TEXT;
