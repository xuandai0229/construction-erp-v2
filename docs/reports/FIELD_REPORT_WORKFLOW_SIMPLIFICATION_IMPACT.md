# Field Report — Workflow Simplification Impact

## Proposal under review

The user request asks whether the Chỉ huy trưởng report workflow can be simplified and whether approval can be removed. This document evaluates impact only; it does not change the workflow.

## Current state

Field statuses include `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `REVISION_REQUESTED`, `LOCKED`, `CANCELLED`.

Observed transition/service dependencies:

- Create/save writes report and lines and may emit audit data.
- Submit moves writable states to SUBMITTED and syncs field progress with `SUBMIT`.
- Approve moves SUBMITTED to APPROVED, records approver/time, audits and syncs progress with `APPROVE`.
- Reject requires a reason, moves to REJECTED, audits and syncs with `REJECT`.
- Attachment upload is allowed only while content is writable.
- Delete is soft-delete and list/counters exclude deleted reports.

## Downstream consumers of approval

| Consumer | Dependency | Impact if approval removed |
|---|---|---|
| Approval queue/dashboard | SUBMITTED and REVISION_REQUESTED counts/actions | No review queue semantics or new state needed |
| FieldProgressEntry | approve/reject sync mode and status | Progress becomes trusted without reviewer gate or needs a replacement gate |
| Dashboard | recent reports and issue actions based on status | Counters, issue badges and action labels change |
| Notifications | submit/approve/reject routing | Recipient/event contract changes |
| Permissions | reports.submit/approve/reject | RBAC registry and role expectations become stale |
| API v1 | submit/approve/reject endpoints | Compatibility risk for clients/integrations |
| Audit/history | transition records and actor attribution | Compliance trace loses reviewer decision |
| Print/export | status/approval metadata may appear in output | Generated artifacts need a new trust label |
| Tests/fixtures | statuses and transition matrix | Broad test and fixture rewrite |
| Operations | soft-delete/revision handling | Recovery and correction workflow must be replaced |

## Simplification options

### Option A — Keep approval, simplify the authoring path (recommended)

- Make daily draft contract consistent: either allow empty draft or disable save until a work line exists.
- Keep `SUBMITTED → APPROVED/REJECTED` as a lightweight review gate.
- Collapse user-facing buttons and expose “Gửi duyệt” / “Cần sửa” while retaining internal statuses.
- Keep attachment status guard and audit trail.

Risk: low relative to removing approval; preserves downstream semantics.

### Option B — Auto-approve on submit, retain internal review metadata

- Submit writes APPROVED automatically but records submitter and an “auto-approved” event.
- Existing approval consumers need compatibility mapping and may lose separation of duties.

Risk: medium/high. It changes business meaning even if status names remain.

### Option C — Remove approval completely

- Introduce a single “published” or “confirmed” state, or treat DRAFT as operational truth.
- Replace approval queue, reviewer permissions, notifications, progress sync trigger, APIs and exports.

Risk: high. This is a product/process migration, not a UI simplification.

## Recommended transition if the business insists on removal

1. Freeze the target state model and define who confirms field progress.
2. Add compatibility mapping from existing statuses and APIs.
3. Preserve historical approval decisions; do not rewrite old rows.
4. Change progress sync to an explicit confirmation event, not an implicit save.
5. Run dual-read dashboards and notification comparison.
6. Migrate active DRAFT/SUBMITTED/REVISION_REQUIRED reports with a documented rule.
7. Retire approval endpoints only after client inventory and deprecation window.
8. Verify exports and audit history for old and new reports.

## Decision

Approval should not be removed as a first fix for the current pain. The evidence points to a validation/UX contract problem and ambiguity around duplicate/attachment errors. Simplify the authoring experience while retaining the review state until downstream owners accept a replacement trust event.
