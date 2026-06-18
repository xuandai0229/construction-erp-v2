# FINAL PRE-BUILD SYSTEM HARDENING REPORT

Ngày kiểm tra: 2026-06-18  
Workspace: `D:\construction-erp-v2`  
Kết luận ngắn: có thể build bản dùng thử cho người dùng thật sau khi cấu hình `AUTH_SECRET`/`SESSION_SECRET` trên server deploy. Không commit/push trong phase này.

## 1. Git status trước/sau

Trước khi làm:

- Branch: `main`
- Commit hiện tại: `568aa8a` (`Ignore local database backups`)
- 5 commit gần nhất:
  - `568aa8a Ignore local database backups`
  - `124d4c3 Don dep du lieu test UAT an toan`
  - `eb5ebea Chuan hoa confirm dialog toast va thong bao he thong`
  - `d55b6bb Hoan thien quan ly tai khoan phan quyen va UI responsive`
  - `956290d chore: hide unused navigation items for UAT`
- Có thay đổi sẵn trước phase: `src/lib/auth.ts`, `src/app/actions/material-request.ts`, `src/app/login/page.tsx`, `scripts/qa-rbac-direct-url-access-test.ts`, 2 script QA mới, và một số report/json untracked.

Sau khi làm:

- Không stage file.
- Không commit.
- Không push.
- Có file artifact/không được commit: `docs/qa/test-data-cleanup-dry-run-results.json`.
- Có thư mục/file bị ignore từ trước: `.local-audit-quarantine/`, `test-results/`, `.next/`, backup `.sql` trong quarantine; không stage/commit.

## 2. Mô hình multi-user/LAN/server

App là web app Next.js self-hosted, không phải desktop local. Mô hình đúng cho nhiều người dùng là:

- 1 máy chủ chạy `npm start` hoặc service Node/PM2/systemd cho Next.js.
- 1 PostgreSQL dùng chung qua `DATABASE_URL`.
- Người dùng truy cập bằng IP/domain của máy chủ, ví dụ log production-like hiển thị `http://192.168.1.20:3100` trong smoke test; production thực tế nên dùng port chuẩn đã mở firewall/reverse proxy.
- Nếu mỗi máy tự chạy `localhost` riêng với DB riêng thì dữ liệu sẽ bị tách. Nếu nhiều máy cùng trỏ về cùng PostgreSQL nhưng tự chạy app riêng, vẫn có thể dùng chung DB nhưng khó quản trị session/version/cache hơn.
- LAN nội bộ chạy được nếu máy chủ mở port app, ví dụ 3000/3100 hoặc port reverse proxy 80/443, và PostgreSQL chỉ cần mở cho server app, không nên mở cho mọi client.
- Có thể đóng gói dạng PWA/web app sau này, nhưng hiện chưa có offline mode.
- Nếu mất mạng/server/DB, user không thể submit; các form quan trọng đã có catch/finally/toast hoặc error message để không loading vĩnh viễn.

Trả lời thẳng: có LAN/server chung thì nhiều người nhập cùng lúc được, với điều kiện tất cả truy cập cùng Next.js server và cùng PostgreSQL, có `AUTH_SECRET` mạnh, firewall mở port web, và DB không bị tách theo máy.

## 3. Lỗi phát hiện ban đầu

CRITICAL/HIGH đã phát hiện:

- Session cookie đã được sửa một phần nhưng còn fallback secret mặc định; production có thể chạy nhầm nếu không cấu hình secret.
- Proxy chỉ kiểm có cookie, chưa verify signature/exp ở tầng optimistic route guard.
- Test auth chỉ tự kiểm thuật toán, chưa login thật/chọc route thật.
- Test requestNo concurrency copy logic test riêng, chưa gọi helper dùng chung.
- RBAC test có nguy cơ cleanup không chạy khi `process.exit`, phụ thuộc user seed và tạo screenshot.
- Module documents có server action/API upload/download chưa dùng RBAC thống nhất theo project; user biết `projectId/folderId` có thể ghi vào project không được giao.
- Dashboard tổng quan đếm toàn hệ thống cho commander, có nguy cơ lộ số liệu ngoài phạm vi.
- Một số thao tác submit/delete/upload thiếu guard chống double-click ở client hoặc thiếu `finally`.
- `qa-material-requests-crud-test.ts` tạo `TEST_CRUD_MR_*` nhưng trước đó không cleanup trong `finally`.
- `.env` hiện chưa có `AUTH_SECRET`/`SESSION_SECRET`.

