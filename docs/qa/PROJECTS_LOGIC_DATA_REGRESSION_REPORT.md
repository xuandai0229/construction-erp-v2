# PROJECTS LOGIC & DATA REGRESSION AUDIT REPORT
**Thời gian**: Hôm nay
**Mục tiêu**: Kiểm tra tính toàn vẹn của nghiệp vụ, sự chính xác của cơ sở dữ liệu, và tác động của các thay đổi UI (Autocomplete/Global Layout) lên chức năng thực tế của module Projects & Field Progress.

---

## 1. DỮ LIỆU THỰC TẾ & HIỆN TRẠNG DB
Thông qua truy vấn DB thực tế:
- **Số lượng Project Active**: 2
- **Số lượng Project Deleted**: 6
- **Các Project Active hiện tại**:
  1. `[ct_01] Công Trình test` (Investor: Chủ đầu tư test1)
  2. `[CT-001] Du an Nguyen Trai` (Investor: )

*Đề xuất*: Cần chuẩn hóa, thay thế các tên thô/test thành dữ liệu demo chuyên nghiệp trước khi show cho khách hàng.

## 2. KẾT QUẢ KIỂM THỬ AUTOMATION BẰNG PLAYWRIGHT + DB VERIFICATION

Toàn bộ quy trình CRUD đã được chạy bằng script tự động (tương tác trực tiếp trên trình duyệt bằng Playwright và query DB bằng `pg`). 
Mã dữ liệu test đã sử dụng: `QA_TEST_PROJECT_001` (Đã được cleanup tự động sau khi chạy).

### A. Danh sách Công trình & Tìm kiếm
- **Tìm kiếm theo Tên/Mã**: UI phản hồi mượt mà, query param được đẩy lên URL (VD: `?q=QA_TEST`).
- **Lọc theo Trạng thái**: Các filter hoạt động chuẩn xác, kết hợp với tìm kiếm mà không mất trạng thái. 
- **Kết luận**: **PASS**

### B. Thêm mới Công trình (`/projects/new`)
- **Tạo thành công**: Project được tạo với đầy đủ trường thông tin. Chuyển hướng (Redirect) về đúng trang chi tiết `/projects/[id]`.
- **Database**: Xác thực `id` và `code` được lưu chính xác.
- **Auto-create Folders**: Đã tự động sinh chính xác 8 thư mục tài liệu mặc định (`01_Hợp đồng`, `02_Bản vẽ`, `03_Dự toán`, `04_Nghiệm thu`, `05_Hóa đơn`, `06_Thanh toán`, `07_Hình ảnh hiện trường`, `08_Báo cáo ngày`).
- **AuditLog**: Đã ghi nhận bản ghi `action = 'CREATE'` trên thực thể `Project`.
- **Kết luận**: **PASS**

### C. Cập nhật Công trình (`/projects/[id]/edit`)
- **Chỉnh sửa**: Cập nhật thành công trường Tên dự án.
- **Database**: Xác thực trường `name` đã thay đổi, các trường khác giữ nguyên.
- **AuditLog**: Đã ghi nhận bản ghi `action = 'UPDATE'` với data trước và sau khi đổi.
- **Kết luận**: **PASS**

### D. Xóa Công trình (Soft Delete)
- **Cơ chế**: Click nút Xóa hiển thị Confirm Dialog -> Xác nhận -> Redirect về danh sách.
- **Database**: Không có lệnh `DELETE` cứng nào xảy ra trên bảng `Project`. Trường `deletedAt` được gắn timestamp.
- **Thư mục liên quan**: Bảng `DocumentFolder` không bị mất dữ liệu (giữ nguyên cấu trúc phục vụ restore).
- **Kết luận**: **PASS**

### E. Field Progress (Sau vá lỗi Autocomplete)
- Các input nhập khối lượng có gắn `autoComplete="off"` và `inputMode="decimal"` hoạt động trơn tru. Bàn phím số tự nảy trên mobile, không bị trình duyệt che khuất bởi pop-up tự động điền.
- DB `FieldProgressEntry` được ghi nhận đúng chuẩn số thập phân.
- **Kết luận**: **PASS**

### F. Phân quyền (RBAC) & Bảo mật
- Backend dùng `requireProjectAccess` ở toàn bộ Server Actions. Không thể gọi trực tiếp API để sửa dự án nếu user không đủ role `ADMIN` hoặc không được phân công làm `CHIEF_COMMANDER`.
- **Kết luận**: **PASS**

## 3. KIỂM TRA KỸ THUẬT (CI/CD STATUS)
- Prisma DB Schema Validation: **PASS** (Không lỗi schema)
- TypeScript Compilation: **PASS** (Zero TS errors)
- Next.js Production Build: **PASS** (Build tĩnh & dynamic pages thành công)
- DevTools Console: **PASS** (Hydration ổn định, mọi cảnh báo Autocomplete đã biến mất).

---

## TỔNG KẾT & ĐÁNH GIÁ CHUNG
| Hạng mục | Trạng thái | Đánh giá |
| -------- | ---------- | -------- |
| **Giao diện (UI/UX)** | **PASS** | Sạch sẽ, Responsive, không tràn viền, Autocomplete chuẩn. |
| **Luồng Logic** | **PASS** | Create/Read/Update/Soft Delete + Audit Logs hoạt động khép kín. |
| **Dữ liệu (DB)** | **PASS** | Không sửa schema, bảo toàn RBAC, không lưu rác. Dữ liệu rác của script test đã được dọn sạch. |

✅ **KẾT LUẬN CUỐI CÙNG**: Toàn bộ hệ thống (UI + Logic nền tảng) đã **SẴN SÀNG CHỐT UAT VÀ ĐƯA LÊN PRODUCTION**. Cần dọn dẹp nốt 2 dự án test thủ công trong DB nếu muốn môi trường Production hoàn toàn sạch sẽ.
