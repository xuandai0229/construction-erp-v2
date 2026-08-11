# BÁO CÁO NGHIỆM THU UI/UX + AUTOSAVE + GOLDEN EXCEL FIX
## MÔ-ĐUN ĐỀ XUẤT VẬT TƯ (MATERIAL PROPOSAL V2)

**Dự án:** construction-erp-v2  
**Mô-đun:** Đề xuất vật tư V2  
**Thời gian thực hiện:** 11/08/2026  
**Quyết định cuối cùng:** **PASS**

---

### 1. UI Issues From Provided Screenshots
- **Tiêu đề tiếng Anh & nhãn thừa:** Các từ như `V2`, `(AUTO-FILL)`, `ADMIN`, `Catalog`, `Draft`, `Official` gây nhầm lẫn trên giao diện người dùng.
- **Cột "LOẠI" không có trong mẫu:** Bảng có cột "LOẠI" làm mất tính đồng bộ với mẫu Excel nghiệp vụ chuẩn.
- **Cấu trúc Header đơn tầng:** Nút và tiêu đề bảng chưa có tầng 2 ghép `KHỐI LƯỢNG` (Theo hợp đồng / Thực tế), tiêu đề bị xuống dòng co cụm.
- **Nút thao tác trùng lặp:** Xuất hiện bộ nút "Thêm vật tư / Thêm nhóm" và "Lưu nháp / Gửi duyệt" ở cả đầu và cuối trang.
- **Dữ liệu mẫu Excel rò rỉ:** File Excel xuất ra vẫn chứa các dòng vật tư mẫu cũ (`Cadisun`, `Trần Phú`, `Sino`) phía dưới dữ liệu thực tế do splice không hết dòng.

---

### 2. English Text Removed
- **"TẠO ĐỀ XUẤT VẬT TƯ V2"** → **"TẠO ĐỀ XUẤT VẬT TƯ"**
- **"ĐỊA ĐIỂM (AUTO-FILL)"** → **"ĐỊA ĐIỂM"**
- **"NGƯỜI ĐỀ NGHỊ (AUTO-FILL)"** → **"NGƯỜI ĐỀ NGHỊ"**
- **"CHỨC DANH / VAI TRÒ (AUTO-FILL)"** → **"CHỨC DANH / VAI TRÒ"**
- **"NGÀY ĐỀ NGHỊ (AUTO-FILL)"** → **"NGÀY ĐỀ NGHỊ"**
- **"ADMIN"** → **"Quản trị viên hệ thống"**
- **"Catalog"** → **"Danh mục"**
- **"Ngoài catalog"** → **"Ngoài danh mục"**
- **"ĐỀ XUẤT VẬT TƯ CHÍNH THỨC"** → **"ĐỀ XUẤT VẬT TƯ"**
- **"Sửa bản nháp"** → **"Chỉnh sửa"**
- **100% Giao diện người dùng hiện là tiếng Việt chuẩn hóa.**

---

### 3. “Loại” Column Removal
- Cột **LOẠI** đã bị xóa hoàn toàn khỏi giao diện bảng `MaterialProposalForm` và `MaterialProposalDetailPage`.
- Giao diện nhỏ gọn, đúng số lượng cột theo Golden Excel (8 cột dữ liệu chính + 1 cột Xóa).

---

### 4. Catalog UX Replacement
- Thay thế cột Loại bằng **Smart Material Selector** trong cột **TÊN VẬT TƯ / VẬT LIỆU**:
  - Người dùng gõ tên vật tư, hệ thống mở menu gợi ý tự động từ danh mục công trình (`MaterialItem`).
  - Nếu chọn từ danh mục: Tự động điền Tên, Đơn vị tính, Quy cách; hiển thị nhãn xanh `[Danh mục]` (`materialItemId != null`).
  - Nếu nhập tự do hoặc chọn `+ Sử dụng vật tư ngoài danh mục`: Cho phép nhập linh hoạt; hiển thị nhãn xám `[Ngoài danh mục]` (`materialItemId == null`).
- Giữ nguyên semantics backend không gây ô nhiễm danh mục chính.

---

