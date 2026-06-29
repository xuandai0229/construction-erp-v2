# FINAL GO / NO-GO SYSTEM READINESS REPORT

Ngày kiểm tra: 19/06/2026  
Múi giờ nghiệp vụ: Asia/Bangkok (UTC+7)  
Repo: `D:\construction-erp-v2`

## 1. Executive Summary

| Hạng mục quyết định | Kết quả | Căn cứ chính |
|---|---|---|
| UAT nội bộ | **PARTIAL** | CRUD, Field Progress, responsive, RBAC và build đã chạy thật; pagination chưa có đủ dữ liệu để test page 2; còn lỗi UX mức MEDIUM và rủi ro dữ liệu test/backup trong repo. |
| Production phần mềm | **PARTIAL** | `next build` PASS, `next start` PASS và smoke route PASS; chưa có deploy smoke trên môi trường production thật. |
| Production hạ tầng | **FAIL** | Chưa có env production đã xác nhận, chưa có backup định kỳ/offsite và restore drill; repo đang track 8 file SQL backup, trong đó 6 file có dữ liệu. |
| Go-live | **NO-GO** | Còn rủi ro HIGH về backup nhạy cảm trong Git và tài khoản/password seed-test; chưa hoàn tất production env, backup/restore và deploy verification. |

Không phát hiện lỗi CRITICAL. Một lỗi HIGH về direct URL trang sửa công trình đã được sửa và test lại thành công. Vẫn còn các điều kiện HIGH/production-blocking chưa thể xử lý an toàn chỉ bằng thay đổi code trong đợt audit này.

**Quyết định thực tế:** Có thể tiếp tục vòng UAT nội bộ có điều kiện, nhưng chưa đủ cơ sở ký UAT PASS cuối và tuyệt đối chưa được deploy production.

### Đối chiếu báo cáo cũ

- Bằng chứng tốt được tái sử dụng và xác nhận lại: Projects UI/CRUD, global layout, Field Progress master/daily/summary.
- Các kết luận production-ready trong báo cáo cũ là quá mạnh vì chưa chứng minh production env, backup/restore, start smoke, Git hygiene và RBAC direct URL.
- Audit lần này không làm lại toàn bộ từ đầu; chỉ chạy lại các luồng trọng yếu, bổ sung DB query, RBAC, cleanup, build/start và pre-production checks.

## 2. Phạm vi đã kiểm tra

| Phạm vi | Kết quả | Ghi chú |
|---|---|---|
| Auth/Login | PASS | Admin và CHIEF_COMMANDER đăng nhập thật; cookie production có HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age. Token giả bị redirect 307 về `/login`. |
| Dashboard | PARTIAL | Layout và route PASS; số “Cần chú ý” chỉ tính trên 3 project gần nhất nên có thể gây hiểu nhầm khi dữ liệu lớn. |
| Projects | PASS/PARTIAL | Create, update, search, filter, quick links, soft delete, folder và AuditLog PASS. Pagination có code nhưng chưa test runtime page 2 do chỉ còn 2 project active. |
| Field Progress | PASS | Template, GROUP, WORK, decimal daily, reload, same-day upsert, summary và timezone đã kiểm tra bằng UI + DB. |
| RBAC | PASS sau fix | UI guard, `/projects/new`, `/projects/[id]/edit` và backend update denial đã kiểm tra. |
| AuditLog | PASS | Project CREATE/UPDATE/SOFT_DELETE và Field Progress create/batch/daily đều có record thật. |
| Global Layout | PASS | 4 viewport, không page overflow ngang, không lộ nền navy, không che nội dung cuối trang. |
| Env | PARTIAL | Local `.env` đủ biến và secret không phải placeholder; chưa có production env đã xác nhận. |
| DB/Migration | PASS | Prisma validate/generate/status PASS; 10 migration, schema up-to-date. |
| Backup | PARTIAL/FAIL | Tạo backup local và đọc catalog PASS; chưa restore drill/offsite/schedule; backup SQL cũ đang bị Git track. |
| Build/Start | PASS local | TypeScript, production build, local `next start` và route smoke PASS. |
| Data hygiene | PARTIAL | QA data của đợt này đã cleanup 100%; vẫn còn project/user test cũ cần chủ dữ liệu xác nhận trước khi dọn. |

