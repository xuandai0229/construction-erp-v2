# RBAC Phase 2.5 — Runtime Cross-Project Verification

Ngày: 13/07/2026 (ICT)  
Kết luận: **BLOCKED vì không có `QA_DATABASE_URL` an toàn. Không có runtime PASS.**

## 1. QA database safety guard

Đã tạo `scripts/qa/assert-safe-qa-database.ts`. Guard:

1. Bắt buộc có `QA_DATABASE_URL` và `DATABASE_URL` parse được.
2. Chỉ in host/database name, không in password.
3. Từ chối nếu cùng host/port/database với `DATABASE_URL`.
4. Từ chối nếu database QA không có dấu hiệu `qa`, `test`, `ci` hoặc `sandbox`.

Kết quả chạy thực tế: **BLOCKED**.

```json
{
  "safe": false,
  "reason": "QA_DATABASE_URL không tồn tại hoặc không phải PostgreSQL URL hợp lệ."
}
```

Vì vậy không có create/update/delete nào được chạy. Không fixture, manifest, cleanup hay mutation test nào được thực hiện trên database hiện tại.

## 2. Fixture và integration suite

`scripts/qa-rbac-phase2-cross-project-qa.ts` được giữ ở trạng thái blocked-by-default: chỉ được triển khai/chạy trong pipeline có `QA_DATABASE_URL` cô lập. Không chạy script này trong task.

Fixture bắt buộc khi guard PASS: prefix `QA_RBAC_PHASE25_<timestamp>`, Projects A/B, User A/B, Accountant A, Manager A, Viewer A, removed-member, payment/approval/document/report/attachment/notification A/B và manifest ID. Cleanup phải chỉ xóa theo manifest/prefix và kiểm tra còn sót.

## 3. Sửa tài liệu mâu thuẫn

`FULL_SYSTEM_PERMISSION_MATRIX.md` đã được thay bằng ma trận **trạng thái hiện hành sau Phase 2**:

- ACCOUNTANT `approvals.view/create`: `ASSIGNED_PROJECTS`.
- MANAGER `approvals.view/create`: `ASSIGNED_PROJECTS`.
- Policy cũ global được chuyển vào Phụ lục “Trước Phase 2”, ghi rõ không còn hiệu lực.
- Các ô phân biệt PASS tĩnh, PASS runtime, CHƯA XÁC MINH và CHƯA MIGRATE.
- Gaps chỉ còn registry chưa là nguồn duy nhất, module chưa migrate, ADMIN legacy authority và runtime chưa xác minh.

## 4. Runtime security hardening đã thực hiện

| Bề mặt | Thay đổi | Trạng thái |
| --- | --- | --- |
| Permission errors | `PermissionDeniedError` chỉ trả “Bạn không có quyền thực hiện thao tác này.”; giữ permission/sourcePolicy/projectId dạng metadata cho server logging | PASS tĩnh |
| Audit payload | `sanitizeAuditData` redact password, passwordHash, token, secret, cookie, authorization, reset/access/refresh token, signedUrl trước khi persist | PASS tĩnh |
| Search | `globalProjectId` bị validate với `getAccessibleProjectIds` trước query; không còn query theo project outside-scope | PASS tĩnh |
| Notification mark read | Nếu input có projectId, server kiểm tra `projects.view` trước upsert personal ledger | PASS tĩnh |
| Document download/load-more/upload | Resolver scope được gọi cùng guard project cũ | PASS tĩnh |
| Report attachment/history download | Resolver scope được gọi cùng guard project cũ | PASS tĩnh |

Chưa có bằng chứng HTTP runtime cho 403/404, không có bằng chứng file metadata không bị lộ, và không có test removal-membership thật vì QA guard fail.

## 5. Kết quả role cần xác minh runtime

| Role/scenario | Kỳ vọng sau Phase 2 | Kết quả runtime |
| --- | --- | --- |
| ACCOUNTANT A → Payment/approval B | Deny do thiếu membership | CHƯA XÁC MINH |
| MANAGER A → approval B | Deny do thiếu membership | CHƯA XÁC MINH |
| VIEWER A mutation | Deny upload/update/delete/approve/issue/mark paid | CHƯA XÁC MINH |
| Removed membership → URL/document/attachment/history/search/notification | Deny hoặc 404 an toàn, không metadata | CHƯA XÁC MINH |
| ADMIN | Global business permissions legacy vẫn ALLOW | Không thay policy, CHƯA XÁC MINH runtime |

## 6. ADMIN business authority còn lại

Theo `permission-registry.ts`, ADMIN đang global ALLOW cho Users, Projects, Documents, Reports approve/reject, Materials, Contracts, Payments review/approve, Approvals decide, Audit global/export và Settings system. Đây là legacy policy, được ghi bằng `sourcePolicy`; chưa thu hẹp trong Phase 2.5.

## 7. Audit log policy

AuditLog có before/after text và nhiều module đã ghi role change, project assignment/unassignment, lock/deactivate/restore. Phase 2.5 chỉ thêm sanitization cho **record mới**; không chỉnh dữ liệu audit cũ. `/audit` page vẫn chỉ ADMIN qua `audit.view_global`. Audit project/export chưa có service/UI, nên **CHƯA MIGRATE**.

## 8. Kiểm tra đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| `npx tsx scripts/qa/assert-safe-qa-database.ts` | BLOCKED, QA_DATABASE_URL thiếu; không mutation |
| `npx tsx scripts/qa-rbac-phase25-static.ts` | PASS audit sanitization |
| Integration fixture/cross-project suite | Không chạy, guard không PASS |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx tsc --noEmit` | PASS |
| ESLint phạm vi file sửa | PASS, 0 warning/error |
| `npm run build` | PASS; còn 1 cảnh báo Turbopack có sẵn về dynamic filesystem tracing ở local storage route Reports, không thuộc RBAC |

## 9. Data impact và bước tiếp theo

- Migration/schema: **không**.
- Seed: **không**.
- Dữ liệu hiện có: **không thay đổi**.
- Cần cung cấp `QA_DATABASE_URL` khác `DATABASE_URL`, có database name an toàn như `construction_erp_qa`; sau đó chạy suite fixture, cleanup verification và cập nhật các ô PASS runtime.
