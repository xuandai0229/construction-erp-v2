# HR Open Decisions — Các Quyết Định Nghiệp Vụ Mặc Định & Cần Xác Nhận

**Phiên bản:** 1.0.0  
**Tác giả:** Kiến Trúc Sư Trưởng ERP  
**Trạng thái:** Chính thức  

---

## I. CÁC QUYẾT ĐỊNH NGHIỆP VỤ MẶC ĐỊNH ĐÃ KHÓA (DEFAULT LOCKED DECISIONS)

1. **Độc Lập User và Employee:** User và Employee hoàn toàn độc lập, liên kết tùy chọn 1–1. Vô hiệu hóa hoặc xóa User không làm mất hồ sơ Employee.
2. **Tài Khoản Không Tự Động Tạo:** Không tự động tạo tài khoản hệ thống khi khởi tạo hồ sơ nhân sự mới.
3. **Mã Nhân Viên Sinh Tự Động:** Mã nhân viên do backend sinh định dạng `NV-YYYY-NNNN`, không trùng, không thay đổi sau khi tạo, không tái sử dụng.
4. **Lịch Sử Lựa Chọn Ngày (Effective-Date):** Cơ cấu tổ chức, phòng ban, chức danh, bổ nhiệm quản lý và phân công công trình đều áp dụng quy tắc lịch sử ngày hiệu lực `[startDate, endDate)`.
5. **Cây Tổ Chức N-Cấp Linh Hoạt:** Cây sơ đồ tổ chức linh hoạt, không hard-code cấp bậc.
6. **Một Đơn Vị Chính, Nhiều Công Trình:** Nhân viên có tối đa 1 phòng ban chính tại một thời điểm nhưng có thể tham gia nhiều công trình đồng thời với các vai trò hiện trường khác nhau.
7. **Vai Trò Công Trình Là Danh Mục Cấu Hình:** Không dùng enum cứng cho các vị trí công trường.
8. **Bảo Vệ PII Mã Hóa:** CCCD/CMND bắt buộc mã hóa AES-256-GCM + Blind Index.
9. **Cảnh Báo Hết Hạn Ở MVP:** Chứng chỉ và hợp đồng sắp hết hạn chỉ hiển thị cảnh báo tại MVP, chưa tự động khóa tác nghiệp.
10. **Tạm Dừng Phân Hệ Lương Khi Chưa Được Duyệt:** Phân hệ Lương, thuế, bảo hiểm tạm thời không tự mã hóa công thức nếu chưa có tài liệu nghiệp vụ được xác nhận chính thức.
11. **Không URL Công Khai Cho File HR:** Không dùng đường dẫn công khai cho tài liệu nhân sự.
12. **Một Mục Sidebar Duy Nhất:** Chỉ có một mục "Quản lý nhân sự" duy nhất trên Sidebar hệ thống.

---

## II. CÁC CÂU HỎI MỞ CẦN CHỦ DỰ ÁN XÁC NHẬN CHO CÁC PHASE TỚI

1. **Q1 (Cho Phase 4 - Điều Động Công Trình):** Có cho phép Trưởng công trình (Chỉ huy trưởng) tự ý rút nhân sự khỏi công trình của mình hay bắt buộc phải thông qua phê duyệt của Phòng Nhân sự?
2. **Q2 (Cho Phase 4):** Trường hợp tổng tỷ lệ phân bổ thời gian của 1 kỹ sư đạt 120% (do tham gia 2 công trình song song), ai có quyền bấm "Override" để phê duyệt phân bổ này?
3. **Q3 (Cho Phase 5 - Hợp Đồng):** Số hợp đồng lao động sẽ nhập thủ công theo số văn thư công ty hay sinh tự động theo quy tắc hệ thống?
4. **Q4 (Cho Phase 6 - Chấm Công):** Có áp dụng quy tắc trừ công tự động khi đi muộn / về sớm không hay giữ nguyên số giờ thực tế để quản lý xem xét?
