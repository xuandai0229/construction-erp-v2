# SETTINGS REFACTOR IMPLEMENTATION REPORT

> Kiểm kê hiện trạng sau triển khai — 2026-08-03, múi giờ Asia/Bangkok.  
> Phạm vi: `/settings`, các server action, upload policy, RBAC, `SystemSetting`, `AuditLog`, đầu ra Supervision Weekly và runtime local QA. Không có migration, không xoá cột hay dữ liệu nghiệp vụ.

## 1. Phạm vi thực hiện

- Đã quét route `/settings`, deep-link `?section=company|documents|administration`, hai server action Settings, API upload tài liệu, permission registry, route/menu policy, Prisma schema, consumer báo cáo/tài liệu và biến môi trường liên quan.
- Đã kiểm tra ba lớp: code tĩnh, database/backend logic trên PostgreSQL QA local, và trình duyệt có đăng nhập ở dev Webpack lẫn production build.
- Không dùng số liệu hoặc company profile giả để kết luận. Giá trị tạm phục vụ kiểm thử đã được hoàn nguyên; 9 tài khoản fixture QA đã được xoá theo prefix kiểm soát. Các audit record QA vẫn được giữ lại theo quan hệ `onDelete: SetNull`.
- Vì audit và optimistic concurrency không được phép bị xoá/ghi lùi, `SystemSetting.updatedAt` và `version` tại QA đã tiến sau các lần save test; giá trị cấu hình nghiệp vụ và `updatedBy` đã được trả về trạng thái trước test.

## 2. Baseline

| Hạng mục | Kết quả baseline | Bằng chứng |
|---|---|---|
| Công nghệ | Next.js 16.2.7, Prisma 7.8.0, PostgreSQL local QA | `package.json`, `prisma/schema.prisma` |
| Runtime dev cũ | Turbopack dev từng timeout trên nhiều route, không riêng Settings | `docs/audit/settings-refactor-baseline.md` |
| Fallback phát triển | Script dev đổi sang `next dev --webpack`; production build không phụ thuộc fallback này | `package.json:7` |
| Đường đọc Settings | Trước đây có nguy cơ read path khởi tạo singleton; hiện chỉ đọc | `src/lib/settings/system-settings.ts:53-58` |
| Dữ liệu đã tồn tại | `SystemSetting` đã có row ở QA; không seed/hard-code lại identity khi đọc | runtime + `system-settings.ts:20-30` |

## 3. Quyết định sản phẩm đã chốt

| Quyết định | Triển khai |
|---|---|
| Chỉ giữ thông tin doanh nghiệp dùng chung | `companyName`, `taxCode`, `hotline` trong section **Thông tin doanh nghiệp** |
| Chỉ giữ document policy có enforcement | Giới hạn MB, extension, naming convention, auto-versioning |
| Không phô bày fake control | Security, workflow, notifications, backup, timezone/currency được ẩn; không xoá schema |
| Quy trình thuộc phân hệ chủ | Cột workflow được ghi nhận `deferred`, owner `Approval Center`; không đặt editor ở Settings |
| Tài liệu thuộc Documents | Storage/retention/provider không hiển thị ở Settings khi chưa có enforcement |
| Timezone/currency | Giữ cột tương thích, `deferred`; không có UI hay consumer production |
| Điều hướng | Deep link chuẩn: `company`, `documents`, `administration` |

## 4. Kiến trúc Settings sau refactor

```text
/settings
├── Thông tin doanh nghiệp
│   ├── Tên doanh nghiệp, Mã số thuế, Hotline
│   ├── Lưu/Hủy theo section
│   └── Server action + optimistic concurrency + AuditLog
├── Chính sách tài liệu
│   ├── MB tối đa, extension cho phép
│   ├── Naming convention, auto-versioning
│   ├── Lưu/Hủy theo section
│   └── POST /api/documents/upload đọc và thực thi policy
└── Quản trị hệ thống (ADMIN)
    └── 12 thay đổi Settings gần nhất từ AuditLog, chỉ đọc
```

Desktop dùng navigation sticky; tablet/mobile thay bằng select native. Không có modal, drawer hoặc physical child route `/settings/*`.

