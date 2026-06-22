# BÁO CÁO PHASE 1 — DATA MODEL & BACKEND FOUNDATION
## Phân hệ: Báo cáo hiện trường (/reports)

**Trạng thái:** HOÀN THÀNH CÓ KIỂM SOÁT  
**Phạm vi:** Chuẩn hóa schema, migration, server actions nền tảng  
**Repo:** D:\construction-erp-v2  
**Người thực hiện:** Principal Full-stack Engineer + Technical Documentation Lead (AI Coding Assistant)  
**Ngày thực hiện:** Hôm nay  

---

## Executive Summary

- **Vì sao phải làm phase này:** Phân hệ `/reports` (Báo cáo hiện trường) hiện chỉ là một giao diện Demo hoàn toàn bằng Local State. Dữ liệu sẽ mất khi F5 tải lại trang. Các field trong Database không khớp với giao diện thiết kế, thiếu logic kết nối giữa Báo cáo (SiteReport) và Hạng mục công trình (FieldProgressItem).
- **Trước phase này:** Hệ thống chưa thể tạo Báo cáo lưu vào DB, do Schema Prisma nguyên gốc không có trường phân biệt Báo cáo Ngày/Tuần (`ReportType`), thiếu hệ thống lưu trữ File đính kèm (`Attachment`) và chưa khai báo định dạng thời tiết (`WeatherCondition`). Người tạo báo cáo cũng đang bị hardcode.
- **Sau phase này:** Schema Database đã được định hình chuẩn mực (MVP). Migration đã chạy thành công. Server Action `createSiteReport` và `getSiteReports` đã được xây dựng và kết nối trực tiếp đến Database. Script kiểm thử đã chạy sinh ra dữ liệu báo cáo thật nối với user session thật.
- **Còn chưa đạt gì:** UI hiện tại (Form/Modal) chưa được nối với API mới tạo. Logic đính kèm File (Upload File/Images) chưa được tích hợp hoàn chỉnh Storage Provider thực tế. Logic tính tổng tự động cho báo cáo tuần (Weekly Aggregation) chưa được triển khai.
- **Kết luận:**  
  **Phase 1 Foundation:** GO (Móng dữ liệu đã sẵn sàng và an toàn).  
  **Production / Cho công trường nhập thật:** NO-GO (Phải hoàn tất kết nối Form UI và File Upload ở các phase sau).

---

## Phạm vi thực hiện

### Trong phạm vi Phase 1
- **Schema:** Bổ sung Enum (`SiteReportType`, `WeatherCondition`, `SiteReportAttachmentKind`). Mở rộng `SiteReport`, chỉnh sửa `SiteReportLine`, thêm `SiteReportAttachment`.
- **Migration:** Tạo và chạy script SQL để đồng bộ DB (`add_site_reports_foundation`).
- **Server actions nền tảng:** Code `actions.ts` gồm `getSiteReports` (Read) và `createSiteReport` (Create) theo chuẩn Next.js 16.
- **Test script:** Code `scripts/test-site-report-create.ts` giả lập thao tác User để tạo báo cáo ngày lưu vào DB.
- **Validate/build:** Kiểm tra Type-safety, ESLint, Prisma Generate và Build Next.js 16 thành công.

### Ngoài phạm vi Phase 1
- Upload ảnh/file thật (S3 / R2 / Storage local).
- Gallery ảnh thật từ storage lên giao diện.
- Nối UI Form hiện tại vào Server Action.
- Tính tự động (Aggregation) khối lượng báo cáo tuần.
- Approval workflow (Quy trình duyệt đẩy vào AuditLog).
- FieldProgress sync (Cập nhật tiến độ dự án từ báo cáo).
- Export PDF/Excel.

---

## Hiện trạng trước khi sửa

- **Local state/Mock:** Luồng báo cáo sử dụng biến React `useState(MOCK_REPORTS)`. Rủi ro mất trắng 100% dữ liệu nhập liệu của kỹ sư công trường nếu F5 / Đóng trình duyệt.
- **Những gì đã có thật:** Dropdown lấy danh sách Công trình (`Project`) và Hạng mục (`FieldProgressItem`) đang lấy dữ liệu thật từ DB qua Server Action cũ.
- **Schema cũ thiếu gì:** Thiếu phân loại Ngày/Tuần (`type`), Nhiệt độ (`weatherTemperature`), Enum Thời tiết (`weatherCondition`), và Bảng lưu danh sách File/Ảnh (`SiteReportAttachment`). Hơn nữa, `SiteReportLine` đang bắt buộc (`NOT NULL`) phải có `wbsItemId`, làm cản trở việc kỹ sư tự nhập công việc phát sinh không có trong WBS.

---

## Thay đổi Schema Chi tiết

