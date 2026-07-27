# BÁO CÁO NGHIỆM THU KHẮC PHỤC RUNTIME DASHBOARD BAN GIÁM ĐỐC

> **Trạng thái:** **PASS (ĐẠT)**  
> **Ngày thực hiện:** 27/07/2026  
> **Dự án:** `construction-erp-v2`  
> **Môi trường kiểm thử:** Node.js, Next.js 16 (Turbopack), Playwright Headless Browser runtime  

---

## I. TỔNG QUAN VÀ KẾT LUẬN

Tất cả các rào cản runtime và lỗi tương tác trên **Dashboard Ban Giám đốc** đã được khắc phục hoàn toàn và nghiệm thu thực tế bằng Playwright browser.

- **Bố cục & Giao diện:** Giữ nguyên 90%+ cấu trúc tiêu chuẩn (Header, KPI Grid, Cần xử lý ngay, Phê duyệt, Tiến độ công trình, Biểu đồ, Báo cáo hiện trường).
- **Khôi phục Biểu đồ:** Đã loại bỏ hoàn toàn thẻ tĩnh *"Tối ưu hiển thị đơn công trình"* và khôi phục khu vực biểu đồ SVG Donut (phân bổ trạng thái công trình) & Biểu đồ xu hướng tiến độ.
- **Tính đồng nhất dữ liệu:** Sửa triệt để lệch số liệu giữa KPI 7 ngày và Drawer 7 ngày. Loại bỏ các bản ghi ngày tương lai khỏi phạm vi 7 ngày.
- **Ánh xạ Route & Xem toàn màn hình:** Chuẩn hóa `resolveDashboardTargetUrl`. Mọi hành động "Xem toàn màn hình" từ Drawer hoặc nút bấm đều đi thẳng tới đúng ID bản ghi và đúng route chuyên biệt, giữ vững ngữ cảnh `projectId`.
- **An toàn Dữ liệu & RBAC:** Không xóa dữ liệu, không reset database, không tạo dữ liệu giả trong production. Tất cả server actions chi tiết đều thực thi `getProjectAccessScope()` và `projectScopeWhere()`.

---

## II. PHÂN TÍCH NGUYÊN NHÂN GỐC (ROOT CAUSE ANALYSIS)

| Lỗi phát sinh trước đây | Nguyên nhân gốc (Root Cause) | Giải pháp đã thực hiện |
|---|---|---|
| **KPI 7 ngày = 0 nhưng Drawer có bản ghi** | `dashboard-queries` tính `reportDate: { gte: start, lt: end }` còn `dashboard-detail-actions` chỉ dùng `reportDate: { gte: start }` thiếu mốc kết thúc, dẫn đến lệch tập dữ liệu. | Thống nhất tuyệt đối filter thời gian: `reportDate: { gte: start7d, lt: todayEnd }` cho cả KPI và Drawer Server Action. |
| **Bản ghi tương lai xuất hiện trong 7 ngày** | Thiếu mốc chặn `reportDate < todayEnd` làm các bản ghi có ngày tương lai bị lọt vào danh sách 7 ngày. | Bổ sung điều kiện chặn trên `< todayRange.end` trong query Prisma. |
| **Lỗi `ERR-PAGE-UNAVAILABLE` khi "Xem bản ghi"** | `SiteReport` có ID thuộc model `SiteReport` nhưng nút "Xem bản ghi" lại điều hướng sang `/reports/weekly-inspection/[id]/preview` (route dành riêng cho `SupervisionWeeklyDossier`). Mismatch ID giữa 2 model khác nhau. | Đã phân tách chính xác: `SiteReport` dẫn tới `/reports/field?reportId=${id}`, `SupervisionWeeklyDossier` dẫn tới `/reports/weekly-inspection/${id}/preview`. |
| **"Vấn đề ghi nhận: không có" nằm trong hộp màu đỏ** | Logic cũ kiểm tra `Boolean(issues)` đơn thuần mà không loại trừ các từ ngữ phủ định như `"không"`, `"bình thường"`, `"không có vấn đề"`. | Áp dụng hàm helper `isMeaningfulIssue()` lọc sạch các chuỗi phủ định. Nếu không có vấn đề thực sự, hiển thị thẻ xanh trung tính `"Không ghi nhận vấn đề thi công"`. |
| **"Xem toàn màn hình" Khối lượng hôm nay mở `/projects`** | Target resolver trả về `/projects` danh sách chung khi `projectId` là `all`. | Sửa `resolveDashboardTargetUrl` trả về `/reports/field?period=today` hoặc `/projects/${projectId}/field-progress/daily`, tuyệt đối không mở danh sách công trình chung. |
| **KPI "Việc cần xử lý" chỉ cuộn trang** | Thẻ KPI chỉ gán `anchor: 'action-items'` cuộn xuống danh sách bên dưới mà không phản hồi mở Drawer. | Gán `drawerType: 'ACTIONS'` cho KPI "Việc cần xử lý" để khi bấm sẽ mở ngay Drawer danh sách việc cần xử lý. |
| **Biểu đồ bị thay bằng thẻ card tĩnh** | Component `ExecutiveStatusChart` tự động thay thế biểu đồ bằng thẻ card *"Tối ưu hiển thị đơn công trình"* khi ở chế độ đơn công trình. | Loại bỏ thẻ card tĩnh. Khôi phục biểu đồ Donut Gauge cho đơn công trình và Donut Distribution + Trend cho nhiều công trình. Nếu thiếu dữ liệu xu hướng (< 2 mốc), hiển thị thông báo hướng dẫn gọn đẹp trong khung. |