## 5. UI mới

| Section | Card/form và control | Trạng thái |
|---|---|---|
| Thông tin doanh nghiệp | 3 text input; Hủy/Lưu | ADMIN, DIRECTOR sửa; DEPUTY_DIRECTOR chỉ đọc |
| Chính sách tài liệu | number MB, text extensions, 2 switch; Hủy/Lưu | ADMIN sửa; DIRECTOR/DEPUTY_DIRECTOR chỉ đọc |
| Quản trị hệ thống | Danh sách audit: section, thời điểm, changed fields, actor role | ADMIN xem; không có form/nút ghi |
| Điều hướng | 3 button desktop / 1 select mobile | Filter theo quyền trước khi render |

`SettingsWorkspace` xác định dirty state từng section; nút Lưu và Hủy bị khoá khi dữ liệu chưa đổi (`src/components/settings/settings-workspace.tsx:79-88,235-251`). Validation lỗi hiển thị inline, submit không ghi database (`:95-101,118-124`).

## 6. Route, action và API

| STT | Route/chức năng | File chính | Component/service | API/action | Database | Trạng thái |
|---:|---|---|---|---|---|---|
| 1 | `/settings` | `src/app/(dashboard)/settings/page.tsx:17-57` | `SettingsWorkspace` | read snapshot | `SystemSetting`, `AuditLog`, `User` | Hoạt động đầy đủ |
| 2 | `?section=company` | cùng route `:37-40` | company form | `updateCompanyProfile` | `SystemSetting`, `AuditLog` | Hoạt động đầy đủ |
| 3 | `?section=documents` | cùng route `:37-40` | document policy form | `updateDocumentPolicies` | `SystemSetting`, `AuditLog` | Hoạt động đầy đủ |
| 4 | `?section=administration` | cùng route `:27-34` | audit timeline | read-only query | `AuditLog`, `User` | Hoạt động đầy đủ, ADMIN |
| 5 | Upload document liên quan Settings | `src/app/api/documents/upload/route.ts:122-141,188-257` | validation + storage | `POST /api/documents/upload` | `SystemSetting`, `Document`, `AuditLog` | Hoạt động đầy đủ cho 4 policy |
| 6 | Company output Weekly | `src/lib/supervision-weekly/export-docx.ts:24-27` | document model/preview | server render/export | `SystemSetting` read-only | Hoạt động một phần — chỉ Weekly |

Không thấy `/settings/*`, REST Settings API, modal Settings, drawer Settings, feature flag Settings hay environment flag Settings. Các biến `.env` bắt buộc cho runtime là database/auth; không có secret được ghi vào báo cáo.

## 7. Database và contract dữ liệu

| Model | Vai trò | Bằng chứng | Nhận xét |
|---|---|---|---|
| `SystemSetting` | Singleton thực tế chứa toàn bộ 28 cột legacy/active | `prisma/schema.prisma:1131-1183` | Không migration; 7 cột active, 21 cột deferred |
| `AuditLog` | Audit before/after, actor, IP, UA, timestamp | `schema.prisma:884-903`; `settings/actions.ts:90-101,132-143` | Actor bị `SetNull` nếu tài khoản bị xoá; audit record vẫn còn |
| `User` | Actor và `updatedBy` | `schema.prisma:248,1180` | Read UI lấy `name`, action lấy session server-side |
| `Document` | Consumer upload policy + version | `upload/route.ts:222-257` | Không phải Settings model, nhưng bị ảnh hưởng trực tiếp |

`getSettingsSnapshot()` không ghi row khi đọc. Nếu không có row, nó trả default in-memory có company profile trống, version `0`; row chỉ được tạo khi người có quyền lưu (`src/lib/settings/system-settings.ts:20-30,53-58`; `settings/actions.ts:79-102`).

## 8. Hồ sơ chi tiết — Thông tin doanh nghiệp