## 3. Bằng chứng UI / Browser

### Route đã test

- `/login`
- `/dashboard`
- `/projects`
- `/projects/new`
- `/projects/[id]`
- `/projects/[id]/edit`
- `/projects/[id]/field-progress`
- `/projects/[id]/field-progress/daily`
- `/projects/[id]/field-progress/summary`

### Viewport đã test

- 1920x1080
- 1366x768
- 390x844
- 430x932

### Kết quả

- Body/html giữ nền `rgb(248, 250, 252)`.
- Không có whole-page horizontal overflow ở các route/viewport đã đo.
- Header sticky ở `top: 0`; không che title.
- Daily mobile có khoảng đệm cuối trang, dòng cuối không bị save bar che.
- Input login có `autocomplete="email"` và `autocomplete="current-password"`.
- Input daily có `inputmode="decimal"`; nhập `12.5` và `20` thành công.
- Không phát hiện input nền đen, text trắng trên nền sáng hoặc nền navy lộ khi scroll cuối.
- Production browser smoke: console error/warning = 0 trên dashboard; console error = 0 trên projects, daily và summary.
- Dev log có hydration warning do browser automation chèn `antigravity-scroll-lock`/`caret-color`; production smoke không tái hiện nên không tính là lỗi ứng dụng.

### Screenshot

- `docs/qa/screenshots/final-go-no-go/login-1366x768.png`
- `docs/qa/screenshots/final-go-no-go/projects-loaded-1366x768.png`
- `docs/qa/screenshots/final-go-no-go/daily-bottom-390x844.png`
- `docs/qa/screenshots/final-go-no-go/summary-430x932.png`
- `docs/qa/screenshots/final-go-no-go/go-no-go-production-dashboard-1366x768.png`

Thư mục screenshot đã được `.gitignore`, không đưa artifact QA vào source control.

## 4. Bằng chứng DB

### Project CRUD test

Project test:

- Code: `QA_TEST_PROJECT_GO_NO_GO`
- ID: `cmqkosjn4003p58wkzdvhty9v`
- Tạo thành công bằng UI.
- Update thành `QA Test Project Go No Go Updated`, investor `QA Chủ đầu tư Updated`.
- Search/filter URL đã xác nhận: `?q=QA_TEST_PROJECT_GO_NO_GO&status=ACTIVE`.
- Quick links Xem/Sửa/Nhập KL/Tổng hợp trỏ đúng project ID.
- Soft delete giữ project trong DB với `deletedAt = 2026-06-19T09:07:38.538Z`.
- Sau soft delete, 8 `DocumentFolder` vẫn còn; không bị hard delete.

8 folder đúng tên:

1. `01_Hợp đồng`
2. `02_Bản vẽ`
3. `03_Dự toán`
4. `04_Nghiệm thu`
5. `05_Hóa đơn`
6. `06_Thanh toán`
7. `07_Hình ảnh hiện trường`
8. `08_Báo cáo ngày`

AuditLog thật:

- CREATE: có `entityType=Project`, `entityId`, `afterData`, `userId`, timestamp.
- UPDATE: có `beforeData` và `afterData` phản ánh đúng name/investor.
- SOFT_DELETE: `beforeData.deletedAt=null`, `afterData.deletedAt` có giá trị.

### Cleanup

- Xóa cứng đúng 2 project có code bắt đầu bằng `QA_TEST_`.
- Cascade xóa folder/template/item/entry liên quan.
- Xóa 8 AuditLog theo entity ID và thêm 4 AuditLog Field Progress theo `projectId`.
- Query sau cleanup:
  - Project `QA_TEST_%`: **0**
  - FieldProgressItem có `QA_TEST_%`: **0**
  - AuditLog theo 2 project QA: **0**

Không có dữ liệu thật ngoài prefix QA bị xóa.

## 5. Bằng chứng RBAC

User đã test:

- `admin@construction.local`: role ADMIN.
- `commander1@construction.local`: role CHIEF_COMMANDER, chỉ được gán project `CT-001`.

Kết quả:

- ADMIN tạo/sửa/xóa project thành công.
- CHIEF_COMMANDER chỉ thấy `CT-001`; không thấy nút Tạo/Sửa/Xóa.
- Direct URL `/projects/new` redirect về `/projects`.
- Trước fix, direct URL edit project không được phân công trả toàn bộ form và dữ liệu: **FAIL HIGH**.
- Backend update từ form bị từ chối với thông báo `Bạn không có quyền sửa công trình`; DB không đổi.
- Sau fix, direct URL edit redirect về `/projects` trên dev server sạch và production build.
- Regression script:
  - `scripts/qa-go-no-go-rbac-direct-url.js`
  - Kết quả production: `PASS: Direct edit URL redirected commander to /projects`.

Fix tối thiểu:

- `src/app/(dashboard)/projects/[id]/edit/page.tsx`
- Thêm `requireManagementAccessOrRedirect()` trước khi query project.
- Không đổi schema và không đổi nghiệp vụ.

Session/security:

- Cookie production: HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age.
- Cookie token giả trả HTTP 307 về `/login`.
- Không thấy code log password/token/session value trong `src/`.
- UI login không hardcode password/token.

## 6. Field Progress Evidence

Project test:

- Code: `QA_TEST_FIELD_PROGRESS_GO_NO_GO`
- Project ID: `cmqkoudci004058wkfg7yhsau`
- Template ID: `cmqkouvd5004a58wkl76veo4d`

Master:

- GROUP ID: `cmqkovod7004c58wktwdeucwn`
- GROUP: `QA_TEST_FIELD_PROGRESS_GROUP - QA Hạng mục kiểm tra`
- WORK ID: `cmqkow3u6004e58wkdc0xd2lb`
- WORK: `QA_TEST_FIELD_PROGRESS_WORK - QA Công việc nhập khối lượng`
- Unit: `m³`
- Design quantity: `100`
- `parentId`, `templateId`, `projectId` đúng.

Daily/upsert:

- Nhập `12.5` bằng UI, reload vẫn giữ `12.5`.
- Sửa cùng ngày thành `20`.
- DB chỉ có 1 entry active cho item/ngày.
- Entry ID: `cmqkp2eou004i58wks8nd2uu4`.
- `entryDate = 2026-06-19 00:00:00`.
- `quantity = 20`, `status = APPROVED`.
- PostgreSQL timezone trả về `Asia/Bangkok`.

Summary:

- WORK xuất hiện đúng.
- Thiết kế: 100.
- Trong kỳ: 20.
- Lũy kế: 20.
- Tỷ lệ: 20.00%.

Audit:

- `CREATE_FIELD_PROGRESS_TEMPLATE`
- `CREATE_FIELD_PROGRESS_ITEM` cho GROUP/WORK
- `BATCH_UPDATE_FIELD_PROGRESS_ITEMS`
- Hai lần `UPDATE_FIELD_PROGRESS_ENTRY` cho ngày `2026-06-19`

## 7. Build / TypeScript / Prisma

| Lệnh | Kết quả |
|---|---|
| `npx prisma validate` | PASS - schema valid |
| `npx prisma generate` | PASS - Prisma Client 7.8.0 |
| `npx prisma migrate status` | PASS - 10 migration, database schema up to date |
| `npx tsc --noEmit` | PASS - exit 0 |
| `npm run build` | PASS - Next.js 16.2.7, 21 static pages generated, TypeScript PASS |
| `npm run start -- -p 3020` | PASS - ready in 205 ms |

Lần build đầu trong sandbox lỗi `EPERM` khi unlink `.next/app-path-routes-manifest.json`; chạy lại ngoài sandbox PASS. Đây là giới hạn quyền Windows/sandbox, không phải compile error của source.

Production HTTP smoke:

| Route | HTTP | Lỗi ứng dụng |
|---|---:|---|
| `/login` khi đã auth | 307 -> `/dashboard` | Không |
| `/dashboard` | 200 | Không |
| `/projects` | 200 | Không |
| `/projects/CT-001/field-progress/daily?date=2026-06-19` | 200 | Không |
| `/projects/CT-001/field-progress/summary` | 200 | Không |

