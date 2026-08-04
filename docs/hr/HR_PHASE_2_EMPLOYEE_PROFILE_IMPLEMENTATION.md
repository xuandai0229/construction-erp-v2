# HR Phase 2 — Triển khai hồ sơ nhân viên

## Phạm vi đã hoàn thành

- Workspace `/hr` và các route `/hr/employees`, `/hr/employees/new`, `/hr/employees/[employeeId]`, `/hr/employees/[employeeId]/edit`.
- Tổng quan dùng số liệu database thật; danh sách có phân trang server, tìm kiếm, lọc, sắp xếp và giữ trạng thái trên URL.
- Tạo nhân viên trong transaction cùng mã `NV-YYYY-NNNN`, assignment ban đầu và `EmployeeChangeHistory`.
- Cập nhật hồ sơ có kiểm tra optimistic concurrency; CCCD có action riêng; liên kết User là action riêng; nghỉ việc/lưu trữ là soft state transition.
- Các tab hợp đồng, chứng chỉ, điều động và cảnh báo hiển thị placeholder đúng phạm vi Phase 2.

## Các file chính

- `src/app/hr/` — route, loading, error và not-found.
- `src/app/hr/employees/actions/employee-actions.ts` — server actions tạo, sửa, CCCD, liên kết User, lưu trữ và reveal tạm thời.
- `src/lib/hr/hr-auth-guard.ts` — authenticate, permission và data scope.
- `src/lib/hr/hr-projection.ts` — DTO list/detail và che email/CCCD.
- `src/components/hr/` — workspace tabs, filters, table/card responsive và form.
- `scripts/qa/hr-phase2-runtime.spec.ts` — smoke/runtime responsive.

## Nguồn dữ liệu và giao dịch

`EmployeeOrganizationAssignment` là nguồn duy nhất cho phòng ban/chức danh hiện hành. Không thêm snapshot vào `Employee`. Tạo nhân viên kiểm tra lại User, phòng ban và chức danh trong transaction; lỗi transaction không để lại Employee dở dang.

## Phần chưa thuộc Phase 2

Hợp đồng đầy đủ, upload tài liệu, chứng chỉ, chấm công, GPS, nghỉ phép, tăng ca, lương, thuế/bảo hiểm, tuyển dụng và KPI chưa được tạo giả.