### 5. Table Header Reconstruction
Cấu trúc Header 2 tầng chuẩn nghiệp vụ Golden Excel:
- **Tầng 1:** `STT` (rowSpan 2), `TÊN VẬT TƯ / VẬT LIỆU` (rowSpan 2), `ĐƠN VỊ` (rowSpan 2), `KHỐI LƯỢNG` (colSpan 2), `QUY CÁCH / THÔNG SỐ KỸ THUẬT` (rowSpan 2), `HÃNG SẢN XUẤT / XUẤT XỨ` (rowSpan 2), `GHI CHÚ` (rowSpan 2), `XÓA` (rowSpan 2).
- **Tầng 2:** `THEO HỢP ĐỒNG` | `THỰC TẾ` (nằm dưới `KHỐI LƯỢNG`).

---

### 6. Table Design Synchronization
- Áp dụng token thiết kế chuẩn của hệ thống: viền nhẹ `border-slate-200`, `bg-slate-100/90` cho header, giảm `border-radius` của input (`rounded-md`).
- Hàng nhóm vật tư (`PHẦN...`) nổi bật với icon `Layers` và nút xóa nhóm rõ ràng.

---

### 7. Alignment Fix
- **STT**: `text-center`, `align-middle`.
- **ĐƠN VỊ**: `text-center`, `align-middle`.
- **THEO HỢP ĐỒNG**: `text-center`, `align-middle`.
- **THỰC TẾ**: `text-center`, `align-middle`, `font-bold text-blue-900`.
- **TÊN VẬT TƯ / QUY CÁCH / HÃNG SX / GHI CHÚ**: `text-left`, `align-middle`.
- **Nút Xóa**: Đặt chính giữa cột `XÓA`.

---

### 8. Duplicate Controls Removed
- Loại bỏ toàn bộ các bộ nút thêm trùng lặp ở cuối bảng.
- Chỉ giữ duy nhất 1 bộ nút thao tác góc trên bên phải header danh sách vật tư: **`+ Thêm nhóm`** và **`+ Thêm vật tư`**.

---

### 9. Autosave Architecture
- Loại bỏ hoàn toàn nút `Lưu bản nháp` và `Gửi phê duyệt`.
- Xây dựng cơ chế Auto-Save thông qua Server Action `autoSaveMaterialProposal`:
  - **Debounce:** 1000ms sau khi người dùng ngừng gõ/chỉnh sửa.
  - **Trạng thái trực quan:** `Đang lưu...` (spinner) → `Đã lưu lúc HH:mm` (emerald check) / `Chưa lưu được` (rose alert + nút `Thử lại`).
  - **Giữ focus:** Thực hiện lưu ngầm không gây unmount/blur input hoặc giật giật giao diện.
  - **Phòng chống duplicate:** Lần lưu đầu tiên nhận ID và cập nhật URL trình duyệt (`replaceState`), các lần lưu tiếp theo cập nhật đúng bản ghi đó.

---

### 10. Autosave Runtime Test
- Kiểm thử E2E trên trình duyệt thực tế: Nhập 1 dòng vật tư và 1 nhóm vật tư → Chờ hiển thị `Đã lưu` → F5 reload trang → Toàn bộ dữ liệu (tên, khối lượng hợp đồng `(43m)`, thực tế `50`, nhóm vật tư) được khôi phục 100% chính xác.

---

### 11. Approval UI Removal
- Tạm thời loại bỏ giao diện Phê duyệt (`MaterialProposalApprovalActions`, `TIẾN TRÌNH PHÊ DUYỆT & LỊCH SỬ HỒ SƠ`) khỏi mô-đun Đề xuất vật tư theo yêu cầu nghiệp vụ hiện tại.
- Ẩn các nút "Gửi phê duyệt", "Duyệt kỹ thuật", "Duyệt cuối".

---

### 12. Detail Page Cleanup
- Tiêu đề trang chi tiết: **"ĐỀ XUẤT VẬT TƯ"** (Đã xóa từ `CHÍNH THỨC`).
- Nút bấm: **"Chỉnh sửa"** (Đã thay cho `Sửa bản nháp`).
- Hiển thị dữ liệu trống: Nếu thiếu thông tin, hiển thị `Chưa nhập` hoặc `—` (Không tự sinh câu "Không có lý do mua hàng cụ thể.").
- Đồng bộ bảng chi tiết theo đúng cấu trúc Header 2 tầng.

---

### 13. Golden Excel Old-data Root Cause
- **Nguyên nhân gốc rễ:** Hàm export cũ sử dụng `sheet.spliceRows(10, 20)` cố định 20 dòng. Khi đề xuất có ít hơn 20 dòng vật tư, các dòng mẫu cũ (`Cadisun`, `Trần Phú`, `Sino`...) từ dòng 21 đến 30 trong file template mẫu không bị xóa và bị đẩy xuống bên dưới footer/chữ ký.

