# HR Phase 3 Data Scope & Runtime Permission Matrix

**Date**: 2026-08-04  
**Scope**: Verification of RBAC permissions and Data Scope Resolution in Phase 3 routes  

---

## 1. Access Control & Permission Mapping Matrix

| Route Path | Permission Code | Scope Enforced | ADMIN Access | MANAGER Access | STAFF Access |
|---|---|---|---|---|---|
| `/hr/organization` | `hr:employee:read` | `ALL_EMPLOYEES` / `OWN_UNIT` | Granted (Full) | Read Tree | Read Tree |
| `/hr/organization` (Actions) | `hr:organization:manage` | Transaction Scope | Granted | Denied | Denied |
| `/hr/organization/positions` | `hr:employee:read` | `ALL_EMPLOYEES` / `OWN_UNIT` | Granted | Read List | Read List |
| `/hr/organization/positions` (Actions) | `hr:organization:manage` | Transaction Scope | Granted | Denied | Denied |
| `/hr/organization/managers` | `hr:employee:read` | `ALL_EMPLOYEES` / `OWN_UNIT` | Granted | Read List | Read List |
| `/hr/organization/managers` (Actions) | `hr:organization:manage` | Transaction Scope | Granted | Denied | Denied |
| `/hr/organization/chart` | `hr:employee:read` | `ALL_EMPLOYEES` / `OWN_UNIT` | Granted | Read Chart | Read Chart |

---

## 2. Security Invariants Verification

1. **Server Actions Guard**: All server actions (`createOrgUnitAction`, `updateOrgUnitAction`, `deactivateOrgUnitAction`, `createPositionAction`, `assignUnitManagerAction`, `endUnitManagerTermAction`) enforce `checkHrPermission("hr:organization:manage")`.
2. **Access Denied UI**: When an unauthorized user attempts to open an HR organization route, `HrAccessDenied` renders a standard light-themed error notice instead of crashing or leaking data.
3. **Data Scope Resolution**: Organization listings filter sensitive metadata according to `HrDataScope` policies.
