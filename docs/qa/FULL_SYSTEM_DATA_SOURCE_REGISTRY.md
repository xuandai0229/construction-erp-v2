# FULL SYSTEM DATA SOURCE REGISTRY (BẢN ĐỒ THÀNH PHẦN VÀ NGUỒN DỮ LIỆU TOÀN HỆ THỐNG)

> [!IMPORTANT]
> Tài liệu này đăng ký và phân loại toàn bộ thành phần dữ liệu trên toàn bộ hệ thống `construction-erp-v2` theo nguyên tắc **DỮ LIỆU THẬT - CÓ NGUỒN GỐC RÕ RÀNG - TRUY NGƯỢC VÀ KIỂM CHỨNG ĐƯỢC**.

---

## I. TỔNG QUAN PHÂN LOẠI TRẠNG THÁI DỮ LIỆU

| Ký hiệu trạng thái | Ý nghĩa nghiệp vụ |
|---|---|
| `REAL_SOURCE_CONFIRMED` | Dữ liệu nghiệp vụ thật từ cơ sở dữ liệu Prisma PostgreSQL, đã kiểm chứng truy ngược. |
| `DERIVED_FROM_REAL_DATA` | Dữ liệu được tính toán (KPI, tổng hợp) trực tiếp từ các bản ghi nguồn thật theo công thức chuẩn. |
| `QA_ONLY` | Dữ liệu chỉ dùng trong fixture, unit test hoặc môi trường QA test runner. |
| `DEMO_ONLY` | Dữ liệu mẫu/khởi tạo ban đầu (seed) dùng cho mục đích hướng dẫn hoặc khởi chạy hệ thống lần đầu. |
| `HARDCODED` | Hằng số, nhãn tĩnh hoặc mảng cấu hình giao diện. |
| `MOCKED` | Dữ liệu giả lập (Không xuất hiện trong runtime production). |
| `FALLBACK_MISLEADING` | Dữ liệu fallback gây hiểu nhầm (Đã loại bỏ hoặc thay thế bằng empty/error state). |
| `SOURCE_NOT_FOUND` | Chưa xác định được nguồn nghiệp vụ. |
| `INCONSISTENT` | Dữ liệu không khớp giữa KPI và danh sách chi tiết (Đã chuẩn hóa). |

---

## II. REGISTRY DỮ LIỆU THEO 50 PHÂN HỆ VÀ THÀNH PHẦN HỆ THỐNG

### 1. Dashboard Ban Giám đốc (Executive Dashboard)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `DASH_EXEC_KPI_ACTIVE_PROJECTS` | Dashboard | Ban Giám Đốc | KPI "Công trình đang chạy" | Prisma DB | `Project` | `getExecutiveDashboardData` | `prisma.project.findMany` | `deletedAt: null`, `status: 'ACTIVE'`, `projectId` (nếu chọn) | `COUNT(projects)` | System / Project | Realtime | `DERIVED_FROM_REAL_DATA` |
| `DASH_EXEC_KPI_ACTION_ITEMS` | Dashboard | Ban Giám Đốc | KPI "Cần xử lý" | Prisma DB | `SiteReport`, `MaterialRequest`, `ApprovalRequest`, `ProjectTask` | `ExecutiveActionService.getExecutiveActionItems` | Direct Prisma queries across 4 models | `status: PENDING / SUBMITTED / OVERDUE`, `projectId` | `SUM(reportActions + materialActions + approvalActions + taskActions)` | System / Project | Realtime | `DERIVED_FROM_REAL_DATA` |
| `DASH_EXEC_KPI_TODAY_REPORTS` | Dashboard | Ban Giám Đốc | KPI "Báo cáo hôm nay" | Prisma DB | `SiteReport` | `getExecutiveDashboardData` | `prisma.siteReport.findMany` | `date >= startOfDay(today)`, `deletedAt: null`, `projectId` | `COUNT(todayReports)` | System / Project | Realtime | `DERIVED_FROM_REAL_DATA` |
| `DASH_EXEC_KPI_AT_RISK` | Dashboard | Ban Giám Đốc | KPI "Công trình rủi ro" | Prisma DB | `Project`, `SiteReport` | `getExecutiveDashboardData` | Health calculation service | `health: 'AT_RISK' \| 'DELAYED'`, `projectId` | `COUNT(atRiskProjects)` | System / Project | Realtime | `DERIVED_FROM_REAL_DATA` |
| `DASH_EXEC_CHART_STATUS` | Dashboard | Ban Giám Đốc | Biểu đồ Sức khỏe danh mục | Prisma DB | `Project` | `getExecutiveDashboardData` | Calculated from `projectOverview` | `deletedAt: null` | Donut percent derived from DB health enum | System / Project | Realtime | `DERIVED_FROM_REAL_DATA` |