| Trường thông tin | Nội dung |
|---|---|
| Tên/route | Thông tin doanh nghiệp; `/settings?section=company` |
| Mục đích | Một nguồn cấu hình nhận diện dùng chung, không phải hồ sơ theo công trình |
| Đối tượng/quyền | ADMIN, DIRECTOR xem/sửa; DEPUTY_DIRECTOR xem; role khác bị chặn route |
| UI | `companyName`, `taxCode`, `hotline`; form chỉ render khi `canManageCompany`, còn lại là `<dl>` read-only (`settings-workspace.tsx:187-195`) |
| Input/output | Input Zod strict; output `SettingsSnapshot.company` |
| DB/action/validation | `SystemSetting`; `updateCompanyProfile`; tên bắt buộc, 200 ký tự, MST/hotline 50 ký tự (`settings-validation.ts:14-18`) |
| Lưu/audit | Có: transaction, optimistic version, AuditLog, IP/UA; runtime đã lưu/reload/khôi phục QA |
| Ảnh hưởng liên phân hệ | Weekly DOCX, edit preview và export preview đã nhận source company mới; MST/hotline chưa có consumer Word/PDF đã chứng minh |
| Runtime | Save disabled khi clean, enable khi dirty, lỗi inline quá 200 ký tự, toast thành công, persistence qua reload; xung đột stale save có toast |
| Vấn đề | Chưa phải nguồn cho toàn bộ report Word/PDF; xem mục 9 |

## 9. Tích hợp Company source cho báo cáo/tài liệu

| Đầu ra | Trạng thái | Bằng chứng |
|---|---|---|
| Supervision Weekly DOCX | Đọc `getCompanyProfile()` thật | `src/lib/supervision-weekly/export-docx.ts:5,24-27,42-43` |
| Weekly model/preview/edit/export | Nhận companyName từ profile | `document-model.ts:135-165`; `weekly-editor.tsx`; `reports/weekly-inspection/[id]/edit/page.tsx`; `preview/page.tsx`; `supervision-export/[id]/page.tsx` |
| Không có cấu hình company | Hiển thị rõ `CHƯA CẤU HÌNH DOANH NGHIỆP`, không bịa dữ liệu | `document-model.ts:156-159` |
| Weekly summary DOCX/PDF | **Chưa tích hợp**, còn hard-code company | `src/app/api/reports/weekly-summary/export/route.ts:92-97`; `export-pdf/route.ts:158-159` |
| Safety assessment DOCX/HTML | **Chưa tích hợp**, còn hard-code | `src/lib/safety-reporting/assessment-docx-generator.ts:118-119`; `assessment-html-renderer.ts:382-383` |
| Safety plan DOCX/HTML | **Chưa tích hợp**, official content hard-code | `safety-plan-official-content.ts:7`; `docx-generator.ts:841`; `html-renderer.ts:229-230` |

Kết luận: company source đã có consumer thật, nhưng chỉ **một phần** portfolio. Không được tuyên bố Settings đã điều khiển toàn bộ Word/PDF trước khi các consumer trên được chuyển sang provider.

## 10. Hồ sơ chi tiết — Chính sách tài liệu

| Trường thông tin | Nội dung |
|---|---|
| Tên/route | Chính sách tài liệu; `/settings?section=documents` |
| Mục đích | Policy toàn hệ thống cho upload mới, không phải storage administration |
| Đối tượng/quyền | ADMIN sửa; DIRECTOR và DEPUTY_DIRECTOR xem read-only |
| UI | MB tối đa, extensions, naming switch, auto-version switch, Lưu/Hủy |
| Input/output | `DocumentPolicyInput`; normalise extension lower-case, bỏ dấu `.`, loại duplicate |
| DB/action/validation | `SystemSetting`; `updateDocumentPolicies`; MB nguyên 1–100, extension không rỗng, strict (`settings-validation.ts:20-29`) |
| Enforcement thật | Upload đọc snapshot trước validate, stream kiểm lại max bytes, audit reject; auto-version chỉ tăng version khi switch bật (`upload/route.ts:122-141,188-194,222-234`) |
| Lưu/audit | Có transaction/version/AuditLog; khi đổi policy revalidate `/documents` |
| Không thuộc scope | provider S3/R2/local, retention job, thùng rác, cấu trúc thư mục, phân quyền upload/download — thuộc Documents/Platform |
| Runtime | Đổi MB, toast thành công và reload giữ giá trị; giá trị đã hoàn nguyên sau QA |

