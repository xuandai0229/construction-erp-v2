# MATERIALS PORTFOLIO — PROJECT-FIRST EXECUTIVE UX REARCHITECTURE

## 1. Baseline

- HEAD before work: `c68347a318ed122c9301cdfcda6c5069c9a5f629`.
- The worktree was already dirty before this phase: 15 Materials-related files and the QA scripts `scripts/check-materials.ts` and `scripts/seed-materials-qa-fixtures.ts`.
- No reset, clean, checkout, migration, production seed, or data mutation was performed.

## 2. Root-cause UX

The previous company view used cross-project aggregate tables/cards. Project codes consumed primary visual space, transaction DTOs dropped the fetched Project relation, and UI fallbacks could render generic project labels. Material aggregation treated local `MaterialItem.code` as global identity.

## 3. Architecture before/after

Before: company aggregate → flat lists/cards → operator locates project context.

After: company portfolio → named project health/attention → project-first group → project workspace/detail. Secondary “Theo vật tư” views remain for cross-project analysis.

## 4. Project-first design

The overview contains five real-data KPIs, a project-health table, responsive project cards, and a separate attention ranking. Catalog, stock, and transactions default to project grouping and let every visible project name open the associated project workspace.

## 5. Project-code display removal

Portfolio components render Project.name only. Codes remain in domain DTOs and are searchable internally, but are not displayed as badges, headers, or prefixes in the portfolio surfaces.

## 6. Overview

`MaterialsPortfolioOverview` reports projects with data, actual MaterialItem records, low-stock projects/items, proposal count, and movement count. Its main visual unit is a project row, not a mixed-material card.

## 7. Catalog

`MaterialsPortfolioCatalog` defaults to “Theo công trình” and lists each project’s material records. “Theo vật tư” is expandable and shows named project breakdowns.

## 8. Stock

`MaterialsPortfolioStock` defaults to “Theo công trình” with material count, low stock, sufficient stock, latest activity, and expandable item rows. The secondary view exposes every named project’s stock and warning status.

## 9. Proposals

The existing proposal table/action menu remains. Portfolio now has a project filter whose labels use Project.name, and its `returnTo` includes current portfolio filters. Capability props prevent creating proposals when the caller lacks creation rights.

## 10. Transactions

`MaterialsPortfolioTransactions` defaults to “Theo công trình”. Each group has a Project.name header, count, type, material, quantity, time, and note. “Tất cả giao dịch” is an explicit secondary view. Generic `Công trình` and `CT` fallbacks were removed.

## 11. Project name mapping

`MaterialMovementDto` now preserves the Project relation fetched by portfolio queries. A movement whose Project name is absent is reported as an integrity exception and excluded from the executive list rather than shown with a fabricated name.

## 12. Navigation/returnTo

Portfolio-to-project navigation builds an explicit internal `/materials?...` return target retaining the tab and active filters. Project workspace exposes “Quay lại toàn công ty”. Proposal list return targets preserve portfolio filters and remain relative `/materials` paths.

## 13. Vietnamese audit

New portfolio-facing labels are Vietnamese. Internal DTO, route, model, and component identifiers were intentionally retained. Existing legacy project-scope user-facing copy was not rewritten beyond this phase.

## 14. RBAC

Portfolio aggregate actions require an authenticated company-scope user (`canViewAllProjects`). The proposal multi-project action intersects arbitrary client-supplied project IDs with active membership for non-high-level users. Project operations remain server-authorized by existing logic.

## 15. Database validation

Read-only QA DB validation completed on 2026-08-11:

- 21 active projects
- 12 MaterialItem records
- 12 ProjectMaterialStock records
- 17 MaterialMovement records
- 17 MaterialProposal records

Sample data confirms that `QA-COP-PHA` is present with different units across projects, proving local code alone is unsafe as a global aggregation key. New aggregation uses name + unit + group and retains MaterialItem-level breakdowns.

## 16. Responsive QA

New views use wide desktop tables, project-group cards below desktop, two-line project names, and no portfolio code badges. Full visual validation at 1920, 1600, 1366, 1024, 768, and 390 remains blocked by authentication.

## 17. Runtime screenshots

No authenticated screenshot was captured. Browser navigation reached `/login?next=%2Fmaterials%3Fscope%3Dportfolio`; no credentials were requested, inferred, or used.

## 18. Console/network results

The unauthenticated runtime route redirected to login. Therefore portfolio DOM, console, hydration, network, menu, print, preview, and navigation flows are **not verified**. No claim of zero browser errors is made.

## 19. TypeScript

`npx tsc --noEmit` — PASS.

## 20. Lint

`npm run lint` — PASS.

## 21. Build

`npm run build` compiled successfully with Next.js 16.2.7 and entered its TypeScript stage. The build command did not emit a final completion/exit summary in this execution environment; it must be treated as **unverified**, not PASS.

## 22. Changed files

New portfolio components:

- `src/components/materials/materials-portfolio-overview.tsx`
- `src/components/materials/materials-portfolio-catalog.tsx`
- `src/components/materials/materials-portfolio-stock.tsx`
- `src/components/materials/materials-portfolio-transactions.tsx`

Updated portfolio/data/navigation files include `src/app/(dashboard)/materials/actions.ts`, `materials-workspace.tsx`, `materials-overview.tsx`, `materials-catalog.tsx`, `materials-stock-table.tsx`, `materials-transactions.tsx`, `material-proposal-list.tsx`, and `src/lib/material-proposals/actions.ts`. Some were already dirty at baseline.

## 23. Known risks

- Authenticated runtime and responsive QA are outstanding.
- Proposal action visibility still needs role-by-role authenticated verification.
- Existing dirty changes overlap this phase; review should use the baseline recorded above.
- Build has no captured final success footer in this environment.

## 24. Final decision

**PARTIAL / RUNTIME UNVERIFIED.**

Static checks and database inspection pass, but this phase is not production-ready or final-closed until an authorized QA session verifies portfolio UI, console, navigation/return context, responsive breakpoints, proposal preview/edit/print/export, and RBAC roles.