## 8. Env / Git / Backup

### Env

- Local `.env` có `DATABASE_URL`.
- Local `.env` có `AUTH_SECRET`, dài 64 ký tự và không giống placeholder.
- `.env` không bị Git track.
- `.env.example` chỉ chứa placeholder.
- Chưa có `.env.production` hoặc bằng chứng secret/database production đã được cấu hình.
- Local DB đang dùng tài khoản PostgreSQL đặc quyền cao; không được tái sử dụng cấu hình này cho production.

### Git hygiene

- `.gitignore` có `.env*`, `backups/`, `*.dump`, `*.sql` và log npm/yarn.
- Tuy nhiên Git đang track 8 file tại `.local-audit-quarantine/db-backups/`.
- 6/8 file có câu lệnh dữ liệu và chứa các term User/password; kích thước khoảng 176-188 KB.
- Chỉ thêm ignore không loại được file khỏi lịch sử Git. Cần purge history theo quy trình được phê duyệt và rotate credential liên quan.
- `.gitignore` có một dòng duplicate chứa NUL cho `docs/qa/screenshots/`; không chặn build nhưng cần dọn.

### Backup local

- Tool: PostgreSQL 16 `pg_dump.exe` và `pg_restore.exe`.
- File: `backups/qa-preproduction-20260619.dump`.
- Size: 120,527 bytes.
- `pg_restore --list`: PASS, 237 catalog entries.
- File backup mới được Git ignore.
- Chưa thực hiện restore đầy đủ vào database tách biệt.
- Chưa có lịch backup, retention, encryption, offsite copy, monitoring hoặc người chịu trách nhiệm.

Khuyến nghị restore test trên Windows, chỉ chạy với database cô lập:

```powershell
$env:PGPASSWORD = "<restore-user-password>"
createdb -h <host> -p 5432 -U <user> construction_erp_restore_test
pg_restore -h <host> -p 5432 -U <user> `
  --clean --if-exists --no-owner `
  --dbname construction_erp_restore_test `
  backups\qa-preproduction-20260619.dump