### 2. Công trình (Projects)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `PROJ_LIST_ALL` | Công trình | Danh sách dự án | Bảng công trình | Prisma DB | `Project` | `getProjects` | `prisma.project.findMany` | `deletedAt: null`, search/status filter | Direct list | System / User Scope | Realtime | `REAL_SOURCE_CONFIRMED` |
| `PROJ_KPI_TOTAL` | Công trình | Danh sách dự án | Thống kê số lượng dự án | Prisma DB | `Project` | `getProjects` | `prisma.project.count` | `deletedAt: null` | `COUNT(Project)` | System | Realtime | `DERIVED_FROM_REAL_DATA` |

### 3. Chi tiết công trình (Project Detail)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `PROJ_DETAIL_INFO` | Công trình | Chi tiết công trình | Thông tin chung dự án | Prisma DB | `Project`, `ProjectMember`, `User` | `getProjectById` | `prisma.project.findUnique` | `id = targetProjectId` | Record fields | Single Project | Realtime | `REAL_SOURCE_CONFIRMED` |

### 4. Tiến độ công trình (Project Progress)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `PROJ_PROGRESS_ACTUAL` | Tiến độ | Tiến độ công trình | Tiến độ thực tế (%) | Prisma DB | `FieldProgressItem`, `SiteReportLine` | `calculateProjectProgress` | `prisma.fieldProgressItem.findMany` | `projectId`, `isActive: true` | `SUM(quantityToDate * weight) / SUM(designQuantity * weight) * 100` | Single Project | Realtime | `DERIVED_FROM_REAL_DATA` |

### 5. Hạng mục và công việc thi công (WBS & Tasks)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `WBS_ITEMS_LIST` | Hạng mục | Quản lý WBS | Bảng cây hạng mục | Prisma DB | `WbsItem`, `FieldProgressItem` | `getWbsItems` | `prisma.wbsItem.findMany` | `projectId` | Tree structure | Single Project | Realtime | `REAL_SOURCE_CONFIRMED` |

### 6. Báo cáo ngày (Daily Reports)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `REPORT_DAILY_LIST` | Báo cáo | Báo cáo ngày | Danh sách nhật ký công trình | Prisma DB | `SiteReport`, `SiteReportLine`, `SiteReportPhoto` | `getDailyReports` | `prisma.siteReport.findMany` | `type: 'DAILY'`, `projectId` | Direct query | Single Project | Realtime | `REAL_SOURCE_CONFIRMED` |

### 7. Báo cáo tuần (Weekly Reports)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `REPORT_WEEKLY_LIST` | Báo cáo | Báo cáo tuần | Báo cáo tổng hợp tuần | Prisma DB | `SiteReport` | `getWeeklyReports` | `prisma.siteReport.findMany` | `type: 'WEEKLY'`, `projectId` | Aggregated report list | Single Project | Realtime | `REAL_SOURCE_CONFIRMED` |

### 8. Báo cáo hiện trường (Field Reports)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `REPORT_FIELD_LOGS` | Báo cáo | Nhật ký hiện trường | Nhật ký khối lượng thi công | Prisma DB | `FieldProgressEntry`, `FieldProgressItem` | `getFieldProgressEntries` | `prisma.fieldProgressEntry.findMany` | `projectId`, date range | Recorded volumes | Single Project | Realtime | `REAL_SOURCE_CONFIRMED` |

### 9. Kiểm tra và kế hoạch tuần (Weekly Inspection & Plan)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `WEEKLY_INSPECTION_PLAN` | Kiểm tra | Kế hoạch tuần | Danh sách kiểm tra & kế hoạch | Prisma DB | `SupervisionWeeklyDossier` | `getSupervisionWeeklyDossiers` | `prisma.supervisionWeeklyDossier.findMany` | `projectId`, `weekNumber` | Structured dossier | Single Project | Realtime | `REAL_SOURCE_CONFIRMED` |

