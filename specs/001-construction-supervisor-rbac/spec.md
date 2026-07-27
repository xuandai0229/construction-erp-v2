# Feature Specification: Cán bộ giám sát công trình

**Feature Branch**: `main`

**Created**: 2026-07-27

**Status**: Approved for implementation

**Input**: Bổ sung nhánh quyền Cán bộ giám sát công trình với phạm vi đọc toàn doanh nghiệp và quyền tác giả hồ sơ Kiểm tra & kế hoạch tuần.

## User Scenarios & Testing

### User Story 1 - Theo dõi toàn bộ công trình ở chế độ chỉ xem (Priority: P1)

Là Cán bộ giám sát công trình, người dùng xem được toàn bộ dữ liệu nghiệp vụ của mọi công trình trong doanh nghiệp mà không cần được thêm làm thành viên công trình, kể cả công trình tạo mới sau khi cấp quyền.

**Why this priority**: Đây là mục đích cốt lõi của vai trò và là điều kiện để giám sát độc lập trên phạm vi doanh nghiệp.

**Independent Test**: Cấp vai trò cho một người không có membership, xác nhận người đó xem được hai công trình cùng doanh nghiệp và không xem được công trình ngoài doanh nghiệp; mọi thao tác ghi trực tiếp đều bị từ chối.

**Acceptance Scenarios**:

1. **Given** Cán bộ giám sát không thuộc bất kỳ công trình nào, **When** mở danh sách và chi tiết công trình cùng doanh nghiệp, **Then** mọi công trình và dữ liệu nghiệp vụ được hiển thị ở chế độ chỉ xem.
2. **Given** một công trình mới được tạo, **When** Cán bộ giám sát tải lại danh sách, **Then** công trình mới tự động xuất hiện mà không sinh membership.
3. **Given** Cán bộ giám sát gửi yêu cầu tạo, sửa, xóa, duyệt hoặc đổi trạng thái dữ liệu nguồn, **When** yêu cầu tới máy chủ, **Then** yêu cầu bị từ chối và không có dữ liệu, phiên bản hoặc lịch sử nào bị thay đổi.
4. **Given** một tài nguyên ngoài phạm vi doanh nghiệp, **When** người dùng thay ID trên URL hoặc request, **Then** hệ thống không trả dữ liệu hoặc file và không tiết lộ metadata.

---

### User Story 2 - Lập hồ sơ Kiểm tra & kế hoạch tuần của chính mình (Priority: P1)

Là Cán bộ giám sát công trình, người dùng tạo và hoàn thiện hồ sơ theo tuần gồm nhiều công trình trên từng dòng, lưu nháp, xem trước, xuất/in và gửi hồ sơ của chính mình.

**Why this priority**: Đây là ngoại lệ tác nghiệp duy nhất của vai trò chỉ đọc.

**Independent Test**: Người dùng tạo một hồ sơ mới, chọn các công trình khác nhau trên các dòng, lưu và autosave bản nháp, xuất bản của mình rồi gửi thành công mà dữ liệu nguồn công trình không thay đổi.

**Acceptance Scenarios**:

1. **Given** vai trò hợp lệ, **When** tạo hồ sơ cho một tuần, **Then** hồ sơ thuộc người lập và không bắt buộc chọn một công trình ở cấp hồ sơ.
2. **Given** hồ sơ của chính mình ở DRAFT, **When** thêm/sửa/sắp xếp/xóa dòng hoặc autosave, **Then** dữ liệu hồ sơ được lưu với kiểm soát xung đột và dữ liệu nguồn không đổi.
3. **Given** hồ sơ hợp lệ ở DRAFT, **When** gửi, **Then** trạng thái thành SUBMITTED đúng một lần và bản gửi không còn chỉnh sửa được.
4. **Given** hồ sơ của chính mình, **When** xem trước, xuất Word/PDF hoặc in theo trạng thái cho phép, **Then** nội dung được cung cấp; thao tác tương tự trên hồ sơ người khác bị từ chối trừ xem trước.

---

### User Story 3 - Sửa và gửi lại hồ sơ bị yêu cầu chỉnh sửa (Priority: P1)

Là người lập, Cán bộ giám sát có thể sửa hồ sơ của chính mình khi hồ sơ ở REVISION_REQUIRED và gửi lại, nhưng không thể tự thay đổi hồ sơ đã gửi về bản nháp.

**Why this priority**: Vòng phản hồi là phần bắt buộc của quy trình hồ sơ tuần.

**Independent Test**: Reviewer chuyển hồ sơ sang REVISION_REQUIRED; người lập sửa và gửi lại được, nhưng bị từ chối khi thử sửa hồ sơ SUBMITTED, APPROVED hoặc LOCKED.

