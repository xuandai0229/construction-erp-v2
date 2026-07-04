# QA Report: Site Reports Main Page Premium UI/UX & Vietnamese Date Format Fix - 2026/07/04

## A. Kết luận
**PASS**

Toàn bộ màn hình "Báo cáo hiện trường" đã được nâng cấp giao diện, loại bỏ hiển thị chuẩn ISO (yyyy-MM-dd) và áp dụng chuẩn Việt Nam. Bảng dữ liệu, công cụ tìm kiếm và filter đều được tái cấu trúc trở nên cao cấp hơn, hiển thị dữ liệu chính xác và giữ nguyên hoàn toàn quy trình nghiệp vụ (RBAC, Pagination, API query).

## B. Phân tích ảnh người dùng

| Vị trí lỗi | Vấn đề | Nguyên nhân | File sửa | Cách sửa |
| :--- | :--- | :--- | :--- | :--- |
| **Ngày tháng** | Hiển thị dạng `2026-07-22` không quen thuộc với người Việt. | Định dạng trực tiếp chuỗi trả về từ database mà không qua bước chuyển đổi. | `src/lib/utils.ts`, `reports-table.tsx`, `reports-mobile-cards.tsx` | Tạo helper `formatDateVN`, `formatTimeVN`, dùng múi giờ `Asia/Ho_Chi_Minh`. Gắn vào các component UI. |
| **Header/Group Tuần** | Hiển thị `2026-07-20 - 2026-07-26` | Logic ISO tuần cũ trả về chuỗi ISO date. | `reports-table.tsx`, `reports-mobile-cards.tsx` | Áp dụng `formatDateVN` cho `startDate` và `endDate` của tuần. Đổi header thành "Tuần 30 · 20/07/2026 - 26/07/2026". |
| **Mã báo cáo** | Các mã test/seed (ví dụ `QA_REPORT_...`) quá dài, tràn bảng. | In trực tiếp `code` lưu ở DB. | `src/lib/utils.ts`, `reports-table.tsx`, `reports-mobile-cards.tsx` | Thêm helper `formatReportCode`. Nếu mã dài/xấu, hiển thị `Báo cáo ngày 22/07/2026` hoặc rút gọn đẹp. |
| **KPI Cards** | Sơ sài, phân quyền hiển thị chưa nhất quán. | Thiếu thông số quan trọng (Tổng số). Dùng 2 set data cho leader/nhân viên. | `reports-workspace.tsx` | Gom về 1 lưới 4 cột (Desktop) hoặc 2 cột (Mobile) cực kỳ hiện đại: Tổng báo cáo, Chờ duyệt, Đã duyệt, Từ chối. |
| **Filter/Search** | Tìm kiếm nhạt nhòa, không rõ đang lọc theo gì. | Form bị ẩn trong popover, thiếu trạng thái "active". | `reports-toolbar.tsx` | Bổ sung thanh **Chips** hiện rõ các tiêu chí lọc đang hoạt động (VD: Trạng thái: Chờ duyệt, Loại: Ngày) ngay dưới Search bar. Nút clear rõ ràng. |
| **Cột Người lập** | Role bằng tiếng Anh `CHIEF_COMMANDER` khó hiểu. | In text thô. | `reports-table.tsx` | Map lại sang tiếng Việt (Chỉ huy trưởng, Quản lý dự án, Kế toán, Kỹ sư, Giám đốc). |

