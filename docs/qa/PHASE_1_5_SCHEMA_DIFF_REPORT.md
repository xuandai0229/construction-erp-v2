# Phase 1.5 Schema Drift Analysis Report

**Repository:** `construction-erp-v2`  
**Execution Timestamp:** 2026-07-31T17:30:00+07:00  

---

## 1. Catalog Comparison Summary

| Table / Object | In Live QA Catalog (`construction_erp_v2_qa`) | In Fresh Migration Database | Drift Status | Note |
|---|---|---|---|---|
| `SafetyWeeklyFile` | Present (Created via db push/SQL) | **MISSING** | **DRIFT_FOUND** | Migration `20260731100000` failed due to `DELETE FROM "SafetyWeeklyFile"` before `CREATE TABLE`. |
| `SafetyReportPlan.weeklyFileId` | Present | **MISSING** | **DRIFT_FOUND** | Column not applied on clean database because migration stopped at step 1. |
| `SafetySelfAssessmentReport.weeklyFileId` | Present | **MISSING** | **DRIFT_FOUND** | Column not applied on clean database because migration stopped at step 1. |
| `SafetyReportPlan.deletedAt` | Present | **MISSING** | **DRIFT_FOUND** | Added to schema without versioned migration. |
| `SafetyReportPlan.deletedById` | Present | **MISSING** | **DRIFT_FOUND** | Added to schema without versioned migration. |

---

## 2. Recommendation

A follow-up migration script must be formatted to ensure `CREATE TABLE IF NOT EXISTS "SafetyWeeklyFile"` executes prior to any row deletion or foreign key assignment.
