# BÁO CÁO NGHIỆM THU: CHUẨN HÓA GIAO DIỆN DANH SÁCH ĐỀ XUẤT VẬT TƯ & MENU THAO TÁC 3 CHẤM
## MATERIAL PROPOSAL V2 — LIST PAGE UI/UX REDESIGN + ROW CLICK EDIT + UNIFIED ACTION MENU REPORT

**Dự án:** construction-erp-v2  
**Thời gian thực hiện:** 11/08/2026  
**Trạng thái nghiệm thu:** **PASS**

---

### 1. Previous List UI Analysis
- Danh sách trước đây hiển thị các nút thao tác trực tiếp (`Xem`, `Excel`) làm rối mắt.
- Cột `TRẠNG THÁI` và bộ lọc status (`Tất cả trạng thái`) không còn phù hợp với quyết định nghiệp vụ hiện tại.
- Tên công trình và mã phiếu bị xuống dòng gây tăng chiều cao hàng không đồng đều.

---

### 2. Status Removal
- **Đã loại bỏ 100%**:
  - Cột `TRẠNG THÁI` trên bảng.
  - Các badge status (Nháp, Đã gửi duyệt, Đã duyệt, Yêu cầu sửa, Từ chối).
  - Bộ lọc `Tất cả trạng thái` khỏi giao diện danh sách.
  - Mã dead-code lọc status trên UI client.

---

### 3. Table Column Redesign
- Bảng danh sách được chuẩn hóa đúng **7 cột duy nhất**:
  1. **MÃ PHIẾU** (`18%` - Bold text `DVT-...`)
  2. **CÔNG TRÌNH** (`32%` - Tên công trình)
  3. **NGƯỜI ĐỀ NGHỊ** (`16%` - Họ tên người lập)
  4. **NGÀY ĐỀ NGHỊ** (`11%` - Định dạng `dd/MM/yyyy`)
  5. **NGÀY CẦN CẤP** (`11%` - Định dạng `dd/MM/yyyy` hoặc `—`)
  6. **SỐ VẬT TƯ** (`7%` - Căn giữa)
  7. **THAO TÁC** (`5%` - Menu 3 chấm căn giữa)

---

### 4. One-line Row Strategy
- Mỗi đề xuất vật tư nằm gọn trên **ĐÚNG 1 HÀNG** (Row height: ~50–56px, `vertical-align: middle`).
- Mã phiếu `DVT-20260811-28729E` giữ nguyên 1 dòng với `whitespace-nowrap`.
- Thẻ `<th>` header và `<td>` value không bị ngắt câu hay ép xuống hàng vô lý.

---

### 5. Long Project Name Handling
- Tên công trình rất dài được xử lý chuẩn 1 dòng: `whitespace-nowrap overflow-hidden text-overflow-ellipsis`.
- Tự động hiển thị đầy đủ tên công trình qua thuộc tính `title` khi người dùng rê chuột (hover).

---

### 6. Unified Action Menu
- Thay thế toàn bộ các nút bấm trực tiếp bằng nút bấm **`⋯` (MoreHorizontal)** sử dụng `UnifiedActionMenu` (`src/components/ui/unified-action-menu.tsx`).
- Menu gồm 6 mục tác vụ có Icon rõ ràng:
  1. **Xem trước** (`Eye` icon)
  2. **Chỉnh sửa** (`Pencil` icon)
  --- Separator ---
  3. **Tải Excel** (`FileSpreadsheet` icon)
  4. **Tải PDF** (`Download` icon)
  5. **In** (`Printer` icon)
  --- Separator ---
  6. **Xóa đề xuất** (`Trash2` icon - Destructive color)

---

### 7. Row Click -> Edit
- Bấm vào bất kỳ vùng nội dung bình thường nào trên hàng (Mã phiếu, Công trình, Người đề nghị, khoảng trắng...) đều tự động chuyển hướng đến màn hình **CHỈNH SỬA** (`/materials/proposals/new?edit=[id]`).
- Hàng hiển thị `cursor: pointer` và hiệu ứng `hover:bg-slate-50`.
- Nút bấm `⋯` và các mục trong Menu được bọc `e.stopPropagation()`, đảm bảo bấm thao tác menu KHÔNG bị mở nhầm màn hình chỉnh sửa.
- Hỗ trợ phím tắt bàn phím `tabIndex={0}` + phím `Enter` / `Space`.

---

### 8. Preview Action
- Chọn **"Xem trước"** mở chính xác đường dẫn `/materials/proposals/[id]/preview`.

---

### 9. Excel/PDF/Print Actions
- **Tải Excel**: Kích hoạt đường dẫn `/materials/proposals/[id]/export?format=excel`.
- **Tải PDF**: Kích hoạt đường dẫn `/materials/proposals/[id]/export?format=pdf`.
- **In**: Tải khung in ngầm (Hidden Print Frame) gọi hộp thoại in chuẩn ngay tại màn hình hiện tại.

---

### 10. Delete Flow
- Chọn **"Xóa đề xuất"** kích hoạt hộp thoại xác nhận `ConfirmDialog` (`src/components/ui/confirm-dialog.tsx`):
  - **Tiêu đề**: "Xóa đề xuất vật tư?"
  - **Nội dung**: "Đề xuất này sẽ bị xóa và không còn xuất hiện trong danh sách."
  - **Nút bấm**: "Hủy" / "Xóa đề xuất" (Màu đỏ nguy hiểm).

---

### 11. Delete RBAC
- Thao tác xóa gọi Server Action `deleteMaterialProposal(id)` trong `src/lib/material-proposals/actions.ts`.
- Server Action thực thi kiểm tra quyền truy cập công trình `assertProjectAccess` và xóa an toàn `materialProposalItem`, `materialProposalApproval` và `materialProposal` trong một Prisma Transaction duy nhất.

---

### 12. Search Area
- Ô tìm kiếm mở rộng tối đa: `"Tìm theo mã phiếu, người đề nghị, công trình..."`.
- Phía bên phải giữ nguyên nút bấm chính **`+ Tạo đề xuất`**.

---

### 13. Responsive QA
- **Desktop/Laptop**: Hiển thị bảng full 1 hàng chuẩn.
- **Màn hình nhỏ**: Khung chứa bảng hỗ trợ cuộn ngang `overflow-x-auto`, không ép co chữ làm vỡ bảng.

---

### 14. Browser Console
- Console sạch 100%: 0 React errors, 0 Hydration warnings, 0 Nested interactive element warnings.

---

### 15. TypeScript
- Run `npx tsc --noEmit`: **PASS (0 LỖI)**.

---

### 16. Lint
- Run `npm run lint`: **PASS**.

---

### 17. Build
- Run `npm run build`: **Exit code: 0 (PASS)**.

---

### 18. Changed Files
- `src/components/materials/material-proposal-list.tsx` *(Viết lại hoàn toàn giao diện danh sách, menu 3 chấm, row click edit, confirm delete)*
- `src/lib/material-proposals/actions.ts` *(Bổ sung server action deleteMaterialProposal có RBAC & transaction)*
- `MATERIAL_PROPOSAL_LIST_UI_ACTION_MENU_REPORT.md` *(Báo cáo nghiệm thu)*

---

### 19. FINAL DECISION
**PASSED**
