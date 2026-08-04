# HR Phase 3 Date Range & Assignment Invariants Report

**Date**: 2026-08-04  
**Scope**: Invariants governing Manager Assignments, Employee Transfers, and `isPrimary` preservation  

---

## 1. Core Assignment Rules & Invariants

### Rule 1: `startDate` <= `endDate`
- `startDate` is mandatory on assignment creation.
- `endDate` is optional (`null` indicates active/current assignment).
- When ending a term/assignment, `endDate` MUST be >= `startDate`. Attempting to set an `endDate` before `startDate` throws a domain validation error.

### Rule 2: Single Active Primary Assignment per Target
- An organization unit can have at most ONE active primary manager (`endDate = null` AND `isPrimary = true`).
- Appointing a new primary manager automatically terminates the existing manager's term by setting `endDate = now()`.

### Rule 3: Preservation of Historical `isPrimary` Status
- **Critical Policy**: When an active manager assignment or employee assignment term ends (`endDate` populated), the system **MUST NOT** mutate `isPrimary` to `false`.
- The `isPrimary` flag reflects the nature of the assignment during its active period and must remain intact for historical compliance, reporting, and audit trail audits.

---

## 2. Code Verification Evidence

```typescript
// Verified implementation in src/lib/hr/organization-service.ts
export async function assignUnitManager(params: AssignUnitManagerParams) {
  return await prisma.$transaction(async (tx) => {
    if (params.isPrimary) {
      // Find current active primary manager
      const activePrimary = await tx.organizationUnitManagerAssignment.findFirst({
        where: {
          organizationUnitId: params.organizationUnitId,
          endDate: null,
          isPrimary: true,
        },
      });

      if (activePrimary) {
        // End term without clearing isPrimary!
        await tx.organizationUnitManagerAssignment.update({
          where: { id: activePrimary.id },
          data: { endDate: new Date(params.startDate) },
        });
      }
    }
    ...
  });
}
```

- Tests in `src/lib/hr/__tests__/organization-service.test.ts` verify that past assignments retain `isPrimary: true`.
