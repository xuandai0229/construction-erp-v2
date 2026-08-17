# ACCOUNT AND SITE COMMANDER — FINAL CLOSURE REPORT

**Hệ thống:** `construction-erp-v2`  
**Ngày thực hiện:** 13/08/2026 (Asia/Bangkok)  
**Nguồn nghiệp vụ được xác nhận:** `D:\ZaloData\CÁC CT CÁC BAN.xlsx`  
**Kết luận:** **PASS**

## 1. Phạm vi và nguyên tắc dữ liệu

- File Excel được dùng làm nguồn sự thật cho đợt đồng bộ Chỉ huy trưởng này.
- Chỉ nhập 11 tên và 18 quan hệ công trình được Excel xác nhận.
- Không tạo Project mới, không seed dữ liệu demo, không thay đổi nội dung 21 Project hiện hữu.
- Không tạo email, điện thoại, CCCD, ngày sinh, địa chỉ hoặc thông tin cá nhân không có trong nguồn.
- Tất cả 11 tài khoản mới có `email = null`; đăng nhập bằng `username = Employee.code`.
- Chuẩn hóa tên bằng Unicode NFC, khoảng trắng và so khớp không phân biệt hoa/thường trước khi tạo Employee.
- Một người được dùng chung một Employee và một User cho mọi công trình.

## 2. Backup và đối soát trước/sau

### Backup trước migration

- Tệp: `backups/site-commander-account-provisioning/pre-provisioning-2026-08-13T08-57-01-360Z.json`
- SHA-256: `a4258bf372238153055bd2197023bdfafb04229455246f5242ba12700b0bee3f`
- Backup được tạo trước mọi thao tác migration/import.

| Chỉ tiêu | Trước | Sau | Đối soát |
| --- | ---: | ---: | --- |
| User tổng | 5 | 16 | +11 tài khoản CHT |
| User hiện hành | 4 | 15 | +11 tài khoản CHT |
| User đã ngừng sử dụng | 1 | 1 | Không đổi |
| Employee | 1 | 12 | +11 nhân sự thật từ Excel |
| Project | 21 | 21 | Không tăng/giảm |
| Phân công CHT đang hiệu lực | 0 | 18 | +18 từ Excel |
| ProjectMember CHT đang hiệu lực | 0 | 18 | Đồng bộ 1:1 với phân công |
| Employee CHT duy nhất | 0 | 11 | Không duplicate |
| User CHT duy nhất | 0 | 11 | Không duplicate |

Kết quả truy vấn cuối: 11/11 User CHT liên kết đúng Employee; tổng số phân công theo từng người là `1+3+1+2+1+4+1+1+1+2+1 = 18`; tập ProjectMember đang hiệu lực bằng chính xác tập phân công CHT đang hiệu lực.

## 3. Giải thích chênh lệch 4/5 User ban đầu

Tài khoản thứ năm là **Admin System** (`cmsczcskg00009ck57x7moaxt`): `isActive=false`, có `deletedAt=03/08/2026`. Vì vậy DB có 5 User nhưng danh sách tài khoản hiện hành chỉ hiển thị 4. Đây là tài khoản đã ngừng sử dụng, không phải orphan và không bị xóa trong đợt này.

Các tài khoản QA `.local` đã tồn tại trước migration. Bài thử khóa/ngừng/xóa an toàn dùng các tài khoản QA, sau đó phục hồi nguyên trạng từ backup; không dùng chúng làm dữ liệu nghiệp vụ CHT.

## 4. Import Employee và tài khoản

DB ban đầu không có Employee nào trùng 11 tên Excel sau khi chuẩn hóa. Vì vậy 11 Employee được tạo mới, chỉ gồm dữ liệu đã xác nhận: mã nhân viên hệ thống và họ tên; các trường cá nhân chưa biết để `null`. Employee `NV-2026-0001 — Nguyễn Văn A` có sẵn, không liên quan và không bị sửa.

