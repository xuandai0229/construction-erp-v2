# HR PHASE 4 — SỔ TAY QUẢN LÝ RỦI RO VÀ GIẢI PHÁP KHẮC PHỤC (RISK REGISTER)

- **Phiên bản:** 1.0.3
- **Trạng thái:** APPROVED — FROZEN FOR PHASE 4.1
- **Mã nguồn khảo sát (Surveyed Source SHA):** `8c1e1c89084a27eccacc3bc5fdf12aa3af160925`
- **Người phê duyệt:** Chủ dự án

---

## I. SỔ TAY RỦI RO KỸ THUẬT VÀ NGHIỆP VỤ (17 RISKS REGISTER)

| Mã Rủi ro | Tên Rủi ro | Phân loại | Mức độ | Xác suất | Giải pháp Giảm thiểu & Phòng ngừa (Mitigation Plan) |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`RSK-01`** | Race Condition khi điều động đồng thời | Technical / Data | High | Medium | Sử dụng `SET LOCAL lock_timeout = '5s'` và advisory lock trong Prisma transaction kèm retry 3 lần cho lỗi `55P03`/`40001`/`40P01` (DEC-02). |
| **`RSK-02`** | Lỗ hổng IDOR truy cập dữ liệu dự án khác | Security | High | Low | Thực thi 2-Sided Scope Validation (`EmployeeTargetScope` + `ProjectStaffingScope`) trên tất cả Server Actions (DEC-04). |
| **`RSK-03`** | Rò rỉ thông tin PII qua Network API | Security | High | Low | Áp dụng chính sách Assignment Payload Isolation, không trả CMND/CCCD, email cá nhân, lương trong DTO (DEC-08). |
| **`RSK-04`** | Hiệu năng truy vấn Overlap bị chậm khi CSDL lớn | Performance | Medium | Medium | Bổ sung Composite Indexes `@@index([employeeId, status, startDate])` và `@@index([projectId, status, startDate])` trong Sub-phase 4.1 (DEC-07). |
| **`RSK-05`** | Xung đột giữa Điều động Lao động và Quyền phần mềm | Business | Medium | High | Tách biệt hoàn toàn `EmployeeProjectAssignment` và `ProjectMember`, không tự động chèn dữ liệu chéo (DEC-04). |
| **`RSK-06`** | Sai lệch trạng thái do trôi ngày | Data Integrity | High | Medium | Phân tách `allocationEffectiveEnd` đã bắt đầu (`endDate ?? Infinity`) và chưa bắt đầu (`endDate ?? expectedEndDate ?? Infinity`) (DEC-01). |
| **`RSK-07`** | Đổi vai trò làm mất vết lịch sử biến động | Data Integrity | High | Medium | Quy định Immutability Policy: Đóng bản ghi cũ tại ngày $D$, mở bản ghi mới từ ngày $D$ với `endReason` phù hợp (DEC-06). |
| **`RSK-08`** | Nhân sự nghỉ việc nhưng phân công vẫn Active | Operational | Medium | Medium | Quy trình Offboarding kiểm tra phân công hiệu lực và xử lý đóng trong cùng giao dịch CSDL (DEC-09). |
| **`RSK-09`** | Điều động nhân sự vào công trình đã đóng | Business | Medium | Low | Kiểm tra điều kiện `Project.status` bắt buộc phải là `ACTIVE` hoặc `PLANNING`. |
| **`RSK-10`** | Mâu thuẫn Múi giờ khi tính toán khoảng hiệu lực | Technical | Medium | Medium | Thống nhất định dạng chuỗi ngày `YYYY-MM-DD` qua helper `parseVietnamDateOnly` theo múi giờ `Asia/Ho_Chi_Minh` (DEC-03). |
| **`RSK-11`** | Trùng lặp vai trò công trường tại một dự án | Business | Low | Medium | Ràng buộc kiểm tra trong service nếu doanh nghiệp không cho phép trùng vai trò chủ chốt. |
| **`RSK-12`** | Advisory Lock Hash Collision | Performance | Low | Low | Sử dụng `hashtextextended(employeeId, 0)` 64-bit hash để giảm nguy cơ xung đột khóa. |
| **`RSK-13`** | Đếm lặp nhân sự trên Dashboard metrics | UI / Reporting | Medium | Low | Sử dụng `COUNT(DISTINCT employeeId)` khi tính tổng số nhân sự đang cắm tại công trường (DEC-01). |
| **`RSK-14`** | Payload Audit Log phình quá lớn | Storage | Low | Medium | Chỉ lưu snapshot các trường thay đổi trong `beforeData` và `afterData`. |
| **`RSK-15`** | QA E2E Test làm nhiễm bẩn dữ liệu thật | Test Safety | High | Low | Sử dụng môi trường CSDL cách ly hoàn toàn qua `QA_DATABASE_URL` và `setup-qa-env.ts`. |
| **`RSK-16`** | Trình bày bảng bị vỡ khung trên màn hình nhỏ | UI / UX | Low | Medium | Áp dụng thiết kế Responsive Table / Card View cho giao diện thiết bị di động. |
| **`RSK-17`** | Rò rỉ thông tin nhạy cảm khi xuất Excel báo cáo | Security | High | Low | **Quy tắc tuyệt đối (DEC-08):** File Excel xuất ra không chứa thông tin PII nhạy cảm (CMND/CCCD, lương, tài khoản ngân hàng) dưới mọi hình thức, kể cả khi tài khoản có quyền `read_sensitive`. Xem PII chỉ thực hiện tại màn hình hồ sơ nhân sự riêng. |