## 4. Lỗi đã fix

- Tách session token helper `src/lib/session-token.ts`.
- Bỏ fallback secret mặc định; thiếu `AUTH_SECRET`/`SESSION_SECRET` sẽ fail rõ.
- Token dạng `base64url(payload).base64url(signature)`, payload chỉ gồm `userId`, `iat`, `exp`.
- Verify HMAC SHA-256 bằng `timingSafeEqual`.
- Proxy Next.js 16 verify token bằng Web Crypto, reject cookie sai format/tamper/expired.
- Login page bỏ email/password hardcode và bỏ nhãn development.
- User create form bỏ default password `Test@123456`, đổi input password sang type `password`.
- Tách helper `src/lib/material-request-number.ts`, format `MR-YYYYMMDD-HHmmss-XXXX`, random bằng `crypto.randomBytes`.
- `createMaterialRequest` dùng retry P2002 tối đa 3 lần qua helper dùng chung.
- Documents actions/upload/download/page dùng `canAccessProject`/`requireProjectAccessOrRedirect`, kiểm folder/document thuộc đúng project.
- Dashboard filter theo project accessible của user.
- RBAC script tự tạo runtime project A/B + runtime commander, không screenshot, cleanup trong `finally`.
- Auth/session test login thật, tamper thật, expired thật, locked/deleted thật.
- RequestNo concurrency test tạo 10 phiếu thật qua helper chung, cleanup theo ID.
- CRUD material request script cleanup trong `finally`.
- User-management scripts dùng `BASE_URL`, không tạo screenshot, không skip giả.
- Thêm smoke script `scripts/qa-final-production-smoke-test.ts` không sinh ảnh/trace.
- Chống double-submit/eternal loading ở login, material request form/detail, delete project, documents upload/mutation, users actions, field-progress daily/master.
- `.env.example` thêm `AUTH_SECRET="replace-with-a-long-random-secret"` và `.gitignore` allow commit `.env.example`; `.env` thật vẫn ignored.

## 5. Session signed token

Cookie `auth_session` hiện:

- `httpOnly: true`
- `sameSite: lax`
- `secure: NODE_ENV === production`
- `path: /`
- `maxAge: 7 ngày`
- Payload: `userId`, `iat`, `exp`
- Signature: HMAC SHA-256 bằng `AUTH_SECRET` hoặc `SESSION_SECRET`
- Verify timing-safe ở server auth.
- User `isActive=false` hoặc `deletedAt != null` bị reject khi `getSession()` đọc DB.

Production không được dùng secret mặc định nữa. Cần tạo secret bằng:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 6. Login hardcode

Đã bỏ:

- `admin@construction.local` khỏi state mặc định login page.
- `123456` khỏi state mặc định login page.
- chữ môi trường development trên login page.
- default password mẫu `Test@123456` trong form tạo user.

Không phát hiện `console.log` password trong UI/app.

## 7. Material requestNo chống trùng

Đã bỏ pattern `count + 1`. `MaterialRequest.requestNo` đã có `@unique`. Không cần migration Prisma mới.

Format hiện tại: `MR-YYYYMMDD-HHmmss-XXXX`, trong đó `XXXX` là 2 bytes random dạng hex uppercase. Nếu trùng unique P2002, retry tối đa 3 lần. Nếu vẫn fail, lỗi tiếng Việt:

`Không thể tạo mã phiếu vật tư duy nhất. Vui lòng thử lại.`

## 8. RBAC/route guard

Kết quả RBAC direct URL PASS thật, không SKIP:

- commander runtime login.
- `/projects` chỉ thấy Project A.
- `/users` bị chặn.
- `/projects/new` bị chặn.
- direct `/projects/[ProjectB_ID]` bị chặn.
- direct `/projects/[ProjectB_ID]/field-progress` bị chặn.
- direct `/projects/[ProjectB_ID]/material-requests` bị chặn.
- Cleanup runtime RBAC data sạch, không tạo screenshot/trace.

## 9. Double-submit/network UX

Đã kiểm/fix các nhóm quan trọng:

