# HR PHASE 4 — CHÍNH SÁCH NGÀY HIỆU LỰC VÀ THUẬT TOÁN PHÂN BỔ (EFFECTIVE-DATE & ALLOCATION POLICY)

- **Phiên bản:** 1.0.3
- **Trạng thái:** APPROVED — FROZEN FOR PHASE 4.1
- **Mã nguồn khảo sát (Surveyed Source SHA):** `8c1e1c89084a27eccacc3bc5fdf12aa3af160925`
- **Người phê duyệt:** Chủ dự án

---

## I. CHUẨN KHOẢNG THỜI GIAN HIỆU LỰC VÀ PHÂN TÁCH KÍCH THƯỚC PHÂN BỔ (DEC-01 & DEC-03)

Hệ thống áp dụng chính sách khoảng nửa mở `[startDate, effectiveEnd)` với chuẩn múi giờ Việt Nam `Asia/Ho_Chi_Minh`:
- **`startDate` (Bắt đầu):** Bắt đầu từ **00:00:00** của ngày `startDate` (inclusive).
- **Format Input:** Chuỗi ISO Date-Only nghiêm ngặt `YYYY-MM-DD` (ví dụ: `2026-08-10`).
- **Helper tập trung:** Mọi thao tác xử lý ngày bắt buộc thông qua hai hàm dùng chung `parseVietnamDateOnly(value)` và `formatVietnamDateOnly(value)`. Helper kiểm tra cấu trúc regex, từ chối các ngày không tồn tại trên lịch (ví dụ `2026-02-29`) và đảm bảo chuyển đổi instant CSDL không bị lệch ngày.

### Phân tách hai công thức `effectiveEnd` cho Thuật toán Phân bổ (DEC-01):

1. **Phân công đã bắt đầu (`startDate <= now`):**
   $$\text{allocationEffectiveEnd} = \text{endDate} \,\,\text{??}\,\, \text{Infinity (9999-12-31)}$$
   Trường `expectedEndDate` của phân công đã bắt đầu chỉ dùng cho cảnh báo sắp hết hạn hoặc quá hạn gia hạn. Không tự động giải phóng tỷ lệ phân bổ, không tự động kết thúc hiệu lực lao động và không tự động làm nhân sự biến mất khỏi KPI công trường.

2. **Phân công chưa bắt đầu (`startDate > now`):**
   $$\text{allocationEffectiveEnd} = \text{endDate} \,\,\text{??}\,\, \text{expectedEndDate} \,\,\text{??}\,\, \text{Infinity (9999-12-31)}$$

---

## II. THUẬT TOÁN SWEEP-LINE TÍNH TỔNG PHÂN BỔ THỜI GIAN

### 1. Bài toán
Một nhân viên $E$ có các phân công hiện tại. Cần kiểm tra xem việc tạo mới hoặc điều chỉnh phân công $N$ (với $[S_N, E_N)$ và tỷ lệ $A_N\%$) có làm tổng tỷ lệ phân bổ tại bất kỳ thời điểm nào vượt 100% hay không.

### 2. Các bước xử lý của Thuật toán:

1. **Truy vấn danh sách phân công hiện tại của nhân viên:**
   Lấy tất cả bản ghi `EmployeeProjectAssignment` của nhân viên $E$ có `status = ACTIVE`.
   *Chú ý:* Nếu đây là thao tác cập nhật phân công `currentAssignmentId`, bắt buộc loại trừ `currentAssignmentId` khỏi truy vấn để tránh tự xung đột.

2. **Xác định các mốc sự kiện (Critical Event Points):**
   Gộp tất cả mốc thời gian $S_i$ và $\text{allocationEffectiveEnd}_i$ của các phân công hiện tại cùng với $S_N$ và $E_N$.

3. **Tính tổng phân bổ tại từng khoảng thời gian con:**
   Tại mỗi điểm sự kiện $t_k$ trong khoảng $[S_N, E_N)$, tổng tỷ lệ phân bổ là:
   $$\text{TotalAllocation}(t_k) = A_N + \sum_{i \in \text{ActiveAssignmentsAt}(t_k)} A_i$$

4. **Kiểm tra vi phạm:**
   Nếu tồn tại khoảng $[t_k, t_{k+1})$ có $\text{TotalAllocation}(t_k) > 100\%$, hệ thống kích hoạt cảnh báo vi phạm phân bổ.

---

## III. QUY TRÌNH PHÊ DUYỆT NGOẠI LỆ OVERRIDE

Khi tổng phân bổ vượt 100%:
1. Mặc định hệ thống chặn giao dịch và trả về mã lỗi `ALLOCATION_OVERLAP_EXCEEDED` kèm danh sách các khoảng bị trùng.
2. Nếu người dùng sở hữu quyền `hr:project_allocation:override` và cung cấp chuỗi `overrideReason` (tối thiểu 10 ký tự), giao dịch được phép lưu.
3. Khi thực hiện Override, hệ thống ghi bản ghi Audit Log có cấu trúc bao gồm:
   - `actorId`: ID người phê duyệt.
   - `permissionUsed`: `hr:project_allocation:override`.
   - `employeeId`: ID nhân viên.
   - `overlapDetails`: Danh sách các dự án trùng lịch, khoảng thời gian trùng và tổng % peak allocation.
   - `overrideReason`: Lý do giải trình.
   - `timestamp`: Thời điểm phê duyệt.
