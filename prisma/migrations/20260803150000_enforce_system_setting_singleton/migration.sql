-- Additive singleton guarantee for SystemSetting.
-- This migration aborts before any schema change when more than one row exists.
DO $$
DECLARE
  settings_count integer;
BEGIN
  SELECT COUNT(*) INTO settings_count FROM "SystemSetting";
  IF settings_count > 1 THEN
    RAISE EXCEPTION 'SystemSetting singleton preflight failed: % rows exist', settings_count;
  END IF;
END $$;

ALTER TABLE "SystemSetting"
  ADD COLUMN IF NOT EXISTS "singletonKey" TEXT;

UPDATE "SystemSetting"
SET "singletonKey" = 'DEFAULT_SETTINGS'
WHERE "singletonKey" IS NULL;

ALTER TABLE "SystemSetting"
  ALTER COLUMN "singletonKey" SET DEFAULT 'DEFAULT_SETTINGS',
  ALTER COLUMN "singletonKey" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'SystemSetting_singletonKey_fixed_check'
      AND conrelid = '"SystemSetting"'::regclass
  ) THEN
    ALTER TABLE "SystemSetting"
      ADD CONSTRAINT "SystemSetting_singletonKey_fixed_check"
      CHECK ("singletonKey" = 'DEFAULT_SETTINGS');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_singletonKey_key"
  ON "SystemSetting"("singletonKey");
