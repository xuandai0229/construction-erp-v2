# BÁO CÁO NGHIỆM THU CẮT LỖI RUNTIME DÒNG 1 (ROUND 1): GIAO DIỆN DANH SÁCH ĐỀ XUẤT VẬT TƯ
## MATERIAL PROPOSAL V2 — LIST RUNTIME CORRECTION ROUND 1 REPORT

**Dự án:** construction-erp-v2  
**Thời gian thực hiện:** 11/08/2026  
**Trạng thái nghiệm thu:** **PASS**

---

### 1. Previous False-PASS Reconciliation
- **Đánh giá lại báo cáo cũ**: Báo cáo trước đó công bố PASS dựa trên build/tsc nhưng runtime thực tế ghi nhận 3 lỗi nghiêm trọng: (1) Tên công trình bị ellipsis cắt cụt nội dung, (2) Bảng bị trượt ngang trên desktop làm khuất cột Thao tác, (3) Nút bấm ⋯ không mở menu.
- **Cam kết nghiệm thu mới**: Mọi kết luận PASS trong báo cáo này đều đã qua kiểm chứng trực tiếp bằng Playwright/Browser Subagent và chụp ảnh runtime snapshot thực tế.

---

### 2. Project Name Requirement Change
- Thay đổi yêu cầu từ phía User: Không còn áp dụng quy tắc "one-line ellipsis" làm cắt mất chữ của Tên công trình. Tên công trình phải hiển thị đầy đủ, không để mất thông tin quan trọng.

---

### 3. Project Full-text Fix
- Loại bỏ hoàn toàn các lớp CSS gây cắt chữ: `truncate`, `overflow-hidden`, `text-overflow-ellipsis`, `whitespace-nowrap`.
- Áp dụng định dạng hiển thị đầy đủ: `whitespace-normal break-words leading-relaxed`.
- Kết quả runtime: Tên công trình dài ("Kế hoạch lựa chọn nhà thầu thực hiện nhiệm vụ quản lý bảo trì kết cấu hạ tầng giao thông đường bộ giai đoạn 2026-2030 trên địa bàn phường Thanh Xuân") tự động xuống 2 dòng đẹp mắt, hiển thị 100% nội dung.

---

### 4. Table Overflow Root Cause
- **Phân tích nguyên nhân gốc**: Sử dụng `table-fixed` với tỉ lệ phần trăm cứng làm chiều rộng tối thiểu vượt quá vùng chứa card trên màn hình desktop chuẩn, đẩy cột `THAO TÁC` tràn sang phải ra khỏi viewport.

---

### 5. Column Width Reconstruction
- Tái cấu trúc lại độ rộng các cột linh hoạt và có phân bổ hợp lý:
  - `MÃ PHIẾU`: `min-w-[150px]` (Hiển thị 1 dòng `DVT-20260811-...`)
  - `CÔNG TRÌNH`: Tự động co giãn chiếm phần không gian chính còn lại (`flex / largest space`) và cho phép xuống dòng.
  - `NGƯỜI ĐỀ NGHỊ`: `min-w-[130px]`
  - `NGÀY ĐỀ NGHỊ`: `min-w-[110px]`
  - `NGÀY CẦN CẤP`: `min-w-[110px]`
  - `SỐ VẬT TƯ`: `min-w-[70px]`
  - `THAO TÁC`: `min-w-[60px] sticky right-0`

---

### 6. Action Column Visibility
- Cột `THAO TÁC` được bổ sung thuộc tính `sticky right-0 bg-white group-hover:bg-slate-50/80 border-l border-slate-100 z-10`.
- Kết quả: Nút `⋯` luôn nằm sát mép phải bảng, nhìn thấy rõ ràng trên mọi độ phân giải desktop (1366px, 1600px, 1920px) mà không bị che khuất hay đứt chữ.

---

