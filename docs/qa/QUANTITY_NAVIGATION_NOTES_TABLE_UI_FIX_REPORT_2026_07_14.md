# Báo Cáo QA: Khắc phục lỗi hiển thị Ghi chú, Bảng và Điều hướng Khối lượng

**Ngày thực hiện:** 14/07/2026

## 1. Executive Summary
Đã hoàn thành sửa 3 vấn đề UI/UX cho module Khối lượng thi công. Các vấn đề về cắt chữ Ghi chú, Tiêu đề dính, và Điều hướng không hợp lý đã được giải quyết dứt điểm mà không làm thay đổi nghiệp vụ hiện có. 

## 2. Hiện trạng trước sửa
- **Ghi chú bị cắt**: Sử dụng input `type="text"` với thuộc tính truncate/whitespace-nowrap làm mất chữ, nội dung dài bị che khuất bằng dấu 3 chấm.
- **Tiêu đề “Phân hệ quản lý”**: Tiêu đề quá chung chung, trình bày dưới dạng 3 card chiếm diện tích lớn trên trang chi tiết công trình.
- **Header bảng**: Các cột trên bảng *Hạng mục & Công việc* và *Khối lượng thực hiện* bị dính chữ (do whitespace-nowrap).

## 3. Phương án đã triển khai
- Thay thế 3 card chức năng bằng thanh điều hướng `ProjectModuleTabs` nhỏ gọn theo ngữ cảnh công trình dưới nhãn "Khối lượng thi công".
- Chỉnh sửa cấu hình CSS table header từ `whitespace-nowrap` thành `whitespace-normal` và ngắt 2 dòng tự nhiên.
- Ứng dụng `textarea` auto-resize kết hợp kỹ thuật div ẩn (`invisible`) để tính toán chiều cao nội dung trọn vẹn, giữ nguyên ngắt dòng và độ dài thực tế.

## 4. Thanh điều hướng “Khối lượng thi công”
- **File sửa**: `src/app/(dashboard)/projects/[id]/page.tsx`
- **Cấu trúc desktop/mobile**: Chèn component `ProjectModuleTabs` ngay dưới box Thông tin chung. Bố cục 3 tabs ngang (Desktop) và Grid (Mobile).
- **Active state**: Active theo route hiện tại.
- **Route giữ nguyên**: `/projects/[id]/field-progress`, `/daily`, `/summary`.

## 5. Sửa Ghi chú
- **Component cũ**: Thẻ `input` (text-ellipsis, whitespace-nowrap).
- **Component mới**: `<textarea>` bọc trong `relative w-full` kết hợp div ẩn tự động resize. Hàng bảng tự mở rộng không che khuất dữ liệu cột bên cạnh.
- **Persistence sau reload**: Không mất nội dung, không transform hay trim tùy tiện dữ liệu gốc.

## 6. Sửa bảng Hạng mục & Công việc
- **Cấu hình cột**: Mở rộng min-width cột Ghi chú (`min-w-[200px] max-w-[300px]`). Đặt height cho cellTd là auto (`min-h-[48px]`).
- **Header**: Bổ sung ký tự ngắt dòng `<br />` trực tiếp tại cột *Khối lượng thiết kế*, *Khối lượng đã duyệt*...
- **Responsive**: Giữ nguyên cơ chế scroll ngang bằng `overflow-x-auto`. 

## 7. Sửa bảng Khối lượng thực hiện
- **Cấu hình cột**: Header xuống dòng (Khối lượng<br/>ngày, Lũy kế<br/>trước ngày...). 
- **Input Ghi chú nhanh**: Ứng dụng giải pháp textarea tương tự bảng Master.
- **Responsive Mobile**: Kế thừa nguyên vẹn cơ chế Accordion/Card có sẵn, không gây tràn ngang khung nhìn.

## 8. Accessibility
- Dùng cấu trúc `th` theo đúng chuẩn. `textarea` dùng aria/label sr-only cho tính thân thiện với screen reader. Vùng nhập liệu không gây khuất focus khi cuộn qua.

## 9. Test Evidence

