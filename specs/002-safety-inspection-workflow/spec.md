# Feature Specification: Quản lý kiểm tra ATLĐ, PCCC, VSMT

**Feature Branch**: `002-safety-inspection-workflow`

**Created**: 2026-07-30

**Status**: Draft — chưa được phép triển khai

**Input**: Phân hệ liên hoàn để lập kế hoạch, kiểm tra hiện trường, khắc phục, kiểm tra lại, báo cáo tự đánh giá tuần và xuất đúng hai mẫu chính thức của Công ty CP Xây dựng và Thương mại số 2 Hà Nội.

## User Scenarios & Testing

### User Story 1 - Lập và thực hiện kiểm tra hiện trường (Priority: P1)

Cán bộ ATLĐ lập kế hoạch tuần cho nhiều công trình, bố trí lịch theo ngày/buổi và bắt đầu một phiên kiểm tra từ lịch đó. Tại hiện trường, người dùng đánh giá từng nội dung bằng thao tác nhanh và chỉ cung cấp thông tin chi tiết khi có tồn tại.

**Why this priority**: Đây là nguồn dữ liệu gốc cho toàn bộ vòng đời; không có dữ liệu này thì không thể theo dõi khắc phục hoặc lập báo cáo tin cậy.

**Independent Test**: Một cán bộ ATLĐ có phạm vi hợp lệ hoàn thành một phiên kiểm tra cho một lịch đã duyệt và kết quả xuất hiện chính xác trong danh sách phiên kiểm tra của công trình.

**Acceptance Scenarios**:

1. **Given** kế hoạch tuần đang soạn, **When** cán bộ thêm nhiều công trình vào các buổi khác nhau, **Then** mỗi lịch chỉ nhận công trình thuộc phạm vi của cán bộ và thuộc tuần kế hoạch.
2. **Given** một lịch kiểm tra hợp lệ, **When** cán bộ bắt đầu kiểm tra trên điện thoại, **Then** ngày, buổi, công trình, địa điểm, người kiểm tra và checklist được điền từ lịch nguồn.
3. **Given** một mục được đánh dấu chưa đạt, **When** cán bộ lưu phiên kiểm tra, **Then** một tồn tại có mã duy nhất, người chịu trách nhiệm và hạn khắc phục được tạo cùng lịch sử.

---

### User Story 2 - Khắc phục và kiểm tra lại tồn tại (Priority: P1)

Ban chỉ huy của công trình nhận yêu cầu thuộc đúng công trình của mình, gửi kết quả và bằng chứng khắc phục. Cán bộ ATLĐ độc lập kiểm tra lại để xác nhận hoàn thành, yêu cầu làm lại, gia hạn hoặc nâng mức độ.

**Why this priority**: Tồn tại chỉ có giá trị quản trị khi được giao, theo dõi, kiểm tra lại và lưu vết đầy đủ.

**Independent Test**: Một tồn tại được giao, có kết quả khắc phục, được kiểm tra lại bởi người có thẩm quyền và chỉ được tính hoàn thành sau khi được chấp thuận.

**Acceptance Scenarios**:

1. **Given** tồn tại đã giao, **When** Ban chỉ huy gửi ảnh và kết quả khắc phục, **Then** trạng thái chuyển sang chờ kiểm tra lại và lịch sử không bị thay đổi ngầm.
2. **Given** kết quả đang chờ kiểm tra lại, **When** cán bộ không chấp thuận, **Then** yêu cầu làm lại được lưu kèm lý do và tồn tại không được tính hoàn thành.
3. **Given** người dùng chỉ thuộc công trình A, **When** họ dùng URL hoặc thao tác trực tiếp với tồn tại của công trình B, **Then** hệ thống từ chối truy cập và không trả dữ liệu/bằng chứng.

---

### User Story 3 - Báo cáo tuần và phê duyệt (Priority: P2)

Cán bộ ATLĐ tạo báo cáo tự đánh giá tuần từ dữ liệu kiểm tra, tồn tại và kiểm tra lại thực tế; có thể chỉnh sửa phần tổng hợp trước khi trình duyệt. Ban có thẩm quyền xem, trả lại hoặc duyệt; báo cáo đã khóa không thể sửa.

