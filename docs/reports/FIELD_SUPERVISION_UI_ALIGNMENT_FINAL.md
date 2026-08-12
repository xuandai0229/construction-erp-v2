# Field / Supervision UI Alignment — Final Report

## FR-003 correction

Supervision Weekly previously derived its banner from `!isOwner`, which told an Admin/reviewer “chỉ có quyền xem” even when server policy allowed editing. The editor now renders the effective capability:

- `!canEditPolicy`: read-only/status restriction message.
- `canEditPolicy && !isOwner`: explicit message that reviewer/admin may edit under role policy.
- owner with edit capability: no misleading read-only banner.

The server authorization checks remain authoritative; this is a UI alignment fix only.

## Field boundary

Field remains the source-of-truth for daily site observations, quantities and evidence. Supervision remains its separate structured weekly dossier with its own state, version and review policy. No schema/model merge was introduced.

## Verification

The change passes TypeScript, targeted lint and production build. Existing Supervision workflow tests remain passing.

