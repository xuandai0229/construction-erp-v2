-- hr_phase4_assignment_end_reason_correction

DO $$
BEGIN
  -- We assume EmployeeProjectAssignmentEndReason might have PROJECT_COMPLETED and OTHER.
  -- 1. Create a new enum with the correct values
  CREATE TYPE "EmployeeProjectAssignmentEndReason_new" AS ENUM ('COMPLETED', 'EARLY_RELEASE', 'ROLE_TRANSFER', 'ALLOCATION_CHANGE', 'PROJECT_TRANSFER');

  -- 2. Check if there are any OTHER records
  IF EXISTS (
    SELECT 1
    FROM "EmployeeProjectAssignment"
    WHERE "endReason"::text = 'OTHER'
  ) THEN
    RAISE EXCEPTION 'Cannot migrate: OTHER values exist in EmployeeProjectAssignment.endReason';
  END IF;

  -- 3. Alter the column to use the new enum
  ALTER TABLE "EmployeeProjectAssignment"
    ALTER COLUMN "endReason" TYPE "EmployeeProjectAssignmentEndReason_new"
    USING (
      CASE "endReason"::text
        WHEN 'PROJECT_COMPLETED' THEN 'COMPLETED'::"EmployeeProjectAssignmentEndReason_new"
        WHEN 'OTHER' THEN NULL
        WHEN NULL THEN NULL
        ELSE "endReason"::text::"EmployeeProjectAssignmentEndReason_new"
      END
    );

  -- 4. Drop the old enum and rename the new one
  DROP TYPE "EmployeeProjectAssignmentEndReason";
  ALTER TYPE "EmployeeProjectAssignmentEndReason_new" RENAME TO "EmployeeProjectAssignmentEndReason";

EXCEPTION
  WHEN undefined_object THEN
    -- If the column or enum doesn't exist, ignore
    NULL;
  WHEN duplicate_object THEN
    NULL;
  WHEN undefined_column THEN
    NULL;
END $$;
