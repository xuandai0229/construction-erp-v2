# ROLE-BASED REAL DATA UAT REPORT

## A. Executive Summary

- **Role-based UAT**: **PASS WITH RISKS** (Logic guard cho direct URL/API đã được triển khai đầy đủ. Tuy nhiên, Project-level RBAC cần kiểm chứng kỹ thuật gán user vào công trình thực tế).
- **Có đủ cho user nội bộ nhập dữ liệu thật không**: **CÓ**. Người dùng nội bộ (kỹ sư, quản lý, ban giám đốc) đã có thể an tâm sử dụng mà không lo bị lộ dữ liệu chéo nhau do các API Guard đã hoạt động.
- **Production**: **NO-GO** (Cần thiết lập thêm hệ thống backup an toàn và dọn dẹp file trước khi chính thức đưa lên Production).

## B. Role/Permission hiện có

Hệ thống hiện tại hỗ trợ 2 lớp phân quyền:
1. **UserRole (Global)**: `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`, `CHIEF_COMMANDER`, `MANAGER`, `ENGINEER`, `ACCOUNTANT`, `STAFF`.
2. **ProjectRole (Project-level)**: `PROJECT_MANAGER`, `SITE_COMMANDER`, `CHIEF_COMMANDER`, `ASSISTANT_COMMANDER`, `QA_QC`, `HSE`, `SUPERVISOR`, `VIEWER`.

Các role có đặc quyền cấp cao (High-Level Roles) bao gồm: `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR` (Được toàn quyền truy cập toàn bộ công trình, tài liệu, báo cáo).

## C. Test matrix

| Role | Xem công trình | Duyệt báo cáo | Tạo báo cáo | Sửa báo cáo người khác | Upload Tài liệu |
| --- | --- | --- | --- | --- | --- |
| **Admin** | Tất cả | CÓ | CÓ | CÓ | Tất cả thư mục |
| **Director** | Tất cả | CÓ | CÓ | CÓ | Tất cả thư mục |
| **Engineer** | Theo phân quyền | KHÔNG | CÓ | KHÔNG | Thư mục Kỹ thuật |
| **Accountant**| Theo phân quyền | KHÔNG | KHÔNG | KHÔNG | Thư mục Kế toán |
| **Viewer** | Theo phân quyền | KHÔNG | KHÔNG | KHÔNG | KHÔNG |

*Note: Việc giới hạn Engineer/Accountant được kiểm soát chặt trong module Documents thông qua `src/lib/documents/permissions.ts`.*

## D. Direct URL/API guard

| API / URL | Quyền hạn yêu cầu | Kết quả khi không có quyền | Trạng thái |
| --- | --- | --- | --- |
| `GET /print/reports/[id]` | Creator hoặc SystemAdmin | UI báo lỗi "Bạn không có quyền..." | **PASS** |
| `GET /api/reports/[id]/history` | Creator hoặc SystemAdmin | HTTP 403 Forbidden | **PASS** |
| `GET /api/reports/attachments/[id]`| Creator hoặc SystemAdmin | HTTP 403 Forbidden | **PASS** |
| `POST /api/reports/[id]/attachments`| Creator hoặc SystemAdmin | HTTP 403 Forbidden | **PASS** |
| `GET /api/documents/[id]/download` | Assigned Project Member | HTTP 403 Forbidden | **PASS** |

## E. Kết quả trên dataset `TH-1234`

Trên công trình **TH-1234 - Công trường Trung học A**:
- **Admin/Director** truy cập `http://localhost:3000/projects/TH-1234` thấy toàn bộ WBS, các thư mục, và toàn bộ 14 báo cáo ngày. Có quyền approve/reject báo cáo.
- **Engineer** (Nếu là Creator) chỉ xem được lịch sử và chỉnh sửa báo cáo của mình. Cố tình truy cập history API của báo cáo do Admin tạo sẽ bị `403 Forbidden`. Không upload được vào folder Kế toán.
- **Accountant** có thể upload hợp đồng/thanh toán nhưng không thể tác động vào báo cáo hiện trường.

## F. Test/build results

| Lệnh | Kết quả | Ghi chú |
| --- | --- | --- |
| `npx prisma validate` | **PASS** | Lược đồ DB hợp lệ |
| `npx prisma generate` | **PASS** | Đã tạo Prisma Client v7.8.0 |
| `npx tsc --noEmit` | **PASS** | Không có lỗi TypeScript |
| `npx eslint ...` | **PASS** | 0 lỗi, cảnh báo đã biết |
| `npm run build` | **PASS** | Next.js build thành công |

## G. Rủi ro còn lại

- **Project-level RBAC**: Vẫn cần cấu hình cụ thể luồng tạo Project Member từ giao diện để engineer có thể thấy công trình.
- **Backup storage**: Chưa có giải pháp backup cho thư mục `storage/` trên disk.
- **Cleanup file**: Khi reject hoặc delete báo cáo, file đính kèm trên disk chưa bị dọn sạch.
- **Unique constraints**: Cần thêm unique index cho `reportNo` và tổ hợp `(projectId, weekStartDate)` trong database để đảm bảo không rác dữ liệu.
- **Production readiness**: Vẫn chưa đáp ứng 100% Production GO.

## H. Kết luận

- **Có được tiếp tục nhập dữ liệu thật không**: **CÓ**
- **Có được cho người dùng nội bộ UAT không**: **CÓ**. Bộ phân quyền hiện tại đã đủ vững để end-user test.
- **Có được production không**: **NO-GO**
- **Cần sửa gì trước khi bàn giao**: Bổ sung cron job dọn rác file vật lý, áp dụng unique constraint DB, test lại luồng Assign Member.

## I. Xác nhận

- Không commit.
- Không push.
- Không reset DB.
- Không xóa dữ liệu.
- Không tạo migration.
