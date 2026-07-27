# Research: Cán bộ giám sát công trình

## Decision 1: Role naming

**Decision**: Use `CONSTRUCTION_SUPERVISOR`.

**Rationale**: Existing system roles use uppercase English enum values. `SUPERVISION_HEAD` already names Trưởng ban giám sát; the new name is distinct and maps directly to Cán bộ giám sát công trình.

**Alternatives considered**: `CONSTRUCTION_SUPERVISION_OFFICER` is precise but longer; reusing `SUPERVISION_HEAD` would violate the approved separation.

## Decision 2: Scope without membership

**Decision**: Add a read-only all-project classification separate from company-wide management roles.

**Rationale**: Existing `COMPANY_WIDE_ROLES` grants both viewing and management in many call sites. Adding the new role there would escalate project, report, material and approval mutations. A separate read classification preserves least privilege and automatically includes new projects.

**Alternatives considered**: Creating a ProjectMember per project causes permission inheritance, notification/statistics pollution and stale scope; a parallel permission system would duplicate the canonical registry.

## Decision 3: Weekly authorization

**Decision**: Central pure policies evaluate role capability, owner and server status; action and export handlers call the same policies.

**Rationale**: Current weekly helpers conflate module access with review roles and hide other users' dossiers. Central decisions make deny behavior testable and keep UI advisory only.

**Alternatives considered**: Role checks inline in each action are error-prone; client-only disabled controls do not stop direct requests.

## Decision 4: Multi-tenant boundary

**Decision**: Preserve the repository's documented single-tenant deployment boundary and report cross-tenant runtime testing as unavailable.

**Rationale**: User, Project and weekly dossier models contain no tenant foreign key. Inventing a partial tenant field only for this role would not isolate all existing resources and would create false security.

**Alternatives considered**: A broad organization migration across every resource is a separate high-risk feature, not an additive RBAC adjustment.

## Decision 5: Export defaults

**Decision**: Allow preview for authorized weekly viewers; allow Word/PDF/print only for the dossier owner (and preserve existing explicit reviewer/admin behavior only where policy already grants it).

**Rationale**: Export is data exfiltration and the approved request chooses the safe default for other authors' dossiers.

**Alternatives considered**: Treating read as download would violate the requirement; granting export to all weekly users is excessive.

## Decision 6: Next.js security conventions

**Decision**: Authenticate and authorize within each Server Action and Route Handler and treat all IDs/payloads as untrusted.

**Rationale**: The bundled Next.js 16 authentication, data security, route-handler and forms guides require authorization at the mutation boundary even when UI access is restricted.

**Alternatives considered**: Layout/page-only guards do not protect callable Server Actions or direct Route Handler requests.
