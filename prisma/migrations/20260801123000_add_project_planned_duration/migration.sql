CREATE TYPE "ProjectDurationUnit" AS ENUM ('DAY', 'MONTH');
ALTER TABLE "Project" ADD COLUMN "plannedDurationValue" INTEGER;
ALTER TABLE "Project" ADD COLUMN "plannedDurationUnit" "ProjectDurationUnit";
ALTER TABLE "Project" ADD COLUMN "plannedDurationRaw" TEXT;
