# Field Report Attachment — Final Report

## Implementation

- Added `src/lib/storage/site-report-storage.ts` as the shared SiteReport storage adapter.
- New writes use the configured `storageProvider` and project/report folder contract.
- Reads and deletes support both provider keys and legacy `storage/site-reports/...` paths with traversal guards.
- POST upload keeps extension and magic-byte validation, size/count limits, project access and writable-status policy.
- Upload is handled per file in the Field workspace. Valid files can succeed while rejected files remain in a retry set.
- DELETE attachment validates report ownership/scope/permission/status, removes the object, deletes the metadata row transactionally and writes an audit event.
- Existing attachment/photo rows are shown in edit mode and can be removed.
- Generic file input uses `.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar`; image inputs remain image-only.

## QA evidence

On the isolated QA fixture, one existing valid PNG was added to a saved Daily report and the list showed `1 ảnh`. The report was reopened in edit mode; the saved image was visible as `Ảnh đã lưu`, removed, saved, and the list returned to `Chưa có ảnh`. The report was then soft-deleted as remediation cleanup.

## Safety

No absolute storage path is returned to the client. Existing historical storage paths remain readable. Production storage and production data were not touched.

