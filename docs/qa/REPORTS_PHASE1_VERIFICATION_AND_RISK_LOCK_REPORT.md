# BÁO CÁO XÁC MINH PHASE 1 & KHÓA RỦI RO
## Phân hệ: Báo cáo hiện trường (/reports)

**Trạng thái:** HOÀN THÀNH XÁC MINH  
**Phạm vi:** Kiểm tra độ an toàn của Phase 1 trước khi tiến vào Phase 2  
**Người thực hiện:** Principal Full-stack Engineer + QA Lead (AI)  
**Ngày thực hiện:** Hôm nay  

---

## A. Tóm tắt xác minh

* **Phase 1 có an toàn không:** CÓ. Nền móng dữ liệu (Data Model) và Backend Migration đã được thực hiện rất cẩn thận, không gây ảnh hưởng đến dữ liệu cũ của khách hàng.
* **Có sẵn sàng vào Phase 2 không:** CÓ. Đã đủ điều kiện kỹ thuật Backend để bắt tay vào xóa Mock Data trên UI.
* **Còn rủi ro nào phải khóa trước:** 
  * Giao diện vẫn đang hoàn toàn thao tác trên MOCK_REPORTS local.
  * Validation ở Backend chưa đủ chặt chẽ với schema Zod.
  * Lịch sử duyệt (Approval) chưa có Data Model riêng để lưu vết.
  * Dữ liệu Test do script tạo ra vẫn đang nằm lại trong CSDL.

---

## B. Kết quả kiểm tra migration

* **Tên Migration:** `20260622025729_add_site_reports_foundation`
* **Có drop/delete không:** KHÔNG. Hoàn toàn không có lệnh `DROP TABLE` hay `DROP COLUMN` nào, dữ liệu cũ giữ nguyên.
* **Thay đổi nguy hiểm:** Có 1 lệnh Drop Constraint FK `SiteReportLine_wbsItemId_fkey` và sau đó set lại thành `ON DELETE SET NULL`, đây là thay đổi an toàn cho nghiệp vụ.
* **`reportNo` UUID tạm ra sao:** Lệnh `ALTER TABLE "SiteReport" ADD COLUMN "reportNo" TEXT NOT NULL DEFAULT gen_random_uuid()::text` hoạt động hoàn hảo, giúp 5 báo cáo cũ tự phát sinh UUID không bị trùng lặp, vượt qua cảnh báo Unique Index Constraint của Prisma.
* **Có cần extension PostgreSQL không:** KHÔNG. Hàm `gen_random_uuid()` là hàm built-in mặc định của PostgreSQL từ bản 13 trở lên, không cần kích hoạt extension `pgcrypto` phức tạp.
* **Có dữ liệu null/trùng không:** Hiện tại sau khi query kiểm tra không có dòng nào bị trống (null/empty) field `reportNo`.

---

## C. Kết quả kiểm tra dữ liệu

| Kiểm tra | Kết quả | Ghi chú |
| -------- | ------- | ------- |
| Đếm số `Project` | 7 | Dữ liệu thật gốc vẫn nguyên vẹn. |
| Đếm số `SiteReport` | 6 | Bao gồm 5 báo cáo cũ và 1 báo cáo test mới tạo. |
| Đếm số `SiteReportLine` | 8 | Các chi tiết của báo cáo ngày vẫn tồn tại bình thường. |
| Đếm số `SiteReportAttachment` | 0 | Do chưa chạy tính năng Upload ảnh thật. |
| Số report có `reportNo` rỗng | 0 | Khẳng định Migration script đã cover an toàn 100% dữ liệu cũ. |
| Số reportNo trùng nhau | 0 | Index `@unique` phát huy hiệu quả. |

---

## D. Kết quả kiểm tra actions

| Function | Đạt | Thiếu | Ghi chú |
| -------- | --- | ----- | ------- |
| `getSiteReports` | Tốt | Thiếu Zod validate cho input filters. | Đã đọc được DB thật, Count được line/attachment, có phân chia theo type. |
| `createSiteReport` | Tốt | Thiếu Zod validate chặn logic (Ví dụ chặn quantityToday < 0 hoặc check type/weather sai). | Tạo được report + array lines trong một Transaction (Nested Write). Truy xuất `getSession()` tự động gán `reporterName` chính xác. Đã gọi `revalidatePath('/reports')`. |