| Nhóm | Thay đổi | Mục đích | Ghi chú |
| ---- | -------- | -------- | ------- |
| **Enum mới** | Thêm `SiteReportType` | Phân loại Báo cáo NGÀY (`DAILY`) và TUẦN (`WEEKLY`). | |
| **Enum mới** | Thêm `WeatherCondition` | Chuẩn hóa các hệ số thời tiết (SUNNY, RAINY, STORM...) thay vì chuỗi Text tự do. | Hỗ trợ Dashboard phân tích rủi ro thời tiết về sau. |
| **Enum mới** | Thêm `SiteReportAttachmentKind` | Phân loại File Đính kèm (PHOTO, FILE). | |
| **Model SiteReport** | Thêm `reportNo` (String) | Mã số Báo cáo duy nhất. | Tạm thời cấp phát qua default `gen_random_uuid()` để vượt Warning Unique constraint. |
| **Model SiteReport** | Thêm `type`, `weekStartDate`, `weekEndDate` | Hỗ trợ lưu cấu trúc Báo cáo Tuần. | `DAILY` là mặc định. |
| **Model SiteReport** | Thêm `weatherCondition`, `weatherTemperature` | Lưu thông số thời tiết tiêu chuẩn. | Có thể Map thẳng Icon UI sau này. |
| **Model SiteReport** | Thêm `summary`, `materials`, `labor`, `quality`, `issues`, `recommendations` | Định hình lưu trữ Text cho tài nguyên và Rủi ro báo cáo. | Data kiểu `@db.Text`. |
| **Model SiteReport** | Thêm `reporterName` | Snapshot lưu cứng tên người tạo vào thời điểm Submit. | Ngừa trường hợp User sau này bị xóa tên/đổi tên. |
| **Model SiteReportLine** | Sửa `wbsItemId` thành Nullable (`String?`) | Cho phép kỹ sư tự gõ việc phát sinh. | Rất quan trọng cho thực tế công trường. |
| **Model SiteReportLine** | Thêm `fieldProgressItemId`, `workName`, `area`, `sortOrder` | Liên kết ngược lại với Khối lượng (FieldProgressItem) nếu công việc có trong danh mục. | Giữ nguyên các field `quantityToday` (Decimal) như cũ. |
| **Model mới** | Tạo bảng `SiteReportAttachment` | Lưu metadata thông tin Upload File (Size, StorageKey, URL...). | Sẵn sàng cho Phase Upload. |

---

## Migration chi tiết

- **Tên migration folder:** `20260622025729_add_site_reports_foundation`
- **File SQL:** `prisma/migrations/20260622025729_add_site_reports_foundation/migration.sql`
- **Tóm tắt SQL làm gì:**
  - Create Enums: `SiteReportType`, `WeatherCondition`, `SiteReportAttachmentKind`.
  - Alter Table `SiteReport`: Bổ sung hàng loạt cột mới. Cột `reportNo` được add cùng default `gen_random_uuid()::text` và tạo Unique Index.
  - Alter Table `SiteReportLine`: Drop constraint NOT NULL của `wbsItemId`. Thêm các cột mới (workName, area...) và Foreign Key tới `FieldProgressItem`.
  - Create Table `SiteReportAttachment` và Foreign Keys tương ứng.
- **Thực thi (Run status):** Thành công.
- **Có Warning / Xác nhận không:** 
  - Trong quá trình phát triển, Prisma v7 phát hiện Warning khi thêm thuộc tính `reportNo` (Unique Constraint) vào Table đã có sẵn dữ liệu cũ (5 row records). Trong môi trường non-interactive, migration sẽ thất bại vì yêu cầu User phải Drop Table hoặc bổ sung thủ công.
- **Giải pháp kỹ thuật:** 
  - Bổ sung `@default(dbgenerated("gen_random_uuid()::text"))` vào cột `reportNo` ngay trong schema. Việc này ép PostgreSQL tự động sinh UUID khác biệt cho 5 dòng dữ liệu cũ hiện có, thoả mãn Unique Index mà không làm chết Migration Script và không xóa dữ liệu của khách hàng.
  - **Đánh giá rủi ro tạm thời:** UUID dài dòng, không thân thiện để đọc. Ở các Phase sau khi nối UI, cần sử dụng hàm tạo `reportNo` chuẩn nghiệp vụ (VD: `BC-D-2024-001`) tại tầng Application Logic trước khi truyền vào lệnh Prisma Create.
- **Cam kết:** KHÔNG Drop Database, KHÔNG Reset, KHÔNG Xóa bất kỳ dòng dữ liệu cũ nào.

---

## Server Actions / Backend Foundation

