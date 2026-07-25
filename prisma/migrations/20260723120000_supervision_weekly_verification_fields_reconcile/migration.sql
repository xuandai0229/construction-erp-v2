ALTER TABLE "SupervisionWeeklyTransition"
  ADD COLUMN IF NOT EXISTS "verificationMode" TEXT,
  ADD COLUMN IF NOT EXISTS "varianceReason" TEXT;

ALTER TABLE "SupervisionWeeklyQuantity"
  ADD COLUMN IF NOT EXISTS "verificationMode" TEXT,
  ADD COLUMN IF NOT EXISTS "varianceReason" TEXT;
