# Comprehensive Database Integrity Scan Report

**Repository:** `construction-erp-v2`  
**Target Database:** `construction_erp_v2_qa` (`127.0.0.1:5432`)  
**Execution Timestamp:** 2026-07-31T17:22:00+07:00  

---

## 1. Scan Summary

| Category | Metric | Value | Status | Notes / Recommended Action |
|---|---|---|---|---|
| **Users** | Total Accounts | 27 | PASS | System user accounts active. |
| **Safety Weekly Files** | Total Records | 4 | INFO | All 4 records are soft-deleted (`deletedAt != null`). |
| **Safety Weekly Files** | Active Records | 0 | INFO | 0 active parent dossiers currently. |
| **Safety Plans** | Total / Active | 13 / 2 | **WARNING** | 2 active plans exist with `weeklyFileId = null` (Orphaned). |
| **Safety Assessments** | Total / Active | 12 / 2 | **WARNING** | 2 active assessment reports exist with `weeklyFileId = null` (Orphaned). |
| **Safety Plans / Reports** | Invalid Versions (`<= 0`) | 0 | PASS | All active safety records have valid `version >= 1`. |
| **Supervision Dossiers** | Total / Active | 10 / 5 | PASS | All active supervision dossiers have valid versions. |
| **Supervision Packages** | Total | 2 | PASS | Valid packages. |
| **Site Reports** | Total (Daily / Weekly) | 111 (90 / 21) | PASS | 110 active site reports found. |
| **Projects** | Total / Active | 66 / 12 | PASS | 12 active projects in scope. |
| **Material Requests** | Total | 4 | PASS | Valid records. |
| **Documents** | Total | 12 | PASS | Valid document records. |
| **Duplication Scan** | Duplicate `SafetyWeeklyFile` Period Groups | 0 | PASS | No duplicate weekly dossier period starts found. |

---

## 2. Identified Data Discrepancies & Reconstruction Plan

### Discrepancy 1: Orphaned Legacy Safety Plans & Self-Assessments
- **Findings:** 
  - 2 active `SafetyReportPlan` records have `weeklyFileId = null`.
  - 2 active `SafetySelfAssessmentReport` records have `weeklyFileId = null`.
- **Root Cause:** Records created prior to the unification into `SafetyWeeklyFile` parent dossiers.
- **Remediation Plan:** Execute a safe backfill script (`scripts/backfill-safety-weekly-files-safe.ts`) to auto-create parent `SafetyWeeklyFile` containers matching their `periodStart` dates and link them transactional via Prisma.

---

## 3. Database Schema & Migration Health

- **Prisma Validation:** `npx prisma validate` returned `SUCCESS` (Schema valid).
- **Migration Status:** `16` applied migrations found in `prisma/migrations`. Database schema is up to date with zero drift.
- **Constraints & Indexes:** Foreign keys, unique constraints, and partial indexes verified on all core entities.
