# EXECUTIVE DASHBOARD INTERACTION AUDIT MATRIX

## 1. Giới Thiệu
Tài liệu này kiểm kê toàn bộ các điểm tương tác trên giao diện Dashboard dành cho Ban Giám đốc (`ExecutiveDashboard`), xác định các lỗi tương tác/điều hướng hiện tại, và quy định hành vi đúng theo phạm vi (Toàn hệ thống vs Một công trình cụ thể).

---

## 2. Ma Trận Kiểm Kê Tương Tác (Audit Matrix)

| Thành phần | Phạm vi | Hành vi hiện tại | Hành vi đúng | Route / Component đích | Target Type / ID | Bộ lọc cần giữ | Quyền cần kiểm tra | Trạng thái audit |
|---|---|---|---|---|---|---|---|---|
| **KPI: Tổng công trình** | Toàn hệ thống | Mở `/projects` chung | Mở danh sách công trình đang hoạt động thuộc phạm vi | `/projects?status=ACTIVE` | `PROJECT_LIST` | `status=ACTIVE` | `canViewCompanyWideDashboard` | ⚠️ Cần chuẩn hóa query |
| **KPI: Tổng công trình** | Một công trình | Mở `/projects` chung | Mở chi tiết hoặc drawer của đúng công trình đang chọn | `/projects/[projectId]` hoặc Project Drawer | `PROJECT` / `projectId` | `projectId` | Scope công trình | ❌ Sai (Làm mất `projectId`) |
| **KPI: Việc cần xử lý** | Cả 2 phạm vi | Mở `#action-items` nhưng bị header che hoặc không phản hồi rõ | Cuộn mượt tới `#action-items` có offset `scroll-margin-top` + highlight 1.5s hoặc mở Action Drawer | Anchor `#action-items` / Action Drawer | `ACTION_LIST` | `projectId` (nếu có) | RBAC | ⚠️ Cần bổ sung offset & highlight |
| **KPI: Khối lượng thực hiện (hôm nay)** | Toàn hệ thống | Mở `/projects` chung | Mở drawer/trang tổng hợp khối lượng thi công hôm nay của các công trình | Volume Drawer / `/projects/[id]/field-progress/daily` | `VOLUME_TODAY` | `date=today` | Scope công trình | ❌ Sai (Mở danh sách công trình) |
| **KPI: Khối lượng thực hiện (hôm nay)** | Một công trình | Mở `/projects` chung | Mở đúng trang nhập/xem khối lượng hôm nay của công trình đang chọn | `/projects/[projectId]/field-progress/daily` | `VOLUME_TODAY` / `projectId` | `projectId`, `date=today` | Scope công trình | ❌ Sai (Mở danh sách công trình) |
| **KPI: Báo cáo / Tài liệu (7 ngày)** | Toàn hệ thống | Mở `/reports` trang chọn loại chung | Mở drawer/trang danh sách báo cáo & tài liệu trong 7 ngày gần nhất | Reports 7D Drawer / `/reports?period=7d` | `REPORTS_7D` | `period=7d` | Scope công trình | ❌ Sai (Mở trang chọn loại) |
| **KPI: Báo cáo / Tài liệu (7 ngày)** | Một công trình | Mở `/reports` trang chọn loại chung | Mở danh sách báo cáo 7 ngày của công trình đang chọn | `/reports?projectId=[projectId]&period=7d` | `REPORTS_7D` / `projectId` | `projectId`, `period=7d` | Scope công trình | ❌ Sai (Làm mất `projectId`) |
| **KPI: Công trình rủi ro** | Toàn hệ thống | Mở `/projects` chung không giải thích | Mở Risk Drawer giải thích nguyên nhân rủi ro, mức độ, nguồn phát hiện, người phụ trách, hạn xử lý | Risk Detail Drawer | `RISK_LIST` | `health=AT_RISK` | Scope công trình | ❌ Sai (Không có nguyên nhân) |
| **KPI: Công trình rủi ro** | Một công trình | Mở `/projects` chung không giải thích | Mở Risk Drawer giải thích nguyên nhân rủi ro cụ thể của công trình đang chọn | Risk Detail Drawer | `RISK_LIST` / `projectId` | `projectId` | Scope công trình | ❌ Sai (Mở trang danh sách) |
| **Header Badge: Việc cần xử lý** | Cả 2 phạm vi | Link `#action-items` bị header che | Cuộn mượt với offset header + highlight | Anchor `#action-items` | `ACTION_LIST` | `projectId` (nếu có) | RBAC | ⚠️ Cần bổ sung offset |
| **Header Badge: Công trình rủi ro** | Cả 2 phạm vi | Link `#project-progress` | Cuộn mượt tới `#project-progress` hoặc mở Risk Drawer | Anchor `#project-progress` / Risk Drawer | `RISK_LIST` | `projectId` (nếu có) | Scope công trình | ⚠️ Cần chuẩn hóa |
| **Header Badge: Hồ sơ chờ duyệt** | Toàn hệ thống | Mở `/approvals?status=PENDING` | Mở Trung tâm phê duyệt giữ đúng điều kiện lọc PENDING | `/approvals?status=PENDING` | `APPROVAL_LIST` | `status=PENDING` | `canViewApprovalDashboard` |  Đã đúng |
| **Header Badge: Hồ sơ chờ duyệt** | Một công trình | Mở `/approvals?projectId=...` | Mở Trung tâm phê duyệt giữ đúng `projectId` | `/approvals?projectId=[projectId]&status=PENDING` | `APPROVAL_LIST` / `projectId` | `projectId`, `status=PENDING` | Scope công trình |  Đã đúng |
| **Dòng "Cần xử lý ngay": Báo cáo ngày** | Cả 2 phạm vi | Mở `/reports` chung | Mở chi tiết Báo cáo ngày trong Drawer hoặc route báo cáo tương ứng theo `targetId` | Detail Drawer / `/reports/field/[targetId]` | `SITE_REPORT` / `targetId` | `projectId` | Scope công trình | ❌ Sai (Mở `/reports` chung) |
| **Dòng "Cần xử lý ngay": Báo cáo tuần** | Cả 2 phạm vi | Mở `/reports` chung | Mở chi tiết Báo cáo tuần trong Drawer hoặc `/reports/weekly-inspection/[targetId]/preview` | Detail Drawer / `/reports/weekly-inspection/[id]/preview` | `WEEKLY_REPORT` / `targetId` | `projectId` | Scope công trình | ❌ Sai (Mở `/reports` chung) |
| **Dòng "Cần xử lý ngay": Yêu cầu vật tư** | Cả 2 phạm vi | Mở `/projects/[projectId]/material-requests` | Mở chi tiết Yêu cầu vật tư theo `targetId` trong Drawer hoặc route chi tiết | Material Detail Drawer / `/projects/[projectId]/material-requests` | `MATERIAL_REQUEST` / `targetId` | `projectId` | Quyền vật tư | ⚠️ Cần mở đúng bản ghi |
| **Dòng "Cần xử lý ngay": Rủi ro tiến độ** | Cả 2 phạm vi | Mở `/projects/[projectId]` | Mở Risk Detail Drawer giải thích lý do chậm tiến độ của công trình | Risk Detail Drawer | `PROJECT_RISK` / `projectId` | `projectId` | Scope công trình | ⚠️ Cần thêm giải thích rủi ro |
| **Dòng "Phê duyệt chờ xử lý": Hồ sơ** | Cả 2 phạm vi | Mở `/approvals` chung | Mở Approval Detail Drawer cho phép xem tóm tắt & phê duyệt/từ chối tại chỗ | Approval Detail Drawer | `APPROVAL` / `targetId` | `projectId` | Quyền duyệt | ❌ Sai (Mở trang danh sách chung) |
| **"Xem tất cả" Cần xử lý ngay** | Cả 2 phạm vi | Mở `/dashboard/actions` | Mở trang/drawer danh sách việc cần xử lý giữ nguyên `projectId` | `/dashboard/actions` / Action Drawer | `ACTION_LIST` | `projectId` (nếu có) | RBAC | ⚠️ Cần giữ `projectId` |
| **"Xem tất cả" Phê duyệt** | Cả 2 phạm vi | Mở `/approvals` | Mở Trung tâm phê duyệt giữ nguyên `projectId` | `/approvals?projectId=[projectId]` | `APPROVAL_LIST` | `projectId` (nếu có) | `canViewApprovalDashboard` | ⚠️ Cần giữ `projectId` |
| **"Xem tất cả" Tiến độ công trình** | Cả 2 phạm vi | Mở `#` | Mở danh sách tiến độ toàn bộ công trình hoặc Drawer tổng quan | `/projects` / Progress Drawer | `PROGRESS_LIST` | `projectId` (nếu có) | Scope công trình | ❌ Chưa có link |
| **"Xem tất cả" Báo cáo hiện trường** | Cả 2 phạm vi | Mở `/reports` chung | Mở danh sách báo cáo giữ nguyên `projectId` | `/reports?projectId=[projectId]` | `REPORT_LIST` | `projectId` (nếu có) | Scope công trình | ⚠️ Cần giữ `projectId` |
| **Card Báo cáo hiện trường nổi bật** | Cả 2 phạm vi | Mở `/reports?projectId=...` chung | Mở đúng chi tiết báo cáo trong Drawer hoặc preview theo `reportId` | Report Detail Drawer / `/reports` | `SITE_REPORT` / `targetId` | `projectId` | Scope công trình | ❌ Sai (Mở danh sách chung) |
| **Biểu đồ: Trạng thái công trình** | Đang chọn 1 công trình | Hiển thị 1 công trình 100% gây thừa khoảng trắng | Hiển thị thẻ tóm tắt trạng thái công trình đang chọn (Trạng thái, Giai đoạn, Mốc tiếp theo) | Chart Container Component | `CHARTS` | `projectId` | Scope công trình | ❌ Dơ khoảng trắng |
| **Biểu đồ: Xu hướng tiến độ** | Thiếu dữ liệu lịch sử | Render SVG giả hoặc trống | Hiển thị thông báo “Chưa đủ dữ liệu để hiển thị xu hướng tiến độ (cần ít nhất 2 mốc)” | Chart Container Component | `CHARTS` | `projectId` | Scope công trình | ❌ Dơ khoảng trắng |

