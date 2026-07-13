# RBAC Phase 2.6 — QA harness và unit verification

Ngày: 13/07/2026 (ICT)  
Kết luận: **PASS có điều kiện (static/unit); runtime cross-project BLOCKED vì thiếu QA_DATABASE_URL.** Không được hiểu kết luận này là RBAC toàn hệ thống PASS.

## 1. Integration suite: không còn placeholder

`scripts/qa-rbac-phase2-cross-project-qa.ts` hiện triển khai fixture thật với prefix `QA_RBAC_PHASE25_<timestamp>`: Project A/B, User A/B, ACCOUNTANT A, MANAGER A, VIEWER A, membership đã bị gỡ, document/folder A/B, report/attachment A/B, payment A/B, approval A/B và notification A/B. Script dùng manifest ID, cleanup theo quan hệ (xóa Project QA cascade trước, rồi User QA), sau đó query xác minh còn 0 project/user fixture.

Nó gọi pure evaluator thật `evaluatePermissionPolicy`, chính là lớp policy được `permission-resolver.ts` gọi sau lớp lấy membership. Assertions kiểm tra User A không truy cập Project B, ACCOUNTANT/MANAGER không global, VIEWER không mutation, và removed membership bị từ chối. Có HTTP boundary check thật cho download Document B khi cung cấp `QA_RBAC_HTTP_BASE_URL` và cookie User A; yêu cầu 403/404 và không lộ filename/project ID.

Server Action không được gọi trực tiếp từ process ngoài Next vì action phụ thuộc session/request context của ứng dụng. Harness không giả PASS phần đó: chỉ khi QA app/session HTTP được cấp mới chạy route boundary; direct action/runtime page vẫn **CHƯA XÁC MINH**.

## 2. QA database safety

`scripts/qa/assert-safe-qa-database.ts` parse hai URL PostgreSQL, che credential, yêu cầu:

- `QA_DATABASE_URL` và `DATABASE_URL` đều hợp lệ;
- database QA có `qa`, `test`, `testing`, `ci` hoặc `sandbox` trong tên;
- `ALLOW_QA_RBAC_MUTATIONS=RBAC_QA_ONLY`;
- `QA_RBAC_SENTINEL=RBAC_QA_SENTINEL_V1`;
- fingerprint read-only của cả hai DB bằng `current_database()`, `current_user`, `inet_server_addr()`, `inet_server_port()` không trùng.

Kết quả lần chạy: **BLOCKED** — `QA_DATABASE_URL` không tồn tại/hợp lệ. Không fixture, mutation hoặc cleanup nào chạy.

`scripts/qa/create-safe-qa-prisma-client.ts` nhận URL QA tường minh, tạo `Pool` + `PrismaPg` + `new PrismaClient({ adapter })`; không import `src/lib/prisma.ts`, không dùng singleton hay `DATABASE_URL`. Nó query fingerprint từ chính Prisma client và dừng nếu không khớp guard. Static test xác nhận những ràng buộc này.

## 3. Unit policy không cần DB

`scripts/qa-rbac-phase26-unit.ts` PASS các trường hợp:

- ACCOUNTANT không membership bị deny; VIEWER chỉ view và không mutation payment; membership non-VIEWER đúng project được phép theo policy.
- MANAGER không membership không tạo approval; `PROJECT_MANAGER` ở project được gán được phép.
- VIEWER: `approvals.view` allow; `approvals.create/decide`, document mutation, payment/material/contract mutation deny.
- Membership inactive, soft-delete, leftAt, khác project và project inactive đều deny.
- Scope GLOBAL, ASSIGNED_PROJECTS, OWN_RECORDS, NONE; resource missing; self-approval; workflow status sai.

Policy đáng ngờ đã sửa: `approvals.create` đổi từ `ANY_PROJECT_MEMBER` thành `PROJECT_OPERATORS` trong `src/lib/permissions/permission-registry.ts`; UI capability trong approvals cũng không hiển thị create cho membership chỉ VIEWER.

## 4. Metadata lỗi và AuditLog

