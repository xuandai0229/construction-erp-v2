-- CreateEnum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmployeeProjectAssignmentEndReason') THEN
    CREATE TYPE "EmployeeProjectAssignmentEndReason" AS ENUM ('COMPLETED', 'EARLY_RELEASE', 'ROLE_TRANSFER', 'ALLOCATION_CHANGE', 'PROJECT_TRANSFER');
  END IF;
END $$;

-- AlterTable
ALTER TABLE "EmployeeProjectAssignment" ADD COLUMN IF NOT EXISTS "endReason" "EmployeeProjectAssignmentEndReason";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeProjectAssignment_employeeId_status_startDate_idx" ON "EmployeeProjectAssignment"("employeeId", "status", "startDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeProjectAssignment_projectId_status_startDate_idx" ON "EmployeeProjectAssignment"("projectId", "status", "startDate");
