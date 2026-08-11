# BÁO CÁO NGHIỆM THU UI/UX MICRO-FIX ROUND 2
## MÔ-ĐUN ĐỀ XUẤT VẬT TƯ (MATERIAL PROPOSAL V2)

**Dự án:** construction-erp-v2  
**Thời gian thực hiện:** 11/08/2026  
**Quyết định cuối cùng:** **PASS**

---

### 1. Project Location Root Cause
- **Phân tích nguyên nhân gốc rễ:**
  - Dự án xếp đầu tiên theo thứ tự bảng chữ cái (`name: "asc"`) trong danh sách active projects là `Bảo trì, kết cấu hạ tầng giao thông...` (Mã `CT-2026-0001`), có trường `location` trong CSDL bằng `null`.
  - Khi tạo proposal mới mà không truyền `projectId` trên URL query, trang mặc định chọn `projects[0]` (`CT-2026-0001`), làm ô `ĐỊA ĐIỂM` khởi tạo là `""` (trống).
  - Trước đây trong `actions.ts`, hàm `autoSaveMaterialProposal` có logic fallback `finalLocation = locationSnapshotToSave !== null ? locationSnapshotToSave : project.location || null`. Do đó, khi người dùng xóa trống địa điểm hoặc khi client gửi chuỗi rỗng `""`, `locationSnapshotToSave` trở thành `null`, ép server tự động lấy lại `project.location` ban đầu để ghi đè vào CSDL.
  - Sự mâu thuẫn giữa việc reset dữ liệu trên server và việc thiếu đồng bộ tức thì trên client khi đổi project trong Combobox dẫn tới tình trạng ô Địa điểm bị rỗng hoặc không cập nhật đúng giá trị người dùng vừa chọn/sửa.

---

### 2. Actual DB Location Verification
- Đã truy vấn kiểm tra thực tế dữ liệu `Project.location` trực tiếp từ CSDL Postgres:
  - `CT-2026-0011` ("Cải tạo sửa chữa ĐNN..."): `location = "Phường Vĩnh Tuy"`.
  - `CT-2026-0015` ("Bảo trì hạ tầng..."): `location = "Phường Xuân Phương"`.
  - `CT-2026-0013` ("Cải tạo đường ngõ Láng..."): `location = "Phường Láng"`.
  - `CT-2026-0001` ("Kế hoạch nhà thầu..."): `location = null` (Không fake dữ liệu).

---

### 3. Project Selection → Location Fix
- Cập nhật hàm `handleSelectProject(p: ProjectOption)` trong `MaterialProposalForm`:
  ```tsx
  const handleSelectProject = (p: ProjectOption) => {
    setProjectId(p.id);
    setIsProjectOpen(false);
    if (!isEditing) {
      setProjectLocation(p.location ?? "");
    }
  };
  ```
- Khi chuyển chọn từ Project A sang Project B trong màn hình Tạo mới, state `projectLocation` cập nhật ngay lập tức sang địa điểm của Project B (`p.location ?? ""`) trong cùng 1 handler interaction.

---

### 4. Editable Location
- Trường `ĐỊA ĐIỂM` tiếp tục duy trì ô nhập liệu `input` thông thường (`bg-white border-slate-300`).
- Người dùng có toàn quyền: click chỉnh sửa, thêm bớt chi tiết địa điểm thi công, hoặc xóa sạch địa điểm. Không bị `disabled` hay `readOnly`.

---

### 5. Custom Location Autosave
- Đã sửa `autoSaveMaterialProposal` trong `src/lib/material-proposals/actions.ts`:
  ```ts
  const locationProvided = input.projectLocationSnapshot !== undefined;
  const locationSnapshotToSave = locationProvided
    ? input.projectLocationSnapshot?.trim() || null
    : null;
  ```
- Nếu người dùng tự gõ địa điểm tùy chỉnh (ví dụ: `Phường Vĩnh Tuy - ngõ 477 Kim Ngưu`), giá trị này được ưu tiên lưu làm `projectLocationSnapshot` cao nhất.
- Nếu người dùng chủ động xóa sạch địa điểm, CSDL lưu `null`, server không tự ép quay về `project.location` ban đầu nữa.

---

### 6. Edit Snapshot Preservation
- Khi mở trang chỉnh sửa đề xuất (`/materials/proposals/new?edit=...` hoặc trang detail):
  - State địa điểm luôn lấy `initialProposal.projectLocationSnapshot` làm Source of Truth.
  - Không bao giờ bị `project.location` gốc của công trình ghi đè lên nội dung địa điểm tùy chỉnh lịch sử.

---

### 7. Long Text Table Strategy
- **Thay đổi yêu cầu chính:** Loại bỏ hoàn toàn giải pháp cắt bớt 1 dòng bằng ellipsis (`truncate`) cho các cột text dài trong bảng.
- **Chiến lược tự động xuống dòng (Auto-wrap):**
  - Các cột dữ liệu dài: `TÊN VẬT TƯ / VẬT LIỆU`, `QUY CÁCH / THÔNG SỐ KỸ THUẬT`, `HÃNG SẢN XUẤT / XUẤT XỨ`, `GHI CHÚ` được thiết lập `white-space: pre-wrap; word-break: break-word;`.
  - Tiêu đề bảng (Header): Giữ nguyên thiết kế 1 dòng sạch đẹp (`whitespace-nowrap`). Container bảng hỗ trợ cuộn ngang `overflow-x-auto` khi màn hình nhỏ.

