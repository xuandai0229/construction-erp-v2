-- AlterTable
ALTER TABLE "EmployeeProjectAssignment" ADD COLUMN IF NOT EXISTS "sourceOrgUnitId" TEXT,
ADD COLUMN IF NOT EXISTS "sourceOrgUnitCodeSnapshot" TEXT,
ADD COLUMN IF NOT EXISTS "sourceOrgUnitNameSnapshot" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeProjectAssignment_sourceOrgUnitId_fkey'
  ) THEN
    ALTER TABLE "EmployeeProjectAssignment" 
    ADD CONSTRAINT "EmployeeProjectAssignment_sourceOrgUnitId_fkey" 
    FOREIGN KEY ("sourceOrgUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