### 10. Báo cáo giám sát (Supervision Reports)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SUPERVISION_DOSSIER` | Giám sát | Hồ sơ giám sát | Editor & Preview hồ sơ | Prisma DB | `SupervisionWeeklyDossier` | `getSupervisionWeeklyDossierById` | `prisma.supervisionWeeklyDossier.findUnique` | `id = dossierId` | Document structure | Single Project | Realtime | `REAL_SOURCE_CONFIRMED` |

### 11-16. Phân hệ Vật tư & Kho (Materials, Requests, Import/Export, Stock, Loss)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `MAT_CATALOG_LIST` | Vật tư | Danh mục | Danh sách vật tư | Prisma DB | `MaterialItem` | `getMaterialItems` | `prisma.materialItem.findMany` | `isActive: true` | Direct query | System / Project | Realtime | `REAL_SOURCE_CONFIRMED` |
| `MAT_REQUEST_LIST` | Vật tư | Yêu cầu vật tư | Bảng đề xuất vật tư | Prisma DB | `MaterialRequest`, `MaterialRequestItem` | `getMaterialRequests` | `prisma.materialRequest.findMany` | `projectId`, `status` | Direct query | Single Project | Realtime | `REAL_SOURCE_CONFIRMED` |
| `MAT_STOCK_CURRENT` | Vật tư | Tồn kho | Bảng tồn kho công trình | Prisma DB | `MaterialStock`, `MaterialMovement` | `getProjectStocks` | `prisma.materialStock.findMany` | `projectId` | `InitialStock + SUM(Imports) - SUM(Exports)` | Single Project | Realtime | `DERIVED_FROM_REAL_DATA` |
| `MAT_MOVEMENTS` | Kho | Nhập/Xuất kho | Nhật ký xuất nhập vật tư | Prisma DB | `MaterialMovement` | `getMaterialMovements` | `prisma.materialMovement.findMany` | `projectId`, `type` | Ledger transaction list | Single Project | Realtime | `REAL_SOURCE_CONFIRMED` |

### 17-20. Hợp đồng, Nhà cung cấp, Thanh toán & Hồ sơ nghiệm thu

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ACCEPTANCE_DOSSIERS` | Nghiệm thu | Hồ sơ nghiệm thu | Danh sách hồ sơ nghiệm thu | Prisma DB | `AcceptanceDossier` | `getAcceptanceDossiers` | `prisma.acceptanceDossier.findMany` | `projectId`, `status` | Direct query | Single Project | Realtime | `REAL_SOURCE_CONFIRMED` |

### 21-24. Trung tâm Phê duyệt & Công việc (Approvals & Tasks)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `APPROVAL_CENTER_LIST` | Phê duyệt | Trung tâm phê duyệt | Danh sách hồ sơ chờ duyệt | Prisma DB | `ApprovalRequest`, `ApprovalStep` | `getApprovalRequests` | `prisma.approvalRequest.findMany` | `approverId = user.id`, `status: PENDING` | Real approval flow | System / Project | Realtime | `REAL_SOURCE_CONFIRMED` |
| `PROJECT_TASKS_OVERDUE` | Nhiệm vụ | Nhiệm vụ | Danh sách công việc quá hạn | Prisma DB | `ProjectTask` | `getProjectTasks` | `prisma.projectTask.findMany` | `dueDate < NOW()`, `status != COMPLETED` | Overdue filtering | Single Project | Realtime | `DERIVED_FROM_REAL_DATA` |

### 25-26. Tài liệu & Lưu trữ (Documents & Storage Files)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `DOC_SYSTEM_FILES` | Tài liệu | Thư viện tài liệu | Danh sách file và dung lượng | Prisma DB & Storage | `DocumentFile` | `getDocumentFiles` | `prisma.documentFile.findMany` | `projectId`, `isArchived: false` | Real file metadata & physical storage existence check | System / Project | Realtime | `REAL_SOURCE_CONFIRMED` |

### 27-30. Tài khoản, Phân quyền & RBAC (Accounts, Users, RBAC)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `USER_MANAGEMENT_LIST` | Tài khoản | Quản lý người dùng | Danh sách tài khoản & Vai trò | Prisma DB | `User`, `ProjectMember` | `getUsers` | `prisma.user.findMany` | `isActive: true` | User & Role memberships | System | Realtime | `REAL_SOURCE_CONFIRMED` |

### 31-35. Thông báo, Tìm kiếm, Cài đặt & Nhật ký (Notifications, Search, Audit)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SYSTEM_NOTIFICATIONS` | Thông báo | Trung tâm thông báo | Danh sách thông báo | Prisma DB | `Notification` | `getNotifications` | `prisma.notification.findMany` | `userId = currentUserId` | Real event-driven notifications | User Scope | Realtime | `REAL_SOURCE_CONFIRMED` |
| `GLOBAL_SEARCH` | Tìm kiếm | Tìm kiếm toàn hệ thống | Kết quả tìm kiếm | Prisma DB | Multiple models | `globalSearchAction` | Full-text query | User scope & Project scope | Filtered search results | User Scope | Realtime | `DERIVED_FROM_REAL_DATA` |
| `AUDIT_LOG_LIST` | Nhật ký | Nhật ký hoạt động | Lịch sử thay đổi hệ thống | Prisma DB | `AuditLog` | `getAuditLogs` | `prisma.auditLog.findMany` | Date & Entity filtering | System audit entries | System | Realtime | `REAL_SOURCE_CONFIRMED` |

