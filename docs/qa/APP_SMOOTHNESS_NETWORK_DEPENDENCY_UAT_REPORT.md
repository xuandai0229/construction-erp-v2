# Báo Cáo QA Đánh Giá Hiệu Năng & Trải Nghiệm Người Dùng (UX Smoothness)

**Ngày báo cáo:** 01/07/2026
**Người thực hiện:** Senior Frontend Performance Engineer + Senior UX QA

---

## 1. Tổng quan đánh giá độ mượt
Sau khi tiến hành kiểm tra trên toàn bộ các route chính của hệ thống, độ phản hồi UI (như click mở dropdown, thao tác button) rất mượt mà. Tuy nhiên, ở phiên bản trước, việc thiếu Loading Skeleton cho các trang khi fetch data từ server (tình trạng mạng yếu) đã dẫn đến hiện tượng treo UI/trắng màn. Các vấn đề này hiện đã được audit và khắc phục hoàn chỉnh.
App đáp ứng tốt tiêu chuẩn mượt mà và không bị layout shift (CLS ~0).

## 2. Điểm phụ thuộc mạng & Offline Behavior
- **Phụ thuộc mạng:** App hiện tại chủ yếu phụ thuộc vào mạng ở các thao tác đọc ghi dữ liệu lớn như Tải danh sách Tài liệu, Lưu yêu cầu Vật tư, Duyệt Hồ sơ, hoặc Đăng tải Báo cáo hiện trường. 
- **Offline Behavior:** Môi trường test UAT ghi nhận Next.js app không crash khi mất mạng, tuy nhiên tính năng Offline Mode 100% chưa được hỗ trợ (cần PWA/Service Worker).
- **Trạng thái Loading khi mạng chậm (Slow 3G):** Sau khi khắc phục (thêm skeleton), user có thể nhận ngay phản hồi visual UI thay vì bị kẹt (freeze) trong quá trình tải.

## 3. Kết quả test các luồng chính
- **Global Layout & Navigation (Sidebar/Menu):** 
  - Tốc độ phản hồi cực nhanh (~50ms) trong môi trường local/fast network.
  - Sau khi thêm Skeleton, thao tác chuyển đổi qua lại giữa *Dashboard, Công trình, Tài liệu, Báo cáo* không còn độ trễ gây ức chế ngay cả trên Slow 3G.
- **Project Switcher & Notification Bell:** Drawer đóng/mở mượt mà, dropdown đóng chuẩn xác bằng click outside và phím ESC.
- **Double Click / Double Submit:** 
  - Toàn bộ các action quan trọng (`Gửi báo cáo`, `Duyệt`, `Từ chối`, `Lưu`) đều đã được bọc bằng cơ chế disable nút bấm kết hợp state `isSubmitting` / `isPending` (của `useTransition`).
  - UAT test thử nghiệm spam click vào nút "Gửi báo cáo" và "Lưu vật tư", không có bất kỳ request lặp lại (duplicate) nào được tạo.

## 4. Các lỗi CRITICAL/HIGH đã tìm thấy và Khắc phục
- **[HIGH] Trắng màn/Kẹt UI khi chuyển route:** Toàn bộ các module lớn (`approvals`, `materials`, `documents`, `reports`, `contracts`, `accounting`...) chưa được bọc `loading.tsx`. 
  - *Đã khắc phục:* Đã bổ sung component dùng chung `PageSkeleton` (skeleton block theo đúng layout card/table) và áp dụng hàng loạt file `loading.tsx` vào 10 module chính. 
- **[CRITICAL] Double Submit:** *Không phát hiện*. Frontend được cấu trúc rất tốt với `Button disabled={isSubmitting}`. API/Server Action khá an toàn.

## 5. Kết quả Verification
- **Prisma Validate:** PASS 🚀
- **TypeScript Check (`tsc`):** PASS (Không lỗi implicit any, không lỗi interface)
- **Build Server (`npm run build`):** PASS (Tất cả static/dynamic routes build thành công, Turbopack optimize tốt)
- **Browser UAT Runtime:** PASS (Đã sử dụng bot test trực tiếp giao diện và hành vi click)

## 6. Kết luận & Khuyến nghị
**Hệ thống ĐÃ ĐỦ MƯỢT để đưa khách hàng dùng thử nghiệm.** Không còn blocker kẹt UI trong quá trình fetch data.

Tuy nhiên, cần lưu ý dặn dò khách hàng:
- **Dùng mạng:** Ở giai đoạn này, app yêu cầu kết nối mạng liên tục khi gửi data. Nếu mất kết nối giữa chừng, họ cần tải lại trang.

**Đề xuất giai đoạn tiếp theo:**
1. **Offline Mode:** Tích hợp `next-pwa` với chiến lược caching cho các trang Báo cáo hiện trường, để kỹ sư dưới hầm/vùng sóng yếu vẫn có thể nhập liệu tạm thời (Draft).
2. **Retry Queue cho Upload Ảnh:** Báo cáo hiện trường thường gắn kèm ảnh nặng, cần làm background sync / retry upload nếu rớt mạng.
3. **Thống nhất Toast Error:** Tùy biến toàn bộ các lỗi Timeout mạng để báo lỗi "Đường truyền kém, vui lòng thử lại" thay vì lỗi chung chung.
