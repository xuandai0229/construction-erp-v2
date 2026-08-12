# MOBILE APP REMOVAL MANIFEST

## Overview
This manifest documents every deleted path and every intentionally retained Mobile-era shared artifact following the surgical decommission of the Native Mobile App (Expo / React Native) from `construction-erp-v2`.

## 1. Deleted Paths (Mobile-Only Artifacts)

| Path | Category | Reason for Deletion | Web Dependency Check |
| :--- | :--- | :--- | :--- |
| `mobile/**` | Native Client App | Native Expo / React Native application source code, screens, routes, assets, package.json, and Expo configuration files | Verified: 0 active Web imports |
| `docs/mobile/**` | Documentation | Native Mobile phase reports, design system mappings, parity registers, and Native UI consolidation reports | Verified: 0 shared backend value |
| `scratch/setup-qa-project-and-cleanup.ts` | QA Script | Setup script dedicated to creating/clearing `QA-MOBILE-001` project | Verified: Native Mobile QA only |
| `scratch/seed-qa-wbs.ts` | QA Script | Seed script dedicated to populating `QA-MOBILE-001` WBS data | Verified: Native Mobile QA only |
| `scratch/test-mobile-phase1-runtime.ts` | QA Script | Mobile Phase 1 E2E runtime test runner | Verified: Native Mobile test runner |
| `scratch/test-mobile-phase2-e2e.ts` | QA Script | Mobile Phase 2 E2E test runner | Verified: Native Mobile test runner |
| `scratch/test-phase2-endpoints.ts` | QA Script | Mobile endpoint testing script | Verified: Native Mobile test runner |
| `scratch/diag-phase2-db.ts` | QA Script | Mobile Phase 2 database diagnostic script | Verified: Mobile QA diagnostic |
| `scratch/diag-qa-isolation.ts` | QA Script | Mobile QA isolation diagnostic script | Verified: Mobile QA diagnostic |

## 2. Intentionally Retained Artifacts (Shared Backend / Security Capabilities)

| Path / Feature | Category | Reason for Retention | Web / API Value |
| :--- | :--- | :--- | :--- |
| `src/app/api/v1/**` | Backend Infrastructure | REST API V1 endpoints (`/api/v1/auth`, `/api/v1/projects`, `/api/v1/me`, etc.) | Retained as shared backend infrastructure for integration, external clients, and future AI Agent architecture |
| `next.config.ts` (API V1 CORS headers) | Security Hardening | CORS headers configured for `/api/v1/:path*` | Enables secure cross-origin API V1 requests |
| `src/lib/v1-auth-guard.ts` | Auth Security | Bearer Token validation, HMAC helper, session validation, and RBAC auth guard | Retained shared security & session validation capability |
| `src/app/api/v1/projects/[projectId]/progress/daily/route.ts` | Backend Hardening | Strict date validation, invalid WBS validation, cross-project validation, and controlled 400 error responses | Retained data-integrity and security hardening (prevents 500 crashes) |
| QA Accounts (`qa_freeze_admin@construction.local`, `qa_admin@construction.local`, etc.) | QA Infrastructure | System QA accounts in database | Retained for Web E2E tests, freeze tests, and RBAC regression |
| Web Responsive Mobile UI (`src/components/layout/mobile-nav.tsx`, etc.) | Web ERP UI | Web bottom navigation, responsive header, responsive project cards, responsive reports | Retained as core ERP Web mobile browser experience (localhost:3000 at 430x932) |
| Prisma Schema & Migrations (`prisma/schema.prisma`, `prisma/migrations/**`) | Database Infrastructure | Canonical database schema and migration history | Intact; schema and migrations are immutable |

## 3. Configuration Updates
- `tsconfig.json`: Removed obsolete `"mobile"` entry from `"exclude"` array. Before: `["node_modules", "scripts", "scratch", "mobile"]`. After: `["node_modules", "scripts", "scratch"]`.