## 11. Cơ chế enforcement tài liệu

| Policy | Điểm thực thi | Hành vi khi vi phạm | Audit |
|---|---|---|---|
| Max upload MB | pre-validation và `createValidatedUploadStream` | HTTP 400, chặn trước/suốt streaming; partial storage bị dọn | `DOCUMENT_UPLOAD_BLOCKED_BY_POLICY` cho policy validation |
| Allowed extensions | `validateDocumentUploadPolicy` | HTTP 400; dangerous extension vẫn bị chặn | Có metadata lý do |
| Naming convention | `validateDocumentUploadPolicy` | Chặn tên ngắn, generic, traversal | Có metadata lý do |
| Auto-versioning | Truy vấn `Document` cùng project/folder/originalName | Tăng version khi bật; khi tắt không tự tăng | Audit upload thường |

Unit test thực thi đã pass cho giới hạn size và dangerous extension (`src/lib/documents/validation.test.ts`). Chưa dùng file artefact để kiểm thử raw HTTP upload end-to-end nhằm tránh tạo/giữ file QA không cần thiết.

## 12. Danh mục toàn bộ field

| # | Category | Field/control | Loại | Nguồn/lưu | Validation/consumer | Trạng thái |
|---:|---|---|---|---|---|---|
| 1 | Company | `companyName` | text | `SystemSetting` | required/max 200; Weekly partial | Active/enforced |
| 2 | Company | `taxCode` | text | `SystemSetting` | max 50; chưa có output consumer | Active, save thật |
| 3 | Company | `hotline` | text | `SystemSetting` | max 50; chưa có output consumer | Active, save thật |
| 4 | Documents | `maxUploadSizeMb` | number | `SystemSetting` | 1–100; upload pre/stream check | Active/enforced |
| 5 | Documents | `allowedExtensions` | text CSV | `SystemSetting` | normalize; upload check | Active/enforced |
| 6 | Documents | `enforceNamingConvention` | switch | `SystemSetting` | upload name check | Active/enforced |
| 7 | Documents | `autoVersioning` | switch | `SystemSetting` | Document version branch | Active/enforced |
| 8 | System | `timezone` | hidden select cũ | retained column | no consumer | Deferred/I |
| 9 | System | `currency` | hidden select cũ | retained column | no consumer | Deferred/I |
| 10 | Security | `requireTwoFactorForAdmins` | hidden switch cũ | retained column | no MFA flow | Deferred/F |
| 11 | Security | `sessionTimeoutMinutes` | hidden number cũ | retained column | session không đọc cột | Deferred/F |
| 12 | Security | `passwordRotationDays` | hidden number cũ | retained column | no rotation | Deferred/F |
| 13 | Security | `allowedIpMode` | hidden select cũ | retained column | no allowlist | Deferred/F |
| 14 | Security | `trustedDeviceReviewDays` | hidden number cũ | retained column | no device registry | Deferred/F |
| 15 | Security | `auditSensitiveActions` | hidden switch cũ | retained column | không là feature flag | Deferred/F |
| 16 | Workflow | `materialRequestApproval` | hidden switch cũ | retained column | Approval owns workflow | Deferred/B/E |
| 17 | Workflow | `reportLockAfterApproval` | hidden switch cũ | retained column | Approval owns workflow | Deferred/B/E |
| 18 | Documents | `documentRetentionYears` | hidden number cũ | retained column | no retention job | Deferred/B |
| 19 | Notifications | `emailDailyDigest` | hidden switch cũ | retained column | no mail delivery job | Deferred/C/F |
| 20 | Notifications | `approvalEscalation` | hidden switch cũ | retained column | no scheduler | Deferred/B/F |
| 21 | Notifications | `fieldReportReminder` | hidden switch cũ | retained column | no delivery job | Deferred/C/F |
| 22 | Notifications | `reminderTime` | hidden time cũ | retained column | no reminder feature | Deferred/C/F |
| 23 | Notifications | `escalationHours` | hidden number cũ | retained column | no scheduler | Deferred/B/F |
| 24 | Data | `automaticBackup` | hidden switch cũ | retained column | no provider/job | Deferred/F/H |
| 25 | Data | `backupFrequency` | hidden select cũ | retained column | no provider/job | Deferred/F/H |
| 26 | Data | `retentionYears` | hidden number cũ | retained column | no backup job | Deferred/F/H |
| 27 | Data | `exportRequiresApproval` | hidden switch cũ | retained column | no export enforcement | Deferred/B/F |
| 28 | Data | `maintenanceWindow` | hidden text cũ | retained column | no scheduler | Deferred/F |

