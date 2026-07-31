# KẾ HOẠCH TRIỂN KHAI VÀ THIẾT KẾ MÔ HÌNH DỮ LIỆU (PLAN)
## PHẦN BÁO CÁO ATLĐ • PCCC • VSMT

---

### I. MÔ HÌNH DỮ LIỆU PRISMA TỐI GIẢN (PRISMA SCHEMA DESIGN)

Thiết kế mô hình dữ liệu phẳng, tối giản, chuyên biệt cho 2 loại hồ sơ:

```prisma
// ============================================================================
// SAFETY REPORTING MODULE (ATLĐ • PCCC • VSMT) — REBUILT STANDALONE MODEL
// ============================================================================

enum SafetyReportPlanStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REVISION_REQUIRED
  CANCELLED
}

enum SafetyReportShift {
  MORNING
  AFTERNOON
  EVENING
}

enum SafetyReportConstructionType {
  BUILDING
  INFRASTRUCTURE
  OTHER
}

enum SafetySelfAssessmentStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REVISION_REQUIRED
  CANCELLED
}

// 1. Sequence sinh số văn bản an toàn
model SafetyReportPlanSequence {
  businessYear Int      @id
  nextNumber   Int      @default(1)
  updatedAt    DateTime @updatedAt
}

model SafetySelfAssessmentSequence {
  businessYear Int      @id
  nextNumber   Int      @default(1)
  updatedAt    DateTime @updatedAt
}

// 2. Kế hoạch kiểm tra tuần (Mẫu 02)
model SafetyReportPlan {
  id                 String                 @id @default(cuid())
  documentYear       Int
  sequenceNumber     Int?
  documentNumber     String?
  title              String
  createdDate        DateTime               @db.Date
  periodStart        DateTime               @db.Date
  periodEnd          DateTime               @db.Date
  legalBases         Json?                  // Mảng câu căn cứ pháp lý
  recipients         Json?                  // Nơi nhận
  purpose            String?                @db.Text
  note               String?                @db.Text
  status             SafetyReportPlanStatus @default(DRAFT)
  createdById        String
  submittedById      String?
  submittedAt        DateTime?
  approvedById       String?
  approvedAt         DateTime?
  revisionReason     String?                @db.Text
  cancelledAt        DateTime?
  cancellationReason String?                @db.Text
  version            Int                    @default(1)
  createdAt          DateTime               @default(now())
  updatedAt          DateTime               @updatedAt

  createdBy       User                         @relation("SafetyPlanCreator", fields: [createdById], references: [id], onDelete: Restrict)
  submittedBy     User?                        @relation("SafetyPlanSubmitter", fields: [submittedById], references: [id], onDelete: Restrict)
  approvedBy      User?                        @relation("SafetyPlanApprover", fields: [approvedById], references: [id], onDelete: Restrict)
  entries         SafetyReportPlanEntry[]
  selfAssessments SafetySelfAssessmentReport[]

  @@unique([documentYear, sequenceNumber])
  @@index([status, periodStart])
  @@index([createdById, periodStart])
}

// Chi tiết kế hoạch theo ngày/buổi/công trình
model SafetyReportPlanEntry {
  id                   String                       @id @default(cuid())
  planId               String
  inspectionDate       DateTime                     @db.Date
  shift                SafetyReportShift
  projectId            String
  projectNameSnapshot  String
  constructionType     SafetyReportConstructionType @default(BUILDING)
  inspectionContent    String                       @db.Text
  trainingContent      String?                      @db.Text
  collaborators        String?                      @db.Text
  location             String?
  note                 String?                      @db.Text
  sortOrder            Int                          @default(0)
  version              Int                          @default(1)
  createdAt            DateTime                     @default(now())
  updatedAt            DateTime                     @updatedAt

  plan    SafetyReportPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  project Project          @relation(fields: [projectId], references: [id], onDelete: Restrict)

  @@index([planId, inspectionDate, sortOrder])
  @@index([projectId, inspectionDate])
}

// 3. Báo cáo tự đánh giá (Mẫu 01)
model SafetySelfAssessmentReport {
  id                       String                     @id @default(cuid())
  sourcePlanId             String?
  documentYear             Int
  sequenceNumber           Int?
  documentNumber           String?
  title                    String
  createdDate              DateTime                   @db.Date
  periodStart              DateTime                   @db.Date
  periodEnd                DateTime                   @db.Date
  legalBases               Json?
  recipients               Json?
  previousWeekRemediation  String?                    @db.Text
  reinspectionConfirmation String?                    @db.Text
  managementRecommendation String?                    @db.Text
  otherOpinion             String?                    @db.Text
  status                   SafetySelfAssessmentStatus @default(DRAFT)
  createdById              String
  submittedById            String?
  submittedAt              DateTime?
  approvedById             String?
  approvedAt               DateTime?
  revisionReason           String?                    @db.Text
  cancelledAt              DateTime?
  cancellationReason       String?                    @db.Text
  version                  Int                        @default(1)
  createdAt                DateTime                   @default(now())
  updatedAt                DateTime                   @updatedAt

  sourcePlan  SafetyReportPlan?           @relation(fields: [sourcePlanId], references: [id], onDelete: SetNull)
  createdBy   User                        @relation("SafetyAssessmentCreator", fields: [createdById], references: [id], onDelete: Restrict)
  submittedBy User?                       @relation("SafetyAssessmentSubmitter", fields: [submittedById], references: [id], onDelete: Restrict)
  approvedBy  User?                       @relation("SafetyAssessmentApprover", fields: [approvedById], references: [id], onDelete: Restrict)
  entries     SafetySelfAssessmentEntry[]

  @@unique([documentYear, sequenceNumber])
  @@index([status, periodStart])
  @@index([createdById, periodStart])
}

// Chi tiết dòng đánh giá theo ngày/buổi trong tuần
model SafetySelfAssessmentEntry {
  id                   String            @id @default(cuid())
  reportId             String
  inspectionDate       DateTime          @db.Date
  shift                SafetyReportShift
  projectId            String
  projectNameSnapshot  String
  inspectionContent    String            @db.Text
  assessment           String?           @db.Text
  recommendation       String?           @db.Text
  implementationResult String?           @db.Text
  sortOrder            Int               @default(0)
  version              Int               @default(1)
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt

  report  SafetySelfAssessmentReport @relation(fields: [reportId], references: [id], onDelete: Cascade)
  project Project                    @relation(fields: [projectId], references: [id], onDelete: Restrict)

  @@index([reportId, inspectionDate, sortOrder])
  @@index([projectId, inspectionDate])
}

// 4. Lịch sử duyệt & Audit Log
model SafetyReportApprovalHistory {
  id                String   @id @default(cuid())
  reportType        String   // "PLAN" hoặc "SELF_ASSESSMENT"
  reportId          String
  fromStatus        String?
  toStatus          String
  actorId           String
  reason            String?  @db.Text
  approvalRequestId String?
  occurredAt        DateTime @default(now())

  actor           User             @relation("SafetyReportApprovalActor", fields: [actorId], references: [id], onDelete: Restrict)
  approvalRequest ApprovalRequest? @relation(fields: [approvalRequestId], references: [id], onDelete: SetNull)

  @@index([reportType, reportId, occurredAt])
}

model SafetyReportAuditLog {
  id            String   @id @default(cuid())
  reportType    String
  reportId      String
  action        String
  beforeData    Json?
  afterData     Json?
  actorId       String
  occurredAt    DateTime @default(now())
  correlationId String

  actor User @relation("SafetyReportAuditActor", fields: [actorId], references: [id], onDelete: Restrict)

  @@index([reportType, reportId, occurredAt])
}
```

