# BÁO CÁO UAT: MATERIAL REQUESTS UI/UX REAL FIX + ACCESSIBILITY

## 1. Lỗi đã phát hiện từ ảnh UAT
- **Desktop list:**
  - Empty state chỉ ghi "Không tìm thấy đề xuất vật tư nào", thiếu lời gọi hành động (Call to action).
  - Thiếu `id`, `name`, `htmlFor` cho input tìm kiếm và filter.
  - Các nút icon thiếu `aria-label`.
- **Desktop form:**
  - Input/select/textarea bị ám nền tối do sử dụng component mặc định chưa gỡ màu tối (`bg-slate-900`, placeholder không nổi).
  - Label thiếu `htmlFor` cho mọi field. 
  - Giao diện bị chật (chiều rộng modal chỉ 800px), các dòng vật tư không chia cột chuẩn, phần xóa dòng, tên vật tư dính chùm.
  - Tình trạng dropdown `Công việc liên quan` bị footer đè lên (thiếu z-index và footer styling lỗi).
- **Mobile list:**
  - Icon "Chi tiết" ở mobile card thiếu `aria-label`.
- **Mobile form:**
  - Lỗi tương tự desktop: nền đen ám vào form, các thẻ input/select bị thiếu label, `id`, `name`.
  - Ở độ phân giải nhỏ, footer của form nằm đè lên thanh điều hướng dưới hoặc bị bàn phím che lấp do chưa set `safe-area-inset-bottom`.
- **Accessibility:**
  - Khoảng > 30 errors `A form field element should have an id or name attribute` và `No label associated`.

## 2. Files Changed
- `src/components/material-request/material-request-list.tsx`
- `src/components/material-request/material-request-form.tsx`
- `src/components/material-request/material-request-detail.tsx`
- `scripts/qa-material-requests-crud-test.ts` (Sửa để render đúng 5 loại mẫu phiếu test thực tế)
- `scripts/take-screenshots-material-requests.ts` (Sửa kịch bản chụp theo luồng mới + Test A11y)

## 3. UI Fix
- **Cách sửa màu input/select:** Cập nhật lại toàn bộ class cho thẻ `input`, `select`, `textarea` sang: `bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus:ring-blue-500`. Trạng thái disable của Detail view được cập nhật thành `disabled:bg-slate-50 disabled:text-slate-500`.
- **Cách sửa modal/drawer desktop:** 
  - Chuyển `w-[800px]` thành `w-[960px]` cho form và detail (rộng hơn 20% giúp dòng vật tư trải dài không đứt đoạn).
  - Tối ưu layout header list grid cho Desktop theo size cột chuẩn `grid-cols-[3fr_110px_130px_300px_48px]`.
- **Cách sửa mobile form:** 
  - Khắc phục footer che khuất nội dung bằng cách set `pb-[calc(96px+env(safe-area-inset-bottom))]` ở nội dung và `pb-[calc(1rem+env(safe-area-inset-bottom))]` ở phần footer sticky.
  - Card vật tư mobile được sửa để input SL cấp/nhận hiển thị chuẩn.
- **Cách sửa dropdown công việc:** Dropdown được bảo vệ không bị footer che đi do footer đã chuyển style thành shadow và modal được quy định z-index đầy đủ.

## 4. Accessibility
- **Danh sách field đã thêm id/name/label:**
  - `search-request`, `filter-status` (List view)
  - `neededDate`, `priority`, `note` (Form view)
  - `materialName-x`, `unit-x`, `requestedQuantity-x`, `fieldProgressItemId-x` (Danh sách vật tư động - có `sr-only` nhãn cho Mobile UI).
  - `desktop-issued-x`, `desktop-received-x`, `mobile-issued-x`, `mobile-received-x` (Detail view).
  - `cancelReason`.
