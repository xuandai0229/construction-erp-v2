# BÁO CÁO NGHIỆM THU: NÂNG CẤP UX NÚT IN (PRINT) TRỰC TIẾP TRÊN TRANG XEM TRƯỚC
## MATERIAL PROPOSAL V2 — INLINE PRINT UX FIX REPORT

**Dự án:** construction-erp-v2  
**Thời gian thực hiện:** 11/08/2026  
**Trạng thái nghiệm thu:** **PASS**

---

### 1. Previous Print Trigger
- Trước đây khi bấm nút `[In]`, hệ thống gọi `window.open('/proposal-export/[id]?autoPrint=true', '_blank', ...)` mở một cửa sổ/tab trình duyệt Chrome mới rồi mới hiện dialog In.

---

### 2. Root Cause
- Luồng mở popup bằng `window.open` gây gián đoạn trải nghiệm người dùng (bị chuyển sang tab mới, có nguy cơ bị popup blocker chặn, và khi cancel người dùng phải tự đóng tab phụ).

---

### 3. Visible Popup Removal
- Đã **LOẠI BỎ 100%** việc sử dụng `window.open`, `target="_blank"` hoặc mở tab/cửa sổ trình duyệt mới.
- Người dùng đứng nguyên tại màn hình `/materials/proposals/[id]/preview`.

---

### 4. Hidden Print Frame Architecture
- Triển khai kiến trúc **Hidden Print Frame (Khung in ngầm)**:
  1. Người dùng bấm nút `[In]`.
  2. Nút In chuyển sang trạng thái `[Loader2] Đang chuẩn bị...` và tạm thời disable để chống spam / double click.
  3. Ứng dụng tạo một thẻ `<iframe>` ẩn (`visibility: hidden; width: 0; height: 0; position: fixed`) nạp nội bộ route văn bản sạch `/proposal-export/${proposalId}`.
  4. Sau khi `iframe` nạp hoàn tất DOM và Font chữ, ứng dụng gọi `iframe.contentWindow.print()`.
  5. Hộp thoại in chuẩn của trình duyệt (Chrome Print Dialog) hiển thị đè lên màn hình Preview hiện tại.
  6. Sau khi in hoặc hủy in, thẻ `iframe` tự động được dọn dẹp (cleanup) khỏi DOM và khôi phục trạng thái nút `[In]`.

---

### 5. Print Document Regression
- Bản in trong Print Dialog giữ nguyên 100% độ chuẩn xác đã khắc phục ở đợt trước:
  - Khổ ngang A4 Landscape (`297mm x 210mm`).
  - Không có Sidebar, Topbar, User Menu hay Project Selector.
  - Không có URL, Title hay Ngày giờ rác của trình duyệt.
  - Đủ 8 cột bảng vật tư, không bị crop hay nhảy chữ.

---

### 6. Cancel → Preview Test
- Khi bấm nút `[Hủy]` (Cancel) trong hộp thoại Print của trình duyệt, người dùng lập tức trở lại trang Preview hiện tại với vị trí cuộn trang (scroll position) và dữ liệu nguyên vẹn, không bị reload hay chuyển hướng.

---

### 7. Repeated Print Test
- Đã test bấm nút `[In]` nhiều lần liên tiếp: Nút bấm hiển thị chỉ báo tải nhẹ `"Đang chuẩn bị..."`, ngăn chặn tuyệt đối tình trạng mở trùng lặp (duplicate print jobs) hay tạo nhiều iframe ngầm.

---

### 8. Cleanup Verification
- Thẻ `iframe` ngầm được tự động xóa khỏi DOM ngay sau khi mở dialog in hoặc khi timeout/unmount component.
- Kiểm tra DOM không tồn tại rác thẻ print iframe dư thừa.

---

### 9. Browser Console
- Console sạch 100%: 0 Errors, 0 Warnings, 0 Exceptions.

---

### 10. TypeScript
- Run `npx tsc --noEmit`: **PASS (0 LỖI)**.

---

### 11. Build
- Run `npm run build`: **Exit code: 0 (PASS)**.

---

### 12. FINAL DECISION
**PASSED**