Registry là nguồn phân loại chính thức, không phải UI menu (`src/lib/settings/settings-registry.ts:23-60`). Tổng: 7 active và 21 deferred; field deferred không render ra production Settings.

## 13. Button và action

| Nút/hành động | Điều kiện | Hành động thực tế | Thành công/lỗi/loading | Trạng thái |
|---|---|---|---|---|
| Chọn Company | section có quyền | `router.replace(?section=company)` | đổi panel | Hoạt động |
| Chọn Documents | section có quyền | `router.replace(?section=documents)` | đổi panel | Hoạt động |
| Chọn Administration | ADMIN | `router.replace(?section=administration)` | read audit | Hoạt động |
| Lưu Company | dirty, hợp lệ, có quyền | server action riêng | toast; pending; inline validation/conflict toast | Hoạt động đầy đủ |
| Hủy Company | dirty và không pending | reset local state | không gọi API | Hoạt động |
| Lưu Documents | dirty, hợp lệ, ADMIN | server action riêng | toast; pending; inline validation/conflict toast | Hoạt động đầy đủ |
| Hủy Documents | dirty và không pending | reset local state | không gọi API | Hoạt động |
| Naming switch | ADMIN + document form | thay local draft | save mới ghi | Hoạt động |
| Auto-version switch | ADMIN + document form | thay local draft | save mới ghi | Hoạt động |

Không còn nút global Save/Reset/default, test connection, backup/restore/import/export hoặc placeholder button trong Settings. Runtime xác nhận: clean save bị khoá; một trường đổi thì enabled; save ghi DB và survives reload; lỗi validation không gọi ghi; stale update hiện thông báo yêu cầu reload.

## 14. RBAC matrix

| Vai trò | Thấy menu/route `/settings` | Company | Documents | Administration | Server action/API guard |
|---|---|---|---|---|---|
| ADMIN | Có | Xem/sửa | Xem/sửa | Xem | `assertPermission` company/documents; upload permission riêng |
| DIRECTOR | Có | Xem/sửa | Chỉ xem | Không | Không thể gọi document action hợp lệ |
| DEPUTY_DIRECTOR | Có | Chỉ xem | Chỉ xem | Không | Không có editor/action từ UI; server permission không cho manage |
| SUPERVISION_HEAD | Không; redirect `/projects` | Không | Không | Không | Route policy chặn |
| CONSTRUCTION_SUPERVISOR | Không; redirect `/projects` | Không | Không | Không | Route policy chặn |
| CHIEF_COMMANDER | Không; redirect `/projects` | Không | Không | Không | Route policy chặn |
| MANAGER | Không; redirect `/projects` | Không | Không | Không | Route policy chặn |
| ENGINEER | Không; redirect `/projects` | Không | Không | Không | Route policy chặn |
| STAFF | Không; redirect `/projects` | Không | Không | Không | Route policy chặn |

Evidence: permission policy `src/lib/permissions/permission-registry.ts:68-73`; menu/route policy `src/lib/roles/role-workspace-policy.ts:62`; page guard `settings/page.tsx:18-22`; action guard `settings/actions.ts:36-40,155,177`. Runtime login ran all 9 roles; Admin, Director, Deputy and Staff screenshots are retained.

## 15. Optimistic concurrency và audit

