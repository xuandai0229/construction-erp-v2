-- hr_phase4_assignment_end_reason_final_enforcement

DO $$
DECLARE
  v_other_count INT;
  v_invalid_count INT;
  v_enum_values TEXT[];
BEGIN
  -- 1. Fail immediately if any assignment has endReason = 'OTHER'
  SELECT COUNT(*) INTO v_other_count
  FROM "EmployeeProjectAssignment"
  WHERE "endReason"::text = 'OTHER';

  IF v_other_count > 0 THEN
    RAISE EXCEPTION 'Final Enforcement Migration Failed: Found % assignment record(s) with unmappable endReason OTHER', v_other_count;
  END IF;

  -- 2. Fail immediately if any assignment has unmappable or legacy values like 'PROJECT_COMPLETED'
  SELECT COUNT(*) INTO v_invalid_count
  FROM "EmployeeProjectAssignment"
  WHERE "endReason"::text NOT IN ('COMPLETED', 'EARLY_RELEASE', 'ROLE_TRANSFER', 'ALLOCATION_CHANGE', 'PROJECT_TRANSFER')
    AND "endReason" IS NOT NULL;

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Final Enforcement Migration Failed: Found % assignment record(s) with invalid endReason values', v_invalid_count;
  END IF;

  -- 3. Assert current enum typname has exactly the 5 approved labels
  SELECT ARRAY_AGG(enumlabel ORDER BY enumsortorder) INTO v_enum_values
  FROM pg_enum
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EmployeeProjectAssignmentEndReason');

  IF v_enum_values IS NULL OR v_enum_values <> ARRAY['COMPLETED', 'EARLY_RELEASE', 'ROLE_TRANSFER', 'ALLOCATION_CHANGE', 'PROJECT_TRANSFER'] THEN
    RAISE EXCEPTION 'Final Enforcement Migration Failed: Enum EmployeeProjectAssignmentEndReason labels do not match approved 5 values: %', v_enum_values;
  END IF;

END $$;
