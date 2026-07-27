# BÁO CÁO ĐIỀU TRA NGUYÊN NHÂN GỐC & ĐỒNG BỘ LUỒNG DỮ LIỆU DASHBOARD BAN GIÁM ĐỐC

> **Mục tiêu:** Xác định triệt me mâu thuẫn dữ liệu giữa KPI, Danh sách rút gọn trên Dashboard và Drawer chi tiết ở cả 2 chế độ "Toàn hệ thống" và "Một công trình".  
> **Ngày thực hiện:** 27/07/2026  
> **Repository:** `construction-erp-v2`  

---

## I. BẢNG PHÂN TÍCH QUY TRÌNH LUỒNG DỮ LIỆU HIỆN TẠI (BEFORE FIX)

| Thành phần UI | Hàm / Query nguồn | Scope (`projectId`) | Điều kiện trạng thái (Where clause) | Điều kiện ngày | Limit / Take | Count trước / sau limit | Cache key |
|---|---|---|---|---|---|---|---|
| **KPI "Việc cần xử lý"** | `getDashboardData` (`dashboard-queries.ts`) | `rawProjectId` (nếu có) | Ghép từ `attentionProjects` (trễ tiến độ), `issueReports` (báo cáo có vấn đề), `materialRequests` | Không lọc ngày tương lai | Sliced `slice(0, 5)` | **Lỗi:** Count lấy `actionItems.length` sau khi `slice(0, 5)` (ra 4) | N/A (Server Render) |
| **Card "Cần xử lý ngay"** | `getDashboardData` (`dashboard-queries.ts`) | `rawProjectId` (nếu có) | `data.actionItems.slice(0, 5)` | Không lọc ngày tương lai | Max 5 items | Hiển thị `items.length` (4) | N/A (Server Render) |
| **Drawer "ACTIONS"** | `fetchExecutiveActionItemsDetails` (`dashboard-detail-actions.ts`) | `projectId` (từ Client State) | `approvalRequests` (PENDING), `siteReports` (SUBMITTED/REVISION), `materialRequests` (REQUESTED) | Không lọc ngày tương lai | Take 15 per model | **Lỗi:** Lấy tối đa 15 items per query (ra 5 hoặc 11) | N/A (Server Action) |

---

## II. ĐÁNH GIÁ 11 NGUYÊN NHÂN GỐC ĐÃ XÁC THỰC

1. **Vì sao Toàn hệ thống: KPI = 4, Card = 4, Drawer = 5?**
   - Trong `getDashboardData`, `actionItems` bị cắt `.slice(0, 5)`. KPI card hiển thị `data.actionItems.length` (chỉ đếm mảng đã cắt ra 4 mục).
   - Trong khi đó, `fetchExecutiveActionItemsDetails` trong drawer lại query trực tiếp DB không bị giới hạn 5 mục nên trả về đúng 5 mục thực tế.
   - **Kết luận:** KPI và Card list đếm mảng bị `slice(0, 5)` thay vì đếm `totalCount` thực sự từ DB.

2. **Vì sao Chọn công trình Từ Hiệp: KPI = 4, Card = 4 (chứa Công trình A), nhưng Drawer = 0?**
   - Khi chọn công trình, `projectId` được truyền vào URL `?projectId=...`.
   - Trong `getDashboardData`, query `attentionProjects` sử dụng `visibleProjectWhere` (lấy toàn bộ công trình active trễ tiến độ) nhưng không thêm điều kiện `projectId = rawProjectId` một cách đồng bộ cho tất cả các nhánh query `projectActions`. Do đó "Công trình A" trễ tiến độ bị đẩy vào `actionItems` của Từ Hiệp!
   - Trong khi đó, Server Action `fetchExecutiveActionItemsDetails(projectId)` trong Drawer lại lọc `where: { projectId: selectedProjectId }`, khiến công trình Từ Hiệp (không có việc tồn đọng) trả về 0 item!
   - **Kết luận:** Scope `projectId` không được áp dụng đồng nhất 100% lên tất cả các sub-query trong `getDashboardData`.

3. **Vấn đề báo cáo tương lai (Ví dụ: "Báo cáo ngày 02/08/2026"):**
   - Query `siteReport` hiện tại lọc theo `updatedAt` hoặc không kiểm tra `reportDate > todayEnd`. Do đó các báo cáo nháp/lập trước cho ngày tương lai bị tính vào danh sách "Việc cần xử lý ngay".
   - **Quy tắc mới:** Báo cáo có `reportDate` lớn hơn ngày hiện tại (`> todayEnd`) phải được gắn nhãn phân biệt *"Báo cáo dự kiến ngày..."* và không được tính trùng vào việc trễ hạn.

---

## III. KIẾN TRÚC TỔNG THỂ SAU KHI CHUẨN HÓA (SINGLE SOURCE OF TRUTH)

```
                       [ URL ?projectId=... ]
                                  │
                                  ▼
                resolveExecutiveDashboardScope(session, projectId)
                                  │
           ┌──────────────────────┼──────────────────────┐
           ▼                      ▼                      ▼
  getExecutiveActionItems   fetchExecutiveRisk    fetchExecutiveStatus
     (Single Service)        (Single Service)       (Single Service)
           │                      │                      │
   ┌───────┴───────┐              │                      │
   ▼               ▼              ▼                      ▼
[KPI Count]  [Top 4 Card]   [Drawer List]         [Chart Data]
 (total = 5)  (4/5 việc)     (đủ 5 việc)         (100% Real DB)
```

---

## IV. ĐỀ XUẤT THIẾT KẾ CẢI TỔ BIỂU ĐỒ BAN GIÁM ĐỐC

1. **Biểu đồ Toàn hệ thống (System-Wide Mode):**
   - **Sức khỏe Danh mục (Portfolio Health):** Donut Chart SVG hiển thị tổng số dự án thực ở trung tâm, phân bổ Đúng tiến độ / Cần chú ý / Rủi ro. Click segment mở đúng list đã lọc.
   - **Chênh lệch Kế hoạch - Thực tế (Bullet / Bar Chart):** Hiển thị danh mục công trình xếp hạng theo tỷ lệ trễ tiến độ (công trình trễ nhất xếp trên cùng).

2. **Biểu đồ Một công trình (Single-Project Mode):**
   - **Không lặp thông tin card bên trái:** Tuyệt đối không lặp lại tên công trình, ngày kết thúc, trạng thái ACTIVE thô.
   - **Thanh so sánh Kế hoạch vs Thực tế (Bullet Comparison):**
     - Tiến độ kế hoạch tại ngày hiện tại: `X%`
     - Tiến độ thực tế tại ngày hiện tại: `Y%`
     - Chênh lệch: `(Y - X)%`
   - **Xu hướng tiến độ (Trend):** Hiển thị các mốc nhập liệu thực tế. Nếu chưa đủ 2 mốc ➔ Hiển thị Empty State thông báo *"Chưa đủ mốc dữ liệu nhập liệu để vẽ đường xu hướng"*.