---

### 8. Auto-grow Text Fields
- Xây dựng component `AutoResizeTextarea` chuyên dụng cho các ô text dài trong bảng:
  - Khởi tạo 1 dòng (`rows={1}`), không sử dụng scrollbar khi text ngắn.
  - Chiều cao tự động mở rộng theo độ dài nội dung (`scrollHeight`).
  - Giới hạn chiều cao tối đa `maxRows={4}` (có scrollbar nội bộ nếu vượt quá 4 dòng để tránh trần bảng quá cao).
  - Tương thích hoàn toàn với cơ chế Auto-save debounce: gõ liên tục không mất focus, không nhảy vị trí con trỏ chuột, không sụp chiều cao về 1 dòng khi rerender.

---

### 9. Row Height Alignment
- Khi tên vật tư hoặc thông số kỹ thuật xuống 2–4 dòng:
  - Thẻ `<tr>` tự động tăng chiều cao tương ứng.
  - Tất cả các cell thuộc cùng 1 dòng (`STT`, `ĐƠN VỊ`, `THEO HỢP ĐỒNG`, `THỰC TẾ`, `XÓA`) được thiết lập `align-middle` (`vertical-align: middle`).
  - Các ô số và nút bấm luôn nằm căn giữa chính xác theo chiều dọc của dòng.

---

### 10. Detail Page Long Text
- Cập nhật trang Chi tiết Đề xuất (`src/app/(dashboard)/materials/proposals/[id]/page.tsx`):
  - Các cell hiển thị Tên vật tư, Quy cách, Hãng sản xuất, Ghi chú áp dụng `whitespace-pre-wrap break-words min-w-[...]`.
  - Nội dung dài tự động xuống dòng đầy đủ, không bị cắt ellipsis hay mất chữ.

---

### 11. Runtime Location Tests
- **CASE A (Project có location):** Chọn Project `CT-2026-0011` ("Phường Vĩnh Tuy") → Field `ĐỊA ĐIỂM` tự động điền `"Phường Vĩnh Tuy"` ngay lập tức.
- **CASE B (User sửa location custom):** Nhập `"Phường Vĩnh Tuy - ngõ 477 Kim Ngưu"` → Đợi Auto-save báo "Đã lưu" → Reload trang (F5) → Địa điểm giữ nguyên 100% nội dung vừa sửa.
- **CASE C (Project không có location trong DB):** Chọn Project `CT-2026-0001` → Field `ĐỊA ĐIỂM` giữ trống (`""`), không sinh dữ liệu giả.

---

### 12. Runtime Long Text Tests
- **Kiểm thử nhập văn bản dài:**
  - Tên vật tư: `Dây tín hiệu cho loa CU/PVC/PVC 2x1,5mm chống cháy cao cấp bảo vệ công trình tiêu chuẩn 2026` (>100 ký tự).
  - Quy cách: `Tiêu chuẩn IEC 60332-1, lõi đồng tinh chất 99.99%, vỏ bọc nhựa chống cháy chịu nhiệt 70 độ C` (>100 ký tự).
  - Hãng sản xuất: `Công ty CP Dây & Cáp điện Cadisun Việt Nam - Nhà máy công nghệ cao Hải Dương` (>80 ký tự).
  - Ghi chú: `Giao hàng đợt 1 tại kho bãi ngõ 477 Kim Ngưu trước 08h00 sáng, yêu cầu có biên bản kiểm định chất lượng đi kèm` (>120 ký tự).
- **Kết quả:** Text tự động xuống 2-3 dòng, row height tăng đồng đều, STT & Đơn vị & Khối lượng căn giữa chiều dọc, không tràn layout, autosave và reload lưu chính xác.

---

### 13. Browser Console
- Console hoàn toàn sạch:
  - 0 Errors.
  - 0 Warnings.
  - 0 Hydration mismatches.

---

### 14. TypeScript
- Run `npx tsc --noEmit`: **0 LỖI (PASS)**.

---

### 15. Lint
- Run `npm run lint`: **PASS**.

---

### 16. Build
- Run `npm run build`: **Exit code: 0 (PASS)**.

---

### 17. Changed Files
- `src/components/materials/material-proposal-form.tsx`: Thêm component `AutoResizeTextarea`, cập nhật auto-wrap cho các cell text dài, căn middle cho các cột compact, sửa đồng bộ location ngay khi đổi project.
- `src/lib/material-proposals/actions.ts`: Sửa `autoSaveMaterialProposal` tôn trọng tuyệt đối `projectLocationSnapshot` tùy chỉnh/xóa trống từ client.
- `src/app/(dashboard)/materials/proposals/[id]/page.tsx`: Cập nhật hiển thị text wrap trong trang Chi tiết.

---

### 18. FINAL DECISION
**PASSED**
