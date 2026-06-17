# MATERIAL REQUESTS FINAL UI ALIGNMENT AND LOGIC AUDIT REPORT

## 1. Các lỗi phát hiện từ ảnh UAT
- Form tạo đề xuất desktop: Các cột chưa thẳng hàng, width không đều, modal nhỏ.
- Chi tiết phiếu: Nút "Cập nhật tiến độ" dùng sai ngữ cảnh đối với vật tư.
- Danh sách desktop: Layout khối KPI, search/filter, table chưa đồng bộ container `max-w-[1400px]`.
- Logic trạng thái: Thiếu đồng bộ trạng thái giữa List và Detail. Lỗi thuật toán hiển thị KPI.

## 2. Files changed
- `src/app/(dashboard)/projects/[id]/material-requests/page.tsx`
- `src/components/material-request/material-request-list.tsx`
- `src/components/material-request/material-request-form.tsx`
- `src/components/material-request/material-request-detail.tsx`
- `scripts/take-screenshots-material-requests.ts`

## 3. Cách sửa căn hàng form desktop
- Chỉnh modal lên `max-w-6xl` để có không gian thoáng hơn.
- Áp dụng fixed CSS Grid layout cho cả Header và Body row trên Desktop (`grid-cols-[minmax(260px,1fr)_120px_140px_minmax(260px,340px)_48px]`). Đảm bảo tất cả các element nằm ngay ngắn trên cùng một trục.

## 4. Cách sửa container alignment toàn page
- Thay đổi `max-w-[1600px]` thành `max-w-[1400px] lg:px-8` trong `page.tsx` cho danh sách vật tư.
- Đảm bảo các khối KPI và table đều nằm trong chung một container, không bị vỡ layout ở độ phân giải lớn.

## 5. Cách sửa thuật ngữ
- Sửa nút `Cập nhật tiến độ` thành `Cập nhật cấp/nhận` trong component Detail.

## 6. Audit status list/detail/KPI
- Status Map: `DRAFT`, `REQUESTED`, `PROCESSING`, `ISSUED`, `RECEIVED`, `CANCELLED`.
- Sửa công thức KPI "Đang xử lý": Gộp các phiếu có status `REQUESTED`, `PROCESSING`, `ISSUED` nhằm phản ánh chính xác các phiếu đang cần tác vụ của quản lý công trường.

## 7. Kết quả validate form
- Ngày cần vật tư bắt buộc, cảnh báo nếu nhỏ hơn ngày đề xuất.
- Bắt buộc nhập tên và số lượng vật tư (> 0).
- Validate inline `Đã cấp`, `Đã nhận` không cho phép số âm và cảnh báo `window.confirm` nếu vượt quá số lượng đề xuất ban đầu.

## 8. Kết quả accessibility
- Không còn thông báo lỗi trên Form. Tất cả các inputs đã có `<label className="sr-only">` đối với desktop và label block đối với mobile, đầy đủ `id` và `name`.
- Screenshots lưu log `material-requests-a11y-desktop.txt` và `material-requests-a11y-mobile.txt` pass không có cảnh báo.

## 9. UAT với dữ liệu thật
- Tạo an toàn 5 record mẫu với Script `qa-material-requests-crud-test.ts`. 
- Đã kiểm tra qua Playwright tự động và pass 100%. Không có vấn đề sai lệch trạng thái hoặc tính KPI lỗi.

## 10. Kết quả screenshot
- Các screenshot desktop (`1366`, `1440`, `1536`, `1920`) và mobile (`360`, `390`, `430`) đã được lấy đầy đủ và lưu trong thư mục `docs/qa/screenshots/material-requests-final-alignment/`. 
- Folder screenshots đã được chặn qua `.gitignore`.

## 11. Kết quả test/build
- `npx prisma validate`: **PASS**
- `npx tsc --noEmit`: **PASS**
- `npm run build`: **PASS** (Hoàn thành trong ~3s)
- Script Test DB & Rollup Logic: **PASS**

## 12. Xác nhận không phá Field Progress
- Các ảnh regression test đối với Field Progress (`summary`, `daily`, `master`) đã hiển thị bình thường.
- Script Test UAT Integration cho Field Progress (Rollup, Volume Guard) đều pass 100%.

## 13. Known issues
- Tốc độ tải lần đầu trên môi trường Dev (Cold Start) khi chạy Playwright có thể chậm (hơn 30s) tùy thuộc vào lượng cache của `.next`. Ở production mode sau build không gặp tình trạng này.
- Dropdown menu cho "Công việc liên quan" khi có quá nhiều hạng mục có thể dài, nhưng đã có xử lý `truncate`.