### 36-40. Xuất Báo cáo, In ấn, Preview & Thông báo đẩy (Exports, Preview, Print)

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `EXPORT_WEEKLY_DOCX` | Báo cáo | Xuất Word | Bản Word báo cáo tuần | Data Source | `SupervisionWeeklyDossier` | `generateWeeklyDocx` | Direct DB model query | `dossierId` | Canonical document model mapping | Single Project | On Demand | `DERIVED_FROM_REAL_DATA` |
| `EXPORT_WEEKLY_XLSX` | Báo cáo | Xuất Excel | Sheet Excel báo cáo tuần | Data Source | `SupervisionWeeklyDossier` | `generateWeeklyXlsx` | Direct DB model query | `dossierId` | Canonical document model mapping | Single Project | On Demand | `DERIVED_FROM_REAL_DATA` |
| `EXPORT_WEEKLY_PDF` | Báo cáo | Xem trước / In | Bản in PDF A4 landscape | Data Source | `SupervisionWeeklyDossier` | Dedicated Print Route | Direct DB model query | `dossierId` | Isolated print layout rendering | Single Project | On Demand | `DERIVED_FROM_REAL_DATA` |

### 41-50. Tác vụ Nền, Cache, API, Server Actions, Store & UI Badges

| Mã dữ liệu | Phân hệ | Màn hình | Thành phần UI | Nguồn | Model/Bảng | API/Action | Query | Bộ lọc | Công thức | Scope | Thời gian cập nhật | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SERVER_ACTION_SWD` | Action | Phê duyệt/Chuyển trạng thái | Server actions | Service | Prisma transactions | Server Actions | `prisma.$transaction` | Status validation & authorization | State Machine Transitions | System | Realtime | `REAL_SOURCE_CONFIRMED` |
| `CACHE_KEY_PROJECT_SCOPE` | Cache | React/Next Cache | Shared cache | Cache Store | Memory / React Cache | `revalidatePath` / `revalidateTag` | Cache key include `projectId` | Project scope isolation | Tagged invalidation | Project | Realtime | `REAL_SOURCE_CONFIRMED` |

---

## III. XÁC NHẬN NGUYÊN TẮC HỆ THỐNG

1. **Không có dữ liệu thật -> Render Empty State (Trạng thái rỗng)**.
2. **Chưa đủ dữ liệu -> Ghi rõ thông báo chưa đủ dữ liệu** (Ví dụ: "Chưa đủ mốc dữ liệu để vẽ biểu đồ xu hướng").
3. **Query lỗi -> Render Error State (Trạng thái lỗi)**, tuyệt đối không trả về `0` hoặc mảng mẫu khiến người dùng hiểu nhầm là hệ thống không có dữ liệu.
4. **Không có quyền -> Render Access Denied State (Trạng thái không có quyền)**.
