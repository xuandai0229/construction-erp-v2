# Complete real-projects test dataset v1

Bộ dữ liệu test toàn hệ thống dựa trên toàn bộ công trình thật đang có trong database dev. Script không tạo, sửa hoặc xóa `Project` và không thay đổi `SystemSetting`.

## Phạm vi

- 9 tài khoản test, đủ toàn bộ `UserRole`.
- Thành viên và nhân sự được phân công trên mọi công trình nguồn.
- WBS, vị trí, bảng khối lượng, khối lượng ngày và phân công công việc.
- Nhật ký ngày/tuần, dòng khối lượng, ảnh và tệp đính kèm.
- Tài liệu, thư mục, vật tư, sổ nhập xuất, tồn kho, đề xuất và phiếu yêu cầu.
- Phê duyệt, thông báo, chat và audit.
- Giám sát tuần mới; các bảng giám sát legacy chỉ được seed tối thiểu để kiểm thử schema/compatibility.
- Kế hoạch và báo cáo an toàn.
- Cơ cấu tổ chức, chức danh, hồ sơ nhân sự, điều động, phân quyền và lịch sử thay đổi.

Mọi bản ghi do bộ seed tạo có ID bắt đầu bằng `tdv1-`. Mã nghiệp vụ bắt đầu bằng `TDV1`. File vật lý nằm tại:

`storage/test-fixtures/complete-real-projects-v1`

Manifest được tạo cùng thư mục sau khi seed thành công.

## Lệnh sử dụng

```powershell
# Chỉ xem kế hoạch, không ghi database
npm run test-data:seed:dry

# Nạp dữ liệu (database dev/non-production)
npm run test-data:seed

# Kiểm tra count, quan hệ, khối lượng, tồn kho, file và bcrypt
npm run test-data:verify

# Xem trước dữ liệu sẽ bị xóa; đây là mặc định an toàn
npm run test-data:cleanup

# Xóa đúng dataset tdv1 và thư mục file riêng
npm run test-data:cleanup:execute
```

Mật khẩu tài khoản test lấy từ `COMPLETE_TEST_DATA_PASSWORD`; nếu không có thì dùng `SEED_DEV_TEST_PASSWORD`. Script không in mật khẩu hoặc hash ra console.

## Tài khoản

| Username | Vai trò |
|---|---|
| `tdv1_admin` | ADMIN |
| `tdv1_director` | DIRECTOR |
| `tdv1_deputy` | DEPUTY_DIRECTOR |
| `tdv1_commander` | CHIEF_COMMANDER |
| `tdv1_manager` | MANAGER |
| `tdv1_engineer` | ENGINEER |
| `tdv1_hse` | STAFF |
| `tdv1_supervision_head` | SUPERVISION_HEAD |
| `tdv1_supervisor` | CONSTRUCTION_SUPERVISOR |

## Cơ chế an toàn

- Từ chối production theo `NODE_ENV`, hostname và database name.
- Seed bắt buộc `--execute`; lệnh dry-run không ghi file/DB.
- Seed ghi DB trong transaction và xóa thư mục file riêng nếu transaction lỗi.
- Seed không chạy chồng khi manifest/dataset đã tồn tại.
- Cleanup mặc định dry-run; execute cần chuỗi xác nhận cố định.
- Cleanup chỉ xóa ID `tdv1-`, ba sequence năm `2099` và đúng thư mục storage của dataset.
- Cleanup dừng nếu phát hiện tài khoản test có bản ghi cascade nằm ngoài dataset.
- Mẫu bảng khối lượng thật đã có sẵn được reuse; cleanup chỉ xóa các dòng `tdv1-` và giữ mẫu gốc.