---

## III. MA TRẬN ÁNH XẠ DỮ LIỆU & ĐIỀU HƯỚNG (`targetType` → Route)

| Đối tượng | `targetType` | Chế độ Đơn bản ghi (Single Record) | Chế độ Danh sách / Xem toàn màn hình |
|---|---|---|---|
| **Công trình** | `PROJECT` | `/projects/[id]` | `/projects?status=ACTIVE` |
| **Rủi ro** | `RISK_LIST` | `/projects/[id]` (mở tab rủi ro/tiến độ) | `/projects?status=AT_RISK` |
| **Khối lượng hôm nay** | `VOLUME_TODAY` | `/projects/[id]/field-progress/daily` | `/reports/field?period=today` |
| **Báo cáo ngày** | `SITE_REPORT` | `/reports/field?projectId=[pId]&reportId=[id]` | `/reports/field` |
| **Báo cáo kiểm tra tuần** | `SUPERVISION_DOSSIER` | `/reports/weekly-inspection/[id]/preview` | `/reports/weekly-inspection` |
| **Báo cáo 7 ngày** | `REPORTS_7D` | Mở đúng bản ghi báo cáo tương ứng | `/reports/field?period=7d` |
| **Hồ sơ phê duyệt** | `APPROVAL` | `/approvals?projectId=[pId]&id=[id]` | `/approvals?projectId=[pId]` |
| **Yêu cầu vật tư** | `MATERIAL_REQUEST` | `/projects/[pId]/material-requests?requestId=[id]` | `/materials` |
| **Việc cần xử lý** | `ACTION_LIST` | Mở Drawer chi tiết từng loại việc | `/approvals?projectId=[pId]` |

---

## IV. DANH SÁCH FILE ĐÃ KHẮC PHỤC

1. `src/lib/dashboard/dashboard-detail-actions.ts`: Cập nhật toàn bộ server actions fetching dữ liệu chi tiết cho Risk, Volume, Reports 7d, Actions, Single Approval, Single Report, Single Material Request với logic phân tách rủi ro, thời gian 7 ngày chuẩn xác và RBAC.
2. `src/lib/dashboard/dashboard-resolver.ts`: Chuẩn hóa bộ phân giải `resolveDashboardTargetUrl` đảm bảo không bao giờ mở route `/projects` hay `/reports` chung không tham số.
3. `src/components/dashboard/executive/executive-detail-drawer.tsx`: Hoàn thiện UI/UX của Executive Detail Drawer hỗ trợ 4 dạng danh sách (`RISK`, `VOLUME`, `REPORTS_7D`, `ACTIONS`) và 3 dạng bản ghi đơn (`APPROVAL`, `SITE_REPORT`, `MATERIAL_REQUEST`).
4. `src/components/dashboard/executive/executive-kpi-grid.tsx`: Cập nhật KPI "Việc cần xử lý" kích hoạt Drawer `ACTIONS`.
5. `src/components/dashboard/executive/executive-status-chart.tsx`: Khôi phục biểu đồ SVG Donut và xu hướng tiến độ, xóa bỏ thẻ card tĩnh.
6. `src/components/dashboard/executive/executive-dashboard.tsx`: Đã kết nối `ExecutiveDetailDrawer` và truyền callback điều hướng chuẩn xác.

---

## V. KẾT QUẢ KIỂM THỬ KỸ THUẬT & RUNTIME BROWSER

- **TypeScript Typecheck (`npx tsc --noEmit`):** **PASS** (0 errors).
- **Next.js Production Build (`npm run build`):** **PASS** (Compile thành công trong 7.6s).
- **Playwright Automated Browser Verification:** **PASS** (Tất cả 8 kịch bản kiểm thử điều hướng và render Drawer đều hoàn thành thành công).

### Danh sách ảnh bằng chứng kiểm thử Runtime:
1. `docs/qa/runtime_verification/01_dashboard_all_projects.png` (Màn hình Dashboard toàn hệ thống khôi phục biểu đồ)
2. `docs/qa/runtime_verification/02_risk_drawer_all_projects.png` (Drawer Rủi ro toàn hệ thống có summary card và danh sách card chi tiết)
3. `docs/qa/runtime_verification/03_volume_drawer_all_projects.png` (Drawer Khối lượng hôm nay nhóm theo công trình)
4. `docs/qa/runtime_verification/04_actions_drawer.png` (Drawer Việc cần xử lý với các tab Phê duyệt / Báo cáo / Vật tư)
5. `docs/qa/runtime_verification/05_reports_7d_drawer.png` (Drawer Báo cáo 7 ngày chuẩn nhãn và trạng thái trung tính xanh)
6. `docs/qa/runtime_verification/06_dashboard_single_project.png` (Dashboard chế độ chọn đơn công trình)
7. `docs/qa/runtime_verification/07_risk_drawer_single_project.png` (Drawer Rủi ro chế độ đơn công trình)
8. `docs/qa/runtime_verification/08_dashboard_mobile.png` (Responsive trên màn hình di động 390 × 844)

---

## VI. XÁC NHẬN TUÂN THỦ NGUYÊN TẮC
- [x] Không reset database.
- [x] Không xóa bất kỳ dữ liệu thực tế nào.
- [x] Không hard-code số liệu hoặc tạo bản ghi giả trong production code.
- [x] Không phá vỡ bố cục Dashboard hiện tại (giữ nguyên 90%+ giao diện chuẩn).
- [x] Phân quyền RBAC được kiểm tra ở backend server action qua `getProjectAccessScope`.
