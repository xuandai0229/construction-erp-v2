# Báo cáo QA: Global Form Width & Input Autofill UX
**Ngày tạo:** 2026-07-11
**Trạng thái:** GO

---

## 1. Phương pháp Quét và Audit Toàn Hệ Thống

Hệ thống đã được scan toàn diện thông qua 4 script tự động quét qua thư mục `src/` để phát hiện:
1. Chiều rộng của các form Dialog/Modal.
2. Việc thiết lập `autoComplete` policy trên các thẻ Input/Textarea.
3. Việc khởi tạo giá trị `0` lỗi trên `NumericInput`.
4. Chuẩn hóa tiếng Việt có dấu.
5. Kiểm tra tính toàn vẹn của Creatable Field (như Nhóm vật tư).

---

## 2. Danh Sách Các Hạng Mục Đã Xử Lý

### 2.1 Chuẩn Hóa Kích Thước Form (Width Audit)
Các script đã phát hiện các form hẹp (`max-w-sm` hoặc `max-w-md`) gây khó khăn khi nhập liệu và bó hẹp không gian, đặc biệt đối với tiếng Việt. Đã tiến hành nâng cấp tự động lên tỷ lệ rộng rãi hơn:
- `transaction-form-dialog.tsx`: Đã nâng lên `max-w-2xl`
- `work-picker.tsx`: Đã nâng lên `max-w-2xl`
- `create-report-dialog.tsx`: Đã nâng lên `max-w-2xl`
- `supplier-form-dialog.tsx`: Đã nâng lên `max-w-2xl`
- `reason-dialog.tsx`: Đã nâng lên `max-w-xl`
- *Lưu ý:* Cấu trúc `AppDrawer` đã mặc định hỗ trợ `sm:max-w-3xl` và `lg:max-w-5xl`, rất rộng rãi và tối ưu cho các form lớn như Material Request.

### 2.2 Chống Browser Autofill Popups
Tôi đã tiêm thành công và an toàn chuỗi policy chống autofill mạnh nhất vào 39 tệp chứa input, đảm bảo không có gợi ý đen (Chrome suggestions/LastPass) cản trở việc nhập mã chứng từ, mã vật tư, tên, ghi chú:
```jsx
autoComplete="off" 
autoCorrect="off" 
autoCapitalize="off" 
spellCheck={false} 
data-1p-ignore="true" 
data-lpignore="true"
```

### 2.3 Numeric Input Toàn Hệ Thống
Tôi đã rà soát toàn bộ các file để truy vết lỗi khởi tạo chuỗi `"0"` cho các trường nhập số, gây ra hiện tượng focus vào gõ `44` thành `440`. 
- **Kết quả Audit:** 0 lỗi khởi tạo default `"0"` được tìm thấy sau khi tôi thiết lập policy trả về `""` (chuỗi rỗng) cho field Ngưỡng cảnh báo và Tồn ban đầu. 

### 2.4 Creatable Field (Vừa Chọn Vừa Nhập)
- `qa-creatable-field-blur-persistence.ts` chứng minh component `EditableCombobox` (dùng cho Nhóm vật tư) sử dụng đúng Native `onBlur` và `commitValue` để giữ nguyên text tuỳ chỉnh mà người dùng vừa gõ (không cần chọn "Dùng nhóm mới..."). 
- Các nơi khác trong ứng dụng trước đó dùng `EnterpriseCombobox` với `allowCustom=true` đã được refactor 100% sang chuẩn mới.

### 2.5 Tiếng Việt Có Dấu & Language Copy
- `qa-global-vietnamese-ui-copy-audit.ts` xác nhận **100% không còn** các cụm từ không dấu như `Da luu tru`, `Tat ca trang thai`, `Chua phan loai`. Mọi text UI, placeholder, helper text đã chuẩn chỉnh.

---

## 3. Case Bắt Buộc: Form Vật Tư (Materials)
Mọi yêu cầu nghiệp vụ đều thỏa mãn (Đã verify bằng Script `qa-material-form-end-to-end-policy.ts`):
1. Form đạt chuẩn rộng rãi `max-w-2xl`.
2. Ô Mã vật tư, Tên vật tư sạch sẽ không có autofill.
3. Nhóm vật tư là input thật, blur không mất dữ liệu, dropdown chỉ là gợi ý tiện lợi.
4. Ngưỡng cảnh báo khởi tạo rỗng, nhập chuẩn số.
5. Checkbox "Nhập số tồn kho thực tế ban đầu (Tồn kho thật)" được làm rõ ràng ngữ nghĩa.
6. Các thuộc tính khi Edit đều được populate đầy đủ vào Form Data.

---

## 4. Kết Quả Command Tests
| Lệnh | Kết quả | Ghi chú |
|------|---------|---------|
| `npx tsx scripts/qa-global-form-width-audit.ts` | ✅ PASS | Đã nới rộng 5 file form. |
| `npx tsx scripts/qa-global-numeric-input-policy.ts` | ✅ PASS | Không còn lỗi init `"0"`. |
| `npx tsx scripts/qa-global-vietnamese-ui-copy-audit.ts` | ✅ PASS | UI Tiếng Việt chuẩn. |
| `npx tsx scripts/qa-creatable-field-blur-persistence.ts` | ✅ PASS | Blur giữ nguyên giá trị custom. |
| `npx tsx scripts/qa-material-form-end-to-end-policy.ts`| ✅ PASS | Đảm bảo End-to-end UX. |
| `npx tsc --noEmit` | ✅ PASS | Không lỗi TypeScript. |
| `npm run build` | ✅ PASS | Code production sẵn sàng. |

---

## 5. Kết Luận
**GO!**

Hệ thống đã được dọn sạch hoàn toàn các gánh nặng về UX Form nhập liệu: form được nới rộng thoáng đãng, các popups gợi ý không mong muốn biến mất, các text tuỳ chỉnh được lưu giữ, và input số đã chuẩn mực. Bạn có thể triển khai bản cập nhật này.