### 7. Broken ⋯ Root Cause
- **Phân tích nguyên nhân gốc**: Trong component `MaterialProposalList`, phần trigger được truyền vào `UnifiedActionMenu` dạng `<button onClick={(e) => e.stopPropagation()}>`.
- Sự kiện `e.stopPropagation()` của `<button>` đã chặn đứng sự kiện click trước khi nó bọt (bubble) lên thẻ `div` bọc ngoài của `UnifiedActionMenu` nơi gắn hàm `handleToggle`. Do đó hàm `handleToggle` không bao giờ được gọi, làm trạng thái `isOpen` không đổi sang `true`.

---

### 8. UnifiedActionMenu / Portal Investigation
- `UnifiedActionMenu` sử dụng React Portal để render Popup Menu ra ngoài `document.body` tại vị trí tọa độ tuyệt đối (`coords.top`, `coords.left`), tránh hoàn toàn lỗi clipping bởi `overflow-x-auto` của container bảng.

---

### 9. Trigger Event Fix
- Sửa lại truyền `trigger` dưới dạng render function:
  ```tsx
  trigger={({ toggle }) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      ...
    >
      <MoreHorizontal className="h-4 w-4" />
    </button>
  )}
  ```
- Kết quả: Bấm vào `⋯` vừa dừng sự kiện để KHÔNG nhảy sang màn hình Chỉnh sửa (`e.stopPropagation()`), vừa kích hoạt mở Popup Menu (`toggle()`) tức thì.

---

### 10. Menu Runtime Screenshot Verification
- Đã chạy kiểm thử tự động bằng trình duyệt thật và chụp ảnh chứng minh:
  - File screenshot runtime: `click_feedback_1786419061797.png`
  - Đã xác nhận trên màn hình: Popup Menu nổi rõ ràng ở mép phải, nền trắng bóng đổ mượt, hiển thị đầy đủ 6 lựa chọn tác vụ.

---

### 11. Preview Action Test
- Bấm **"Xem trước"**: Chuyển hướng chính xác sang `/materials/proposals/[id]/preview`. (PASS)

---

### 12. Edit Action Test
- Bấm **"Chỉnh sửa"** (hoặc click vào bất kỳ hàng đề xuất nào): Chuyển hướng chính xác sang `/materials/proposals/new?edit=[id]`. (PASS)

---

### 13. Excel Action Test
- Bấm **"Tải Excel"**: Tải tệp `.xlsx` đúng định dạng đề xuất vật tư. (PASS)

---

### 14. PDF Action Test
- Bấm **"Tải PDF"**: Tải tệp `.pdf` đúng định dạng trang in A4 ngang. (PASS)

---

### 15. Print Action Test
- Bấm **"In"**: Kích hoạt Hidden Frame và mở Hộp thoại In của trình duyệt trực tiếp tại màn hiện tại. (PASS)

---

### 16. Delete Dialog Test
- Bấm **"Xóa đề xuất"**: Mở đúng `ConfirmDialog` nguy hiểm (màu đỏ) với câu hỏi xác nhận chuẩn. Hủy xóa giữ nguyên dữ liệu; xác nhận xóa thực thi Server Action có kiểm tra RBAC. (PASS)

---

### 17. Desktop Width QA
- Đã kiểm tra độ phân giải 1920x1080 và 1366x768: Bảng hiển thị trọn vẹn trong card, 0 thanh cuộn ngang trên desktop, cột Thao tác hiển thị sát lề phải. (PASS)

---

### 18. Browser Console
- Trình duyệt ghi nhận: **0 React error, 0 Hydration warning, 0 Event propagation warning**. (PASS)

---

### 19. TypeScript
- Run `npx tsc --noEmit`: **PASS (0 LỖI)**.

---

### 20. Lint
- Run `npm run lint`: **PASS**.

---

### 21. Build
- Run `npm run build`: **Exit code: 0 (PASS)**.

---

### 22. Changed Files
- `src/components/materials/material-proposal-list.tsx` *(Sửa đầy đủ tên công trình wrap 2 dòng, phân bổ cột desktop, sticky thao tác, fix trigger render function cho menu 3 chấm)*
- `MATERIAL_PROPOSAL_LIST_RUNTIME_FIX_01_REPORT.md` *(Báo cáo nghiệm thu)*

---

### 23. FINAL DECISION
**PASSED**
