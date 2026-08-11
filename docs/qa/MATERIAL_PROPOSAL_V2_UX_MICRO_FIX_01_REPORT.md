# BÁO CÁO NGHIỆM THU UI/UX MICRO-FIX ROUND 1
## MÔ-ĐUN ĐỀ XUẤT VẬT TƯ (MATERIAL PROPOSAL V2)

**Dự án:** construction-erp-v2  
**Thời gian thực hiện:** 11/08/2026  
**Quyết định cuối cùng:** **PASS**

---

### 1. Long Material Name Fix
- Thêm thuộc tính `truncate` (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`) vào ô input `TÊN VẬT TƯ / VẬT LIỆU`.
- Cột tên vật tư luôn giữ 1 hàng duy nhất (`h-10` uniform row height), không bị đẩy cao thành 2-3 hàng khi tên vật tư rất dài.
- Tùy chỉnh `title={item.materialName}` hiển thị tooltip native trên browser khi hover chuột.
- Khi focus vào ô input, người dùng cuộn ngang chỉnh sửa nội dung đầy đủ bình thường.

---

### 2. Material Suggestion Popup
- Thiết lập popup gợi ý vật tư có chiều rộng linh hoạt `min-w-[360px]` và chiều cao giới hạn `max-h-70 overflow-y-auto`.
- Mỗi dòng gợi ý trong danh mục hiển thị tên vật tư dạng `truncate` kèm `title` hiển thị tên đầy đủ khi hover.

---

### 3. Editable Auto-fill Location
- Chuyển field `ĐỊA ĐIỂM` từ trạng thái read-only sang ô `input` text bình thường (`bg-white border-slate-300`).
- Không dùng `disabled` hay `readOnly`. Người dùng có thể bấm vào sửa, thêm bớt, hoặc xóa hẳn địa điểm.

---

### 4. Location Snapshot Runtime Test
- Khi tạo mới proposal, hệ thống khởi tạo `projectLocation` từ `Project.location` mặc định.
- Khi người dùng ghi đè địa điểm thủ công (ví dụ: `Phường Vĩnh Tuy - khu vực ngõ 477 Kim Ngưu`), hàm `autoSaveMaterialProposal` lưu trực tiếp giá trị tùy chỉnh này vào `projectLocationSnapshot`.
- Reload trang (F5) khôi phục chính xác địa điểm người dùng đã tùy chỉnh, không bị ghi đè lại bởi `Project.location`.

---

### 5. Project Selector Replacement
- Loại bỏ hoàn toàn thẻ HTML `<select>` native đối với danh sách công trình.
- Thay thế bằng **Searchable Project Combobox Popover**:
  - Hỗ trợ ô gõ tìm kiếm `Tìm công trình theo tên, mã...`.
  - Tìm kiếm linh hoạt theo cả Tên công trình và Mã công trình (`code`).

---

### 6. Long Project Name UX
- Khi Popover đóng: Nút hiển thị công trình đã chọn hiển thị **ONE LINE** gọn gàng với thuộc tính `truncate` và `title` chứa tên đầy đủ.
- Đi kèm badge mã công trình (ví dụ: `[CT-2026-0011]`) phía sau tên công trình nếu có dữ liệu.

---

### 7. Project RBAC Verification
- Combobox công trình tiếp tục sử dụng danh sách `projects` đã qua bộ lọc quyền hạn server-side (`assertProjectAccess` & `getActiveProjects`).
- Người dùng thường chỉ thấy và chọn các công trình mình được phân công; người dùng cấp cao thấy toàn bộ công trình theo đúng RBAC hiện hành.

---

### 8. Default Unit Root Cause
- **Nguyên nhân gốc rễ:** Hàm tạo dòng vật tư mới `createBlankItem()` trước đây vô tình để `unit: "Cái"`.
- **Đã sửa:** Chuyển `unit: ""` (rỗng) trong `createBlankItem()`. Hàng vật tư mới thêm xuất hiện với ô Đơn vị hoàn toàn trống kèm placeholder `"Đơn vị..."`.

---

### 9. Default Actual Quantity Root Cause
- **Nguyên nhân gốc rễ:** Hàm khởi tạo và handler biến ô trống thành số `1` (`actualQuantity: 1` hoặc `Number(val) || 1`).
- **Đã sửa:** Chuyển `actualQuantity: ""` (chuỗi rỗng). Ô Thực tế xuất hiện hoàn toàn trống kèm placeholder `"Số lượng..."`, không tự suy đoán hay tự gán giá trị giả.

---

### 10. Empty Row Behavior
- Một dòng rỗng chưa có thông tin (`materialName`, `specification`, `actualQuantity` đều trống) được duy trì ở local state mà không bị ép số giả.
- `autoSaveMaterialProposal` tự động lọc bỏ các dòng chưa có dữ liệu kinh doanh, không lưu dữ liệu rác vào CSDL.

---

### 11. Catalog Unit Auto-fill
- Khi người dùng chọn một mặt hàng trong Danh mục (Catalog):
  - Tên vật tư được điền tự động.
  - Đơn vị tính được điền tự động nếu Danh mục có sẵn dữ liệu Đơn vị.

---

### 12. Actual Quantity Remains Empty
- Sau khi chọn vật tư từ Danh mục: Ô **THỰC TẾ** vẫn giữ nguyên trạng thái **TRỐNG** (`actualQuantity` không tự động gán bằng 1). Người dùng chủ động nhập khối lượng thực tế mong muốn.

---

### 13. Browser Console
- Browser console hoàn toàn sạch sẽ:
  - 0 React warnings.
  - 0 Hydration errors.
  - 0 Uncontrolled to Controlled input warnings (nhờ xử lý `value={item.actualQuantity === "" ? "" : item.actualQuantity}`).

---

### 14. TypeScript
- Run `npx tsc --noEmit`: **0 LỖI (PASS)**.

---

### 15. Lint
- Run `npx eslint`: **0 LỖI (PASS)**.

---

### 16. Build
- Run `npm run build`: Biên dịch thành công **Exit code: 0 (PASS)**.

---

### 17. Changed Files
- `src/components/materials/material-proposal-form.tsx`: Cập nhật Combobox công trình, địa điểm editable, 1-line truncate cho tên vật tư, loại bỏ default values cho Unit và Actual Quantity.
- `src/lib/material-proposals/actions.ts`: Cập nhật `autoSaveMaterialProposal` lưu `projectLocationSnapshot` tùy chỉnh và làm sạch mặc định Unit / Quantity.
- `src/app/(dashboard)/materials/proposals/new/page.tsx`: Truyền thuộc tính `code` công trình cho combobox selector.

---

### 18. FINAL DECISION
**PASSED**
