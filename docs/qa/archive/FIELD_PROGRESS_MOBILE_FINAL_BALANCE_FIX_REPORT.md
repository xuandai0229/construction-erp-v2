# Báo cáo: FIELD PROGRESS MOBILE FINAL BALANCE FIX

## 1. Vấn đề từ ảnh người dùng
Người dùng đã test thật trên `iPhone 12 Pro - 390 x 844` và ghi nhận một số lỗi làm mất cân đối màn hình:
- **Button xuống dòng**: Nút "Nhập theo ngày" và "Tổng hợp khối lượng" quá dài dẫn đến bị rớt dòng xấu trên điện thoại.
- **Box Lưu ý chưa bỏ**: Box cảnh báo màu xanh nhạt chiếm nhiều diện tích trên mobile.
- **Vùng editor hẹp**: Các padding quá dày khiến card hiển thị công việc bị ép vào giữa, hẹp chiều ngang.
- **Chữ label lệch/xấu**: Việc sử dụng quá nhiều `uppercase` kết hợp `tracking-wider` làm các label dài (như Tỷ lệ hoàn thành) bị rớt chữ.
- **UI còn đơn giản**: Giao diện các ô input và viền card có cảm giác chưa được tinh tế.
- **Chưa có bằng chứng Unit Picker**: Cần kiểm chứng Bottom Sheet qua các ảnh chụp màn hình tự động thực tế.

## 2. Files changed
- `src/app/(dashboard)/projects/[id]/field-progress/page.tsx`
- `src/app/(dashboard)/projects/[id]/field-progress/daily/page.tsx`
- `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx`
- `src/components/field-progress/master-table.tsx`

## 3. Đã sửa nút điều hướng thế nào
- Tại cả 3 file `page.tsx` của phân hệ, label nút bấm đã được rút gọn thông minh:
  - `Nhập theo ngày` -> `Nhập khối lượng`
  - `Tổng hợp khối lượng` -> `Tổng hợp`
- Sự thay đổi này vẫn truyền tải đúng ngữ nghĩa mà không còn gây vỡ dòng trên thiết bị hẹp như iPhone SE hoặc iPhone 12 Pro.

## 4. Đã bỏ box Lưu ý trên mobile chưa
- Đã ẩn hoàn toàn dòng cảnh báo "Lưu ý: Cột Lũy kế chỉ cộng các khối lượng đã duyệt" trên mobile bằng Tailwind class `hidden md:flex`. Giao diện màn hình chính giờ đây được đẩy lên cao, dễ quan sát dữ liệu hơn.

## 5. Đã mở rộng editor mobile thế nào
- Ở `master-table.tsx`, padding bao ngoài của vùng editor (vùng chứa các card công việc) đã được giảm từ `p-3` xuống `p-2`.
- Padding của bản thân các card được điều chỉnh linh hoạt: `p-2.5 sm:p-3` nhằm giúp nội dung chiếm được không gian hiển thị tối ưu nhất.

## 6. Đã sửa layout label/card công việc thế nào
- Các class định dạng label như `uppercase tracking-wider` đã được loại bỏ và thay bằng `text-[11px] font-semibold text-slate-600`. Sự thay đổi này không những khắc phục triệt để hiện tượng gãy chữ "TỶ LỆ HOÀN \n THÀNH" mà còn giúp giao diện trông sang và dễ đọc hơn hẳn (chữ hoa thường phối hợp).
- Bố cục lưới 2 cột được tinh chỉnh kích thước khe hở từ `gap-3` sang `gap-2.5`, tiết kiệm diện tích bề ngang.

## 7. Đã cải thiện UI/UX hài hòa hơn thế nào
- Bỏ bớt border cứng ở card `GROUP` và thêm bo viền cho các field Lũy kế/Tỷ lệ hoàn thành với `border-slate-100`.
- Tối ưu màu sắc text trong các input để đạt độ tương phản chuẩn. Nút bấm Unit Picker được bo góc và sử dụng icon Chevron nhỏ gọn chỉ thị cho hành động.

## 8. Unit Picker đã test và có ảnh chưa
- Kịch bản tự động (`take-screenshots.ts` sử dụng Playwright) đã điều khiển viewport iPhone 12 Pro (390x844), tìm nút "Đơn vị" và thực hiện click. 
- Unit Picker đã bật lên đúng dạng Bottom Sheet, có tiêu đề "Chọn đơn vị", liệt kê các chip lựa chọn và trường "Đơn vị khác". 
- Không có lỗi tràn màn hình và UI vuốt tự nhiên.

## 9. Screenshot sau sửa
Các ảnh chụp từ Playwright nằm tại `docs/qa/screenshots/field-progress-mobile-final-balance/`:
- `master-top-390.png` (Nút không còn rớt dòng, đã bỏ box lưu ý)
- `master-editor-390.png` (Label đẹp, khung card rộng rãi, không bị gãy chữ)
- `master-unit-picker-390.png` (Unit picker dạng Bottom Sheet trên 390x844)
- `master-editor-375.png` (Layout chuẩn trên màn nhỏ SE)
- `desktop-master-1366.png` (Desktop không bị ảnh hưởng)

## 10. Test/build result
- Lệnh Test Scripts Database Audit, Rollup, Write-Path, Work-Date, Volume-Guard và UAT Integration: **PASS 100%**.
- TypeScript Compiler: `tsc --noEmit` **PASS 100%** (0 errors).
- Build Next.js: **PASS 100%**.

## 11. Còn lỗi gì không
- Giao diện đã đạt đúng kỳ vọng của file ảnh UAT mà người dùng gửi.
- Hiện không còn lỗi nào trên mobile layout và có thể yên tâm commit nhánh này.
