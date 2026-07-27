# FULL SYSTEM DATA LINEAGE MAP (BẢN ĐỒ TRUY NGƯỢC DÒNG DỮ LIỆU TOÀN HỆ THỐNG)

> [!IMPORTANT]
> Tài liệu này thiết lập chuỗi truy ngược dòng dữ liệu từ giao diện người dùng (UI) đến đúng bản ghi nguồn gốc trong cơ sở dữ liệu cho tất cả các chỉ số, bảng biểu, widget và báo cáo trong hệ thống `construction-erp-v2`.

---

## I. NGUYÊN TẮC TRUY NGƯỢC DÒNG DỮ LIỆU (DATA LINEAGE PRINCIPLE)

Mọi chỉ số hiển thị trên giao diện người dùng bắt buộc tuân theo chuỗi truy ngược:

```text
UI (Widget / Badge / Chart / Table)
  └─► Client Component / Render Function
        └─► React Hook / Server Component Props
              └─► API Route / Server Action
                    └─► Business Service Layer
                          └─► Prisma Query / Transaction
                                └─► Prisma Model / Database Table
                                      └─► Source Record ID (Bản ghi nguồn)
```

**Mọi trường hợp ngắt quãng (VD: UI → Constant, UI → Fallback Mẫu, Chart → Mảng ngẫu nhiên) đều bị loại bỏ hoàn toàn.**

---

## II. BẢN ĐỒ CHUỖI TRUY NGƯỢC DÒNG DỮ LIỆU PHÂN HỆ MẶC ĐỊNH

### 1. Phân hệ Dashboard Ban Giám Đốc (Executive Dashboard)

#### 1.1 KPI "Tổng số việc cần xử lý" (Action Items Count & Drawer)
- **UI Element**: `ExecutiveKpiGrid` -> Badge "Công việc cần xử lý" & Drawer `ExecutiveDetailDrawer ('ACTION_REQUIRED')`
- **Component**: `src/components/dashboard/executive/executive-kpi-grid.tsx`
- **Hook/Server Prop**: `ExecutiveDashboard` -> `data.actionItemsCount` & `data.actionItemsList`
- **API/Server Action**: `getExecutiveDashboardData({ selectedProjectId })`
- **Service Layer**: `ExecutiveActionService.getExecutiveActionItems(selectedProjectId)`
- **Prisma Query**:
  - `prisma.siteReport.findMany({ where: { status: 'SUBMITTED', projectId } })`
  - `prisma.materialRequest.findMany({ where: { status: 'PENDING', projectId } })`
  - `prisma.approvalRequest.findMany({ where: { status: 'PENDING', projectId } })`
  - `prisma.projectTask.findMany({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lt: now }, projectId } })`
- **Prisma Model**: `SiteReport`, `MaterialRequest`, `ApprovalRequest`, `ProjectTask`
- **Source Record Verification**: Đảm bảo KPI Total = Action Item List Count = Drawer Total.

#### 1.2 KPI "Công trình đang thi công"
- **UI Element**: `ExecutiveKpiGrid` -> Badge "Công trình active"
- **Component**: `src/components/dashboard/executive/executive-kpi-grid.tsx`
- **Hook/Server Prop**: `ExecutiveDashboard` -> `data.kpis.activeProjects`
- **API/Server Action**: `getExecutiveDashboardData`
- **Service Layer**: `src/lib/dashboard/dashboard-queries.ts`
- **Prisma Query**: `prisma.project.count({ where: { status: 'ACTIVE', deletedAt: null, ...(projectId ? { id: projectId } : {}) } })`
- **Prisma Model**: `Project`
- **Source Record Verification**: Khớp chính xác ID danh sách công trình đang chạy.

#### 1.3 Biểu đồ Donut "Sức khỏe danh mục công trình"
- **UI Element**: `ExecutiveStatusChart` Donut SVG
- **Component**: `src/components/dashboard/executive/executive-status-chart.tsx`
- **Hook/Server Prop**: `data.projectOverview`
- **API/Server Action**: `getExecutiveDashboardData`
- **Service Layer**: `src/lib/dashboard/dashboard-queries.ts`
- **Prisma Query**: `prisma.project.findMany({ include: { fieldProgressItems: true, siteReports: true } })`
- **Prisma Model**: `Project`, `FieldProgressItem`, `SiteReport`
- **Source Record Verification**: Các lát cắt On-track, At-risk, Delayed được tính trực tiếp từ mảng `projectOverview`.

---

### 2. Phân hệ Vật tư & Kho (Materials & Inventory)

#### 2.1 Bảng Tồn Kho Hiện Tại (Current Stock Ledger)
- **UI Element**: `MaterialsCatalog` -> Tab Tồn kho
- **Component**: `src/components/materials/materials-catalog.tsx`
- **Hook/Server Prop**: `useSearchParams`, `stocks` prop
- **API/Server Action**: `getProjectStocksAction(projectId)`
- **Service Layer**: `src/app/(dashboard)/materials/actions.ts`
- **Prisma Query**:
  ```ts
  prisma.materialStock.findMany({
    where: { projectId },
    include: { materialItem: true }
  })
  ```
