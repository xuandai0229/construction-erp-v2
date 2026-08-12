# MOBILE REMOVAL CLASSIFICATION REPORT

## Classification & Action Register

| Path / Data | Purpose | Mobile-only? | Web dependency? | Action | Evidence |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `mobile/**` | Native Expo / React Native App source, routes, assets & configs | YES | NO | **DELETE** | Native client directory unused by Next.js Web ERP |
| `docs/mobile/**` | Native Mobile parity, design & phase reports | YES | NO | **DELETE** | Native mobile specific documentation |
| DB Project `QA-MOBILE-001` (`cmsps3w180000ukk58ulp77w6`) | Dedicated sandbox project for Native Mobile QA | YES | NO | **DELETE** | Non-production project created for Mobile E2E tests |
| DB Records owned by `QA-MOBILE-001` | WBS (2), FieldProgressItem (1), FieldProgressEntry (4), FieldTemplate (1), Member (1) | YES | NO | **DELETE** | Exclusive child records of `QA-MOBILE-001` |
| `scratch/setup-qa-project-and-cleanup.ts` | Mobile QA sandbox setup script | YES | NO | **DELETE** | Script solely creates/cleans `QA-MOBILE-001` |
| `scratch/seed-qa-wbs.ts` | Mobile QA WBS seeding script | YES | NO | **DELETE** | Script populates `QA-MOBILE-001` WBS data |
| `scratch/test-mobile-phase1-runtime.ts` | Mobile Phase 1 runtime test script | YES | NO | **DELETE** | Native Mobile E2E test runner |
| `scratch/test-mobile-phase2-e2e.ts` | Mobile Phase 2 E2E test script | YES | NO | **DELETE** | Native Mobile E2E test runner |
| `scratch/test-phase2-endpoints.ts` | Mobile Phase 2 endpoint test script | YES | NO | **DELETE** | Mobile-specific test script |
| `scratch/diag-phase2-db.ts` | Mobile Phase 2 DB diagnostic script | YES | NO | **DELETE** | Mobile QA diagnostic script |
| `scratch/diag-qa-isolation.ts` | Mobile QA isolation check script | YES | NO | **DELETE** | Mobile QA diagnostic script |
| `tsconfig.json` (`"exclude": ["mobile"]`) | Root TypeScript exclusion for `mobile/` directory | YES | NO | **UPDATE** | Obsolete exclusion once `mobile/` is removed |
| `next.config.ts` (API V1 CORS headers) | CORS headers for `/api/v1/*` | NO | YES (Shared API) | **KEEP** | Shared backend CORS hardening for API V1 |
| `src/app/api/v1/**` | REST API V1 Endpoints | NO | YES (Shared API) | **KEEP** | Shared backend infrastructure and future integration layer |
| `src/lib/v1-auth-guard.ts` | Bearer Token & Session Auth Guard | NO | YES (Shared Auth) | **KEEP** | Shared backend security & auth capability |
| Web Mobile Navigation (`src/components/**`) | Web Responsive Mobile Navigation & Header | NO | YES (Web ERP) | **KEEP** | Essential for Web ERP responsive mobile viewports |
| Prisma Schema (`prisma/schema.prisma`) | Database schema definitions | NO | YES (Web ERP) | **KEEP** | Data model is shared; zero schema changes for mobile removal |
| Prisma Migrations (`prisma/migrations/**`) | Migration history | NO | YES (Web ERP) | **KEEP** | Immutable database migration history |
| 21 Real Projects (`CT-2026-0001` to `CT-2026-0021`) | Protected real business projects | NO | YES (Web ERP) | **KEEP** | Core production business data |
| QA Accounts (`qa_freeze_admin`, `qa_admin`, etc.) | Shared QA & Security E2E Test Accounts | NO | YES (Web QA) | **KEEP** | Used by Web QA, freeze tests & E2E regression |
