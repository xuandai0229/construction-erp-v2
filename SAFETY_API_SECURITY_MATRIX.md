# SAFETY REST API SECURITY REMEDIATION MATRIX

**Target System:** `construction-erp-v2`  
**Module:** `/api/reports/safety/**`  
**Security Status:** `PASS` (Fully Hardened & Production-Ready)  
**Date:** August 12, 2026  

---

## 1. Safety API Inventory & Security Boundary Mapping

| STT | HTTP Method | Endpoint Path | Boundary Enforced | Auth Strategy | Scope Verification | Validation Schema | Anonymous Access |
|---|---|---|---|---|---|---|---|
| 1 | `GET` | `/api/reports/safety/plans` | `getSafetyAuth() + verifySafetyProjectAccess()` | Server Session | Project-level scope check | Query params | `401 Unauthorized` |
| 2 | `POST` | `/api/reports/safety/plans` | `getSafetyAuth() + verifySafetyProjectAccess()` | Server Session | Scope check on all `entries.projectId` | `CreateSafetyPlanApiSchema` | `401 Unauthorized` |
| 3 | `GET` | `/api/reports/safety/plans/[planId]` | `getSafetyAuth() + verifySafetyProjectAccess()` | Server Session | Scope check on plan entries | Dynamic param | `401 Unauthorized` |
| 4 | `DELETE` | `/api/reports/safety/plans/[planId]` | `getSafetyAuth() + verifySafetyProjectAccess()` | Server Session | Scope check on plan entries | Query params | `401 Unauthorized` |
| 5 | `POST` | `/api/reports/safety/plans/[planId]/submit` | `getSafetyAuth() + verifySafetyProjectAccess()` | Server Session | Scope check on plan entries | N/A | `401 Unauthorized` |
| 6 | `POST` | `/api/reports/safety/plans/[planId]/approve` | `getSafetyAuth() + verifySafetyApproverRole()` | Server Session | Approver role + project scope | `SafetyApproveSchema` | `401 Unauthorized` |
| 7 | `GET` | `/api/reports/safety/plans/[planId]/export` | `getSafetyAuth() + verifySafetyProjectAccess()` | Server Session | Scope check on plan entries | Query params | `401 Unauthorized` |
| 8 | `GET` | `/api/reports/safety/self-assessments` | `getSafetyAuth() + verifySafetyProjectAccess()` | Server Session | Project-level scope check | Query params | `401 Unauthorized` |
| 9 | `POST` | `/api/reports/safety/self-assessments` | `getSafetyAuth() + verifySafetyProjectAccess()` | Server Session | Scope check on source plan / entries | `CreateSafetyAssessmentApiSchema` | `401 Unauthorized` |
| 10 | `GET` | `/api/reports/safety/self-assessments/[reportId]` | `getSafetyAuth() + verifySafetyProjectAccess()` | Server Session | Scope check on report entries | Dynamic param | `401 Unauthorized` |
| 11 | `DELETE` | `/api/reports/safety/self-assessments/[reportId]` | `getSafetyAuth() + verifySafetyProjectAccess()` | Server Session | Scope check on report entries | Query params | `401 Unauthorized` |
| 12 | `POST` | `/api/reports/safety/self-assessments/[reportId]/submit` | `getSafetyAuth() + verifySafetyProjectAccess()` | Server Session | Scope check on report entries | N/A | `401 Unauthorized` |
| 13 | `POST` | `/api/reports/safety/self-assessments/[reportId]/approve` | `getSafetyAuth() + verifySafetyApproverRole()` | Server Session | Approver role + project scope | `SafetyApproveSchema` | `401 Unauthorized` |
| 14 | `GET` | `/api/reports/safety/self-assessments/[reportId]/export` | `getSafetyAuth() + verifySafetyProjectAccess()` | Server Session | Scope check on report entries | Query params | `401 Unauthorized` |

---

## 2. Runtime Security Proof Summary

1. **Anonymous Access Rejection:** All 14 HTTP methods return `401 Unauthorized` when accessed without an active `auth_session` cookie.
2. **Actor Derivation:** `actorId` and `userId` parameter trust removed. All user identifiers are strictly derived from `session.id`.
3. **Project Scope Validation:** Requests containing target `projectId` values are validated via `canAccessProject()`. Unauthorized project IDs return `403 Forbidden`.
4. **Approval Authorization:** Decision endpoints (`/approve`) enforce valid approver roles (`ADMIN`, `EXECUTIVE`, `DIRECTOR`, `DEPUTY_DIRECTOR`, `PROJECT_MANAGER`, `SUPERVISION_HEAD`, `TECHNICAL_HEAD`). Unauthorized roles return `403 Forbidden`.
5. **Build Certification:** TypeScript verification (`npx tsc --noEmit`) and production build (`npm run build`) completed with zero errors.
