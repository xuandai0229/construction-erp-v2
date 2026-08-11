# BÁO CÁO FIX LỖI TỰ ĐỘNG XUỐNG DÒNG TÊN VẬT TƯ (MATERIAL NAME WRAP)
## MATERIAL PROPOSAL V2 — UX MICRO-FIX 02.2

**Dự án:** construction-erp-v2  
**Thời gian thực hiện:** 11/08/2026  
**Quyết định cuối cùng:** **PASS**

---

### 1. Runtime Screenshot Analysis
- Phân tích runtime screenshot cho thấy:
  - Cột `QUY CÁCH / THÔNG SỐ`, `HÃNG SX / XUẤT XỨ`, `GHI CHÚ` đã hoạt động tốt với auto-wrap.
  - Tuy nhiên, cột `TÊN VẬT TƯ / VẬT LIỆU` bị chiếm chiều rộng bởi badge tuyệt đối `"Ngoài danh mục"` (`pr-20` / `pr-16`), làm hẹp vùng nhập liệu của ô text, sinh ra scrollbar sớm hoặc ép text 1 dòng bị cắt chữ.
  - Các chuỗi liền không có khoảng trắng (như `aaaaaaaaaaaaaaaaaaaaaaaa...` dài 100+ ký tự) không tự động xuống dòng do thiếu thuộc tính ngắt từ chuyên dụng (`[overflow-wrap:anywhere]`).

---

### 2. Root Cause
- Badge `"Ngoài danh mục"` / `"Danh mục"` được render dạng `<span className="absolute right-2 top-2 ...">` chèn trực tiếp bên trong ô `TÊN VẬT TƯ / VẬT LIỆU`, bắt ô nhập liệu phải sử dụng `pr-20` / `pr-16` padding bên phải.
- `AutoResizeTextarea` chưa tích hợp bộ thuộc tính CSS ngắt chuỗi dài không có space (`[overflow-wrap:anywhere] [word-break:break-word]`).

---

### 3. Input → Auto-growing Control
- `TÊN VẬT TƯ / VẬT LIỆU` được chuyển sang sử dụng `AutoResizeTextarea` chuyên dụng 100%:
  - Khởi tạo 1 dòng (`rows={1}`).
  - Tên ngắn: Hiển thị 1 dòng gọn gàng.
  - Tên dài: Tự động giãn chiều cao theo nội dung (`scrollHeight`).

---

### 4. Long Token Wrapping
- Bổ sung bộ thuộc tính ngắt chuỗi cho `AutoResizeTextarea` và ô hiển thị trang chi tiết:
  ```css
  whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]
  ```
- **Kết quả kiểm thử chuỗi dài không có khoảng trắng (`aaaaaaaa...` >= 100 ký tự):** Văn bản tự động xuống 4-5 dòng gọn gàng bên trong cell, không bị tràn ra ngoài cột, không làm vỡ chiều rộng bảng.

---

### 5. “Ngoài danh mục” Badge Removal
- Loại bỏ hoàn toàn badge overlay `<span className="absolute right-2 top-2 ...">` khỏi vùng nhập liệu `TÊN VẬT TƯ / VẬT LIỆU`.
- Ô nhập Tên vật tư được trả lại 100% chiều rộng của cell (`px-2.5`), loại bỏ padding thừa `pr-20`.
- Phân biệt vật tư danh mục vs ngoài danh mục được thể hiện tinh tế qua viền/màu nền control (`border-blue-400 bg-blue-50/30` khi chọn danh mục) và hiển thị rõ ràng trong Popup gợi ý danh mục.

---

### 6. Catalog Search Compatibility
- Chức năng tìm kiếm danh mục vật tư duy trì 100%:
  - Gõ tên vật tư -> Khởi động Popup gợi ý danh mục (`activeSuggestionRow`).
  - Popup gợi ý được neo chính xác ngay dưới control Tên vật tư (`top-full mt-1 z-30`).
  - Chọn vật tư từ danh mục -> Tên vật tư & Đơn vị tự động điền.
  - Chọn "Sử dụng vật tư ngoài danh mục" -> Giữ tên vật tư người dùng nhập.

---

### 7. Row Height Behavior
- **Từ 1 đến 4 dòng:** Auto-grow giãn chiều cao linh hoạt, hoàn toàn không xuất hiện scrollbar dọc.
- **Trên 4 dòng (>4 dòng):** Xuất hiện scrollbar nội bộ gọn gàng để tránh hàng trong bảng cao quá mức.
- **Căn chỉnh dòng:** Thẻ `<tr>` tự tăng chiều cao theo Tên vật tư, các ô `STT`, `ĐƠN VỊ`, `THEO HỢP ĐỒNG`, `THỰC TẾ`, `XÓA` căn middle chiều dọc (`vertical-align: middle`) chuẩn xác theo phong cách Excel.

---

### 8. Reload Autosave Test
- **Kịch bản 1 (Tên dài thông thường):** `"Dây tín hiệu cho loa CU/PVC/PVC 2x1,5mm chống cháy cao cấp phục vụ khu vực kỹ thuật công trình"`.
- **Kịch bản 2 (Tên dài không space):** `"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"` (116 ký tự).
- **Kết quả:** Đã lưu thành công qua Auto-save -> Reload (F5) -> Giữ nguyên 100% toàn bộ chuỗi văn bản, tự động wrap đúng số dòng, không bị cắt bớt hay đè lấn.

---

### 9. Browser Console
- Console sạch 100%:
  - 0 Errors.
  - 0 Warnings.
  - 0 Hydration errors.

---

### 10. TypeScript
- Run `npx tsc --noEmit`: **0 LỖI (PASS)**.

---

### 11. Build
- Run `npm run build`: **Exit code: 0 (PASS)**.

---

### 12. FINAL DECISION
**PASSED**
