# Báo cáo xác minh hard delete: Nhà cung cấp, Hợp đồng và Thanh toán

Ngày: 13/07/2026 (ICT)  
Kết luận: **BLOCKED** — mã nguồn, Prisma schema, build production và smoke route đã được xác minh; migration, backup-restore và regression có xác thực đăng nhập chưa thể chạy vì chưa có `QA_DATABASE_URL` an toàn. Không có thao tác ghi nào trên database hiện tại.

## Kết quả bắt buộc

| Hạng mục | Trạng thái | Bằng chứng / ghi chú |
| --- | --- | --- |
| Safety guard QA | **FAIL / BLOCKED** | `QA_DATABASE_URL` không tồn tại hoặc không phải PostgreSQL URL hợp lệ. Không có fixture, restore hay migration được chạy. |
| Migration áp dụng vào database | **CHƯA ÁP DỤNG** | Không database nào bị thay đổi. Migration mới đã được Git track và stage riêng: `prisma/migrations/20260713093000_hard_delete_supplier_contract_payment/migration.sql`. |
| Backup và restore | **BLOCKED** | Backup đã tạo, 162,447 bytes, SHA-256 `7911F27F91B585503846BA8EEA4BAAE197F81372EA630837CF413D0C291A0B4F`; restore thử bị cấm khi không có QA DB. |
| `npx prisma format` | **PASS** | Chạy thành công. |
| `npx prisma validate` | **PASS** | Schema hợp lệ. |
| `npx prisma generate` | **PASS** | Prisma Client v7.8.0 tạo thành công. |
| `npx tsc --noEmit` | **PASS** | Exit code 0 (lần cuối: 5.2 giây). |
| ESLint `src` | **PASS có warning sẵn có** | Exit code 0; 0 error, 174 warning. Các warning còn lại thuộc module giữ lại, không phải lỗi hard-delete mới. `src/proxy.ts` riêng: exit 0. |
| `npm run build` | **PASS** | Exit code 0; 22.1 giây. Có 1 warning Turbopack/NFT hiện hữu từ local-storage provider qua API attachment report, không liên quan ba domain đã xóa. |
| Production route smoke | **PASS** | Server production (`npm run start -- -p 3101`): `/suppliers`, `/contracts`, `/accounting` đều HTTP 404; `/login` 200; `/dashboard` chưa đăng nhập chuyển 307 tới login. Server đã dừng. |
| Production route manifest | **PASS** | `.next/server/app-paths-manifest.json` không chứa ba route cũ. |
| Regression có đăng nhập | **CHƯA XÁC MINH RUNTIME** | Dashboard, Projects, Reports, Materials, Documents, Approval Center, notifications, global search và Users cần session/QA an toàn. Không dùng database development thay thế. |

## Migration và dữ liệu

Migration được đọc và đối chiếu với schema cùng database hiện tại trước migration. Nó xóa bảng con trước bảng cha: `PaymentRecord`, `PaymentPlan`, `PaymentRequest`, `Contract`, `Supplier`; xóa foreign key/index theo việc drop bảng; rebuild `ApprovalRequestType`; bỏ `ApprovalRequest.amount`; bỏ `SystemSetting.fiscalYearStartMonth`; rebuild `UserRole` với `ACCOUNTANT -> STAFF`. Không xóa `User` hoặc tài liệu người dùng; folder tài liệu kế thừa được đổi sang taxonomy vận hành. Đây là migration Prisma một lần, không được thiết kế idempotent.

Audit chỉ đọc trước migration tại database development-like (`127.0.0.1:5432`, `construction_erp_v2`) ghi nhận:

| Đối tượng | Số bản ghi trước migration |
| --- | ---: |
| Supplier | 5 |
| Contract | 5 |
| PaymentPlan | 4 |
| PaymentRecord | 1 |
| PaymentRequest | 5 |
| Approval `CONTRACT` / `PAYMENT` | 1 / 1 |
| User | 12 |
| User `ACCOUNTANT` | 1 |

Tài khoản `ACCOUNTANT` duy nhất (`cmr5p2ivu0005r4wk1xnlp2dm`) đang active và có membership `VIEWER` ở một công trình. Theo helper cũ, `VIEWER` chỉ xem và chặn mutation tài chính trước nhánh accountant. Sau migration dự kiến account này thành `STAFF`, giữ nguyên membership; không thấy tăng quyền, nhưng mất quyền thuộc domain tài chính đã bị xóa. Kết quả sau migration và số User sau migration **chưa có** cho tới khi QA restore/apply thành công.

## Bề mặt đã gỡ khỏi mã nguồn