---

## 3. Quy Tắc Chuẩn Hóa Phân Giải Đích (Target Resolver Rules)

1. **Nguyên tắc bảo toàn ngữ cảnh**:
   - Khi `projectId` đang có giá trị (Ví dụ: `projectId=cmr...`), **KHÔNG BAO GIỜ** được loại bỏ `projectId` khỏi URL hoặc state khi thực hiện click.
   - Khi chuyển từ Dashboard sang trang danh sách hoặc chi tiết, phải kèm `projectId` trên query string (`?projectId=...`).

2. **Nguyên tắc Deep Drilldown**:
   - Bấm vào một item cụ thể (báo cáo, hồ sơ, vật tư) phải mở đúng bản ghi có `targetId` thông qua **Executive Detail Drawer** hoặc trực tiếp route chứa ID đó.
   - Không chuyển hướng người dùng về trang chọn danh mục chung (`/reports` không tham số, `/projects` không tham số).

3. **Nguyên tắc giải thích rủi ro (Risk Transparency)**:
   - Thẻ/KPI Rủi ro khi bấm phải hiển thị chi tiết các yếu tố: *Nguyên nhân rủi ro, Mức độ ảnh hưởng, Nguồn cảnh báo, Người phụ trách, Hạn xử lý*.

4. **Bảo mật & Phân quyền RBAC**:
   - Backend API khi trả về dữ liệu cho Executive Detail Drawer phải gọi `getProjectAccessScope(session)` và `projectScopeAllows` để đảm bảo tài khoản không xem được dữ liệu ngoài phạm vi được phép.
