# Báo cáo: Documents Phase B1 — Final Review & Local Merge

## 1. Môi trường kiểm thử
- **Repo dùng để chạy local**: `D:\construction-erp-v2` (Repo cũ)
- **Repo sạch nguồn (Clean Repo)**: `D:\construction-erp-v2-clean`
- **Backup trước khi merge**: `D:\construction-erp-v2-BACKUP-before-B1-merge-*` đã được tạo thành công.

## 2. Kết quả Merge Code & Database
- Đã sao chép các file tính năng Phase B1 (bao gồm `permissions.ts`, `metadata-types.ts`, `route.ts`, và giao diện `DocumentViewer`, `DocumentWorkspace`) từ repo sạch sang repo local cũ thành công.
- **Prisma & Migration**: Chạy thành công. Các thay đổi về Enum `DocumentStatus`, `metadata`, `fileHash` đã được đồng bộ vào PostgreSQL cục bộ. 
- **Build**: Quá trình `npm run build` và `tsc --noEmit` hoàn tất không phát sinh lỗi (PASS).

## 3. Kết quả Kiểm thử UAT (Runtime)
- **UI/UX File Card & Viewer**: Đã hiển thị badge trạng thái (SUBMITTED, APPROVED...), loại tài liệu và có giao diện hiển thị Hash + Ghi chú.
- **Upload Flow**: Form Preflight hoạt động chuẩn xác, gửi được `documentType`, `displayName` và `note` cùng với file lên Backend.
- **Tính năng cập nhật thông tin**: Sửa metadata, thêm ghi chú hoạt động tốt. Dữ liệu được lưu trữ dạng JSON và render realtime.
- **Tính năng chuyển trạng thái**: 
  - Nút chuyển trạng thái có validate bắt buộc nhập "Lý do từ chối" khi chọn REJECTED.
  - Sau khi chuyển, UI cập nhật badge màu ngay lập tức.
- **Kiểm soát truy cập (RBAC)**: Chỉ những user có Role phù hợp (dựa vào cấu hình `FULL_ACCESS` hoặc Role liên quan thư mục) mới nhìn thấy các nút sửa/xoá/phê duyệt. Mọi hành động đều được audit log ở backend.
- File PDF và Ảnh tiếp tục preview tốt bằng in-app viewer. File Office và CAD có fallback icon và nút "Tải xuống" rõ ràng.

## 4. Hành vi chống trùng lặp (Hash Duplicate Behavior)
- **Hiện trạng**: API route đã có tính toán mã `fileHash` (SHA-256) và lưu vào database.
- **Behavior khi upload trùng**: Hệ thống **không chặn cứng** mà tiếp tục lưu file và tạo một bản ghi mới có chung mã `fileHash`.
- **Đánh giá**: Điều này tránh gây khó chịu cho user trong giai đoạn UAT nếu họ cố tình muốn tải lại file vào các thư mục hoặc ngữ cảnh khác nhau. 
- **Đề xuất nâng cấp**: Thay vì block cứng, có thể cảnh báo trên UI "Tệp tin này đã có sẵn", hoặc xử lý phía Storage theo dạng Deduplication (chỉ giữ 1 file vật lý trên MinIO/S3, và tạo nhiều dòng DB reference) để tối ưu dung lượng.

## 5. Rủi ro Git Safety tại Repo Local (Rất quan trọng)
Qua kiểm tra bằng lệnh `git log --all -- storage`:
- Thư mục `storage/` hiện không còn bị track (`git ls-files` rỗng).
- Tuy nhiên, **Git history cũ vẫn còn giữ thông tin của thư mục này** (có commit `3b69485` và `e128057` từng track file upload).
- Repo này hiện vẫn đang nối với remote `origin` cũ.
- **CẢNH BÁO MỨC ĐỘ CAO**: Không bao giờ được dùng lệnh `git push` ở repo `D:\construction-erp-v2` này lên GitHub do rủi ro lộ dữ liệu upload cũ.

## 6. Kết luận
- **Phase B1 code**: PASS (Hoàn thiện ổn định).
- **Local repo usable**: PASS (Rất tốt để dùng nội bộ, dev tiếp, test UAT).
- **Commit local**: CÓ (Có thể commit để lưu checkpoint).
- **Push repo cũ (`D:\construction-erp-v2`)**: **KHÔNG (Tuyệt đối không)**.
- **Production**: NO-GO (Vẫn chờ Phase C để đấu nối AWS S3/MinIO thay vì ghi file vào `.next/server` hoặc Local filesystem).