**Why this priority**: Báo cáo là đầu ra quản trị chính thức nhưng phải là sản phẩm tái sử dụng dữ liệu, không phải nhập lại.

**Independent Test**: Sau các phiên kiểm tra trong tuần, người lập tạo một báo cáo có đúng số dòng theo ngày/buổi/công trình và quy trình duyệt khóa báo cáo đó.

**Acceptance Scenarios**:

1. **Given** một buổi có nhiều công trình đã kiểm tra, **When** tạo báo cáo, **Then** báo cáo có một dòng cho từng công trình thực tế, không gộp mất dữ liệu.
2. **Given** phần tổng hợp được chỉnh sửa, **When** người lập lưu, **Then** hệ thống lưu cả nội dung ban đầu, nội dung sửa, người sửa, thời gian và lý do khi thay đổi số liệu/kết luận.
3. **Given** báo cáo đã khóa, **When** bất kỳ người dùng nào cố cập nhật qua giao diện hoặc đường dẫn trực tiếp, **Then** thay đổi bị từ chối.

---

### User Story 4 - Xuất và lưu biểu mẫu chính thức (Priority: P2)

Người có quyền xuất kế hoạch hoặc báo cáo thành Word/PDF theo đúng mẫu công ty, sau đó lưu bản đã xuất và truy xuất đúng theo phạm vi công trình.

**Why this priority**: Mẫu chính thức là tài liệu nghiệp vụ bắt buộc và không được bị thay đổi câu chữ hay bố cục không được phê duyệt.

**Independent Test**: Dữ liệu kiểm tra đã biết được xuất ra Word/PDF, đối chiếu từng trang với mẫu gốc và chỉ được đánh dấu đạt khi báo cáo sai lệch ở mức chấp nhận đã được phê duyệt.

**Acceptance Scenarios**:

1. **Given** mẫu chính thức đang hiệu lực, **When** xuất tài liệu, **Then** mọi dữ liệu hiển thị xuất phát từ bản ghi thực tế trong hệ thống.
2. **Given** người không có phạm vi công trình, **When** cố tải Word/PDF hoặc ảnh bằng chứng, **Then** hệ thống từ chối cả giao diện lẫn truy cập trực tiếp.

### Edge Cases

- Một buổi có thể không có lịch hoặc có nhiều công trình; báo cáo phải phân biệt từng lần kiểm tra thực tế.
- Tuần mặc định tính từ Thứ Hai đến Chủ nhật; mọi khoảng thời gian khác phải có giải trình và lưu lịch sử duyệt.
- Mất mạng khi kiểm tra không được làm mất dữ liệu đã nhập; các thay đổi phải đồng bộ an toàn khi kết nối lại.
- Tồn tại quá hạn, gia hạn, đình chỉ và kết quả không chấp thuận phải được phân biệt khi tổng hợp.
- Nội dung dài hoặc nhiều ảnh không được làm mất dữ liệu, vỡ tài liệu hoặc che nút hoàn thành trên điện thoại.

## Requirements

### Functional Requirements

