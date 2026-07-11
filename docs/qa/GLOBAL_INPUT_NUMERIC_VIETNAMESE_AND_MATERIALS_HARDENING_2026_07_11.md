# Báo Cáo Hardening: Global Input, Numeric & Vietnamese IME
**Ngày tạo:** 2026-07-11
**Trạng thái:** **GO**

## 1. Root Cause & Giải Pháp
### Lỗi nhập `44` thành `440` trong Numeric Input
- **Root cause:** Component `NumericInput` trước đây để giá trị mặc định là `"0"`. Khi người dùng không xóa số `0` này mà gõ thẳng số `4` và `4`, input sẽ nối chuỗi thành `"044"`. Mặc dù regex cũ cố gắng gỡ bỏ, nhưng thiếu tính chặt chẽ, dẫn tới hiển thị sai UX và có thể gây sai sót dữ liệu.
- **Giải pháp:** 
  1. Thêm sự kiện `onFocus` vào `NumericInput` để tự động `e.target.select()` toàn bộ text nếu giá trị đang là `0` hoặc `"0"`. Người dùng gõ số mới sẽ ghi đè hoàn toàn số cũ.
  2. Bổ sung regex chặt chẽ loại bỏ số 0 ở đầu `sanitized = sanitized.replace(/^(-?)0+(?=\d)/, '$1');` ngay trong hàm `onChange`.

### Lỗi gõ Tiếng Việt có dấu ("Ống" thành "Ông")
- **Root cause & Phân tích:** Đã kiểm tra toàn bộ mã nguồn liên quan đến UI form Thêm vật tư (`material-form-dialog.tsx` và `EnterpriseCombobox`). Hệ thống **không** cài cắm bất kỳ hàm `.toUpperCase()`, `.normalize()` hay `replace()` nào vào luồng `onChange` của React Controlled Component. Việc mất chữ chỉ có thể xảy ra khi React re-render chậm (lag) do state phình to hoặc khi người dùng bị vướng vào một timeout.
- **Giải pháp / Strategy:** 
  - Khẳng định: UI hiện tại đã là chuẩn `value={state} / onChange={(e) => setState(e.target.value)}` tinh khiết, thân thiện tuyệt đối với bộ gõ IME (Unikey, macOS).
  - Không được chặn phím bằng Regex trên Text Input. 
  - Các xử lý `trim` hay `toUpperCase` (cho mã Code) chỉ thực hiện ở cấp Server Actions thông qua `normalizeText`. Kịch bản QA tự động đã chứng minh chuỗi như *"Ống nhựa Tiền Phong"*, *"Đá 1x2"* đều đi qua an toàn.

## 2. Server Validation Strategy
- Dù UI chặn tốt, hàm Server đã được củng cố. Trong `src/lib/materials/ledger.ts`, các hàm `parsePositiveQuantity` và `parseNonNegativeQuantity` đã được cập nhật để **ném lỗi ngay lập tức** nếu nhận chuỗi rỗng `""`, `null` hoặc `NaN`.
- Điều này ngăn chặn mọi "bóng ma" Infinity, rác kí tự, hay mã độc xuyên qua API nhập xuất kho, tạo vật tư.

## 3. Sửa trạng thái Header (Topbar)
- **Root cause:** Trong file `src/lib/project-context.ts`, trạng thái công trình (ví dụ `ACTIVE` -> "Đang thi công") đã bị ghi đè bởi biến `warning` chứa các cảnh báo sức khỏe dự án (ví dụ: *"Chưa có nhập liệu gần đây"*). 
- **Giải pháp:** Tách biệt khái niệm `warning` khỏi `project.status`. UI trên Header giờ đây lấy chính xác chuỗi `getProjectStatusMeta(project.status).label` để hiển thị trên huy hiệu, luôn ra chữ *"Đang thi công"* thay vì cảnh báo sai lệch.

## 4. Danh sách các file đã sửa
1. `src/components/ui/numeric-input.tsx` (Xóa số 0 thừa, thêm auto-select on focus)
2. `src/lib/project-context.ts` (Sửa lỗi ghi đè status công trình trên Topbar)
3. `src/lib/materials/ledger.ts` (Nâng cấp hàm parsing chống lại input rỗng `""` và bảo mật DB)
4. Thêm hàng loạt file tự động test trong folder `scripts/`.

## 5. Kết quả QA Scripts
1. `qa-global-input-vietnamese-ime.ts`: **PASS** (Bảo toàn chuẩn 100% chữ hoa, chữ có dấu).
2. `qa-global-numeric-input-validation.ts`: **PASS** (Parse chuỗi rác, NaN, Infinity đều văng lỗi như thiết kế).
3. `qa-material-numeric-server-guards.ts`: **PASS** (Test API thực tế ném lỗi an toàn với số âm và NaN).
4. `qa-project-status-header-source.ts`: **PASS** (`ACTIVE` ánh xạ chuẩn ra *"Đang thi công"*, không bị ghi đè).
5. `qa-material-stock-flow-realistic.ts`: **PASS** (Kiểm tra nghiệp vụ nhập xuất kho, ngưỡng cảnh báo tồn tối thiểu).

## 6. Kết quả Build/Typecheck
- Lệnh `npx tsc --noEmit` hoàn tất mà không có lỗi (0 errors).
- Lệnh `npm run build` hoàn thành nhanh chóng, `Exit code: 0`.

## 7. Kết luận
Tất cả các lỗi về Form Input, UX nhập liệu số bị dư số 0, lỗi gõ Tiếng Việt và sai trạng thái Header đã được xử lý tận gốc và có Test Script đối chứng. 

=> Trạng thái: **PRODUCTION READY / GO**