| Function | Mục đích | Dữ liệu vào | Dữ liệu ra | Trạng thái | Ghi chú |
| -------- | -------- | ----------- | ---------- | ---------- | ------- |
| `getSiteReports` | Lấy danh sách Báo cáo cho Dashboard | `filters` (Record) bao gồm projectId, type, status. | Mảng `SiteReport` kèm Count của Lines, Photos, Attachments. | Hoàn thành | Đã loại bỏ `any` Typescript. |
| `createSiteReport` | Submit báo cáo mới vào DB | `data` (Payload Form), `isDraft` (Boolean) | Object `{success, id, reportNo}` | Hoàn thành | Tự động đọc `getSession()` để lấy Identity thực tế. Không bị hardcode. |

- **Đã lưu DB thật chưa:** Cả 2 action đã kết nối thẳng đến `prisma` client thật.
- **Có transaction không:** `createSiteReport` sử dụng nested writes (tạo Report kèm Create Array `lines`), hoạt động như 1 transaction nội bộ của Prisma.
- **Có lấy session thật không:** Đã Hook thành công `getSession()` từ `src/lib/auth`. Dùng ID làm `createdById` và snapshot Name vào `reporterName`.
- **Thiếu gì:** Chưa triển khai thư viện Zod Validator Schema ở Backend (Vì phải đợi Phase nối UI để thống nhất Payload Form Data trước khi bắt Validate chặt). Mới dùng ép kiểu an toàn cơ bản (Number, String).

---

## Test script

- **File script:** `scripts/test-site-report-create.ts`
- **Mục đích:** Mô phỏng payload truyền từ frontend, test việc Server có Create Report và Lines thành công không mà không phải bấm tay vào web.
- **Dữ liệu test:** Tự động lấy Project Đầu tiên đang `ACTIVE` và User đầu tiên đang `isActive`. Không hardcode ID cố định nào.
- **Kết quả thực tế:** 
  - In ra console `✅ Successfully created SiteReport!`
  - ID Report và Report No (UUID) đã được hiển thị trên CLI.
  - Test chạy hoàn hảo không gây sụp DB.
- **Dữ liệu test tồn tại (Rủi ro):** Có tạo 1 Báo cáo test (Status: DRAFT, Title: `TEST-REPORT-001`). Script hiện **KHÔNG cleanup dữ liệu này**.
  - **Hướng xử lý đề xuất:** Dữ liệu này an toàn vì là DRAFT. Phase tới khi làm Dashboard có thể dùng UI để test tính năng Delete Report để tự tay xoá, hoặc viết bổ sung function xóa.

---

