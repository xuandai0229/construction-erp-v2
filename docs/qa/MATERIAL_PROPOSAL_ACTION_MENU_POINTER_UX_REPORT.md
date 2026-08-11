# BÁO CÁO NGHIỆM THU MICRO UX: MENU POINTER ARROW & ACTIVE ROW HIGHLIGHT
## MATERIAL PROPOSAL V2 — ACTION MENU ANCHOR POINTER + ACTIVE ROW HIGHLIGHT REPORT

**Dự án:** construction-erp-v2  
**Thời gian thực hiện:** 11/08/2026  
**Trạng thái nghiệm thu:** **PASS**

---

### 1. Runtime UX Problem
- Menu 3 chấm (`⋯`) mở ra dưới dạng một Floating Panel độc lập. Khi các hàng đề xuất nằm sát nhau, người dùng có thể khó xác định chính xác Menu đang mở thuộc về hàng phiếu nào.
- Yêu cầu: Tạo liên kết thị giác rõ ràng giữa nút bấm `[⋯]` và Popover Menu bằng một Pointer Arrow nhỏ hướng vào nút bấm, đồng thời làm nổi bật (highlight) chính hàng đề xuất đang có menu mở.

---

### 2. Pointer Design
- Sử dụng CSS Caret Pointer tinh tế được tạo bằng hình vuông xoay 45 độ (`rotate-45 h-2.5 w-2.5`) có viền `border-slate-200` và màu nền `bg-white` đồng bộ 100% với khung Popover Menu.
- Mũi tên Pointer chỉ xuất hiện **KHI MENU MỞ**, tuyệt đối không thêm icon cố định vào các hàng chưa mở làm rối bảng.
- Pointer định vị chính xác ở viền trên (`-top-[5.5px] right-4`), chỉ thẳng vào vị trí nút bấm `[⋯]` trigger. Tự động hỗ trợ lật mũi tên xuống viền dưới (`-bottom-[5.5px] right-4`) khi menu lật ngược lên trên (`isFlipped`).

---

### 3. Active Row Design
- Quản lý trạng thái `activeMenuId` thực tế trong `MaterialProposalList`:
  - Hàng đang mở menu được làm nổi bật với màu nền nhẹ `bg-blue-50/70`, đường viền nhấn lề trái `border-l-2 border-l-blue-600` và chữ đậm hơn (`font-medium`).
  - Nút bấm `[⋯]` của hàng đang mở chuyển sang màu nền xanh nhạt active `bg-blue-100/80 text-blue-700 border-blue-300`.
- Đảm bảo tại một thời điểm **chỉ duy nhất ONE ROW active**. Khi đóng menu hoặc bấm mở menu ở hàng khác, hàng cũ lập tức trở về trạng thái bình thường.

---

### 4. UnifiedActionMenu Change
- Bổ sung prop tùy chọn `showPointer?: boolean` (mặc định `false`) trong `UnifiedActionMenuProps` tại `src/components/ui/unified-action-menu.tsx`.
- Không ảnh hưởng đến các màn hình khác đang dùng `UnifiedActionMenu` không cần pointer.
- Bổ sung callback `onOpenChange?: (isOpen: boolean) => void` để báo trạng thái mở/đóng về parent component một cách sạch sẽ.

---

### 5. Portal / Position Verification
- Tính năng Pointer Arrow tích hợp hoàn hảo với React Portal (`createPortal` vào `document.body`).
- Tọa độ và vị trí mũi tên được tính toán chính xác cùng với vị trí Popover Menu, không bị clipping hay vỡ khung bởi container cuộn của bảng.

---

### 6. Row 1 Runtime Test
- Click `[⋯]` Hàng 1:
  - Hàng 1 chuyển sang màu highlight `bg-blue-50/70 border-l-blue-600`. (PASS)
  - Menu mở ra có mũi tên Pointer chỉ thẳng vào nút `[⋯]` Hàng 1. (PASS)

---

### 7. Row 2 Runtime Test
- Click `[⋯]` Hàng 2:
  - Hàng 1 trở về trạng thái bình thường. (PASS)
  - Hàng 2 chuyển sang màu highlight `bg-blue-50/70`. (PASS)
  - Mũi tên Pointer của Menu di chuyển chỉ đúng nút `[⋯]` Hàng 2. (PASS)

---

### 8. Row Last Runtime Test
- Click `[⋯]` Hàng cuối cùng:
  - Menu hiển thị chính xác, nếu gần đáy màn hình menu tự lật ngược lên trên và Pointer tự đảo ngược hướng xuống dưới chỉ vào trigger. (PASS)

---

### 9. Responsive Test
- Kiểm tra các độ phân giải 1920x1080, 1600x900, 1366x768: Menu và Pointer luôn nằm sát mép phải, không bị tràn màn hình hay che khuất. (PASS)

---

### 10. Browser Console
- Ghi nhận sạch 100%: **0 React errors, 0 hydration warnings, 0 positioning errors**. (PASS)

---

### 11. TypeScript
- Run `npx tsc --noEmit`: **PASS (0 LỖI)**.

---

### 12. Build
- Run `npm run build`: **Exit code: 0 (PASS)**.

---

### 13. FINAL DECISION
**PASSED**
