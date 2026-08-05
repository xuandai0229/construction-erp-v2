# HR PHASE 4 — ĐẶC TẢ GIAO DIỆN NGƯỜI DÙNG VÀ TRẢI NGHIỆM (UI/UX SPECIFICATION)

- **Phiên bản:** 1.0.3
- **Trạng thái:** APPROVED — FROZEN FOR PHASE 4.1
- **Mã nguồn khảo sát (Surveyed Source SHA):** `8c1e1c89084a27eccacc3bc5fdf12aa3af160925`
- **Người phê duyệt:** Chủ dự án

---

## I. NGUYÊN TẮC THIẾT KẾ GIAO DIỆN HR WORKSPACE SHELL

1. **Shared Workspace Design System:**
   Giao diện Phase 4 sử dụng khung `HrWorkspaceShell` nhất quán với Phase 2 và Phase 3 (Light Theme, high contrast, typography Inter/Outfit, Lucide icons, responsive layout).
2. **Trình bày dữ liệu trực quan:**
   Bố cục trình bày rõ ràng với Dashboard KPI metrics, Badge trạng thái phân biệt màu sắc, Bảng dữ liệu có phân trang và Hộp thoại tương tác mượt mà.

---

## II. ĐẶC TẢ TRANG TRUNG TÂM ĐIỀU ĐỘNG (`/hr/project-assignments`)

### Bố cục trang bao gồm 4 khu vực chính:

```text
+-----------------------------------------------------------------------------------+
|  HrWorkspaceShell Header (Tiêu đề: "Điều động nhân sự công trình", Subtabs & Actions)|
+-----------------------------------------------------------------------------------+
|  [KPI Metric 1: Tổng nhân sự cắm công trường] [KPI 2: Số công trình có nhân sự] |
|  [KPI Metric 3: Số điều động sắp hết hạn]    [KPI 4: NV chưa có điều động (0%)] |
+-----------------------------------------------------------------------------------+
|  Thanh bộ lọc: [Tìm kiếm Nhân sự/Công trình] [Lọc Dự án] [Lọc Đơn vị] [Lọc Trạng thái]|
+-----------------------------------------------------------------------------------+
|  Bảng dữ liệu điều động                                                            |
|  - Nhân sự | Đơn vị nguồn | Công trình tiếp nhận | Vai trò | % Phân bổ | Ngày | Thao tác|
+-----------------------------------------------------------------------------------+
```

### Chi tiết Badge trạng thái giao diện:
- **`ACTIVE` (đang hiệu lực):** Badge xanh lá (`bg-emerald-50 text-emerald-700 border-emerald-200`) — Phân công đang hoạt động (nếu `startDate > now()` hiển thị nhãn "Kế hoạch").
- **`COMPLETED` (hoàn thành):** Badge xám (`bg-slate-100 text-slate-700 border-slate-200`) — Đã hoàn thành nhiệm vụ đúng hạn.
- **`RELEASED` (đã rút):** Badge cam (`bg-amber-50 text-amber-700 border-amber-200`) — Rút nhân sự sớm hoặc đóng bản ghi để chuyển đổi vai trò.
- **`CANCELLED` (đã hủy):** Badge đỏ (`bg-rose-50 text-rose-700 border-rose-200`) — Đã hủy quyết định điều động.

---

## III. ĐẶC TẢ HỘP THOẠI CẢNH BÁO VƯỢT PHÂN BỔ (`AllocationOverlapDialog`)

Khi Form điều động gửi dữ liệu và nhận phản hồi vi phạm `ALLOCATION_OVERLAP_EXCEEDED`, hệ thống hiển thị Hộp thoại cảnh báo:

- **Tiêu đề Hộp thoại:** "Cảnh báo: Tỷ lệ phân bổ nhân lực vượt 100%" (Header cảnh báo).
- **Nội dung hiển thị:**
  - Tổng tỷ lệ phân bổ đỉnh điểm: ví dụ **130%** (trong khoảng từ 10/08/2026 đến 25/08/2026).
  - Danh sách các công trình đang bị trùng lịch thời gian.
- **Khu vực tương tác:**
  - Nếu người dùng không có quyền Override: Hiển thị thông báo "Bạn không có quyền phê duyệt ngoại lệ phân bổ. Vui lòng điều chỉnh lại ngày hoặc tỷ lệ." -> Nút "Quay lại chỉnh sửa".
  - Nếu người dùng có quyền Override: Hiển thị ô nhập `overrideReason` ("Nhập lý do giải trình phê duyệt ngoại lệ...") -> Nút "Xác nhận Phê duyệt Ngoại lệ".