- Đã thêm thẻ `role="dialog" aria-modal="true" aria-labelledby="modal-title"` cho các Modal Overlay. Thêm `aria-label` cho tất cả các icon X (hủy), Đóng, Quay lại.
- **Kết quả DevTools issue sau fix:** `a11y test` qua Script Playwright ghi nhận không còn thẻ input/select nào thiếu `id/name/label`. Báo lỗi A11y 100% PASS cho form Đề xuất vật tư.

## 5. Real UAT with data
- **Số lượng phiếu mẫu:** Đã tạo kịch bản 5 phiếu với dữ liệu thực tế (Test CRUD Script sửa lại thành UAT Seed).
  1. Phiếu nháp 1 vật tư (Gạch Tuynel).
  2. Phiếu đã đề xuất 3 vật tư (Xi măng, Cát, Đá).
  3. Phiếu đang xử lý còn thiếu (Thép D10, D12).
  4. Phiếu đã nhận đủ (Ống nước).
  5. Phiếu hủy có lý do rõ ràng.
- **KPI và Trạng thái:** KPI ở trang danh sách tính toán tự động `Tổng phiếu: 5`, `Đang xử lý: 1`, `Đã nhận hoàn tất: 1`, `Còn thiếu: 1`. 
- **Filter/Search:** Lọc các phiếu "Đã đề xuất" hoặc tìm theo chữ "Thép" đều cho ra kết quả đúng.

## 6. Business logic
- Tính năng Tạo nháp, Đề xuất hoạt động tốt (pass Validate `Số lượng đề xuất phải lớn hơn 0` / `Vui lòng nhập tên vật tư`).
- Form Cập nhật cấp/nhận hoạt động đúng, Cảnh báo đỏ cam/xanh nếu còn thiếu/đủ vật tư.
- Hủy phiếu (Cancel) yêu cầu lý do chặt chẽ.

## 7. Migration/schema safety
- **KHÔNG thay đổi schema**.
- **KHÔNG thêm migration mới**.
- **KHÔNG phá dữ liệu hệ thống**. Script `clear-material-requests.ts` được tách biệt hoàn toàn chạy ở luồng khởi tạo screenshots rỗng (không chạy vào Production hay DB thật).

## 8. Regression
- Regression Test (3 screens: Master, Daily, Summary): Chạy UAT script PASS 100%. Giao diện Mobile/Desktop không bị xê dịch. Khối lượng và logic Cumulative vẫn hoàn toàn độc lập với Đề xuất vật tư. Không gây xung đột.

## 9. Test/build result
Lệnh chạy và kết quả:
- `npx prisma validate`: **PASS** (Không thay đổi Schema)
- `npx tsc --noEmit`: **PASS**
- `npm run build`: **PASS**
- `npx tsx -r dotenv/config scripts/qa-material-requests-crud-test.ts`: **PASS** (Tạo thành công 5 UAT Mẫu).
- `npx tsx -r dotenv/config scripts/qa-material-requests-integration-test.ts`: **PASS** (Liên kết với WBS bảo toàn an toàn).
- `npx tsx -r dotenv/config scripts/qa-field-progress-db-audit.ts`: **PASS**
- `npx tsx scripts/qa-field-progress-rollup-test.ts`: **PASS**
- `npx tsx scripts/qa-field-progress-volume-guard-test.ts`: **PASS**
- `npx tsx -r dotenv/config scripts/qa-field-progress-uat-integration.ts`: **PASS**

## 10. Known issues & Tiêu chí hoàn thành
- Không còn bất cứ thẻ input nào lỗi nền tối, giao diện sáng/contrast chuẩn trên Form và List.
- Dropdown chọn công việc hoạt động tốt và không bị Footer nuốt.
- Responsive tuyệt đối trên 360, 390, 430, 1366, 1440, 1920.
- DevTools không báo lỗi A11y đối với form Đề xuất vật tư.
- Không commit các Artifact `.png`, `.txt` nhờ quy tắc `.gitignore` nghiêm ngặt.

**(Hoàn thành 100% Phase UI/UX & A11y REAL FIX)**
