# MÁ TRẬN DATA LINEAGE — PHÂN HỆ BÁO CÁO ATLĐ • PCCC • VSMT

Tài liệu ghi nhận chính xác nguồn gốc dữ liệu, đường đi từ giao diện nhập liệu (Form UI) qua API, Service Layer đến Model database trong Prisma.

---

## 1. KẾ HOẠCH KIỂM TRA ATLĐ, PCCC, VSMT CÔNG TRÌNH HÀNG TUẦN (MẪU 02)

| Trường trên Biểu mẫu / Form UI | Người nhập / Cách nhập | Nguồn API / Component | Service Processing | Model & Column Prisma | Quy tắc Validation & Format |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Số kế hoạch** (`documentNumber`) | Server tự sinh (Auto) | `POST /api/reports/safety/plans` | `SafetyPlanService.generateDocNumber()` | `SafetyReportPlan.documentNumber` | Format `KH-ATLD-{YEAR}-{SEQ:0001}` |
| **Năm văn bản** (`documentYear`) | Server tự xác định | Context Year | `SafetyPlanService` | `SafetyReportPlan.documentYear` | `Int`, năm hiện tại |
| **Số thứ tự sequence** | Server (Atomic Tx) | Transaction Tx | `SafetyPlanSequence` | `SafetyPlanSequence.nextNumber` | Tăng tự động theo năm |
| **Ngày lập** (`createdDate`) | Ngày chọn (Default: Today) | DatePicker | `SafetyPlanService` | `SafetyReportPlan.createdDate` | `DateTime` (ISO Date string) |
| **Từ ngày - Đến ngày** | Tuần chọn (Start/End) | WeekPicker | `SafetyPlanService` | `SafetyReportPlan.periodStart`, `periodEnd` | `periodStart <= periodEnd` |
| **Kính gửi** (`recipients`) | Nhập danh sách/Free text | Form Input | `SafetyPlanService` | `SafetyReportPlan.recipients` | Default: Ban lãnh đạo, Phòng KT, BCH |
| **Căn cứ pháp lý** (`legalBases`) | Checkbox / Dynamic list | Form Array | `SafetyPlanService` | `SafetyReportPlan.legalBases` | Array string, default 2 căn cứ mẫu |
| **Mục đích** (`purpose`) | Textarea | Form Input | `SafetyPlanService` | `SafetyReportPlan.purpose` | Textarea |
| **Ghi chú** (`note`) | Textarea | Form Input | `SafetyPlanService` | `SafetyReportPlan.note` | Optional string |
| **Chi tiết ngày kiểm tra** | Chọn Ngày (T2-CN) | Dynamic Entry Row | `SafetyPlanService` | `SafetyReportPlanEntry.inspectionDate` | Bắt buộc thuộc [periodStart, periodEnd] |
| **Buổi kiểm tra** (`shift`) | Radio/Select (Sáng/Chiều/Tối) | Dynamic Entry Row | `SafetyPlanService` | `SafetyReportPlanEntry.shift` | Enum: `MORNING`, `AFTERNOON`, `EVENING` |
| **Công trình** (`projectId`) | Combobox Select Project | `GET /api/projects` | `ProjectService.findById` | `SafetyReportPlanEntry.projectId` | ID công trình hợp lệ trong hệ thống |
| **Tên công trình snapshot** | Tự động lấy từ Project | Project Resolver | `SafetyPlanService` | `SafetyReportPlanEntry.projectNameSnapshot` | Lưu snapshot tránh đổi tên về sau |
| **Loại công trình** | Select (Xây lắp / Hạ tầng) | Form Input | `SafetyPlanService` | `SafetyReportPlanEntry.constructionType` | Enum: `BUILDING`, `INFRASTRUCTURE`, `OTHER` |
| **Nội dung kiểm tra** | Textarea | Form Input | `SafetyPlanService` | `SafetyReportPlanEntry.inspectionContent` | Textarea bắt buộc |
| **Nội dung huấn luyện** | Textarea | Form Input | `SafetyPlanService` | `SafetyReportPlanEntry.trainingContent` | Textarea optional |
| **Người phối hợp** | Multi-select Users / Text | User Picker | `SafetyPlanService` | `SafetyReportPlanEntry.collaborators` | Free text hoặc JSON danh sách cán bộ |
| **Địa điểm** | Input text | Form Input | `SafetyPlanService` | `SafetyReportPlanEntry.location` | Text optional |
| **Người lập kế hoạch** | Context User Session | Auth Session | `serverActorContext` | `SafetyReportPlan.createdById` | Relate User.id |
| **Người duyệt kế hoạch** | Context Approver Session | Approval Tx | `ApprovalService` | `SafetyReportPlan.approvedById` | Relate User.id |

