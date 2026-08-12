# Field Report — Upload & Storage Audit

## Scope and verdict

Audited: browser file selection, create handler, attachment API, DB metadata, filesystem path, retrieval route, permissions and rollback behavior.

Verdict: the complete photo upload path works in QA for a writable WEEKLY/DRAFT report. A failed user attempt must therefore be triaged by create validation, duplicate weekly guard, status, permission/project scope, file extension/magic bytes or file limits before treating it as storage failure.

## End-to-end evidence

QA-only sequence:

1. Login as the isolated QA Admin fixture.
2. Select `QA_FIXTURE_PROJ_A`.
3. Create a WEEKLY/DRAFT report for a non-duplicate week.
4. Select the same PNG fixture twice through the browser file chooser.
5. Save draft.
6. Read-only collector found `attachmentCount=2` and `kind=PHOTO`.
7. Files existed below `storage/site-reports/<reportId>/` with metadata sizes 1,776,118 and 284,876 bytes.
8. Detail drawer rendered `Ảnh tiêu biểu (2)` and two `<img>` elements.

The first attempt to create the same weekly period again failed before upload because the server rejected the duplicate period. That explains a class of “image selected but upload failed” reports: `reportId` is never available, so the upload POST is never reached.

## Pipeline map

```text
AttachmentsCard
  → File[] in CreateReportFormData
  → create report action
  → reportId
  → POST /api/reports/[reportId]/attachments (kind + files)
  → validate access/permission/status/count/ext/size/magic bytes
  → write process.cwd()/storage/site-reports/<reportId>/<safeName>
  → transaction inserts SiteReportAttachment + AuditLog
  → GET /api/reports/attachments/[attachmentId]
```

## Controls observed

| Control | Location | Finding |
|---|---|---|
| Authentication | attachment POST | session required |
| Report existence | attachment POST | report ID format + `deletedAt:null` |
| Project access | attachment POST | `canAccessProject` |
| Permission | attachment POST | `reports.update` with project/owner context |
| Writable status | policy + transaction recheck | DRAFT, REJECTED, REVISION_REQUESTED only |
| Count limit | route | max 10 PHOTO, max 5 FILE cumulatively |
| Extension | route | photo/image and document whitelist |
| Magic bytes | route | content checked against extension |
| Safe naming | route | timestamp + random hex, original name not used as path |
| DB consistency | route | DB transaction; files rolled back on error |
| Retrieval | GET route | `reports.view`, normalized storage path, inline photo/attachment response |

## Storage risks / gaps

### Two storage abstractions

Generic `LocalStorageProvider` uses `STORAGE_ROOT` and project-document paths. Report upload directly constructs `process.cwd()/storage/site-reports/<reportId>`. A deployment that configures `STORAGE_ROOT`, mounts a different volume, or runs multiple web instances can make report files diverge from generic document storage assumptions.

### Local filesystem operational dependency

The route writes to local disk. There is no evidence in this audit of object storage, antivirus scanning, background replication, or cross-node consistency. This is acceptable for a single-node/local deployment but is a P2 operational risk for containers or horizontal scaling.

### Client file-type hint

The photo inputs use `accept="image/*"`; the generic file input has no `accept`. Server validation remains the security boundary, but the client can let users choose a file that will later be rejected. Copy says PDF/DOCX/XLSX while server also permits ZIP/RAR.

## Triage decision tree

1. No report row / no `reportId` → inspect daily work-line validation or weekly duplicate period.
2. Report exists but upload response 401/403 → session, project scope or `reports.update`.
3. Response 409 → report status is no longer writable.
4. Response 400 → kind, no files, count limit, extension, empty file or magic bytes.
5. Response 500 + no DB row → inspect filesystem permissions/space and route rollback log.
6. DB row exists but image absent → inspect GET route, `storagePath` normalization, physical file and volume mount.

## Audit conclusion

Do not replace the storage provider or rewrite schema based only on the reported upload symptom. First instrument the create result and attachment response separately, expose rejected-file reasons, and verify deployment volume semantics. The QA evidence demonstrates the current path can persist and retrieve photos.
