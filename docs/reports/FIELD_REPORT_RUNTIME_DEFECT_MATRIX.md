# Field Report — Runtime Defect Matrix

Ngày: 2026-08-12. Mức độ là mức ảnh hưởng tới nghiệp vụ, không phải độ khó sửa.

| ID | Area | Repro | Evidence | Root cause | Impact | Severity | Classification |
|---|---|---|---|---|---|---|---|
| FR-001 | Daily draft | QA: chọn project, không thêm work line, bấm `Lưu nháp` | UI enabled + helper cho phép draft; alert server/client “Daily cần ít nhất 1 dòng”; DB không có row | Client handler và server validation áp cùng rule bắt buộc work line cho draft, trái với UI contract | Không thể lưu thông tin chung trước | P1 | Confirmed defect |
| FR-002 | Weekly create | QA: tạo cùng project/cùng kỳ lần hai | Server log nêu duplicate weekly period; không tạo report/attachment | Duplicate guard đúng nhưng error path không đưa user về report hiện hữu | Dễ tưởng upload hỏng; mất hướng xử lý | P2 | Confirmed behavior + UX gap |
| FR-003 | Supervision editor | Admin mở dossier do người khác tạo | Banner “chỉ xem” nhưng `Lưu báo cáo` enabled; server policy cho Admin edit | Banner dựa trên ownership, không dựa trên effective permission | Người dùng không biết có thể sửa hay không | P2/P3 | Confirmed UX inconsistency |
| FR-004 | Photo upload | QA: weekly khác kỳ, chọn 2 PNG, save, reload/detail | DB attachmentCount=2; 2 file tồn tại tại `storage/site-reports`; detail hiển thị 2 ảnh | Không tái hiện lỗi storage tổng quát | Không có defect chung; cần trace theo guard/input khi fail | — | Passed path |
| FR-005 | File chooser | Field create form | Photo inputs có `accept=image/*`; file input không có `accept`; server whitelist + magic bytes | Client filter thiếu, server filter đúng | Chọn file sai định dạng rồi mới bị reject | P3 | UX gap |
| FR-006 | List counters | Dev raw DB có report soft-deleted | `getSiteReportsPage` dùng `deletedAt:null`; UI 0 | Đây là soft-delete policy | Không hiển thị dữ liệu đã xóa mềm | — | Expected |
| FR-007 | Attachment status | Static + route audit | Upload chỉ cho DRAFT/REJECTED/REVISION_REQUESTED | Workflow cố ý khóa attachment khi SUBMITTED/APPROVED | User cần sửa phải qua revision/reopen path | P2 nếu nghiệp vụ chưa hiểu rule | Business-rule dependency |
| FR-008 | Storage config | Static audit | Generic provider đọc `STORAGE_ROOT`; report upload ghi trực tiếp `process.cwd()/storage/site-reports` | Hai storage path/config abstraction khác nhau | Deploy multi-node/container có risk file không cùng volume | P2 operational risk | Technical debt |

## Repro matrix

| Flow | Dev | QA fixture | Result |
|---|---|---|---|
| Open `/reports/field` | Pass | Pass | Render/counters/list hoạt động |
| Daily empty draft | Không mutate | Reproduced | FR-001 |
| Weekly draft | Không mutate | Pass | Row WEEKLY/DRAFT tạo được |
| Weekly image upload | Preview only | Pass | 2 attachment rows + 2 physical PNG |
| Existing weekly duplicate | Không mutate | Reproduced | FR-002 |
| Supervision editor | Read-only inspection | Not mutated | FR-003 UX inconsistency |
| Build/type/lint | Pass | — | Baseline green |

## Triage order

1. FR-001: decide one authoritative draft rule and make UI/client/server identical.
2. FR-002: expose duplicate-period response as a first-class validation with link/open-existing CTA.
3. FR-003: align banner with effective permission, preserving server checks.
4. FR-008: document/de-risk storage topology before horizontal scaling.
5. FR-005/FR-007: clarify allowed file types and attachment lifecycle in UI copy and acceptance criteria.