- **Prisma Model**: `MaterialStock`, `MaterialMovement`
- **Source Formula**: `Stock = InitialStock + SUM(ImportMovements) - SUM(ExportMovements)`
- **Source Record Verification**: Khớp từng dòng giao dịch nhập/xuất kho thực tế.

#### 2.2 Đề xuất Vật tư (Material Requests)
- **UI Element**: `MaterialRequestsTable` & Detail Drawer
- **Component**: `src/components/materials/material-requests-table.tsx`
- **API/Server Action**: `getMaterialRequestsAction(projectId)`
- **Prisma Query**: `prisma.materialRequest.findMany({ where: { projectId }, include: { items: true, requestedBy: true } })`
- **Prisma Model**: `MaterialRequest`, `MaterialRequestItem`
- **Source Record Verification**: `requestNo`, người gửi và danh sách vật tư chi tiết.

---

### 3. Phân hệ Báo cáo Tuần Giám sát (Supervision Weekly Reports)

#### 3.1 Soạn thảo Báo cáo Tuần
- **UI Element**: `WeeklyEditor`
- **Component**: `src/components/supervision-weekly/weekly-editor.tsx`
- **Server Component**: `src/app/(dashboard)/reports/supervision-weekly/[id]/page.tsx`
- **API/Server Action**: `getSupervisionWeeklyDossierById(id)`
- **Service Layer**: `src/lib/supervision-weekly/document-model.ts`
- **Prisma Query**: `prisma.supervisionWeeklyDossier.findUnique({ where: { id }, include: { project: true, siteReport: true } })`
- **Prisma Model**: `SupervisionWeeklyDossier`
- **Source Record Verification**: Truy xuất trực tiếp bằng ID duy nhất của Dossier.

#### 3.2 Xuất Báo cáo (Word DOCX / Excel XLSX / PDF Print)
- **UI Element**: Nút Xuất Word / Xuất Excel / Xem trước In
- **Component**: `WeeklyPrintButton`, `WeeklyExportActions`
- **API/Server Action**: `generateWeeklyDocx`, `generateWeeklyXlsx`, `/reports/supervision-weekly/[id]/print`
- **Canonical Model Mapper**: `buildWeeklyDocumentModel(dossier, mode)`
- **Prisma Model**: `SupervisionWeeklyDossier`
- **Source Record Verification**: Mọi định dạng xuất dùng chung 1 NGUỒN SỰ THẬT DUY NHẤT.

---

### 4. Phân hệ Phê duyệt & Trung tâm Phê duyệt (Approval Center)

#### 4.1 Danh sách Hồ sơ Chờ Duyệt của Tôi
- **UI Element**: `ApprovalCenterTable`
- **Component**: `src/components/approvals/approval-center-table.tsx`
- **API/Server Action**: `getApprovalRequestsAction({ approverId, status: 'PENDING' })`
- **Prisma Query**:
  ```ts
  prisma.approvalRequest.findMany({
    where: {
      status: 'PENDING',
      steps: { some: { approverId: currentUserId, status: 'PENDING' } }
    },
    include: { requester: true, project: true }
  })
  ```
- **Prisma Model**: `ApprovalRequest`, `ApprovalStep`
- **Source Record Verification**: Chỉ hiển thị đúng hồ sơ thuộc quyền phê duyệt của user hiện tại.

---

### 5. Phân hệ Tài liệu & Lưu trữ (Document Management)

#### 5.1 Quản lý File Công trình
- **UI Element**: `DocumentWorkspace`
- **Component**: `src/components/documents/document-workspace.tsx`
- **API/Server Action**: `getDocumentFilesAction(projectId)`
- **Prisma Query**: `prisma.documentFile.findMany({ where: { projectId, isArchived: false } })`
- **Storage Service Check**: Verification check using `fs.existsSync(file.filePath)`
- **Prisma Model**: `DocumentFile`
- **Source Record Verification**: Bản ghi DB khớp 1:1 với file vật lý trong thư mục `storage/`.

---

## III. MA TRẬN ĐỐI CHIẾU NGUỒN DỮ LIỆU UI - API - DB

| Thành phần UI | Target Route / Action | Prisma Model | Key Filter | State khi không có dữ liệu | Error State |
|---|---|---|---|---|---|
| Executive KPI Grid | `getExecutiveDashboardData` | `Project`, `SiteReport`, `MaterialRequest`, `ApprovalRequest` | `projectId` (Dynamic) | Hiển thị 0 với nguồn xác thực | Surface Toast Error |
| Site Report List | `getDailyReports` | `SiteReport` | `projectId`, `type: DAILY` | Empty State UI with Add Button | Fallback Error Card |
| Stock Table | `getProjectStocksAction` | `MaterialStock` | `projectId` | Empty Table with Catalog Link | Toast Alert Error |
| Approval Center | `getApprovalRequestsAction` | `ApprovalRequest` | `approverId`, `status` | Empty Inbox Placeholder | Error Notification |
| Document Files | `getDocumentFilesAction` | `DocumentFile` | `projectId` | Empty Workspace UI | Surface Storage Error |