| Chỉ huy trưởng | Employee | Username | Role | Công trình | Assignment | ProjectMember | Login |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| Lê Mạnh Hùng | NV-2026-0002 | NV-2026-0002 | Chỉ huy trưởng | CT-2026-0002 | 1 | 1 | PASS |
| Đoàn Văn Giang | NV-2026-0003 | NV-2026-0003 | Chỉ huy trưởng | CT-2026-0003, 0004, 0005 | 3 | 3 | PASS |
| Lê Trọng Hạ | NV-2026-0004 | NV-2026-0004 | Chỉ huy trưởng | CT-2026-0006 | 1 | 1 | PASS |
| Trần Quốc Dũng | NV-2026-0005 | NV-2026-0005 | Chỉ huy trưởng | CT-2026-0007, 0008 | 2 | 2 | PASS |
| Nguyễn Văn Hưng | NV-2026-0006 | NV-2026-0006 | Chỉ huy trưởng | CT-2026-0009 | 1 | 1 | PASS |
| Phạm Anh Tuấn | NV-2026-0007 | NV-2026-0007 | Chỉ huy trưởng | CT-2026-0010, 0013, 0017, 0018 | 4 | 4 | PASS |
| Nguyễn Đức Mùi | NV-2026-0008 | NV-2026-0008 | Chỉ huy trưởng | CT-2026-0011 | 1 | 1 | PASS |
| Nguyễn Tư Mạnh | NV-2026-0009 | NV-2026-0009 | Chỉ huy trưởng | CT-2026-0012 | 1 | 1 | PASS |
| Lương Văn Công | NV-2026-0010 | NV-2026-0010 | Chỉ huy trưởng | CT-2026-0014 | 1 | 1 | PASS |
| Vũ Hưng | NV-2026-0011 | NV-2026-0011 | Chỉ huy trưởng | CT-2026-0015, 0020 | 2 | 2 | PASS |
| Nguyễn Minh Hùng | NV-2026-0012 | NV-2026-0012 | Chỉ huy trưởng | CT-2026-0016 | 1 | 1 | PASS |

### 18 phân công được nhập

| Project | Chỉ huy trưởng | Nguồn/mapping |
| --- | --- | --- |
| CT-2026-0002 | Lê Mạnh Hùng | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0003 | Đoàn Văn Giang | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0004 | Đoàn Văn Giang | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0005 | Đoàn Văn Giang | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0006 | Lê Trọng Hạ | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0007 | Trần Quốc Dũng | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0008 | Trần Quốc Dũng | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0009 | Nguyễn Văn Hưng | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0010 | Phạm Anh Tuấn | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0011 | Nguyễn Đức Mùi | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0012 | Nguyễn Tư Mạnh | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0013 | Phạm Anh Tuấn | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0014 | Lương Văn Công | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0015 | Vũ Hưng | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0016 | Nguyễn Minh Hùng | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0017 | Phạm Anh Tuấn | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0018 | Phạm Anh Tuấn | Project hiện hữu, khớp dòng nguồn Excel |
| CT-2026-0020 | Vũ Hưng | Project hiện hữu, khớp dòng nguồn Excel |

Các Project CT-2026-0001, CT-2026-0019 và CT-2026-0021 không có tên CHT trong nguồn Excel nên không bị gán giả. Do schema yêu cầu ngày hiệu lực, hệ thống dùng ngày bắt đầu Project nếu có; nếu Project không có ngày bắt đầu thì dùng ngày hiệu lực migration 13/08/2026. Đây là mốc hiệu lực kỹ thuật, không phải dữ liệu cá nhân được suy diễn.

## 5. Schema, authentication và mật khẩu

- Migration `20260813084000_add_user_first_login_password_change`: thêm `mustChangePassword` và `passwordChangedAt`.
- Migration `20260813091500_support_username_only_accounts`: cho phép `User.email` và `Employee.joinedDate` là nullable, không phá tài khoản email hiện hữu.
- Login chấp nhận username hoặc email; username CHT là mã Employee duy nhất.
- Role tài khoản: `UserRole.CHIEF_COMMANDER`; role nghiệp vụ phân công: `ProjectPersonnelRole.code=CHT`.
- Mật khẩu được sinh ngẫu nhiên và hash bằng bcrypt theo cơ chế auth hiện tại.
- Không có mật khẩu plaintext trong DB, import output, test output hoặc báo cáo này.
- Tất cả 11 tài khoản kết thúc kiểm thử ở trạng thái `isActive=true`, `mustChangePassword=true`; Admin dùng chức năng **Đặt lại mật khẩu** để nhận mật khẩu tạm đúng một lần và bàn giao cho người dùng.
- Login lần đầu bị chuyển bắt buộc tới `/change-password`; sau đổi mật khẩu mới truy cập ứng dụng.

## 6. RBAC và đồng bộ hai nguồn

Mô hình đã kiểm chứng:

```text
Employee (1) → User (1) → ProjectMember (N) → Project
       └──────── EmployeeProjectAssignment CHT (N) ────────┘
```

- `EmployeeProjectAssignment` là nguồn nghiệp vụ.
- `ProjectMember` là nguồn kiểm soát truy cập.
- Import và thao tác gán/bỏ công trình dùng transaction; cập nhật hai tập cùng lúc.
- `/projects` lấy Chỉ huy trưởng từ phân công CHT đang hiệu lực, hỗ trợ nhiều CHT và không hard-code tên.
- CHT chỉ được liệt kê/đọc/cập nhật trong project thuộc ProjectMember của chính User.
- API project ngoài scope trả 403 theo policy; query báo cáo và upload ngoài scope cũng bị từ chối trước khi ghi dữ liệu.

## 7. `/users`, vòng đời tài khoản và UI

### Màn hình `/users`

