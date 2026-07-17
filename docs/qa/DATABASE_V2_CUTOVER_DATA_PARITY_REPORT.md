# Database V2 Cutover Data Parity

| Table | Snapshot rows | Target rows | Policy | Status |
|---|---:|---:|---|---|
| ApprovalRequest | 2 | 2 | EXPLICITLY_TRANSFORMED | PASS |
| AuditLog | 39 | 39 | COPIED | PASS |
| ChatMessage | 0 | 0 | COPIED | PASS |
| Document | 12 | 12 | COPIED | PASS |
| DocumentFolder | 10 | 10 | COPIED | PASS |
| FieldMaterialRequest | 1 | 1 | COPIED | PASS |
| FieldMaterialRequestItem | 2 | 2 | COPIED | PASS |
| FieldProgressEntry | 34 | 34 | COPIED | PASS |
| FieldProgressItem | 34 | 34 | COPIED | PASS |
| FieldProgressItemAssignment | 0 | 0 | COPIED | PASS |
| FieldProgressItemLocation | 5 | 5 | COPIED | PASS |
| FieldProgressTemplate | 2 | 2 | COPIED | PASS |
| MaterialItem | 8 | 8 | COPIED | PASS |
| MaterialMovement | 5 | 5 | COPIED | PASS |
| MaterialRequest | 4 | 4 | COPIED | PASS |
| MaterialRequestItem | 7 | 7 | COPIED | PASS |
| Notification | 1 | 1 | COPIED | PASS |
| Project | 2 | 2 | COPIED | PASS |
| ProjectLocationNode | 3 | 3 | COPIED | PASS |
| ProjectMaterialStock | 5 | 5 | COPIED | PASS |
| ProjectMember | 6 | 6 | COPIED | PASS |
| SiteReport | 12 | 12 | COPIED | PASS |
| SiteReportAttachment | 5 | 5 | COPIED | PASS |
| SiteReportLine | 62 | 62 | COPIED | PASS |
| SiteReportPhoto | 0 | 0 | COPIED | PASS |
| SystemSetting | 1 | 1 | COPIED | PASS |
| User | 9 | 9 | COPIED | PASS |
| WBSItem | 2 | 2 | COPIED | PASS |
| WorkTask | 0 | 0 | ZERO_ROW_NOT_APPLICABLE | PASS |
| WorkTaskAction | 0 | 0 | ZERO_ROW_NOT_APPLICABLE | PASS |
| WorkTaskIdempotency | 0 | 0 | ZERO_ROW_NOT_APPLICABLE | PASS |
| WorkTaskOutboxMessage | 0 | 0 | ZERO_ROW_NOT_APPLICABLE | PASS |