**Acceptance Scenarios**:

1. **Given** hồ sơ của người dùng ở REVISION_REQUIRED, **When** chỉnh sửa và gửi lại, **Then** phiên bản hợp lệ được lưu và trạng thái trở lại SUBMITTED.
2. **Given** hồ sơ ở SUBMITTED, APPROVED hoặc LOCKED, **When** người lập gọi autosave hoặc update trực tiếp, **Then** máy chủ từ chối mà không tăng lock version hay tạo revision.
3. **Given** hai bản chỉnh sửa đồng thời, **When** bản cũ lưu sau, **Then** hệ thống báo xung đột có kiểm soát và không ghi đè bản mới.

---

### User Story 4 - Xem hồ sơ của cán bộ khác mà không có quyền xử lý (Priority: P2)

Cán bộ giám sát xem danh sách và nội dung hồ sơ tuần của những người lập khác ở chế độ chỉ đọc, nhưng không sửa, xóa, xuất/in hoặc thực hiện quyết định workflow.

**Why this priority**: Tạo minh bạch giám sát mà không làm lẫn quyền tác giả và quyền phê duyệt.

**Independent Test**: Mở hồ sơ do người khác lập, xác nhận banner chỉ xem và mọi request ghi, xuất hoặc review đều bị máy chủ từ chối.

**Acceptance Scenarios**:

1. **Given** hồ sơ do người khác lập, **When** Cán bộ giám sát mở chi tiết, **Then** nội dung và lịch sử hiển thị cùng thông báo chỉ xem.
2. **Given** hồ sơ do người khác lập, **When** gọi update, delete, submit, export hoặc print trực tiếp, **Then** máy chủ từ chối và không mutation.
3. **Given** bất kỳ hồ sơ nào, **When** Cán bộ giám sát gọi approve, reject, request revision, lock hoặc unlock, **Then** máy chủ luôn từ chối.

### Edge Cases

- Vai trò bị thu hồi trong khi phiên làm việc còn mở; request kế tiếp phải dùng quyền hiện tại từ máy chủ.
- ID dòng thuộc hồ sơ khác, công trình khác hoặc ngoài phạm vi bị chèn vào payload.
- Autosave đến muộn sau khi hồ sơ đã được gửi.
- Gửi lặp hoặc lưu từ hai tab có cùng lock version.
- Tài nguyên bị xóa, ngừng hoạt động hoặc đổi trạng thái trong khi đang mở.
- Hồ sơ LOCKED chỉ được xem; không xuất/in và không được mở khóa bởi Cán bộ giám sát.
- Tài liệu công trình được preview nhưng không được tải xuống hoặc chia sẻ.

## Requirements

### Functional Requirements

- **FR-001**: Hệ thống MUST cung cấp vai trò riêng “Cán bộ giám sát công trình”, không đồng nhất hoặc kế thừa quyền của Trưởng ban giám sát, người phê duyệt hay quản trị viên.
- **FR-002**: Vai trò MUST xem mọi công trình hiện tại và tương lai trong phạm vi doanh nghiệp mà không cần hoặc tự động tạo membership.
- **FR-003**: Hệ thống MUST giữ ranh giới doanh nghiệp trước khi áp dụng phạm vi toàn công trình và chống truy cập bằng thay ID.
- **FR-004**: Vai trò MUST chỉ đọc dữ liệu nguồn thuộc công trình: tổng quan, hoạt động, thành viên, hạng mục, công việc, khối lượng, tiến độ, báo cáo hiện trường, vật tư, nhiệm vụ, tài liệu preview, phê duyệt và dữ liệu tài chính vận hành được phép.
- **FR-005**: Vai trò MUST bị từ chối mọi create/update/delete/submit/approve/reject/request-revision/lock/unlock đối với dữ liệu nguồn; tài liệu không được download/share mặc định.
- **FR-006**: Hệ thống MUST cho phép vai trò xem danh sách và preview mọi hồ sơ Kiểm tra & kế hoạch tuần trong phạm vi hợp lệ.
- **FR-007**: Hệ thống MUST cho phép vai trò tạo hồ sơ tuần của chính mình, chọn công trình theo từng dòng và dùng mọi công trình trong phạm vi hợp lệ.
- **FR-008**: Người lập MUST chỉ sửa/lưu/autosave hồ sơ của chính mình ở DRAFT hoặc REVISION_REQUIRED.
- **FR-009**: Người lập MUST gửi hồ sơ DRAFT và gửi lại hồ sơ REVISION_REQUIRED; SUBMITTED, APPROVED và LOCKED không được sửa.
- **FR-010**: Người lập MUST preview, xuất Word/PDF và in hồ sơ của chính mình theo state matrix; hồ sơ người khác chỉ preview mặc định.
- **FR-011**: Cán bộ giám sát MUST luôn bị từ chối review, approve, reject, request revision, lock và unlock, kể cả qua request trực tiếp.
- **FR-012**: Máy chủ MUST xác thực quyền, ownership, trạng thái, phạm vi công trình và quan hệ row/dossier trước mọi read, mutation, preview và export.
- **FR-013**: Autosave MUST không hạ trạng thái; stale update, row injection và double submit MUST không tạo mutation hoặc revision sai.
- **FR-014**: UI MUST biểu diễn dữ liệu nguồn và hồ sơ người khác ở chế độ chỉ xem, ẩn hành động ghi và hiển thị banner phù hợp nhưng không thay thế server guard.
- **FR-015**: Việc cấp/thu hồi vai trò, mở dữ liệu quan trọng, export/in, submit/resubmit, từ chối truy cập và xung đột MUST được audit mà không ghi bí mật.
- **FR-016**: Thu hồi vai trò MUST có hiệu lực theo cơ chế session hiện tại và bảo toàn hồ sơ đã lập.
- **FR-017**: Các vai trò hiện hữu MUST giữ nguyên quyền và phạm vi nghiệp vụ.
- **FR-018**: Mọi thay đổi dữ liệu lưu trữ MUST additive, không sửa migration cũ và không triển khai vào cơ sở dữ liệu ứng dụng trong quá trình QA chưa được phê duyệt.
- **FR-019**: Kiểm thử MUST bao gồm policy, request trực tiếp có session, UI đa kích thước, export, thu hồi vai trò, cross-project/cross-boundary, regression và cleanup bằng exact fixture IDs trên QA độc lập.

