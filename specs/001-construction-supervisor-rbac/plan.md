# Implementation Plan: Cán bộ giám sát công trình

**Branch**: `main` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

## Summary

Mở rộng RBAC hiện hữu bằng system role `CONSTRUCTION_SUPERVISOR`. Role nhận phạm vi đọc động trên mọi project của deployment hiện tại nhưng không được đưa vào nhóm company-wide quản trị; từng permission đọc được cấp tường minh, mọi permission mutation giữ deny-by-default. Phân hệ weekly supervision dùng policy tập trung theo capability + ownership + state, cho phép đọc hồ sơ người khác nhưng chỉ tác giả sửa/gửi/xuất hồ sơ của mình. Thay đổi schema chỉ thêm enum value và migration additive.

## Technical Context

**Language/Version**: TypeScript 5, React 19.2, Node.js runtime supported by Next.js 16.2.7

**Primary Dependencies**: Next.js App Router, Prisma 7.8, PostgreSQL, Zod 4, Vitest 4, Playwright 1.61

**Storage**: PostgreSQL through Prisma; additive `UserRole` enum migration only

**Testing**: Vitest unit/policy tests, Playwright authenticated UI/request tests, Prisma validation/generation, TypeScript, ESLint, Next build

**Target Platform**: Server-rendered web application on Windows development and deployment-compatible Node.js runtime

**Project Type**: Full-stack Next.js web application

**Performance Goals**: Reuse existing indexed project/resource queries; no per-project membership fan-out and no generated membership rows

**Constraints**: Deny by default; server authorization on every mutation/export; no production database mutation; QA database fingerprint guard; preserve all existing role semantics; no old migration edits

**Scale/Scope**: Cross-cutting authorization over projects, reports, progress, materials, tasks, documents, approvals, navigation, weekly supervision and user role administration

## Constitution Check

The constitution is an unfilled template, so project-specific constitution gates are skipped. Governing gates come from the approved feature request:

- PASS: existing permission registry/policies are extended rather than replaced.
- PASS: new role is distinct from `SUPERVISION_HEAD` and receives no management/review capability.
- PASS: schema change is additive and old migrations remain untouched.
- PASS: QA may target only an independently fingerprinted `QA_DATABASE_URL`.
- PASS: runtime evidence is required before GO; static checks alone cannot produce GO.

Post-design re-check: the design keeps these gates intact. The repository has no organization/company entity; it is explicitly single-tenant. Cross-tenant isolation therefore remains a deployment/database-boundary constraint and cannot be truthfully runtime-tested inside one database without a separate tenancy feature.

## Architecture and Decisions

1. Add `CONSTRUCTION_SUPERVISOR` to `UserRole`, role registry, user-management validation and display metadata.
2. Split “read all projects” from “manage company” in `src/lib/rbac.ts`; never add the role to `COMPANY_WIDE_ROLES` or high-level approval arrays.
3. Extend the canonical permission registry only for read capabilities: project, report, material, document preview/view and approval view. Keep download and all mutation capabilities absent.
4. Introduce pure weekly policy decisions in `src/lib/supervision-weekly/permissions.ts`: view, create, edit, delete, submit, export, review and lock. Server actions and export routes consume policy decisions.
5. Allow weekly list/read for all authorized weekly actors, but preserve ownership gates for update, submit and export. Make weekly uniqueness author-scoped so multiple officers may create dossiers in the same week.
6. Treat source selectors as read operations. Validate every project/category/work/row relationship on the server and never mutate source tables.
7. Propagate read-only capability to UI through server-derived flags; source modules hide create/edit/delete/approve controls for this role while keeping browsing/filtering.
8. Add unit and integration coverage before relying on build validation. Do not create QA fixtures unless the safety guard proves `QA_DATABASE_URL` differs from `DATABASE_URL` by host, port and database.

## Project Structure

```text
prisma/
├── schema.prisma
└── migrations/<timestamp>_add_construction_supervisor_role/migration.sql

src/
├── app/(dashboard)/
│   ├── projects/, reports/, materials/, documents/, approvals/, tasks/
│   └── supervision/weekly/
├── app/api/
│   ├── documents/, reports/, work-management/
│   └── supervision/weekly/[id]/export/
├── components/
│   ├── layout/, projects/, reports/, materials/, documents/
│   └── supervision-weekly/
└── lib/
    ├── permissions/, roles/, rbac.ts, navigation-permissions.ts
    ├── supervision-weekly/
    └── work-management/

tests/
├── rbac/
└── supervision-weekly/

specs/001-construction-supervisor-rbac/
└── design and validation artifacts

docs/qa/
└── CONSTRUCTION_SUPERVISOR_GLOBAL_READONLY_AND_WEEKLY_AUTHOR_RBAC_FINAL_REPORT.md
```

**Structure Decision**: Keep the existing single Next.js application and central RBAC modules. No second authorization service or membership projection is introduced.

## Data and Migration Strategy

- Add only `CONSTRUCTION_SUPERVISOR` to PostgreSQL enum `UserRole`.
- Migration SQL: `ALTER TYPE "UserRole" ADD VALUE 'CONSTRUCTION_SUPERVISOR';`.
- No membership, dossier or source data migration.
- Rollback is application rollback that stops assigning/using the value; PostgreSQL enum value removal is not attempted destructively.
- Migration is generated/validated locally and may be applied only to independent QA after safety checks; application database deployment remains outside this task without backup and approval.

## Verification Strategy

- Pure policy matrix for every existing role plus the new role.
- Direct resolver checks prove read permissions and denied mutations without membership.
- Weekly tests prove own DRAFT/REVISION_REQUIRED mutation, other-owner denial, workflow denial, export ownership, stale version and row injection.
- Route/UI tests use authenticated sessions only when a safe independent QA database is available.
- Regression commands: Prisma validate/generate, scoped lint, Vitest, TypeScript, build, then Playwright smoke at required viewports when runtime prerequisites exist.

## Known Limitation / Release Gate

The schema contains no `organizationId`, `tenantId` or `companyId` on User, Project or weekly dossier. The current product is explicitly single-tenant by deployment. Therefore runtime Tenant A/Tenant B isolation and revocation audit evidence cannot be claimed from this repository model. Unless a separate approved multi-tenancy feature is introduced or isolation is demonstrated across independent deployments/databases, final status must remain NO-GO or BLOCKED despite passing code tests.