`mapAuthorizationErrorForClient` chỉ trả `{ code, message }` trung tính. Unit serialization xác nhận không có projectId, permission, sourcePolicy hay membership. Metadata trong `PermissionDeniedError` chỉ dùng cho server log/diagnostic.

`sanitizeAuditData` đã recursive, array-safe, case-insensitive, không mutate input, xử lý `null`, `Date`, `bigint`, circular/depth/collection/string bounds. Nó redact keys password/token/secret/cookie/authorization/signed URL/apiKey/clientSecret/privateKey/sessionToken/csrfToken/otp/mfa/webhook/credentials/setCookie/proxyAuthorization và Bearer/Basic/query token-signature.

Read-only script `scripts/audit-existing-audit-log-sensitive-data.ts` chỉ query `AuditLog`, không in `beforeData`/`afterData`. Kết quả: **0** record có sensitive signal (password/token/authorization/secret/cookie/signed URL và các biến thể). Đây là heuristic scan, không phải bằng chứng tuyệt đối rằng lịch sử không có dữ liệu nhạy cảm.

## 5. Search và notification

Static audit xác nhận `global-search.ts` build scope `projectId IN accessibleProjectIds` trước query khi không chọn project; danh sách accessible rỗng tạo `IN []`, không search toàn bộ rồi lọc. Với `globalProjectId` không được truy cập, kết quả chỉ còn phạm vi accessible, không lộ Project B.

Notification: `markGlobalNotificationRead` có per-user ledger và kiểm tra `projects.view` nếu notification có projectId (**PASS tĩnh**). List, unread count, detail/deep-link, notification không projectId và membership đã bị gỡ vẫn **CHƯA MIGRATE/CHƯA XÁC MINH runtime**; không tuyên bố toàn module PASS.

## 6. DIRECTOR và DEPUTY_DIRECTOR

Ma trận đã tách hai cột riêng. Code registry hiện đưa cả hai vào `COMPANY_WIDE`, nên cùng GLOBAL với permission đã migrate. Không có delegation policy trong code; không suy đoán ủy quyền hoặc khác biệt nghiệp vụ.

## 7. Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Unit permission/sanitizer/error mapper | PASS |
| Static QA Prisma safety + search scope | PASS |
| AuditLog read-only scan | PASS heuristic: 0 sensitive signal |
| QA guard fingerprint | BLOCKED: thiếu QA_DATABASE_URL |
| Runtime fixture/API/UI/direct action cross-project | BLOCKED, chưa chạy |
| `npx prisma validate` / `generate` | PASS |
| `npx tsc --noEmit` | PASS |
| ESLint source changed | PASS; script lint cần `--no-ignore` vì cấu hình bỏ qua `scripts/` |
| `npm run build` | PASS (có 1 warning Turbopack/NFT đã tồn tại: `next.config.ts` → local storage route) |

## 8. Tác động và phần còn lại

Không migration, schema, seed, commit, push, fixture hay mutation dữ liệu hiện có. Các module Materials/Contracts/Reports workflow-export/Documents actions/Settings/Audit export vẫn chưa migrate đầy đủ; ADMIN business authority vẫn legacy GLOBAL. Runtime search, notification, download/export và server action cross-project vẫn cần QA DB + QA Next instance/sessions để xác minh.

## 9. Cách chạy khi có QA database

1. Cấp `QA_DATABASE_URL` khác `DATABASE_URL`, tên database có dấu hiệu QA/test.
2. Cấp `ALLOW_QA_RBAC_MUTATIONS=RBAC_QA_ONLY` và `QA_RBAC_SENTINEL=RBAC_QA_SENTINEL_V1`.
3. Chạy `npx tsx scripts/qa/assert-safe-qa-database.ts`; chỉ tiếp tục khi `safe: true`.
4. (Tuỳ chọn HTTP) cấu hình QA app riêng, `QA_RBAC_HTTP_BASE_URL` và `QA_RBAC_USER_A_COOKIE`.
5. Chạy `npx tsx scripts/qa-rbac-phase2-cross-project-qa.ts`; kiểm tra output cleanup verification.
