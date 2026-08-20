-- Additive runtime kill-switch for the read-only AI assistant.
ALTER TABLE "SystemSetting"
ADD COLUMN "aiReadOnlyEnabled" BOOLEAN NOT NULL DEFAULT true;