---

## 2. BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA AT, VSLĐ (MẪU 01)

| Trường trên Biểu mẫu / Form UI | Người nhập / Cách nhập | Nguồn API / Component | Service Processing | Model & Column Prisma | Quy tắc Validation & Format |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Số báo cáo** (`documentNumber`) | Server tự sinh (Auto) | `POST /api/reports/safety/self-assessments` | `SafetyAssessmentService.generateDocNumber()` | `SafetySelfAssessmentReport.documentNumber` | Format `BC-ATLD-{YEAR}-{SEQ:0001}` |
| **Kế hoạch nguồn** (`sourcePlanId`) | Dropdown kế hoạch đã duyệt | `GET /api/reports/safety/plans?status=APPROVED` | `SafetyPlanService` | `SafetySelfAssessmentReport.sourcePlanId` | Optional FK tới `SafetyReportPlan` |
| **Từ ngày - Đến ngày** | Kế thừa hoặc Chọn tuần | WeekPicker | `SafetyAssessmentService` | `SafetySelfAssessmentReport.periodStart`, `periodEnd` | Bắt buộc |
| **Danh mục 20 nội dung** | Template cố định | Template Constants | Render Engine | Static In Template | Bảo toàn 100% nguyên văn Word |
| **Chi tiết dòng báo cáo** | Nhập theo Ngày/Buổi | Dynamic Assessment Table | `SafetyAssessmentService` | `SafetySelfAssessmentEntry.inspectionDate`, `shift` | Nhập theo Thứ 2 đến Chủ nhật |
| **Công trình / Nội dung** | Auto từ Plan hoặc Nhập | Combobox / Text | `SafetyAssessmentService` | `SafetySelfAssessmentEntry.projectId`, `projectNameSnapshot` | Snapshot tên công trình |
| **Đánh giá công trình** | Textarea / Select | Form Input | `SafetyAssessmentService` | `SafetySelfAssessmentEntry.assessment` | Nhận xét thực tế tại công trình |
| **Kiến nghị yêu cầu** | Textarea | Form Input | `SafetyAssessmentService` | `SafetySelfAssessmentEntry.recommendation` | Kiến nghị xử lý tồn tại |
| **Kết quả thực hiện** | Textarea | Form Input | `SafetyAssessmentService` | `SafetySelfAssessmentEntry.implementationResult` | Đánh giá hoàn thành |
| **Theo dõi tuần trước** | Textarea | Form Input | `SafetyAssessmentService` | `SafetySelfAssessmentReport.previousWeekRemediation` | Xử lý tồn tại tuần trước |
| **Xác nhận sau khắc phục** | Textarea | Form Input | `SafetyAssessmentService` | `SafetySelfAssessmentReport.reinspectionConfirmation` | Kiểm tra lại sau khắc phục |
| **Kiến nghị Ban giám đốc** | Checkbox + Textarea | Form Input | `SafetyAssessmentService` | `SafetySelfAssessmentReport.managementRecommendation` | Nêu rõ nhu cầu nhân lực, thiết bị... |
| **Ý kiến khác** | Textarea | Form Input | `SafetyAssessmentService` | `SafetySelfAssessmentReport.otherOpinion` | Optional text |
| **Nơi nhận** | Dynamic list | Form Input | `SafetyAssessmentService` | `SafetySelfAssessmentReport.recipients` | Default: Ban Giám đốc, Phòng KT |
| **Người lập báo cáo** | Session User | Auth Session | `serverActorContext` | `SafetySelfAssessmentReport.createdById` | Relate User.id |
| **Người duyệt báo cáo** | Session Approver | Approval Tx | `ApprovalService` | `SafetySelfAssessmentReport.approvedById` | Relate User.id |