| Control | Cơ chế | Bằng chứng/runtime |
|---|---|---|
| First-row race | `pg_advisory_xact_lock` trong transaction | `settings/actions.ts:70-73` |
| Stale write | `expectedVersion`, check current + `updateMany(id, version)` | `:105,119-123` |
| UX conflict | Server action trả serializable conflict result, client toast | `:23-33,163-170,186-193`; `settings-workspace.tsx:104-107,127-130` |
| Changed fields only | diff trước khi update/audit | `:107-140` |
| Audit | actor, role, before/after sanitized, IP/UA, time | `:90-101,132-143`; Administration timeline |

Đã chạy hai tab Admin: tab 1 lưu thay đổi; tab 2 dùng snapshot cũ bị từ chối và hiện toast. Không xảy ra last-write-wins.

## 16. Dữ liệu hard-code, mock và placeholder

| Thông tin | Nguồn thật | Hard-code/mock | Kết luận |
|---|---|---|---|
| Company hiện trên Settings | `SystemSetting` | Không hard-code khi read; default memory trống | Đáng tin cậy sau save |
| 7 document/company controls | `SystemSetting` | Default memory chỉ fallback khi row không có | Đáng tin cậy theo consumer nêu trên |
| “Lần lưu gần nhất” | `SystemSetting.updatedAt` + `updatedBy` | Không KPI giả; timezone browser/Intl `vi-VN` | Có ý nghĩa: thời điểm row Settings được cập nhật |
| Audit timeline | `AuditLog` 12 record mới nhất | Không mock | Production-ready cho read-only overview |
| Security/backup/notification cũ | Cột legacy `SystemSetting` | Không có UI/status Phase 2/7/9 còn hiển thị | Đã ẩn, ghi deferred |
| Company trong Weekly | `getCompanyProfile()` | Fallback minh bạch nếu chưa cấu hình | Một phần portfolio |
| Company trong safety/weekly summary | constant/source template | Hard-code còn tồn tại, liệt kê mục 9 | Chưa được Settings điều khiển |

Không thấy `mock data` hiển thị trên màn `/settings` mới. Các 21 field deferred không được coi là tính năng có thật.

## 17. Runtime browser results

| Tình huống | Kết quả | Evidence |
|---|---|---|
| Admin desktop trước sửa | Section/fields, save disabled khi clean | `admin-desktop-company-before.png` |
| Dirty/save/reload | Save enabled khi dirty; toast; dữ liệu còn sau reload; sau đó hoàn nguyên | `admin-company-dirty.png`, `admin-company-save-success.png` |
| Validation | >200 ký tự hiển thị lỗi inline, không ghi | `admin-company-validation-error.png` |
| Stale update | Tab cũ bị conflict toast, không ghi đè | DOM runtime + `admin-company-stale-update-conflict.png` |
| Documents | save policy và reload persistence, rồi hoàn nguyên | `admin-documents-before.png`, `admin-documents-save-success.png` |
| Administration | audit thật từ `AuditLog` | `admin-administration-audit.png` |
| Director | Company edit; Documents read-only; không Administration | `director-company-read-write.png` |
| Deputy | Company/Documents read-only | `deputy-company-documents-read-only.png` |
| Staff | route bị redirect và menu không có Settings | `staff-settings-blocked.png` |
| Production build | `/settings` authenticated render, không Server Component error/console warning | `admin-production-settings.png` |

## 18. Responsive, accessibility và UX

| Viewport | Kết quả |
|---|---|
| Desktop 1920×1080 | Sidebar Settings sticky, layout 2 cột, form/readability tốt |
| Laptop 1366×768 | Không horizontal overflow; evidence `admin-laptop-company.png` |
| Tablet 1024×768 | Không horizontal overflow; responsive select thay sidebar; evidence `admin-tablet-company.png` |
| Mobile 390×844 | Không horizontal overflow (`scrollWidth === clientWidth`); select native; metadata wrap-safe; evidence `admin-mobile-company.png` |
| Focus/keyboard | Input có focus ring; switch là button role `switch`; mobile native select keyboard-accessible. Tab automation của browser không chuyển focus đáng tin cậy trong in-app harness, nên không kết luận thứ tự Tab hoàn chỉnh. |

Loading (`Đang lưu…`), disabled, success/error toast, empty audit state và read-only state đều có code path. Không có safe way để gây storage/database 500 ở browser mà không phá dữ liệu QA; stale conflict là error state server-side đã xác minh.