```

## 9. Dữ liệu còn cần dọn trước demo/go-live

Không tự xóa các record dưới đây vì không có xác nhận chủ dữ liệu:

### Project active có dấu hiệu test

- `ct_01` - `Công Trình test`

### Project soft-deleted cũ

- `CT001` - `CT test`
- `CT0011` - `test1`
- `123` - `test12`
- `CT-QA-PROGRESS` - `Công trình test tiến độ động`
- `GY-456` - `Công trình A`

### User seed/test đang active

- `admin@construction.local` / `dev_admin_test`
- `director@construction.local` / `director_test`
- `deputy@construction.local` / `deputy_director_test`
- `commander1@construction.local` / `commander_ct001_test`
- `commander2@construction.local` / `commander_ct002_test`

`prisma/seed.ts` và nhiều script QA chứa password test mặc định. Các tài khoản này phải bị xóa, khóa hoặc đổi credential trước production theo quyết định nghiệp vụ.

### QA data đợt này

- Project `QA_TEST_%`: 0.
- Field Progress `QA_TEST_%`: 0.
- AuditLog thuộc project QA: 0.

## 10. Lỗi phát hiện và cách xử lý

| Mã lỗi | Mức độ | File/phạm vi | Mô tả | Xử lý | Test lại |
|---|---|---|---|---|---|
| GNG-SEC-001 | HIGH | `projects/[id]/edit/page.tsx` | CHIEF_COMMANDER truy cập direct URL và đọc dữ liệu/form edit project không được phân công. | Đã thêm server page guard. | PASS browser + script trên production build. |
| GNG-SEC-002 | HIGH | `.local-audit-quarantine/db-backups/` | 8 SQL backup đang bị track; 6 file có dữ liệu/User/password terms. | Chưa sửa vì cần purge history và credential rotation có phê duyệt. | FAIL/OPEN. |
| GNG-SEC-003 | HIGH production | Seed/DB | Tài khoản seed-test active và password mặc định được ghi trong seed/scripts. | Chưa dọn vì cần quyết định tài khoản nào là dữ liệu thật. | OPEN. |
| GNG-UX-001 | MEDIUM | `src/components/layout/header.tsx:111` | Header luôn hiển thị “Quản trị viên/Quản trị hệ thống”, kể cả CHIEF_COMMANDER. | Chưa sửa trong đợt chỉ ưu tiên HIGH. | FAIL. |
| GNG-UX-002 | MEDIUM | `src/components/field-progress/master-table.tsx:112` | Sửa tên GROUP nhưng bấm thêm WORK trước Save làm revalidation ghi đè thay đổi chưa lưu. | Chưa sửa; workaround là Save trước khi thêm dòng. | FAIL tái hiện. |
| GNG-DATA-001 | MEDIUM | `src/app/(dashboard)/dashboard/page.tsx:51,108` | “Cần chú ý” chỉ tính từ 3 project gần nhất, không phải toàn bộ project active. | Chưa sửa vì cần xác nhận ý nghĩa KPI. | OPEN nghiệp vụ. |
| GNG-QA-001 | MEDIUM gap | Projects pagination | Code dùng page size 15 nhưng DB chỉ có 2 project active, chưa test được page 2 bằng UI. | Không tạo thêm 16 record để tránh rác dữ liệu. | PARTIAL. |
| GNG-GIT-001 | LOW | `.gitignore` | Có dòng duplicate chứa NUL cho screenshot path. | Chưa sửa vì không ảnh hưởng build. | OPEN. |

## 11. Checklist quyết định

| Checklist | Kết quả | Bằng chứng/chặn |
|---|---|---|
| UI/UX | PASS/PARTIAL | 4 viewport PASS; còn header role và unsaved master edit mức MEDIUM. |
| CRUD Projects | PASS/PARTIAL | Create/update/search/filter/links/delete PASS; pagination page 2 chưa chạy. |
| Field Progress | PASS | Master/daily/upsert/summary/timezone PASS. |
| AuditLog | PASS | Project và Field Progress có record thật. |
| RBAC | PASS sau fix | UI/direct URL/backend guard đã test bằng CHIEF_COMMANDER. |
| Security basic | FAIL production | Backup SQL tracked và seed credential/test accounts. |
| Build | PASS | Prisma, TypeScript, Next build PASS. |
| Env | PARTIAL | Local env hợp lệ; production env chưa xác nhận. |
| Backup | PARTIAL | Dump + catalog PASS; chưa restore drill/schedule/offsite. |
| Data cleanup | PARTIAL | QA đợt này sạch; dữ liệu test cũ còn lại. |
| Deploy smoke | PARTIAL | Local production start PASS; chưa deploy smoke trên hạ tầng thật. |

## 12. Kết luận cuối

### UAT nội bộ

**PARTIAL - chưa ký PASS cuối.**

Luồng cốt lõi Projects và Field Progress hoạt động; lỗi RBAC HIGH đã được vá. Có thể tiếp tục UAT nội bộ có điều kiện, nhưng cần chốt pagination runtime và xử lý/accept các lỗi MEDIUM trước khi ký biên bản cuối.

### Production

**NO-GO PRODUCTION — còn thiếu:**

1. Gỡ/purge các DB backup nhạy cảm khỏi Git history và rotate credential có khả năng đã lộ.
2. Xác nhận/xóa/khóa toàn bộ tài khoản seed-test; không dùng password mặc định.
3. Cấu hình và review production env/secret/database role tối thiểu.
4. Thiết lập backup định kỳ, retention, encryption, offsite và chạy restore drill thành công.
5. Dọn hoặc xác nhận project/user test còn lại.
6. Deploy lên môi trường pre-production/production thật và smoke test qua HTTPS, proxy, domain, cookie Secure và database production.
7. Hoàn tất pagination UAT và quyết định nghiệp vụ cho KPI “Cần chú ý”.

Không sử dụng kết luận “Production Ready 100%”.

