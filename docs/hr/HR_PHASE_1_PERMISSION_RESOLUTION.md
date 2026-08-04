# HR Phase 1 — Permission Resolution Specification

## 1. Canonical Permissions
The HR module defines 9 core permissions in `HrPermissionDefinition`:
1. `hr:employee:read`: Read basic employee profile information.
2. `hr:employee:create`: Create new employee records.
3. `hr:employee:update`: Update employee profile details.
4. `hr:employee:delete`: Archive/deactivate employee records.
5. `hr:employee:read_sensitive`: Decrypt and view full CCCD/identity numbers.
6. `hr:org_unit:manage`: Manage organizational structure and department hierarchy.
7. `hr:position:manage`: Manage master job positions and levels.
8. `hr:project_role:manage`: Manage project personnel role definitions.
9. `hr:access_grant:manage`: Grant and revoke HR permissions.

## 2. Resolution Rules
- **Explicit DENY Overrides ALLOW**: If any active grant has `effect = DENY` for a permission code, access is denied immediately regardless of role or other ALLOW grants.
- **Validity Window**: Grants with `revokedAt != null`, `validFrom > now`, or `validUntil < now` are ignored.
- **ADMIN Fallback**: Users with `UserRole = ADMIN` have default full access unless an explicit `DENY` grant exists for them.
- **Data Scope Escalation**: When multiple ALLOW grants exist, the effective scope takes the broadest scope available (`ALL_EMPLOYEES` > `OWN_ORGANIZATION_UNIT` > `OWN_PROJECTS` > `SELF_ONLY` > `NONE`).
- **Sensitive Field Policy Escalation**: Policy defaults to `BASIC_ONLY` unless higher permissions (`CONTACT`, `IDENTITY`, `FULL`) are granted.
