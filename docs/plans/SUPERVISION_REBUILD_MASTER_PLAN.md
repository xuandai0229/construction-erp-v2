# KẾ HOẠCH XÂY LẠI PHÂN HỆ GIÁM SÁT (SUPERVISION REBUILD MASTER PLAN)

## 1. Mục tiêu
- Xây dựng lại hoàn toàn **Phân hệ Giám sát** trên nền tảng kiến trúc mới, loại bỏ các nợ kỹ thuật của phiên bản legacy.
- Nâng cấp **UI/UX mới** đáp ứng tính tiện dụng và chuyên nghiệp.
- **Nhật ký độc lập**: Quản lý nhật ký giám sát hoạt động như một module riêng biệt.
- **Tồn tại và khắc phục**: Luồng quản lý lỗi và khắc phục chuyên sâu.
- **Báo cáo giám sát**: Tạo báo cáo dễ dàng, minh bạch.
- Tích hợp **Hai mẫu Word chính thức** của công ty chuẩn hóa.
- Tái cấu trúc **Dashboard theo ảnh mẫu** đã phê duyệt.
- Tăng cường **Liên thông dữ liệu** với các module khác (Công trình, Vật tư, Nhiệm vụ).

## 2. Domain mới (Đề xuất Model)
*(Lưu ý: Chỉ đề xuất, chưa sửa schema)*
- **SupervisionLog** (Thay thế Visit/Schedule)
- **SupervisionIssue** (Thay thế Finding)
- **SupervisionReport** (Thay thế WeeklyPackage)
- **SupervisionReportItem** (Thay thế TransitionCheck, ProgressAssessment, QuantityVerification)
- **SupervisionTemplate** (Thay thế mẫu Word)

## 3. Giai đoạn triển khai
- **Phase 1 — Chốt nghiệp vụ**: Xác nhận flow cuối cùng với Trưởng ban.
- **Phase 2 — Chốt thiết kế UI/UX**: Review mockup cho Dashboard và form.
- **Phase 3 — Thiết kế database và migration**: Viết schema mới và ánh xạ dữ liệu cũ.
- **Phase 4 — Nhật ký giám sát**: Code chức năng tạo, duyệt nhật ký.
- **Phase 5 — Tồn tại và khắc phục**: Code tính năng theo dõi, đánh giá lỗi và giao việc.
- **Phase 6 — Dashboard**: Dựng giao diện báo cáo tổng hợp.
- **Phase 7 — Báo cáo giám sát**: Quản lý các gói báo cáo tuần/tháng.
- **Phase 8 — Word templates**: Tích hợp module gen docx (docxtemplater).
- **Phase 9 — QA và cutover**: Test toàn diện, diễn tập chuyển đổi dữ liệu và release.

## 4. Dữ liệu legacy
- **Audit**: Kiểm tra số lượng và tính toàn vẹn của dữ liệu trong các bảng legacy.
- **Mapping**: Viết logic map các field cũ (ví dụ: `SupervisionFinding`) sang model mới (`SupervisionIssue`).
- **Chuyển đổi (Migration)**: Chạy script migrate data một lần duy nhất trong quá trình cutover.
- **Archive**: Backup data trước khi drop các bảng cũ.
- **Rollback**: Có script để khôi phục trạng thái cũ nếu gặp sự cố.

## 5. Không xử lý tài khoản
**Ghi chú quan trọng:** Phần tài khoản Trưởng ban giám sát (`SUPERVISION_HEAD` và `SupervisionScope`) được **giữ nguyên** ở dạng legacy và sẽ được xử lý bằng yêu cầu riêng của người dùng ở một ticket khác. Không có thay đổi code liên quan đến tài khoản trong kế hoạch xây lại hiện tại.
