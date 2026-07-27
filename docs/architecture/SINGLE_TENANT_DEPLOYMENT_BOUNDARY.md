# ADR: Ranh giới single-tenant theo deployment và database

- Trạng thái: Đã chấp thuận cho kiến trúc hiện tại
- Ngày: 2026-07-27
- Phạm vi: `construction-erp-v2`

## Bối cảnh

Schema hiện tại không có `tenantId`, `organizationId` hoặc `companyId` trên `User`, `Project`, `Report` hay `SupervisionWeeklyDossier`. Việc bổ sung multi-tenancy sẽ thay đổi mô hình dữ liệu, phạm vi truy vấn và toàn bộ authorization contract; đó không phải là một phần của nhánh `CONSTRUCTION_SUPERVISOR`.

## Quyết định

1. Mỗi deployment của ứng dụng và database gắn với deployment đó chỉ phục vụ một doanh nghiệp.
2. Mọi `User`, `Project` và dữ liệu nghiệp vụ trong cùng một database được xem là thuộc cùng doanh nghiệp.
3. `CONSTRUCTION_SUPERVISOR` có quyền đọc toàn bộ công trình không bị xóa trong deployment hiện tại. Quyền này được tính động ở mỗi request, không dựa vào `ProjectMember` và vì vậy bao gồm cả công trình tạo mới.
4. Cách ly giữa các doanh nghiệp được bảo đảm bằng ranh giới deployment/database, cấu hình kết nối riêng và quy trình vận hành database; không phải bằng row-level tenant key trong cùng database.
5. `CONSTRUCTION_SUPERVISOR` không có quyền vượt sang deployment hoặc database khác. Không có request hay truy vấn nào của role này được phép chọn hoặc thay đổi database đích.
6. Nếu sản phẩm chuyển sang multi-tenant trong tương lai, phải triển khai một feature riêng để bổ sung tenant key, propagation bắt buộc và row-level isolation trên mọi truy vấn, mutation, export, audit và background job.
7. Cross-tenant row-level test không áp dụng cho kiến trúc single-tenant hiện tại vì không tồn tại tenant row thứ hai trong cùng database.
8. Cross-project, cross-dossier, ownership, direct-ID, foreign-row-ID và deleted-resource tests vẫn bắt buộc. Quyền đọc toàn bộ project không được phép bỏ qua việc xác minh resource tồn tại và các quan hệ category/work item/dossier/row.

## Hệ quả và ràng buộc vận hành

- QA phải dùng database độc lập đã qua safety guard; không được trỏ tiến trình QA vào database ứng dụng.
- Không tự tạo `ProjectMember` cho `CONSTRUCTION_SUPERVISOR`.
- Project scope toàn cục chỉ là quyền đọc dữ liệu nghiệp vụ. Nó không cấp project management, source mutation, document download/share hay weekly review/lock.
- Session không lưu một bản sao quyền dài hạn: role và trạng thái active phải được đọc lại từ database ở request kế tiếp để việc thu hồi có hiệu lực.
- Mọi thay đổi topology deployment/database hoặc yêu cầu dùng chung database cho nhiều doanh nghiệp làm ADR này không còn đủ và bắt buộc kích hoạt feature multi-tenant riêng.

## Phương án không chọn

- Không thêm tenant key cục bộ chỉ cho role mới vì sẽ tạo isolation không đầy đủ và sai cảm giác an toàn.
- Không mô phỏng tenant bằng `ProjectMember`, vì điều đó phá yêu cầu read-all động và tạo membership fan-out.
- Không dùng `null` để biểu diễn project scope toàn cục; code sử dụng union có phân biệt `ALL_PROJECTS`, `PROJECT_IDS` và `NO_PROJECTS`.
