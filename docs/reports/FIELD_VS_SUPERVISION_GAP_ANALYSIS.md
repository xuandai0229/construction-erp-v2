# Field Report vs Supervision Weekly — Gap Analysis

## Executive comparison

| Dimension | Field / Chỉ huy trưởng | Supervision Weekly / Giám sát | Gap |
|---|---|---|---|
| Primary route | `/reports/field` | `/reports/weekly-inspection` | Two adjacent concepts need clear IA |
| Grain | Daily report or weekly aggregation | Weekly dossier with structured sections | Weekly Field is derived from approved daily data; Supervision is authored dossier |
| Main model | `SiteReport`, `SiteReportLine`, `SiteReportAttachment` | `SupervisionWeeklyDossier` + structured child rows + `SupervisionWeeklyAttachment` | Different schemas and attachment semantics |
| Draft | DRAFT, daily/weekly | DRAFT with version/lockVersion | Supervision has stronger concurrency model |
| Approval | SUBMITTED → APPROVED/REJECTED; revision requested | SUBMITTED → REVISION_REQUIRED → APPROVED → LOCKED | Status vocabularies differ |
| Attachment | Physical file metadata: kind, name, mime, size, path | Attachment relation stores documentId/entryId only | Supervision does not expose the same local upload pipeline |
| Scope | Project access + report owner/high-level roles | Weekly reader/author/reviewer sets + project scope | Similar intent, different policy surface |
| Export | print page, weekly summary PDF/export, attachment GET | preview + PDF/DOCX export routes | Export contracts are separate |
| Progress integration | SAVE/SUBMIT/APPROVE/REJECT sync FieldProgressEntry | Structured dossier rows/revisions | Approval removal in Field has direct downstream impact |

## What is actually duplicated

1. Both products represent a weekly operational view, but they are not interchangeable.
2. Both have a draft/review path and audit/history concerns.
3. Both need project scope, role-aware edit/view behavior and export.
4. Both can surface evidence, but only Field has a complete file-storage path in the audited runtime.

## What must not be merged blindly

- Field weekly is generated from approved daily reports; converting it to a free-authored dossier changes data provenance.
- Field approval mutates field-progress status and appears in approval dashboard/notification paths.
- Supervision has version/lock semantics and a separate review transition model.
- `SiteReportAttachment` has physical storage metadata; `SupervisionWeeklyAttachment` references a document/entry and does not carry a file path.
- Field has legacy `SiteReportPhoto` alongside newer attachments; a migration/compatibility decision is needed before consolidation.

## UI/UX gaps

### Naming and user mental model

Field says “Báo cáo Chỉ huy trưởng”; Supervision says “Báo cáo Giám sát công trình”. The labels imply different authors, but both appear in the same Báo cáo hub. The hub should state whether a weekly report is a source document, an aggregation, or a review dossier.

### Permission messaging

Supervision Admin can edit by server policy but sees “chỉ có quyền xem” when not owner. Field uses ownership/high-level rules for content and submit. Both should render effective capability, not a single ownership flag.

### Empty states and validation

Field daily draft UI advertises a deferred-entry workflow that server rules reject. Supervision clearly requires a selected reporting period before enabling save. This is a contract quality gap, not merely copywriting.

### Attachments

Field displays attachment count and gallery; Supervision editor has no equivalent upload surface in the audited runtime. If the intended product is unified evidence, a common attachment contract is needed; otherwise the UI should make the boundary explicit.

## Recommended target boundary

- Keep Field as the source-of-truth for daily site observations, quantities, evidence and field-progress integration.
- Keep Supervision as the structured weekly review/dossier, with explicit inputs from Field rather than duplicated editing.
- Share only cross-cutting primitives: project scope, user capability resolver, audit events, attachment service abstraction, export metadata and status vocabulary mapping.
- Preserve separate domain models until provenance, workflow and migration rules are accepted.

## Verification backlog

- Execute role matrix against current QA fixture credentials for at least ADMIN, CHIEF_COMMANDER, ENGINEER, MANAGER, CONSTRUCTION_SUPERVISOR, SUPERVISION_HEAD, DIRECTOR and STAFF.
- Define whether weekly Field may be created with zero approved daily rows; current QA allowed a weekly draft with zero source rows.
- Decide whether Supervision attachments should reuse `SiteReportAttachment`, generic Documents, or remain references.
- Define cross-links between a Field weekly report and a Supervision dossier without copying mutable content.