## 19. Test, lint và build

| Gate | Kết quả |
|---|---|
| `npx tsc --noEmit` | PASS sau khi sửa type `searchParams` tương thích Next 16 ở `reports/weekly-inspection/page.tsx` |
| Targeted ESLint | PASS cho source Settings, upload, company consumer và compatibility page |
| Unit tests | PASS: 60 Vitest + 3 Node tests (permissions, validation, route policy, upload policy) |
| `npm run build` | PASS production build |
| Build warning còn lại | 5 warning Turbopack NFT do dynamic storage paths trong Field Reports/Print, không phải Settings; không block build |
| Runtime production | PASS authenticated `/settings`, 0 console error/warning trên tab kiểm tra |

## 20. Rủi ro và backlog còn lại

| Mức | Vấn đề | Ảnh hưởng | Hướng xem xét, chưa tự sửa |
|---|---|---|---|
| High | `SystemSetting` chưa có DB unique/singleton constraint; code dùng `findFirst` | External/legacy write có thể tạo >1 row, read không đồng nhất | Chỉ thêm constraint sau khi chủ hệ thống cho phép migration và xử lý dữ liệu cũ |
| High | `QA_DATABASE_URL` cùng target với `DATABASE_URL` trong môi trường đã kiểm tra | E2E không tách biệt hoàn toàn; mutation QA có rủi ro vận hành | Cần provision QA/E2E DB riêng trước automation tiếp theo |
| Medium | Company profile chưa được tất cả Word/PDF/report dùng | Thay đổi company chưa đồng bộ Weekly Summary/Safety templates | Chốt danh sách template và chuyển từng consumer có test output |
| Medium | Legacy security/backup/workflow/notification columns còn default như có tính năng | Một consumer mới có thể đọc nhầm cờ không được enforce | Giữ registry deferred, chỉ mở sau contract + consumer/job thật |
| Medium | Administration chỉ cho xem changed fields, không render diff before/after | Điều tra chi tiết cần xem database/audit raw | Thiết kế audit detail read-only sau quyết định privacy/retention |
| Low | In-app browser harness không khẳng định full Tab traversal | Không phải lỗi chức năng đã thấy | Kiểm thử accessibility bằng Playwright/axe riêng khi có CI browser |

## 21. Checklist cuối cùng và bước tiếp theo

| Tiêu chí | Kết quả |
|---|---|
| Chỉ còn Settings có enforcement thật | Đạt: Company profile, 4 document policy, audit read-only |
| Không còn fake controls trong UI | Đạt: không security/backup/KPI/Phase 2/reset giả |
| Có save riêng từng section | Đạt |
| Có validation, disabled, loading, success/error | Đạt |
| Có RBAC frontend + route + action | Đạt; 9 role runtime matrix |
| Có audit + concurrency | Đạt |
| Có responsive evidence | Đạt cho 1920/1366/1024/390 |
| Không migration/drop/delete nghiệp vụ | Đạt |
| Có đủ điều kiện mở rộng refactor | Có cho phạm vi active; các High/Medium còn lại phải được chủ hệ thống quyết định |

Các quyết định cần chủ hệ thống chốt trước pha tiếp theo:

1. Thông tin doanh nghiệp có bắt buộc thay thế hard-code của toàn bộ safety và weekly-summary Word/PDF không?
2. Có duyệt migration để bảo đảm singleton `SystemSetting` không?
3. Có tách một database E2E/QA thật trước khi mở rộng automation không?
4. Backup/restore có cần UI vận hành hay chỉ thuộc Platform/DevOps?
5. Timezone/currency nên là global, per-company hay per-project?
6. Workflow approval có chuyển hoàn toàn về Approval Center không?

Đề xuất tiếp theo chỉ để xem xét: (a) thiết kế migration singleton an toàn, (b) lập contract company-template cho từng output, (c) cấp hạ tầng job/provider trước khi mở retention/backup/notification, và (d) thêm test browser CI có accessibility scan. Không mục nào trong bốn việc này được tự động thực hiện bởi đợt refactor hiện tại.
