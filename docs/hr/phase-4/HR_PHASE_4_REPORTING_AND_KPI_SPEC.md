# HR PHASE 4 — BÁO CÁO THỐNG KÊ VÀ CHỈ SỐ KPI ĐIỀU ĐỘNG (REPORTING & KPI SPECIFICATION)

- **Phiên bản:** 1.0.3
- **Trạng thái:** APPROVED — FROZEN FOR PHASE 4.1
- **Mã nguồn khảo sát (Surveyed Source SHA):** `8c1e1c89084a27eccacc3bc5fdf12aa3af160925`
- **Người phê duyệt:** Chủ dự án

---

## I. CHỈ SỐ KPI VẬN HÀNH ĐIỀU ĐỘNG (KEY PERFORMANCE INDICATORS - DEC-01)

1. **`KPI_TOTAL_ON_SITE` (Tổng nhân sự cắm tại công trường):**
   Đếm số lượng nhân sự duy nhất (`COUNT(DISTINCT employeeId)`) đang có phân công thực tế tại thời điểm $T$:
   $$\text{status} = \text{'ACTIVE'} \quad\text{AND}\quad \text{startDate} \le T \quad\text{AND}\quad (\text{endDate IS NULL} \,\,\text{OR}\,\, T < \text{endDate})$$

2. **`KPI_ACTIVE_PROJECTS_STAFFED` (Số công trình đã có nhân sự điều động):**
   Đếm số công trình duy nhất có nhân sự điều động đang hiệu lực tại thời điểm $T$.

3. **`KPI_EXPIRING_ASSIGNMENTS_30D` (Số điều động sắp hết hạn trong 30 ngày):**
   Đếm các phân công đang hiệu lực có `expectedEndDate` trong khoảng từ $T$ đến $T + 30 \text{ ngày}$.

4. **`KPI_UNASSIGNED_EMPLOYEES` (Số nhân sự chưa có điều động):**
   Đếm số nhân sự đang hiệu lực thuộc khối kỹ thuật/công trình hiện không có bất kỳ bản ghi điều động công trình nào đang hoạt động tại thời điểm $T$ (0 assignments).

5. **`KPI_EMPLOYEES_WITH_AVAILABLE_CAPACITY` (Số nhân sự còn dung lượng phân bổ):**
   Đếm số nhân sự đang có phân công hiệu lực tại thời điểm $T$ nhưng tổng tỷ lệ phân bổ thời gian dưới 100% (ví dụ: đang làm 50% tại Dự án A, còn trống 50%).

6. **`KPI_OVERALLOCATED_EMPLOYEES` (Số nhân sự bị phân bổ vượt 100%):**
   Đếm số nhân sự đang có tổng phân bổ thời gian giao thoa > 100%.

---

## II. ĐẶC TẢ BÁO CÁO THỐNG KÊ (REPORTING SPECIFICATIONS - DEC-08 & DEC-10)

### 1. Báo cáo Danh sách Nhân sự Điều động theo Dự án (Project Staffing Roll)
- **Mục đích:** Cung cấp cho Ban Giám đốc và Quản lý Dự án bức tranh toàn cảnh về lực lượng nhân sự tại từng công trình.
- **Trường xuất:** Mã dự án, Tên dự án, Mã NV, Họ tên, Đơn vị gốc, Vai trò công trường, Ngày bắt đầu, Ngày dự kiến kết thúc, Tỷ lệ phân bổ %, Số quyết định, Trạng thái, Lý do kết thúc.
- **Bảo mật PII (DEC-08):** Báo cáo tuyệt đối không xuất các cột CMND/CCCD, tài khoản ngân hàng, mức lương, email cá nhân hay địa chỉ thường trú.
- **Định dạng (DEC-10):** Xuất file Excel (.xlsx) chuẩn mẫu công ty. Xuất PDF tạm hoãn.

### 2. Báo cáo Ma trận Phân bổ Nhân lực (Manpower Matrix Report)
- **Mục đích:** Hiển thị ma trận nhân sự (Dòng: Nhân sự, Cột: các tháng trong năm), ô giao nhau hiển thị tên công trình và % phân bổ.
- **Tính năng:** Phát hiện nhanh các khoảng thời gian nhân sự bị "trống lịch" hoặc "quá tải".