---

## E. Test data

* **Có `TEST-REPORT` không:** CÓ. Script `scripts/test-site-report-create.ts` đã sinh ra 1 report có title `TEST-REPORT-001` (ID: `cmqomn34d0000k4wkmnkfty7w`).
* **Có cần cleanup không:** CÓ. Dù số lượng cực ít (chỉ 1 dòng) và trạng thái là DRAFT không làm hỏng báo cáo, nhưng nguyên tắc không để data rác trong CSDL thực tế.
* **Đề xuất cleanup an toàn:** Phase 2 khi nối UI, cần bổ sung chức năng Xóa Báo Cáo trên giao diện dành cho Role Admin để người quản trị có thể tự click xóa bản test này. Tạm thời không cần chạy script Delete bằng tay tránh nhầm lẫn.

---

## F. UI mock còn lại

| File | Mock/local còn lại | Ảnh hưởng | Phase xử lý |
| ---- | ------------------ | --------- | ----------- |
| `types.ts` | Biến hằng số `MOCK_REPORTS`. | Mọi component khác đang dựa vào MOCK này. | Phase 2 (Phải xóa). |
| `reports-workspace.tsx` | `useState(MOCK_REPORTS)` và các mảng filter local. | Dữ liệu mất hoàn toàn khi F5. Report thật từ DB không được hiển thị. | Phase 2 (Chuyển sang Server Component hoặc gọi Data Fetching). |
| `create-report-dialog.tsx` | Nút "Lưu/Gửi" chỉ gọi hàm set local, Ảnh Upload chỉ là ObjectURL Blob. | Báo cáo bị lưu ảo, file không được ném lên server. | Phase 2 & 3. |
| `reports-stats.tsx` | Tính KPI bằng hàm `.filter` dựa trên mảng tĩnh local. | Sai lệch thống kê do không count trên Server DB thật. | Phase 2. |
| `reports-table.tsx` | Render dựa trên prop `reports` (hiện là mock array). | Giao diện đã chuẩn nhưng dữ liệu lõi rỗng tuếch. | Phase 2. |
| `report-detail-drawer.tsx` | History Approval và Photo preview chỉ đang mock tĩnh. | Không biết được Giám đốc nào duyệt báo cáo. | Phase 3 & 4. |

---

## G. Kết quả lệnh kiểm tra

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx prisma validate` | PASS | Lỗi thiếu `opposite relation` ở commit trước đó đã được giải quyết triệt để. |
| `npx prisma generate` | PASS | Sync client thành công. |
| `npx tsc --noEmit` | PASS | 100% strict type-safe. |
| `npx eslint src/...` | PASS | Sạch lỗi `any` type (đã chuyển thành `Record<string, unknown>`). |
| `npx tsx scripts/test-verify-db.ts` | PASS | Đọc DB xác minh an toàn không chạm UI. |
| `npm run build` | PASS | Next.js Build tối ưu ra Production Bundle không có lỗi nào. |

---

## H. Kết luận

- **Phase 1 Verification:** **PASS WITH RISKS**
- **Có được sang Phase 2 không:** **ĐƯỢC PHÉP CHUYỂN PHASE.**
- **Điều kiện bắt buộc cho Phase 2:**
  - Mục tiêu sống còn là **Xóa sổ MOCK_REPORTS**, chuyển Table và Workspace sang đọc DB thật (`getSiteReports`).
  - Gắn sự kiện `onSubmit` của Modal Tạo Mới vào `createSiteReport` Server Action.
  - Vẫn tạm chấp nhận việc File Đính Kèm/Ảnh chưa lưu vật lý (sẽ làm ở Phase 3).
- **Xác nhận tuân thủ an toàn:** KHÔNG Commit, KHÔNG Push Git, KHÔNG Reset Database, KHÔNG Xóa dữ liệu cũ. Toàn bộ quá trình hoàn toàn tuân thủ lệnh QA.