- **FR-001**: Hệ thống phải quản lý kế hoạch tuần, lịch theo Sáng/Chiều/Tối, phiên kiểm tra, checklist, tồn tại, khắc phục, kiểm tra lại, báo cáo tuần, duyệt và lưu trữ thành một luồng dữ liệu liên tục.
- **FR-002**: Hệ thống phải dùng đủ nội dung chi tiết trong mẫu kế hoạch và đủ 20 nội dung của mẫu báo cáo; không cho phép bỏ nội dung có trong mẫu.
- **FR-003**: Hệ thống phải tự tính tuần Thứ Hai đến Chủ nhật, cảnh báo lịch trùng và ngày ngoài kỳ; ngoại lệ chỉ được lưu cùng giải trình.
- **FR-004**: Mỗi tồn tại phải có mã duy nhất, hạn xử lý, người/đơn vị chịu trách nhiệm, bằng chứng trước/sau và lịch sử không thể bị sửa hoặc xóa âm thầm.
- **FR-005**: Chỉ kiểm tra lại được xác nhận bởi người có thẩm quyền mới làm tồn tại trở thành đã hoàn thành; trạng thái đúng hạn/quá hạn phải căn cứ hạn và thời điểm hoàn thành thực tế.
- **FR-006**: Tất cả dữ liệu theo công trình phải được kiểm soát trên máy chủ theo vai trò và phạm vi công trình; ẩn nút không được xem là kiểm soát quyền.
- **FR-007**: Báo cáo tuần phải lấy dữ liệu thực tế từ phiên kiểm tra và vòng đời tồn tại; thay đổi phần tổng hợp phải có dấu vết trước/sau và người thực hiện.
- **FR-008**: Tài liệu Word/PDF phải giữ nguyên nội dung gốc của mẫu trừ các trường dữ liệu biến đổi; lỗi chính tả chỉ được chuẩn hóa sau khi chủ hệ thống phê duyệt.
- **FR-009**: Giao diện hiện trường phải bằng tiếng Việt, ưu tiên thao tác một tay, hiển thị tiến độ và không bắt nhập trường chi tiết khi mục đạt.
- **FR-010**: Hệ thống phải thông báo đúng đối tượng và dẫn tới đúng kế hoạch, tồn tại, phiên kiểm tra hoặc báo cáo liên quan.
- **FR-011**: Mọi số liệu xuất hiện ở danh sách, chi tiết, dashboard, báo cáo và tài liệu xuất phải có cùng định nghĩa và cùng nguồn dữ liệu.
- **FR-012**: Không được tạo số liệu giả, placeholder nghiệp vụ hoặc dữ liệu kiểm tra lẫn vào dữ liệu sản xuất.

### Key Entities

- **Kế hoạch kiểm tra**: Thông tin tuần, căn cứ, người lập, trạng thái và lịch kiểm tra liên quan.
- **Lịch kiểm tra**: Một công trình hoặc hoạt động tại một ngày/buổi, là nguồn của phiên kiểm tra thực tế.
- **Phiên kiểm tra và kết quả checklist**: Bản ghi thực tế cho mỗi lần đi kiểm tra và trạng thái từng nội dung.
- **Tồn tại và yêu cầu khắc phục**: Vấn đề phát hiện, trách nhiệm, hạn, bằng chứng, kết quả, kiểm tra lại và lịch sử.
- **Báo cáo tự đánh giá tuần**: Bản tổng hợp có thể truy nguyên về phiên kiểm tra và tồn tại nguồn.
- **Mẫu tài liệu**: Bản mẫu công ty được kiểm soát phiên bản để xuất đúng bố cục.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Cán bộ ATLĐ hoàn thành một mục checklist đạt bằng không quá hai thao tác và hoàn thành một tồn tại có ảnh bằng không quá 90 giây trong điều kiện mạng bình thường.
- **SC-002**: 100% dòng báo cáo tuần có thể truy nguyên về phiên kiểm tra thực tế hoặc bản chỉnh sửa có lý do.
- **SC-003**: 100% thử nghiệm truy cập chéo công trình, tệp đính kèm trái quyền và sửa báo cáo đã khóa bị từ chối ở máy chủ.
- **SC-004**: Bộ golden document bao phủ cả hai mẫu và 100% trang được render/đối chiếu trước khi tuyên bố đạt độ trung thực tài liệu.
- **SC-005**: 100% tồn tại được tính hoàn thành trong báo cáo đều có một kết quả kiểm tra lại chấp thuận.

## Assumptions

- Tài khoản, vai trò, thành viên công trình, kho tài liệu, phê duyệt và thông báo hiện hữu sẽ được dùng lại nếu không làm suy yếu quyền theo công trình.
- Hai mẫu Word được phân tích là nguồn chuẩn duy nhất; mọi văn bản thay thế phải được quản trị bằng phiên bản mẫu và duyệt rõ ràng.
- Bằng chứng ảnh/video/ghi âm chỉ được lưu khi người dùng đã cấp quyền thiết bị tương ứng; vị trí GPS là tùy chọn và phải thể hiện trạng thái quyền.
- Chức năng làm việc ngoại tuyến giữ bản nháp cục bộ cho thiết bị đã đăng nhập, đồng bộ lại có kiểm soát xung đột và không dùng cho dữ liệu giả.
