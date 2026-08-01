# Safety Record Orphan Remediation Plan (Phase 1.5)

**Repository:** `construction-erp-v2`  
**Target Entities:** 4 active legacy records (2 `SafetyReportPlan`, 2 `SafetySelfAssessmentReport`)  
**Execution Strategy:** Non-destructive transactional backfill (No hard deletes, No historical mutation)  

---

## 1. Identified Orphan Inventory

### Orphan Pair 1:
- **Plan ID:** `cms77rylk0000hsk54gurfly4` (`KH-ATLD-2026-0001`, creator: `QA Admin User`, Period: 2026-08-03 to 2026-08-09, status: `CANCELLED`)
- **Assessment ID:** `cms77ryo40007hsk58de3voy4` (`BC-ATLD-2026-0003`, creator: `QA Admin User`, Period: 2026-08-03 to 2026-08-09, status: `APPROVED`, `sourcePlanId`: `cms77rylk0000hsk54gurfly4`)
- **Match Confidence:** **HIGH** (`sourcePlanId` explicitly links Assessment to Plan)

### Orphan Pair 2:
- **Plan ID:** `cms77s93800002gk5ul7vmx5u` (`KH-ATLD-2026-0002`, creator: `QA Admin User`, Period: 2026-08-03 to 2026-08-09, status: `CANCELLED`)
- **Assessment ID:** `cms77s95400072gk5wi48yiie` (`BC-ATLD-2026-0004`, creator: `QA Admin User`, Period: 2026-08-03 to 2026-08-09, status: `APPROVED`, `sourcePlanId`: `cms77s93800002gk5ul7vmx5u`)
- **Match Confidence:** **HIGH** (`sourcePlanId` explicitly links Assessment to Plan)

---

## 2. Remediation Transaction Workflow

In the upcoming remediation phase (after fixing migration baseline):

1. **Backup Database:** Export QA database snapshot.
2. **Execute Transactional Backfill Script:**
   - Create parent `SafetyWeeklyFile` record for Pair 1 (`periodStart: 2026-08-03`, `fileCode: HS-ATLD-2026-W32-1`).
   - Link Plan `cms77rylk0000hsk54gurfly4` and Assessment `cms77ryo40007hsk58de3voy4` to new parent ID.
   - Create parent `SafetyWeeklyFile` record for Pair 2 (`periodStart: 2026-08-03`, `fileCode: HS-ATLD-2026-W32-2`).
   - Link Plan `cms77s93800002gk5ul7vmx5u` and Assessment `cms77s95400072gk5wi48yiie` to new parent ID.
3. **Audit Log:** Write audit log entries (`REMEDIATION_BACKFILL`) for both updates.
4. **Verification:** Confirm `orphanedPlans = 0` and `orphanedAssessments = 0` via read-only integrity script.
