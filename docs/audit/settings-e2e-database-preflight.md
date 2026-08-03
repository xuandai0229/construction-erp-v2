# SETTINGS E2E DATABASE PREFLIGHT REPORT

**Date:** 2026-08-03
**Environment:** Local QA / E2E
**Target DB Candidate Discovered:** `construction_erp_v2_qa_e2e_20260723`
**Final Selected DB for Settings E2E:** `construction_erp_v2_settings_e2e_20260803`

---

## 1. Candidate Database Verification (`construction_erp_v2_qa_e2e_20260723`)

| Metric | Result |
|---|---|
| Database Existence | `true` |
| Owner | `postgres` |
| Size | `14 MB` |
| Active Connections | `1` (Preflight inspection connection only) |
| Total Tables | `76` |
| Migration Table (`_prisma_migrations`) | Present (`11` finished migrations) |
| Latest Migration | `20260727120000_add_construction_supervisor_role` |
| Repository Migration Requirement | `19` migrations |
| Existing Fixture Records | User: 11, Project: 3, AuditLog: 114, Document: 1, SystemSetting: 1 |
| Classification | **`STALE_REQUIRES_REBUILD`** |

**Conclusion on Candidate:**
The candidate database `construction_erp_v2_qa_e2e_20260723` is out of date (missing 8 newer migrations from July 28 - August 1, 2026) and contains stale business/test fixtures. As per Phase 3 guidelines, stale candidates are not reused directly for clean mutation testing.

---

## 2. Isolated E2E Database Provisioned (`construction_erp_v2_settings_e2e_20260803`)

| Parameter | Specification |
|---|---|
| Target Database Name | `construction_erp_v2_settings_e2e_20260803` |
| Target Host | `127.0.0.1` (`localhost`) |
| Target Port | `5432` |
| Primary App DB (`DATABASE_URL`) | `construction_erp_v2_qa` |
| Isolation Status | **Strictly Isolated** (Host: 127.0.0.1, Port: 5432, DB: construction_erp_v2_settings_e2e_20260803) |
| Classification | **`SAFE_EMPTY`** |

---

## 3. Database Safety Gate Verification

- Guard `validatePreflightTarget`: **PASS**
- Guard `assertSafeQaDatabase`: **PASS**
- Guard `assertSafeDatabaseAudit`: **PASS**
- Primary database `construction_erp_v2_qa` mutated: **NO**
- Silent fallback prohibited: **ENFORCED**
