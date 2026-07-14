# Ranh giới single-tenant của Work Management

## Hiện trạng có hiệu lực

`construction-erp-v2` hiện là một hệ thống single-tenant. Chưa có `Company` model hoặc `companyId` trên `User`, `Project` hay các thực thể mới. Task core vì vậy không cần và không được dùng `companyId`; không có giá trị tenant hard-code hay filter giả lập tenant.

Mọi `User` hợp lệ thuộc hệ thống hiện tại. Nhiệm vụ gắn `Project` phải kiểm tra `ProjectMember` đang active ở service phía server; `ProjectMember` chỉ chứng minh phạm vi công trình, không phải assignee Task. Nhiệm vụ confidential yêu cầu đồng thời quan hệ participant thực tế và permission đặc biệt; không được suy ra quyền từ việc biết ID task.

## Thiết kế hiện tại và giới hạn

- Domain kernel thuần chỉ nhận quan hệ đã được service tải vào context; không truy vấn Prisma và không khẳng định multi-tenant.
- RBAC là quyền thao tác, không phải Department, JobPosition hoặc chức danh nhân sự.
- Department/companywide scope chỉ là contract nghiệp vụ chưa được service/schema kích hoạt. Không cấp mặc định cho role hiện hữu cho đến khi schema và policy server sẵn sàng.
- Task confidentiality phải được kiểm tra ở mọi read/mutation server-side; UI không phải boundary bảo mật.

## Khi bổ sung Company trong tương lai

Các service cần tenant scope rõ ràng: session loading, user/profile/employment, project membership, task/responsibility/delegation/handover, document attachment, notification, audit, search, export và báo cáo.

Các uniqueness đơn-tenant cần được review để chuyển thành composite phù hợp, ví dụ mã Project, mã/slug Department, mã JobPosition, tên template trong phạm vi tenant, reference/sequence của Task, và access grant/delegation có business key theo tenant. Không được tự động biến mọi unique constraint thành composite nếu chưa có ngữ nghĩa business và census dữ liệu.

Migration cần theo thứ tự: tạo `Company`; thêm `companyId` nullable và index cho thực thể gốc; backfill có kiểm soát từ một tenant đã xác minh; xác thực không null/cross-tenant relation; sau đó thêm FK/unique composite và service filters. Mỗi bước cần migration additive, backup/census, rollback bằng compensating migration và kiểm thử IDOR/cross-tenant.

Đây là thiết kế có điểm mở rộng xác định, **không phải** tuyên bố “multi-tenant-ready” tuyệt đối.