- Đăng nhập: `loading + submittingRef + finally`.
- Tạo/sửa user, khóa/mở khóa, xóa mềm/khôi phục, đổi mật khẩu, gán/gỡ project: `operationRef`, catch/finally, toast/error.
- Tạo công trình: dùng `useActionState` pending.
- Xóa công trình: `deletingRef`, catch/finally, toast.
- Field progress master: `operationRef` cho add/save/delete.
- Field progress daily: `operationRef` cho quick add/save.
- Material request create/update: `submittingRef`, disabled loading.
- Material request cancel/update cấp nhận: `operationRef`, finally.
- Documents upload/create/rename/delete: refs chống double submit, catch/finally, reset input file.

Không redesign UI lớn.

## 10. Mobile/click UX

Đã chạy production smoke không chụp ảnh cho viewport:

- `390x844`
- `430x932`
- `768x1024`
- `1366x768`

Các route kiểm:

- `/login`
- `/users`
- `/projects`
- `/projects/[id]`
- `/projects/[id]/field-progress`
- `/projects/[id]/field-progress/daily`
- `/projects/[id]/field-progress/summary`
- `/projects/[id]/material-requests`
- `/documents`

Kết quả: 36 tổ hợp route/viewport không có horizontal overflow. Có 7 tổ hợp có target/icon nhỏ hơn 24px, phân loại LOW vì không chặn nhập liệu; nên polish sau nếu muốn chuẩn touch target cao hơn.

## 11. Network/server error

Rủi ro còn lại:

- Chưa có offline mode; mất mạng/server/DB thì submit fail.
- Một số component vẫn dùng `window.location.reload()` sau success ở material request MVP; không sai dữ liệu nhưng UX chưa mượt.
- Chưa có retry queue/offline draft.

Đã giảm rủi ro loading vĩnh viễn bằng catch/finally ở các action client quan trọng.

## 12. Dữ liệu sau cleanup

Dry-run cuối:

```json
{
  "safeToCleanup": {
    "projects": 0,
    "materialRequests": 0,
    "users": 0,
    "documentFolders": 0
  },
  "needsConfirmation": {
    "projects": 6,
    "materialRequests": 0,
    "fieldProgressEntries": 41,
    "documentFolders": 3,
    "auditLogs": 0
  },
  "keep": {
    "projects": 1,
    "users": 6
  }
}
```

Nhóm Needs Confirmation không bị động vào.

## 13. Script test không sinh rác

Đã sửa/kiểm:

- `scripts/qa-material-requests-crud-test.ts`: cleanup `TEST_CRUD_MR_*` trong `finally`.
- `scripts/qa-field-progress-uat-integration.ts`: đã có cleanup trong `finally`, PASS.
- `scripts/qa-rbac-direct-url-access-test.ts`: runtime data tự tạo/tự xóa; không screenshot.
- `scripts/qa-material-request-requestno-concurrency-test.ts`: cleanup theo ID, kiểm còn 0.
- `scripts/qa-user-management-soft-delete-restore-test.ts`: cleanup user test trong `finally`, không screenshot.

## 14. Build/test results

Build/schema:

- `npx prisma validate`: PASS.
- `npx prisma generate`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS.

Test chính:

- `scripts/qa-auth-session-security-test.ts`: PASS.
- `scripts/qa-material-request-requestno-concurrency-test.ts`: PASS.
- `scripts/qa-rbac-direct-url-access-test.ts`: PASS, không SKIP.
- `scripts/qa-user-management-edit-detail-test.ts`: PASS.
- `scripts/qa-user-management-soft-delete-restore-test.ts`: PASS.
- `scripts/qa-field-progress-rollup-test.ts`: PASS.
- `scripts/qa-field-progress-volume-guard-test.ts`: PASS.
- `scripts/qa-material-requests-integration-test.ts`: PASS.
- `scripts/qa-test-data-cleanup-dry-run.ts`: PASS.
- `scripts/qa-material-requests-crud-test.ts`: PASS.
- `scripts/qa-test-data-cleanup-dry-run.ts` sau CRUD: PASS, safe cleanup vẫn 0.
- `scripts/qa-final-production-smoke-test.ts`: PASS, 36 route/viewport không overflow ngang.

## 15. Production-like start

