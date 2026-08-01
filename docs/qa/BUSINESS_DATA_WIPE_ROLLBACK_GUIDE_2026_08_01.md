# HƯỚNG DẪN KHÔI PHỤC DỮ LIỆU (BUSINESS DATA WIPE ROLLBACK GUIDE)

> [!WARNING]
> Quy trình khôi phục dữ liệu nghiệp vụ này là hoạt động nhạy cảm và có thể ảnh hưởng đến trạng thái vận hành của hệ thống. Phải đảm bảo toàn bộ phiên làm việc của người dùng đã được thông báo trước khi rollback.

## I. THÔNG TIN BẢN BACKUP CHÍNH THỨC
- **Thời gian backup:** `2026-08-01T02:53:28.829Z`
- **File Database Snapshot Backup:** `backups/db_backup_2026-08-01T02-53-28-829Z.json`
- **Manifest Hash:** `cca3c7a46c732d1ae781a0c8b90a0bb497c80f9f5eff56f416ee239b104b725c`
- **Admin được bảo vệ:** ID `cmro...sv56` (Email: `da***@gmail.com`)

---

## II. THỨ TỰ KHÔI PHỤC CHI TIẾT (ROLLBACK PIPELINE)

### Bước 1: Dừng các phiên làm việc và dịch vụ
1. Đảm bảo dừng toàn bộ máy chủ Web (Next.js), Background Workers, hoặc các tiến trình kết nối tới database để tránh lock table hoặc xung đột ghi dữ liệu.
2. Điều kiện dừng: Khi không còn kết nối active nào tới database `construction_erp_v2_qa`.

### Bước 2: Khôi phục Dữ liệu Database (Restore Database)
Do snapshot backup được lưu trữ dưới dạng JSON chứa đầy đủ cấu trúc bản ghi nghiệp vụ trước wipe, quá trình nạp lại dữ liệu cần thực hiện thông qua script nạp dữ liệu snapshot chuyên dụng hoặc bằng cách chuyển đổi file JSON sang lệnh SQL INSERT.
- Thứ tự chèn dữ liệu (Insert Order):
  1. Các bảng cơ sở: `User`, `Project`
  2. Các bảng liên kết cơ sở: `ProjectMember`, `DocumentFolder`, `SystemSetting`
  3. Các bảng nghiệp vụ: `Document`, `SiteReport`, `SiteReportLine`, `SiteReportAttachment`, `SiteReportPhoto`
  4. Các bảng chuyên ngành (Safety, Supervision, Materials, WorkTask, v.v.)
- Kiểm tra khóa ngoại (Foreign Key Integrity Check): Không chèn các bản ghi con trước khi chèn bản ghi cha tương ứng để tránh vi phạm các ràng buộc khóa ngoại (Foreign Key Constraints).

### Bước 3: Khôi phục Storage (Restore File Storage)
1. Xác định vị trí thư mục chứa backup storage vật lý (nếu có).
2. Sao chép đè/khôi phục toàn bộ các tệp tin trong thư mục backup vào thư mục `storage/` tại thư mục gốc của dự án.
3. Đảm bảo quyền đọc/ghi trên thư mục `storage/` cho ứng dụng Next.js.

### Bước 4: Xóa Cache hệ thống (Rollback Cache)
1. Khởi động lại dịch vụ đệm/cache (Redis nếu có cấu hình).
2. Xóa các cache route tĩnh của Next.js bằng cách dọn dẹp thư mục tạm `.next/cache`.

---

## III. HẬU KIỂM VÀ XÁC MINH SAU KHI RESTORE (POST-RESTORE VERIFICATION)

Sau khi hoàn thành rollback dữ liệu, chạy script kiểm chứng độc lập (chỉ đọc) để đảm bảo tính toàn vẹn hệ thống:

```bash
npx tsx scripts/admin/verify-post-restore.ts
```

### Các tiêu chí xác minh:
1. **Kiểm tra Admin:** Đảm bảo duy nhất hoặc các tài khoản Admin của hệ thống hoạt động bình thường, trạng thái `isActive: true` và `deletedAt: null`.
2. **Kiểm tra Khóa ngoại:** Không tồn tại các bản ghi mồ côi (ví dụ: `Document` không trỏ tới `Project` nào hợp lệ).
3. **Số lượng bản ghi:** Kiểm tra số lượng bản ghi các bảng cốt lõi (User, Project, SiteReport) khớp với số lượng mong đợi.

**Điều kiện dừng kiểm chứng:** Nếu script `verify-post-restore.ts` trả về mã lỗi (`exit code 1` hoặc `mismatch`), phải dừng hệ thống và kiểm tra lại log khôi phục.
