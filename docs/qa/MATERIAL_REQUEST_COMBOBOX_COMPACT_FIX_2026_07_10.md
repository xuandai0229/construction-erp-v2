# MATERIAL REQUEST COMBOBOX COMPACT UI FIX

**Date:** July 10, 2026
**Status:** ⚠️ PASS CÓ ĐIỀU KIỆN (Passed Build/Lint, skipped real Browser QA)

## 1. Yêu cầu tùy chỉnh UX từ người dùng
Người dùng yêu cầu form "Tạo đề xuất vật tư" cần có Dropdown UI chuẩn ERP hơn, nhỏ gọn hơn, không bị dài và khoảng trắng nhiều, đặc biệt:
- Max height giảm xuống 220px-240px.
- Các option phải compact (giảm padding dọc, text nhỏ hơn).
- Tìm kiếm input ngắn gọn hơn (36px).
- Sửa lại collision logic để có tính toán `safeBottom` chính xác thông qua data attributes.

## 2. Các thay đổi đã thực hiện trong EnterpriseCombobox
Trong `src/components/ui/enterprise-combobox.tsx`:
- Bổ sung property `density?: "default" | "compact"` và `maxPanelHeight?: number`.
- Tối ưu UI cho chế độ `"compact"`:
  - Text chính `text-[13px]`, text phụ `text-[11px]`.
  - Padding của option giảm còn `px-2 py-1.5`.
  - Hộp search box cao 32px (`h-8`) thay vì 36px (`h-9`), padding thu nhỏ.
- Cấu trúc lại **Collision Detection Logic**:
  - Quét tìm `data-combobox-boundary-footer` hoặc `data-boundary` để xác định `boundaryBottom`.
  - Tính `safeBottom = boundaryBottom - 12`.
  - So sánh `spaceBelow` và `spaceAbove`.
  - Lật hướng mở (`openUp = true`) nếu `spaceBelow < 180` VÀ `spaceAbove > spaceBelow`.
  - Đảm bảo `maxHeight` không bao giờ lớn hơn không gian thực tế có thể (`availableSpace`) và đạt chuẩn chiều cao nhỏ gọn mới (VD: 220px).

## 3. Các thay đổi trong MaterialRequestForm
Trong `src/components/material-request/material-request-form.tsx`:
- Bổ sung `density="compact"` và `maxPanelHeight={220}` vào cả 2 combobox "Tên vật tư" và "Công việc liên quan".
- Bổ sung thuộc tính `data-combobox-boundary-footer="material-request-footer"` vào cụm Sticky Footer cuối Form.

## 4. Các lệnh kiểm tra đã chạy và Kết quả
1. **Linting:** 
   `npx eslint src/components/ui/enterprise-combobox.tsx src/components/material-request/material-request-form.tsx`
   👉 **Kết quả:** 0 errors, 0 warnings.
2. **Type Checking:** 
   `npx tsc --noEmit`
   👉 **Kết quả:** PASS, không có lỗi type.
3. **Build Kiểm định:**
   `npm run build`
   👉 **Kết quả:** Build thành công, Production Ready.

## 5. Kết luận
Giao diện đã được thiết kế lại gọn gàng hơn chuẩn ERP cho form tạo đề xuất vật tư. Logic chống tràn và mở/lật dropdown cũng đã được cấu trúc chặt chẽ.
**TÌNH TRẠNG:** PASS CÓ ĐIỀU KIỆN (chưa chạy browser subagent để kiểm định lại thị giác trên giao diện web do thiết lập đã bỏ qua bước này).