---

### II. CÁC ĐƯỜNG DẪN GIAO DIỆN (UI ROUTES)

Phân hệ sử dụng cấu trúc route rõ ràng dưới `/reports/safety`:

- `/reports` — Bổ sung thẻ chọn thứ 3: **"ATLĐ • PCCC • VSMT"**
- `/reports/safety` — Trang chọn 2 loại hồ sơ (Kế hoạch tuần & Báo cáo tự đánh giá)
- `/reports/safety/plans` — Danh sách Kế hoạch kiểm tra tuần
- `/reports/safety/plans/new` — Tạo Kế hoạch kiểm tra tuần mới
- `/reports/safety/plans/[planId]` — Chi tiết Kế hoạch kiểm tra tuần
- `/reports/safety/plans/[planId]/edit` — Chỉnh sửa Kế hoạch kiểm tra (bản nháp/yêu cầu sửa)
- `/reports/safety/plans/[planId]/preview` — Xem trước PDF & xuất Word/PDF Kế hoạch
- `/reports/safety/self-assessments` — Danh sách Báo cáo tự đánh giá
- `/reports/safety/self-assessments/new` — Tạo Báo cáo tự đánh giá mới (cho phép kế thừa từ Kế hoạch)
- `/reports/safety/self-assessments/[reportId]` — Chi tiết Báo cáo tự đánh giá
- `/reports/safety/self-assessments/[reportId]/edit` — Chỉnh sửa Báo cáo tự đánh giá
- `/reports/safety/self-assessments/[reportId]/preview` — Xem trước PDF & xuất Word/PDF Báo cáo