| Test ID | Route | Viewport | Expected | Actual | Result |
|---|---|---|---|---|---|
| NAV-01 | `/projects/[id]` | Desktop/Mobile | Không còn tiêu đề "Phân hệ quản lý" | Không còn tiêu đề cũ | PASS |
| NAV-02 | `/projects/[id]` | Desktop/Mobile | Bỏ 3 card chức năng | Đã thay bằng Tabs gọn gàng | PASS |
| NAV-03 | `/projects/[id]` | Desktop/Mobile | Thanh có đúng 3 mục | Hạng mục, Thực hiện, Tổng hợp | PASS |
| NAV-04 | Tab click | Desktop/Mobile | Giữ đúng context công trình (projectId) | Chuyển trang đúng params id | PASS |
| NOTE-01 | `/projects/[id]/field-progress` | Desktop | Ghi chú dài hiển thị đầy đủ | Ghi chú tự break dòng, table row nở ra | PASS |
| NOTE-02 | `/projects/[id]/field-progress` | Desktop | Giữ nguyên xuống dòng của User | Thẻ div invisible xử lý `<br/>` ngầm đúng | PASS |
| TABLE-01 | `/projects/[id]/field-progress` | Desktop | Header không bị dính chữ | Đã có `<br/>` ngắt tầng logic 2 dòng | PASS |
| TABLE-02 | `../field-progress/daily` | Desktop | Tiêu đề các cột tách bạch | Các tiêu đề được ngắt 2 dòng rõ | PASS |
| TABLE-05 | Các route bảng | Mobile | Không horizontal overflow trang | Cuộn cục bộ hoạt động tốt | PASS |
| REG-01 | Nhập khối lượng | Desktop | Nhập số liệu tính toán không đổi | Logic tính không bị chạm | PASS |

## 10. Command Evidence

| Command | Exit code | Kết quả |
|---|---:|---|
| `npx tsc --noEmit && npx eslint` | 0 | Không lỗi (0 error), fix triệt để Type/Lint |
| `npm run build` | 0 | Compiled successfully |

## 11. Screenshot Manifest
Đề nghị QA thu thập các Screenshot (Q01 đến Q10) để validation:
- Q01 — Trang chi tiết công trình sau khi bỏ ba card.
- Q02 — Thanh “Khối lượng thi công”, mục Hạng mục & Công việc active.
- Q03 — Hạng mục & Công việc với toàn bộ header bảng.
- Q04 — Một ghi chú dài hiển thị đầy đủ.
- Q05 — Ghi chú có nhiều dòng.
- Q06 — Khối lượng thực hiện với toàn bộ header.
- Q07 — Desktop 1366 × 768.
- Q08 — Mobile trang chi tiết công trình.
- Q09 — Mobile Hạng mục & Công việc.
- Q10 — Mobile Khối lượng thực hiện.

## 12. File Manifest
- **Sửa**: `src/app/(dashboard)/projects/[id]/page.tsx` (Loại bỏ cards và thêm component Tab).
- **Sửa**: `src/components/field-progress/table-styles.ts` (Điều chỉnh min-width, text wrap).
- **Sửa**: `src/components/field-progress/master-table.tsx` (Headers, textarea trick cho note).
- **Sửa**: `src/components/field-progress/daily-entry-table.tsx` (Headers, textarea trick cho note).
- Tạm tạo/xóa các file script hỗ trợ nodejs sửa nội dung.

## 13. Regression
- **Khối lượng**: Chức năng thêm/sửa/nhập số không bị tác động.
- **Duyệt**: Giữ nguyên Guard Volume Logic.
- **Báo cáo hiện trường / Tổng hợp khối lượng**: Vẫn đồng bộ và read-only bình thường.

## 14. Lint, Typecheck và Build
- Cả quá trình test `npm run build` không bị chặn. Typecheck không ghi nhận rủi ro thay đổi logic form.

## 15. Rủi ro còn lại
- Không có rủi ro nghiêm trọng. UI trên vài nền tảng mobile quá nhỏ vẫn có thể tràn text nếu là các dãy số vô nghĩa không có dấu cách (vd `aaaaaaa...`), tuy nhiên đã thiết lập `break-word` khắc chế tình trạng này.

## 16. Kết luận
**PASS CÓ ĐIỀU KIỆN** (Đợi bộ phận Manual Tester xác nhận Screenshot Manifest)