- KPI dùng cùng nguồn với bảng: Tổng tài khoản, Ban Giám đốc, Chỉ huy trưởng, Đang hoạt động.
- Bỏ mô tả implementation detail khỏi UI.
- Admin/Ban Giám đốc hiển thị **Toàn hệ thống**; CHT hiển thị số lượng và danh sách project.
- Tên project dài giới hạn hai dòng, có tooltip/title; chi tiết hiển thị toàn bộ danh sách.
- Search, lọc role/project/status và trạng thái đã ngừng sử dụng dùng cùng tập dữ liệu.
- Menu thao tác: Xem chi tiết, Sửa thông tin, Gán công trình, Đặt lại mật khẩu, Khóa/Mở khóa, Ngừng sử dụng, Xóa tài khoản.
- Dialog nguy hiểm có xác nhận và phản hồi tiếng Việt; không hiển thị enum/error code kỹ thuật.
- Mobile 390 px đã kiểm tra không có horizontal overflow; desktop menu không tràn viewport.
- Browser console: 0 lỗi; không có hydration warning/React warning trong luồng đã kiểm tra.

### Hành động

| Hành động | Kết quả | Bằng chứng |
| --- | --- | --- |
| Khóa tài khoản | PASS | UI xác nhận; `isActive=false`; login bị chặn; assignment/Employee giữ nguyên |
| Mở khóa tài khoản | PASS | UI đổi semantic và phục hồi `isActive=true` |
| Ngừng sử dụng | PASS | Soft-delete/archive, ẩn khỏi hiện hành, xem được qua bộ lọc; không mất lịch sử |
| Xóa an toàn | PASS | Tài khoản QA hoàn toàn mới, không dependency được hard-delete; sau test khôi phục từ backup. Tài khoản có dependency chuyển sang ngừng sử dụng |
| Tự bảo vệ Admin | PASS | Chặn tự khóa/xóa, chặn khóa/xóa Admin cuối cùng và chặn xóa tài khoản hệ thống cần giữ |
| Đặt lại mật khẩu | PASS | Mật khẩu tạm hiển thị một lần; bcrypt; đặt lại `mustChangePassword=true` |
| Gán/bỏ project | PASS | Server Action transaction đồng bộ Assignment ↔ ProjectMember; final reconciliation 18=18 |
| Xem/Sửa | PASS | Drawer/form mở đúng dữ liệu, refresh giữ trạng thái DB |

## 8. Kiểm thử runtime 11 tài khoản

Script E2E authenticated: `scripts/e2e-confirmed-site-commanders.ts`.

Với từng tài khoản đã kiểm tra thực tế qua HTTP runtime:

1. Login bằng username thành công.
2. Bị bắt buộc đổi mật khẩu lần đầu.
3. Đổi mật khẩu thành công và vào ứng dụng.
4. Tên/role đúng.
5. Danh sách project bằng chính xác assignment.
6. Project được giao trả 200.
7. Project ngoài scope trả 403.
8. Query báo cáo và upload ngoài scope trả 403, không ghi file/dữ liệu giả.
9. Endpoint nghiệp vụ project được giao hoạt động theo quyền.
10. Logout và login lại thành công.

Kết quả: `accountsTested=11`, `allLoginPassed=true`, `allRbacPassed=true`, `passwordsLogged=false`. Các trường hợp multi-project Đoàn Văn Giang (3), Trần Quốc Dũng (2), Phạm Anh Tuấn (4), Vũ Hưng (2) đều PASS.

## 9. Quality gate

| Kiểm tra | Kết quả |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS — 0 error; 268 warning tồn tại trong codebase, không chặn build |
| `npm run build` | PASS — Next.js 16.2.7 production build |
| Vitest auth/account/RBAC | PASS — 3 test files, 16/16 tests |
| E2E authenticated 11 CHT | PASS — 11/11 login và RBAC |
| Browser `/users` | PASS |
| Browser `/projects` | PASS |
| Responsive 390 px | PASS |
| Browser console/hydration | PASS — 0 lỗi trong luồng kiểm tra |
| Final DB reconciliation | PASS — 21 Project, 11 CHT, 18 Assignment, 18 ProjectMember, 11 User CHT |

## 10. Release gate

- **11 CHT thật đã có Employee:** PASS
- **18 phân công thật đã vào DB:** PASS
- **11 CHT đã có tài khoản:** PASS
- **1 PERSON = 1 EMPLOYEE = 1 USER:** PASS
- **1 USER = N PROJECTS:** PASS
- **Màn công trình hiện đúng CHT:** PASS
- **Khóa / mở khóa:** PASS
- **Ngừng sử dụng:** PASS
- **Xóa tài khoản tạo nhầm an toàn:** PASS
- **Gán công trình đồng bộ hai nguồn:** PASS
- **RBAC không rò rỉ project:** PASS
- **Không email giả:** PASS
- **Không Employee demo:** PASS
- **Không Project demo:** PASS
- **21 Project thật giữ nguyên:** PASS
- **11 account E2E login:** PASS

# PASS