---

### III. HỆ THỐNG API ENDPOINTS (API ROUTES)

- `GET /api/reports/safety/plans` — Lấy danh sách kế hoạch
- `POST /api/reports/safety/plans` — Tạo kế hoạch mới
- `GET /api/reports/safety/plans/[planId]` — Chi tiết kế hoạch
- `PUT /api/reports/safety/plans/[planId]` — Cập nhật kế hoạch
- `DELETE /api/reports/safety/plans/[planId]` — Xóa bản nháp / Hủy kế hoạch
- `POST /api/reports/safety/plans/[planId]/submit` — Trình duyệt kế hoạch
- `POST /api/reports/safety/plans/[planId]/approve` — Duyệt / Yêu cầu sửa kế hoạch
- `GET /api/reports/safety/plans/[planId]/export` — Sinh & tải DOCX / PDF kế hoạch

- `GET /api/reports/safety/self-assessments` — Lấy danh sách báo cáo tự đánh giá
- `POST /api/reports/safety/self-assessments` — Tạo báo cáo mới
- `GET /api/reports/safety/self-assessments/[reportId]` — Chi tiết báo cáo
- `PUT /api/reports/safety/self-assessments/[reportId]` — Cập nhật báo cáo
- `DELETE /api/reports/safety/self-assessments/[reportId]` — Xóa bản nháp / Hủy báo cáo
- `POST /api/reports/safety/self-assessments/[reportId]/submit` — Trình duyệt báo cáo
- `POST /api/reports/safety/self-assessments/[reportId]/approve` — Duyệt / Yêu cầu sửa báo cáo
- `GET /api/reports/safety/self-assessments/[reportId]/export` — Sinh & tải DOCX / PDF báo cáo

---

### IV. QUY TRÌNH XUẤT VĂN BẢN VÀ RENDER GOLDEN MASTER

1. **Service Render:** Dùng `docxtemplater` + `pizzip` nạp trực tiếp file Word mẫu bất biến từ `docs/official-templates/`.
2. **Điền dữ liệu:** Điền các biến `documentNumber`, `periodStart`, `periodEnd`, `createdDate`, và danh sách bảng theo đúng cấu trúc `w:tr` và `w:tc` của bản mẫu.
3. **Chuyển đổi PDF:** Gọi LibreOffice / PDF Converter để chuyển file DOCX vừa render thành PDF.
4. **Hiển thị Preview:** Component `DocumentViewer` hiển thị iframe / pdf.js file PDF render được.
5. **Nút Thao tác:** Tải về chính file `.docx` hoặc `.pdf` đó (đảm bảo Preview và File tải về là 1:1).
