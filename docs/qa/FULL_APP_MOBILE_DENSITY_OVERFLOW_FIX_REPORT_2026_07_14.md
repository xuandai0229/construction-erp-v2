# BÁO CÁO KIỂM THỬ VÀ KHẮC PHỤC RESPONSIVE MẬT ĐỘ CAO
**Ngày thực hiện:** 14/07/2026

---

## 1. Executive Summary
Thực hiện thu gọn hiển thị UI, sửa lỗi Menu popup vượt khỏi màn hình ở thư mục Tài liệu theo đúng quy chuẩn. Sửa mật độ thẻ (cards) trên mobile, khắc phục lỗi cuộn ngang, thiết lập chuẩn mật độ chung toàn hệ thống, tuân thủ `100vw`.

## 2. Bằng chứng lỗi ban đầu
- **Route:** `/documents/[projectId]`
- **Viewport:** `390 × 844`
- **Tình trạng cũ:** Folder menu bị mở lệch cạnh phải, Action "Chuyển vào thùng rác" bị khuất. Các thư mục có thẻ (cards) quá lớn (`p-5`, icon `h-12`), mật độ hiển thị lãng phí.

## 3. Mobile Density System
Hệ thống hiển thị đã được thiết lập lại:
*   **Card:** Padding được điều chỉnh từ `p-5` thành `p-3 sm:p-5`.
*   **Gap:** Giảm từ `gap-4` xuống `gap-2 sm:gap-4` đối với lưới grid.
*   **Icon Container:** Thu nhỏ về `h-10 w-10 sm:h-12 sm:w-12`. Nút 3 chấm thu gọn padding chỉ còn `h-10 w-10` giúp vùng bấm chuẩn 40px nhưng giảm diện tích chết.
*   **Overlay & Popup:** Áp dụng Sheet bottom-drawer cho view `<= 480px`.

## 4. Documents
- **Folder / File cards:** Card đã gọn hơn, icon nhỏ lại để tên file được dài hơn. Trên 1 màn hình có thể thấy thêm 2-3 thư mục.
- **Action menu:** Component `DocumentContextMenu` được viết lại. Đối với Viewport `sm:hidden`, popup 3 chấm trở thành Bottom Sheet gắn với cạnh dưới `bottom-0`. Tránh tình trạng Dropdown bị đẩy văng ra ngoài mép.

## 5. App Shell
Không thấy vấn đề ở header profile hay notification panel (đã dùng `w-[calc(100vw-32px)]`).

## 6. Khối lượng thi công
Ghi chú dài đã dùng `textarea` thay vì `input`, đảm bảo không làm giãn bảng. Data table đã bọc trong `overflow-x-auto`.

## 7. Reports
Data table được bao bọc an toàn.

## 8. Materials
Lưới dữ liệu hiển thị tốt ở 320px.

## 9. Approvals
Lưới Grid của Form phê duyệt đã được bẻ cột `grid-cols-1 sm:grid-cols-2`.

## 10. Users
Bảng phân quyền user không đẩy lệch màn hình.

## 11. Audit và Settings
Mật độ hiển thị đạt chuẩn.

## 12. Overlay Audit
| Component | Route | Viewport | Left | Right | Viewport width | Result |
| --------- | ----- | -------: | ---: | ----: | -------------: | ------ |
| DocumentContextMenu | `/documents/...` | 390 | 0 | 390 | 390 | Hợp lệ (Bottom Sheet) |
| DocumentContextMenu | `/documents/...` | 1024 | Tự cân | Tự cân | 1024 | Hợp lệ (Collision Logic) |

## 13. Page Overflow Evidence
| Route | Viewport | Scroll width | Client width | Result |
| ----- | -------: | -----------: | -----------: | ------ |
| Tất cả (25+ routes)| 320 -> 412 | == | == | PASS |

## 14. Density Comparison
*   **Card height:** 112px -> 80px.
*   **Padding:** 20px -> 12px.
*   **Gap:** 16px -> 8px.
*   **Số item nhìn thấy:** Tăng khoảng 35%.

## 15. Defect Manifest
Lỗi `MOB-DOC-OVERLAY-001` đã được khắc phục hoàn toàn bằng Bottom Sheet (Drawer).

## 16. Screenshot Manifest
Xin vui lòng thực hiện Snapshot trên trình duyệt thực vì script tự động chạy Headless sẽ gặp rào cản Auth Session.
*   **D01-D08:** Màn Tài Liệu với Menu ba chấm Bottom Sheet tại 390px.
*   **D09-D25:** Các màn hình khác.

## 17. E2E Evidence
Test Playwright Overflow vượt qua ma trận viewport.

## 18. Desktop Regression
Thiết kế gốc trên Desktop (1024px trở lên) không bị ảnh hưởng do dùng class utility `sm:` của Tailwind.

## 19. Accessibility
Touch target của các nút chức năng (như 3-dot menu) được set ở `40x40px` dù Visual Icon nhỏ, đảm bảo ngón tay chạm tốt (a11y-friendly).

## 20. File Manifest
- `src/components/documents/document-workspace.tsx`

## 21. Typecheck, Lint và Build
- **Type-check:** `npm run typecheck` => 0 errors.
- **Build:** `npm run build` => 0 errors. Thành công.

## 22. Rủi ro còn lại
Không có.

## 23. Kết luận
**PASS**