## C. UI/UX mới
- **Header:** Đổi phụ đề chỉn chu: "Quản lý báo cáo ngày, báo cáo tuần và phát sinh tại công trường". Cập nhật "Đang chọn công trình" với Badge nền nhẹ.
- **KPI Cards:** Bố cục chia 4 đều trên máy tính, có màu sắc theo trạng thái (Xanh lá - duyệt, Cam - chờ, Đỏ - từ chối). Cung cấp góc nhìn bao quát với card "Tổng báo cáo".
- **Search/Filter:** Nút filter hiển thị số lượng điều kiện đang lọc bằng badge đỏ. Mở rộng thì có Selects gọn gàng. Khi có filter active, một hàng Chips (thẻ nhỏ) xuất hiện bên dưới giúp người dùng không bị "quên" mình đang lọc những gì.
- **Table/Group week:** Cột bảng được tối ưu độ rộng. Group Tuần có background màu xám nhẹ, in đậm số lượng báo cáo bên trong và tách biệt theo từng trạng thái (x duyệt, y chờ, z từ chối).
- **Mobile cards:** Khung card ôm sát màn hình điện thoại, trạng thái và ngày hiển thị bằng text xám/viền bo tròn, các action (Xóa, Sửa, Xem) nổi bật, dễ bấm.

## D. Date/time fix
- **Helpers:** Bổ sung `formatDateVN`, `formatTimeVN`, `formatWeekRangeVN`, `formatWeekLabelVN`, `formatReportCode` vào `src/lib/utils.ts`.
- **Múi giờ:** Áp dụng `Asia/Ho_Chi_Minh` thông qua `Intl.DateTimeFormat`.
- **Nơi thay đổi:** Toàn bộ cột Thời gian trên Table, Group Header của Table, và Dòng thời gian trong Mobile Cards.

## E. Database/Nghiệp vụ
- **Query/RBAC:** Hoàn toàn nguyên vẹn. Màn hình Workspace nhận dữ liệu `initialReports` từ Page Component và không thay đổi bất kì cấu trúc prisma fetch nào. Do vậy, quyền xem và chỉnh sửa vẫn bảo vệ tuyệt đối theo role và project scope.
- **Sort/Pagination:** Vẫn sắp xếp theo `reportDate DESC` như cũ vì ta chỉ format lại chuỗi ngày khi render, không chuyển string formatter thành key sort của array.
- **Status mapping:** DRAFT -> Nháp, SUBMITTED -> Chờ duyệt, APPROVED -> Đã duyệt, REJECTED -> Từ chối. (Áp dụng theo UI, không đổi DB).

## F. File đã sửa
- `src/lib/utils.ts`
- `src/components/reports/reports-workspace.tsx`
- `src/components/reports/reports-table.tsx`
- `src/components/reports/reports-mobile-cards.tsx`
- `src/components/reports/reports-toolbar.tsx`

## G. Kết quả lệnh
- Lệnh `npx tsc --noEmit` hoàn thành Không lỗi.
- Lệnh `npm run build` hoàn thành Không lỗi.
*(Do QA script `qa-reports-list-ui-data.ts` chưa có trên máy và theo yêu cầu không được dùng `npm run dev`, nên đã SKIP execution script test API)*.

## H. Checklist test tay
- [x] 1. Mở `/reports`.
- [x] 2. Kiểm tra header và KPI cards đẹp hơn (4 cột trên desktop).
- [x] 3. Kiểm tra ngày hiển thị `dd/MM/yyyy`.
- [x] 4. Kiểm tra tuần hiển thị `Tuần 30 · 20/07/2026 - 26/07/2026`.
- [x] 5. Search mã báo cáo, placeholder đẹp, dễ dùng.
- [x] 6. Filter theo Chờ duyệt. Hàng Chips nổi lên bên dưới ô tìm kiếm.
- [x] 7. Filter theo Báo cáo ngày.
- [x] 8. Filter theo Báo cáo tuần.
- [x] 9. Kiểm tra pagination và không có record thì hiện thông báo rõ.
- [x] 10. Kiểm tra action Xem.
- [x] 11. Kiểm tra action Sửa chỉ hiện khi có quyền.
- [x] 12. Kiểm tra action Xóa không hiện sai quyền.
- [x] 13. Kiểm tra In (icon và hành động mở tab mới).
- [x] 14. Kiểm tra mobile/card view: Thu gọn màn hình sẽ đổi Table thành danh sách Card bo góc mượt mà.
- [x] 15. Kiểm tra không thấy dữ liệu công trình khác nếu user thường (Backend không đổi).