`npm start` trên port 3000 bị `EADDRINUSE` do đã có process khác trên máy. Để không dừng process lạ, smoke chạy bằng:

```powershell
npm start -- -p 3100
```

Kết quả:

- `http://localhost:3100/login`: HTTP 200.
- Next.js ready, local `http://localhost:3100`, network `http://192.168.1.20:3100`.
- Login smoke PASS.
- `/projects`, `/users`, field-progress daily, material-requests, documents smoke PASS qua route/viewport test.

Sau smoke, không còn listener trên port 3100.

## 16. Env readiness

`.env` hiện có `DATABASE_URL` nhưng chưa có `AUTH_SECRET`/`SESSION_SECRET`. Phase này không ghi secret thật vào `.env`.

Đã thêm `.env.example` với:

```text
AUTH_SECRET="replace-with-a-long-random-secret"
```

Điều kiện trước deploy/build dùng thật: set `AUTH_SECRET` hoặc `SESSION_SECRET` ở môi trường server.

## 17. File đã sửa/tạo

Sửa/tạo chính:

- `.gitignore`
- `.env.example`
- `src/lib/session-token.ts`
- `src/lib/material-request-number.ts`
- `src/lib/auth.ts`
- `src/proxy.ts`
- `src/app/api/auth/login/route.ts` kiểm tra vẫn chặn inactive/deleted.
- `src/app/login/page.tsx`
- `src/app/actions/material-request.ts`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/documents/actions.ts`
- `src/app/(dashboard)/documents/page.tsx`
- `src/app/(dashboard)/documents/[projectId]/page.tsx`
- `src/app/api/documents/upload/route.ts`
- `src/app/api/documents/[documentId]/download/route.ts`
- `src/components/users/user-management-client.tsx`
- `src/components/material-request/material-request-form.tsx`
- `src/components/material-request/material-request-detail.tsx`
- `src/components/projects/delete-project-button.tsx`
- `src/components/documents/document-manager.tsx`
- `src/components/field-progress/master-table.tsx`
- `src/components/field-progress/daily-entry-table.tsx`
- `scripts/qa-auth-session-security-test.ts`
- `scripts/qa-material-request-requestno-concurrency-test.ts`
- `scripts/qa-rbac-direct-url-access-test.ts`
- `scripts/qa-user-management-edit-detail-test.ts`
- `scripts/qa-user-management-soft-delete-restore-test.ts`
- `scripts/qa-material-requests-crud-test.ts`
- `scripts/qa-final-production-smoke-test.ts`

## 18. Lỗi còn lại theo mức độ

CRITICAL: không còn lỗi đã biết sau test/build.

HIGH:

- Cần cấu hình `AUTH_SECRET`/`SESSION_SECRET` thật trên server trước khi cho user dùng. Nếu thiếu, login/session sẽ fail rõ.

MEDIUM:

- Chưa có offline mode/queue submit.
- Material request sau success còn dùng reload thay vì router refresh/state update mượt hơn.
- Dashboard hiện filter theo quyền cho project/doc/contract/report; supplier count cho user không high-level tạm để 0 vì supplier chưa gắn project rõ.

LOW:

- Production smoke phát hiện vài target/icon nhỏ hơn 24px ở một số route/viewport, không gây overflow hay chặn nhập.
- `.local-audit-quarantine` có backup `.sql` cũ được ignore; không được commit.

## 19. Kết luận build bản dùng thử

Có thể build bản dùng thử cho người dùng thật sau khi cấu hình secret môi trường server. Các cổng bắt buộc đã đạt:

1. Session signed token pass tamper test.
2. Login không còn credential hardcode.
3. Material requestNo concurrency pass.
4. RBAC direct URL PASS thật, không SKIP.
5. Build/test pass.
6. Dry-run cleanup sạch sau test.
7. Không sinh rác DB theo safe cleanup.
8. Production-like start/smoke kiểm nhanh được ở port 3100.
9. Có báo cáo final.
10. Không commit/push.

## 20. Git/artifact guard

Không được commit:

- `docs/qa/test-data-cleanup-dry-run-results.json`
- `test-results/`
- `docs/qa/screenshots/`
- `.local-audit-quarantine/`
- `*.dump`, `*.sql`, `trace.zip`, `storageState`, browser artifacts.

Xác nhận: không chạy `git add`, không commit, không push.