## Kết quả lệnh kiểm tra

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx prisma validate` | PASS | Lỗi thiếu Opposite Relation ở fieldProgressItem đã được phát hiện và FIX kịp thời. |
| `npx prisma generate` | PASS | Generated Prisma Client v7.8.0 thành công. |
| `npx tsc --noEmit` | PASS | Hệ thống không báo lỗi Syntax / Type nào. |
| `npx eslint src/...` | PASS | Ban đầu báo 4 lỗi `any` type (no-explicit-any) tại file `actions.ts`. Đã FIX sạch bằng `Record<string, unknown>`. |
| `npx tsx --env-file=.env scripts/...` | PASS | Chạy script báo lỗi Prisma không tìm thấy DB nếu không pass biến môi trường `env-file`. Lần chạy thứ 2 với `--env-file=.env` thành công hoàn toàn. |
| `npm run build` | PASS | Next.js 16.2.7 Turbopack biên dịch thành công 100%. (0 Lỗi, Exit code 0). |

---

## Rủi ro còn lại

| Mã | Mức độ | Rủi ro | Ảnh hưởng | Hướng xử lý |
| -- | ------ | ------ | --------- | ----------- |
| R-01 | **CRITICAL** | UI (Form/Modal) tại `/reports` VẪN CHƯA nối vào Database mới. | User ngoài công trường vẫn bị mất dữ liệu nếu F5 vì UI đang chơi với local state MOCK_REPORTS. | Phase 2 ngay lập tức phải xóa Mock, đưa UI call Server Action `createSiteReport`. |
| R-02 | **HIGH** | Tính năng Upload Ảnh & File đang trống (Fake URL.createObjectURL). | Không có bằng chứng công trường lưu trên Server. Ảnh không gửi cho sếp được. | Phase 3 phải xây dựng Upload Local Directory hoặc S3 AWS và gắn Metadata vào `SiteReportAttachment`. |
| R-03 | **MEDIUM** | Format mã `reportNo` hiện đang là chuỗi UUID ngẫu nhiên. | Khó đọc, khó tra cứu cho hồ sơ thanh toán. | Ứng dụng Backend Logic sinh mã số chuẩn format (`BC-D-YYYYMMDD-001`) thay vì dựa vào UUID tự sinh của Postgres. |
| R-04 | **MEDIUM** | Báo cáo tuần chưa có tính năng tự động cộng (Aggregation) dữ liệu. | Buộc kỹ sư nhập tay lại khối lượng nếu chuyển UI. | Xây dựng Query Group By/Sum tại Phase 5. |
| R-05 | **LOW** | Tồn đọng dữ liệu Test (`TEST-REPORT-001`). | Gây rác DB nhẹ. | Phát triển tính năng Xóa Report tại UI để tiện việc dọn dẹp. |

---

## Đánh giá Go/No-Go

- **Phase 1 Foundation:** **GO**  
  (Cơ sở hạ tầng DB, Model, Typescript Interface và Controller Core đã chạy ổn định 100%. Sẵn sàng tiếp đón kết nối từ Frontend UI).

- **Production / Cho công trường nhập thật:** **NO-GO**  
  (Kỹ sư chưa thể dùng được. Việc submit Form trên màn hình hiện vẫn chỉ được lưu tại bộ nhớ tạm của Browser React. Thiếu chức năng Up File).

---

## Roadmap Phase tiếp theo

### Phase 2 — Kết nối UI với DB thật
* Xóa biến local `MOCK_REPORTS` và state `useState` liên quan.
* Đổi `ReportsWorkspace` sang Server Component (Fetch records thật) hoặc dùng React Query/SWR nối với `getSiteReports`.
* Submit Form (`CreateReportDialog`) đẩy thẳng qua `createSiteReport` action.

### Phase 3 — Upload ảnh/file thật
* Thiết lập `storage/site-reports/` hoặc S3 / R2 Cloudflare.
* Viết Server action multipart/form-data upload file.
* Insert bản ghi vào bảng `SiteReportAttachment` khi upload xong.
* Build Viewer/Gallery ảnh thật trên Drawer Chi tiết.

### Phase 4 — Approval workflow
* Khởi tạo các Action `approveSiteReport` / `rejectSiteReport`.
* Link vào `AuditLog` để lưu lịch sử Duyệt, gắn user duyệt, ngày duyệt, lý do từ chối.
* Cấp quyền thao tác này cho Role Ban Giám Đốc.

### Phase 5 — Weekly aggregation
* Phát triển logic backend tự query toàn bộ `SiteReportLine` trong 7 ngày được chọn. Sum `quantityToday` lại và generate ra Preview Báo cáo Tuần không bắt User gõ lại.

### Phase 6 — FieldProgress sync
* Hook khi `Status` báo cáo chuyển sang `APPROVED`: tự động map thông tin `SiteReportLine` sang Insert 1 bản ghi vào `FieldProgressEntry`.
* Tự động update luỹ kế dự án (Chống việc QA/QC nhập tay trùng lặp dữ liệu vào thanh toán).

---

## Danh sách file thay đổi (Git Status)

| File | Loại thay đổi | Ghi chú |
| ---- | ------------- | ------- |
| `prisma/schema.prisma` | Modified (M) | Thay đổi Core Backend Model, Thêm Enum/Tables. |
| `src/app/(dashboard)/reports/actions.ts` | Untracked (??) / New | Sinh ra các Server Actions cốt lõi cho module Reports. |
| `scripts/test-site-report-create.ts` | Untracked (??) / New | Script tạo Data Test an toàn Backend mà không chạm Web UI. |
| `prisma/migrations/20260622025729_add_site_reports_foundation/...` | New | Thư mục sinh ra Script SQL Database Migration. |
| `docs/qa/REPORTS_PHASE1_DATA_MODEL_BACKEND_FOUNDATION_REPORT.md` | New | Document báo cáo này. |
*(Các file UI khác như `page.tsx` hay `document-viewer` có thay đổi từ các task trước đó - không thuộc scope thay đổi của Phase 1 Reports này)*

---

## Kết luận cuối

- Phase 1 đã hoàn thiện nền móng Dữ liệu, kết nối Backend ORM (Prisma), và TypeScript Types một cách chặt chẽ. DB Migration diễn ra thành công mượt mà nhờ kỹ thuật Bypass Data-loss Warning an toàn.
- Dự án **CHƯA NÊN đưa lên Production**, đây mới chỉ là 50% chặng đường.
- **Ưu tiên Tối thượng tiếp theo (Phase 2):** Xóa ngay Mock Data Local trên Frontend UI Form và móc nối thẳng vào Server Action `createSiteReport` vừa làm xong ở Phase 1.
- **Xác nhận tuân thủ an toàn:** KHÔNG Commit, KHÔNG Push, KHÔNG Reset DB và đặc biệt KHÔNG xóa/drop bất kỳ dữ liệu cũ nào của khách hàng.