### Key Entities

- **Cán bộ giám sát công trình**: Người dùng có phạm vi đọc toàn công trình và quyền tác giả hồ sơ tuần, không phải thành viên công trình hay reviewer.
- **Hồ sơ Kiểm tra & kế hoạch tuần**: Hồ sơ cấp doanh nghiệp do một người lập, có nhiều dòng tham chiếu các công trình khác nhau và state machine DRAFT → SUBMITTED → APPROVED → LOCKED hoặc SUBMITTED → REVISION_REQUIRED → SUBMITTED.
- **Dòng hồ sơ tuần**: Bản ghi thuộc duy nhất một hồ sơ, có thể tham chiếu công trình/hạng mục/công việc nhưng không làm thay đổi dữ liệu nguồn.
- **Phạm vi công trình**: Tập mọi công trình thuộc doanh nghiệp hiện tại, được tính động và không dựa trên membership.
- **Audit event**: Bằng chứng không nhạy cảm về cấp/thu hồi quyền, đọc dữ liệu quan trọng, workflow, export/in, denial và conflict.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% công trình hiện tại và công trình tạo mới trong phạm vi hợp lệ xuất hiện cho Cán bộ giám sát mà số membership phát sinh bằng 0.
- **SC-002**: 100% request ghi dữ liệu nguồn trong ma trận kiểm thử bị từ chối và không thay đổi dữ liệu, lock version hoặc lịch sử.
- **SC-003**: 100% thao tác hợp lệ trên hồ sơ tuần của chính người lập hoàn tất đúng state matrix; 100% thao tác trên hồ sơ người khác hoặc review bị từ chối.
- **SC-004**: 100% thử nghiệm thay project, dossier hoặc row ID ngoài phạm vi không trả dữ liệu/file và không mutation.
- **SC-005**: Sau khi thu hồi vai trò và làm mới session theo cơ chế hiện có, 100% quyền đọc toàn công trình và tạo hồ sơ mới bị mất trong request kế tiếp.
- **SC-006**: Các vai trò hiện hữu vượt qua toàn bộ regression matrix mà không mất hoặc nhận thêm quyền ngoài ý muốn.
- **SC-007**: Giao diện tại 1440×900, 1280×800, 1024×768, 768×1024 và 390×844 không lộ hành động trái quyền và không tràn ngang ở luồng chính.

## Assumptions

- Hệ thống xác định ranh giới doanh nghiệp theo mô hình tenant hiện hữu; nếu repository hiện là single-tenant thì deployment/database boundary là tenant và kiểm thử cross-tenant phải được ghi rõ là chưa khả dụng thay vì giả lập sai.
- Preview hồ sơ người khác được phép; Word/PDF/In hồ sơ người khác bị từ chối theo mặc định an toàn.
- Xóa hồ sơ của chính mình không phải mục tiêu bắt buộc nếu workflow hiện hữu không cung cấp quyền đó an toàn; không bao giờ cho phép xóa hồ sơ người khác.
- Cơ chế permission, session, audit và state machine hiện hữu được mở rộng, không thay thế.
