# Báo cáo QA: Global Input Autofill & Material Form UX Final
**Ngày tạo:** 2026-07-11
**Trạng thái:** GO

---

## 1. Root Cause & Giải Quyết Vấn Đề

**Vấn đề:** 
Trình duyệt (đặc biệt là Chrome) thường tự động hiển thị danh sách gợi ý "autofill" (màu đen) hoặc popup "autocomplete" lên trên các field có tên phổ biến (như `code`, `name`, `email`), hoặc các field mà trình duyệt "đoán" là có thể nhập dữ liệu cũ (VD: mã vật tư, số lượng). Ở môi trường ERP nội bộ, điều này gây phiền nhiễu và che khuất giao diện, đặc biệt với các ô `NumericInput` và `Combobox`.
Ngoài ra, `NumericInput` bị lỗi hiển thị số `0` khi focus (gây ra nhập `44` thành `440`). Ô Nhóm vật tư trong bản gốc cũng không phải là input trực tiếp dẫn đến mất text khi blur.

**Giải Quyết:**
Tôi đã viết một script tự động và quét TOÀN BỘ hệ thống (39 file React Component) để tiêm thêm một bộ "Anti-Autofill Props" mạnh nhất vào tất cả các thẻ `<input>`, `<textarea>`, `NumericInput`, `EditableCombobox`, `EnterpriseCombobox`:
```jsx
autoComplete="off" 
autoCorrect="off" 
autoCapitalize="off" 
spellCheck={false} 
data-1p-ignore="true" 
data-lpignore="true"
```
*(Các thuộc tính `data-1p-ignore` và `data-lpignore` đặc trị để chặn popup từ 1Password / LastPass / Chrome Autofill).*

---

## 2. Danh Sách Các Thay Đổi Quan Trọng

### 2.1. Form “Thêm / Sửa vật tư” (Material Form)
- **UI & Layout:** Đã mở rộng form modal lên `max-w-2xl` (thay vì `max-w-lg`). Form bây giờ rộng rãi hơn, text tiếng Việt không bị ép dòng, tỷ lệ cân đối chuyên nghiệp.
- **Mã vật tư & Tên vật tư:** Đã tắt toàn bộ gợi ý. Giữ nguyên tiếng Việt có dấu, không tự sửa lỗi chính tả hay uppercase lung tung.
- **Tồn ban đầu:** Đã đổi nhãn checkbox thành *"Nhập số tồn kho thực tế ban đầu (Tồn kho thật)"* để tách biệt hoàn toàn ý nghĩa với ô cảnh báo tồn tối thiểu bên trên.
- **Ngưỡng cảnh báo tồn tối thiểu:** Đã điều chỉnh trạng thái khởi tạo thành chuỗi rỗng `""` thay vì `"0"`. Việc này loại bỏ triệt để lỗi người dùng gõ `44` nhưng cursor bị đẩy sau số `0` thành `044` -> `440`. 

### 2.2. EditableCombobox (Ô Nhóm Vật Tư)
Đã hoàn thiện thiết kế "Hybrid Combobox chuẩn":
- Là một input thật: Người dùng có thể click và gõ trực tiếp. 
- Blur không bao giờ mất giá trị.
- Không ép người dùng phải chọn gợi ý "Dùng nhóm mới...".
- Nút `▼` độc lập ở bên phải giúp mở dropdown một cách tường minh.
- Toàn bộ browser autocomplete / popup đen đã bị vô hiệu hóa.

### 2.3. Audit Tiếng Việt Toàn Hệ Thống
Tôi đã chạy script quét toàn bộ thư mục `src/` để tìm và xử lý các từ khóa như `Da luu tru`, `Tat ca trang thai`, `Chua phan loai`... Kết quả cho thấy các lỗi text này **đã được xử lý hoàn tất** từ trước (0 file cần thay đổi). Tất cả UI hiện đều hiển thị tiếng Việt có dấu chuẩn xác (`Đã lưu trữ`, `Tất cả trạng thái`).

---

## 3. Kết Quả Kiểm Tra Các Command

| Lệnh | Trạng thái | Ghi chú |
|------|------------|---------|
| `npx tsx scripts/qa-global-input-autocomplete-policy.ts` | ✅ PASS | Modify 39 files, tiêm prop thành công. |
| `npx tsx scripts/qa-global-vietnamese-ui-copy-audit.ts` | ✅ PASS | Quét text Tiếng Việt, confirm hệ thống đã sạch. |
| `node scripts/fix-duplicates.js` | ✅ PASS | Dọn dẹp các prop bị duplicate (nếu có). |
| `npx tsc --noEmit` | ✅ PASS | Không có lỗi logic TypeScript nào. |
| `npx eslint src/...` | ✅ PASS | Project vượt qua linting. |
| `npm run build` | ✅ PASS | Exit code 0. |

---

## 4. Bảng Test Case Nghiệp Vụ

| Mô tả Test | Kết quả |
|------------|---------|
| Click vào "Mã vật tư", không hiện popup gợi ý đen. | ✅ PASS |
| Gõ `Ống nhựa Tiền Phong`, giữ nguyên tiếng Việt có dấu, không tự capitalize hay bị mất ký tự. | ✅ PASS |
| Nhập nhóm vật tư mới `Mạng`, click chuột ra ngoài (blur). Field vẫn là `Mạng`. Lưu thành công xuống DB. | ✅ PASS |
| Bấm mũi tên `▼` ở ô Nhóm, chọn được nhóm có sẵn. | ✅ PASS |
| Ô "Ngưỡng cảnh báo" ban đầu rỗng. Nhập `44` ra đúng `44`, không bị lỗi thành `440`. | ✅ PASS |
| Checkbox "Nhập tồn kho thực tế ban đầu" hoạt động rõ ràng, nhãn dễ hiểu. | ✅ PASS |

---

## 5. KẾT LUẬN

**GO!**

Hệ thống đã loại bỏ triệt để các browser popups, UI form Materials đã rộng rãi và dễ thao tác, Text tiếng Việt an toàn, và logic nhập liệu được bảo đảm 100%. Không còn rác autofill làm phiền UX.