- Route/UI: `src/app/(dashboard)/suppliers/**`, `contracts/**`, `accounting/**`; component supplier/contract, dashboard finance và executive finance.
- Backend/RBAC: supplier, contract, payment permission/service/action/type/validator; approval type tài chính; notification/search/menu/dashboard reference; role `ACCOUNTANT` và permission chết tương ứng.
- Schema: 5 model nêu trên, relation liên quan, enum tài chính, `ApprovalRequest.amount`, setting tài chính nêu trên.
- Dependency trực tiếp: `decimal.js` đã được gỡ (17 xuống 16 direct dependencies).

Không có API route chuyên biệt cho ba domain trước khi xóa; 9 API route còn lại là auth, document, report và cron document. `src/proxy.ts` giữ duy nhất tham chiếu runtime có chủ đích tới ba path cũ để trả 404 **trước** auth redirect; đây không phải feature flag hay route còn hoạt động.

## Quét reference còn sót

`node --import tsx scripts/qa-financial-modules-hard-delete-static.ts` đã trả:

```text
PASS: runtime source and Prisma schema contain no Supplier/Contract/Payment module references.
```

Các kết quả còn lại được phân loại như sau:

| Vị trí | Phân loại |
| --- | --- |
| `src/proxy.ts` | Guard 404 bắt buộc cho URL đã bị loại bỏ. |
| `scripts/audit-financial-hard-delete-*`, `scripts/qa-financial-modules-hard-delete-static.ts` | Script audit/verification có chủ đích, không phải runtime domain. |
| Migration lịch sử | Bắt buộc giữ nguyên. |
| Migration hard-delete mới | Bắt buộc giữ để Prisma áp dụng thay đổi. |
| Từ `contract` chung trong script UI | False positive, không phải domain hợp đồng. |

## Đo thực tế sau thay đổi

Không có baseline sạch trước hard delete vì worktree đã dirty từ trước; không suy diễn phần trăm giảm. Số đo hiện tại:

| Chỉ số | Giá trị |
| --- | ---: |
| Page route | 20 (HEAD: 23) |
| API route | 9 (HEAD: 9) |
| Prisma model | 25 (HEAD: 30) |
| Permission registry | 37 (baseline Phase 2: 50) |
| `.next/server` | 25,214,772 bytes |
| `.next/static` | 2,423,173 bytes |
| `.next/static/chunks` | 2,177,684 bytes; 46 JS chunks |
| Production server source map | 231 file; 18,501,653 bytes |
| Production static source map | 0 file; 0 byte |
| `public` assets | 1,776,118 bytes |
| Build hiện tại | 22.1 giây |

Không dùng tổng `.next` làm số đo vì cache `.next/dev` cũ làm nhiễu. Không có baseline build/bundle đáng tin cậy để kết luận mức giảm.

## Audit nguyên nhân ứng dụng còn nặng (chỉ báo cáo)

Các package cài đặt lớn đáng xem xét tiếp theo gồm `next`, `@prisma/client`, `lucide-react`, `date-fns`, `xlsx`, `react-dom` và `zod`; không package nào bị gỡ ngoài `decimal.js`. Các client component lớn theo kích thước nguồn gồm Document Workspace, Daily Entry Table, User Management Client, Approval Center và Master Table. Không có `dynamic()` import được phát hiện. Local upload vẫn dùng local-storage provider và dashboard có thể còn trả dữ liệu dư thừa; các mục này ngoài phạm vi hard delete và chưa bị sửa.

## Rủi ro và bước bắt buộc để gỡ BLOCKED

1. Cấu hình `QA_DATABASE_URL` trỏ tới PostgreSQL tách biệt, database name chứa `qa`, `test`, `ci` hoặc `sandbox`; khác fingerprint với `DATABASE_URL`.
2. Cấu hình `ALLOW_QA_RBAC_MUTATIONS=RBAC_QA_ONLY` và `QA_RBAC_SENTINEL=RBAC_QA_SENTINEL_V1`.
3. Restore backup vào QA, xác nhận 5/5/4/1/5 record domain, 12 User và account `ACCOUNTANT` trước migration.
4. Chạy quy trình Prisma migration chính thức trên QA (không dùng `db push`), rồi kiểm tra bảng/enum/field cũ biến mất, User không giảm, mapping role đúng và không còn FK mồ côi.
5. Dùng session QA để smoke các module công trình còn giữ và kiểm tra Materials/Kho không còn yêu cầu Supplier, cùng Approval/Notification/Search không còn dữ liệu tài chính.

Không có migration/schema/data nào đã được áp dụng lên development hoặc production trong lần này. Không commit hoặc push được thực hiện.