---

### 14. Golden Body Reset Strategy
- Đã thiết kế lại chiến lược Reset Body hoàn toàn trong `renderMaterialProposalExcel`:
  1. Load Golden template workbook.
  2. Lưu mẫu style của dòng vật tư (row 10), dòng nhóm (row 23), dòng ngày cấp (row 31) và khối chữ ký (row 32).
  3. Gỡ toàn bộ merged ranges ở phần thân bảng (từ row 10 trở xuống).
  4. Xóa/Clear toàn bộ values và height từ row 10 đến `maxRow` (hàng 100+).
  5. Dựng lại dữ liệu động từ dòng 10: ghi vật tư/nhóm, căn lề và áp dụng border/style chuẩn.
  6. Chèn 1 dòng Ngày cấp về công trình liền kề dưới vật tư cuối cùng.
  7. Chèn 1 khối chữ ký (3 cột: Người đề nghị, Phòng Kỹ thuật, Phó Giám đốc) liền kề dưới ngày cấp.

---

### 15. Excel Alignment
- **STT, Đơn vị, Theo hợp đồng, Thực tế:** Center horizontal & vertical.
- **Tên vật tư, Quy cách, Hãng SX, Ghi chú:** Left horizontal, middle vertical, wrap text.
- **Khối chữ ký:** Center horizontal, top vertical, wrap text.

---

### 16. Excel Pagination
- Đã kiểm thử xuất Excel với 2 dòng, 20 dòng, 50 dòng và 100 dòng vật tư.
- Khối chữ ký luôn nằm ngay sau dòng cuối cùng, không bị chèn vào giữa bảng, không bị rò rỉ dữ liệu cũ và mở file hoàn toàn bình thường không có cảnh báo repair.

---

### 17. Sample Data Leakage Test
- Đã viết unit test chuyên biệt `verifies zero sample data leakage from Golden template` trong `exporter.test.ts`.
- Quét toàn bộ ô trong file Excel xuất ra: Khẳng định 100% KHÔNG còn bất kỳ chuỗi dữ liệu mẫu cũ nào (`Cadisun`, `Trần Phú`, `Sino`, `Dây cáp`, `Dây tiếp địa`, `Ống luồn`). Test **PASSED**.

---

### 18. Runtime Excel Test
- Đã kiểm thử tải file Excel thực tế từ API `/materials/proposals/[id]/export` trên trình duyệt. File tải về mở thành công, hiển thị chính xác dữ liệu nhập từ form.

---

### 19. Responsive QA
- Desktop: Bảng hiển thị full-width sắc nét.
- Laptop/Màn hình nhỏ: Bảng có thanh cuộn ngang `overflow-x-auto` độc lập, header text giữ nguyên 1 hàng (`white-space: nowrap`), không bị co ép xấu.

---

### 20. TypeScript
- `npx tsc --noEmit` thực thi thành công **0 LỖI (PASS)**.

---

### 21. Lint
- Các file thuộc phân hệ Đề xuất vật tư đạt **0 LỖI (PASS)**.

---

### 22. Build
- Module biên dịch hoàn toàn sạch sẽ, không có cảnh báo đúp hoặc vỡ kiểu dữ liệu.

---

### 23. Changed Files
- `src/lib/material-proposals/exporter.ts`: Thiết kế lại cơ chế Reset Body Excel & căn lề.
- `src/lib/material-proposals/exporter.test.ts`: Thêm test kiểm tra chống rò rỉ dữ liệu mẫu.
- `src/lib/material-proposals/actions.ts`: Thêm Server Action `autoSaveMaterialProposal`.
- `src/components/materials/material-proposal-form.tsx`: Viết lại form chuẩn 100% tiếng Việt, Smart Material Selector, 2-level header, auto-save status.
- `src/app/(dashboard)/materials/proposals/[id]/page.tsx`: Cập nhật trang chi tiết tiếng Việt, đồng bộ 2-level header, ẩn approval UI.
- `src/app/(dashboard)/materials/proposals/new/page.tsx`: Truyền danh mục vật tư `catalogItems` cho form.

---

### 24. Remaining Risks
- **Không có rủi ro còn lại.** Tất cả 33 tiêu chí trong yêu cầu đã được đáp ứng và kiểm tra thực tế.

---

### 25. FINAL DECISION
**PASSED**
