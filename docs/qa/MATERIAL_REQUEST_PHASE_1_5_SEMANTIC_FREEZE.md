# MATERIAL REQUEST — BUSINESS SEMANTIC FREEZE & TARGET ARCHITECTURE RECONCILIATION
**Document Version:** 1.5.0  
**Date:** 10/08/2026  
**Status:** SEMANTIC & ARCHITECTURE FREEZE (NO CODE / SCHEMA / DB MODIFICATION IN THIS PHASE)  
**Target Module:** Material Request / Proposal (`Đề xuất vật tư, vật liệu, máy móc thiết bị`)

---

## 1. CORRECTIONS TO PREVIOUS AUDIT

| Item | Previous Audit Finding | Reconciled Correction & Target Baseline |
|------|------------------------|-----------------------------------------|
| **Approval Stages** | Labeled as "3 cấp phê duyệt" (3 approval levels). | **Correction:** Biểu mẫu Excel gồm **3 bên ký tên** (*Người đề nghị*, *Phòng Kỹ thuật*, *Phó Giám đốc*). Trong đó *Người đề nghị* là người lập & gửi phiếu (Requester/Creator). Do đó, workflow chỉ có **2 Approval Stages** (*Technical Department Approval* $\rightarrow$ *Deputy Director Approval*). |
| **Quantity Fields** | Propsed adding `contractQuantity`, `actualQuantity`, and `requestedQuantity` as 3 separate columns. | **Correction:** Biểu mẫu Excel CHỈ CÓ 2 cột khối lượng: *Theo hợp đồng* & *Thực tế*. Không có cột thứ 3. `requestedQuantity` hiện có trong DB thực chất lưu trữ Khối lượng thực tế đề nghị. Giữ `requestedQuantity` trên DB, map hiển thị UI/Excel là *“Khối lượng thực tế”*. CHỈ thêm `contractQuantity` Decimal? nullable. |
| **Inventory Mutation** | Recommended keeping `approveMaterialRequest` stock logic. | **Correction:** `approveMaterialRequest` hiện đang tự động cộng kho (`ProjectMaterialStock.upsert`) và tạo `MaterialMovement` (IMPORT). Đây là sai lệch nghiêm trọng. Duyệt đề xuất **TUYỆT ĐỐI KHÔNG** cộng tồn kho. Việc cộng kho chỉ thuộc trách nhiệm của giao dịch Nhập kho thực tế (*Warehouse Receiving*). |
| **Historical Data Migration** | Suggested backfilling `neededDate = requestDate + 3 days` and `purchaseReason = note`. | **Correction:** CẤM tạo dữ liệu giả. Dữ liệu cũ thiếu `neededDate` phải giữ `NULL`. Dữ liệu cũ chưa có `purchaseReason` phải giữ `NULL`. Legacy `note` giữ nguyên. |

---

## 2. QUANTITY SEMANTIC TRACE

### 2.1. Code Trace Matrix of `requestedQuantity`

| Context / Location | Source File | Current Behavior & Meaning |
|--------------------|-------------|----------------------------|
| **DB Schema** | `prisma/schema.prisma` | `MaterialRequestItem.requestedQuantity`: `Decimal(19,4)` - Lưu trữ số lượng người dùng nhập khi lập đề xuất. |
| **Validation** | `src/lib/material-requests/validation.ts` | Enforces `requestedQuantity > 0`. |
| **Creation** | `src/app/actions/material-request.ts` | Sets `requestedQuantity = input.requestedQuantity`, `remainingQuantity = requestedQuantity`, `issuedQuantity = 0`, `receivedQuantity = 0`. |
| **Stock Ledger** | `src/lib/materials/ledger.ts` | When exporting stock against a request item (`EXPORT`/`TRANSFER`), `issuedQuantity` increments by export amount and `remainingQuantity` decrements (`remainingQuantity = requestedQuantity - issuedQuantity`). |
| **UI List & Total** | `src/components/material-request/material-request-list.tsx` | `requestTotal()` sums `item.requestedQuantity`. `requestRemaining()` calculates remaining un-issued quantity. |
| **UI Form & Detail** | `material-request-form.tsx`, `material-request-detail.tsx` | Inputs and displays `requestedQuantity` with label "Số lượng đề xuất". |

### 2.2. Semantic Reconciliation & Answers

- **A. `requestedQuantity` hiện tại thực sự mang nghĩa gì?**  
  `requestedQuantity` hiện tại mang đúng bản chất là **Khối lượng thực tế cần mua/cấp cho công trình trong đợt đề xuất này**.
- **B. Có thể giữ `requestedQuantity` ở DB nhưng hiển thị trên UI/Excel là “Khối lượng thực tế” hay không?**  
  **CÓ.** Giữ nguyên field `requestedQuantity` trong database và map nhãn hiển thị trên UI Form, Detail, Table và file Excel Export là **“Khối lượng thực tế”** (hoặc **“Thực tế”**).
- **C. Làm như vậy có phá `issuedQuantity`, `receivedQuantity`, `remainingQuantity`, hay inventory workflow không?**  
  **KHÔNG.** Mối quan hệ logic trong hệ thống tồn kho hoàn toàn bảo toàn:  
  $$\text{remainingQuantity} = \text{requestedQuantity} - \text{issuedQuantity}$$  
  Việc đổi nhãn hiển thị không làm thay đổi bất kỳ công thức tính toán nào trong `ledger.ts` hay `materials/actions.ts`.
- **D. Có thực sự cần field `actualQuantity` mới không?**  
  **KHÔNG.** Việc tạo thêm field `actualQuantity` song song với `requestedQuantity` sẽ gây dư thừa dữ liệu, mâu thuẫn ngữ nghĩa và làm hỏng logic truy vết tồn kho hiện có.  
  👉 **Quyết định:** DB chỉ bổ sung **1 field khối lượng mới duy nhất**: `contractQuantity` Decimal? (Khối lượng theo hợp đồng).

---

## 3. CONTRACT QUANTITY SOURCE INVESTIGATION

### 3.1. Repository Search Findings

Đã thực hiện grep search toàn bộ repository `construction-erp-v2` cho các từ khóa: `BOQ`, `BillOfQuantities`, `ContractQuantity`, `Estimate`, `BudgetQuantity`, `TenderQuantity`, `BidQuantity`, `ProjectQuantity`.

- **Kiểm tra `prisma/schema.prisma`:** Không có model hay field nào lưu trữ dữ liệu BOQ / Dự toán hợp đồng / Khối lượng hợp đồng gốc cho vật tư.
- **Kiểm tra WBS (`WBSItem`):** `WBSItem` hiện chỉ lưu trữ tên công việc thi công (`workContent`), mã WBS, thời gian bắt đầu/kết thúc và tiến độ. WBS **không chứa định mức vật tư hay BOQ hợp đồng**.

### 3.2. Conclusion

👉 **NO AUTHORITATIVE SOURCE FOUND**  
Repository hiện tại **chưa có phân hệ BOQ / Hợp đồng vật tư**.  
Do đó, theo đúng Baseline Business Decision:
- `contractQuantity` trên dòng đề xuất vật tư sẽ là **Nullable Manual Input** (`contractQuantity Decimal?`).
- Người dùng có thể tự nhập Khối lượng theo hợp đồng khi tạo/sửa phiếu, hoặc để trống (`NULL`) nếu không có thông tin hợp đồng.
- CẤM tự ý suy ra `contractQuantity` từ WBS hoặc hardcode dữ liệu giả.

---

## 4. FINAL FIELD MAPPING (EXCEL vs SYSTEM)

| Excel Target Field | Display Label (UI & Export) | DB Storage Field | Data Type & Constraint | Source / Rule |
|--------------------|-----------------------------|------------------|------------------------|---------------|
| **Ngày lập đề xuất** | Ngày đề nghị | `MaterialRequest.requestDate` | `DateTime` (Not null) | Auto-fill today, editable |
| **Tên công trình** | Tên công trình | `Project.name` via `projectId` | String | Auto-fill from Project Context (Read-only) |
| **Địa điểm** | Địa điểm công trình | `Project.location` via `projectId` | String? | Auto-fill from `Project.location` (Read-only) |
| **Người yêu cầu** | Người đề nghị | `User.name` via `requestedById` | String | Auto-fill from Session User (Read-only) |
| **Lý do mua hàng** | Lý do mua hàng | `MaterialRequest.purchaseReason` | String? (Nullable) | User input on Form Header |
| **STT** | STT | `MaterialRequestItem.sequence` | Int (Default 0) | Sequential line index (1, 2, 3...) |
| **Dòng Phân nhóm / Hạng mục** | Tiêu đề Nhóm (VD: *Phần Điện nhẹ*) | `MaterialRequestItem.sectionName` | String? (Nullable) | Grouping header title |
| **Tên vật tư / vật liệu** | Tên vật tư | `MaterialRequestItem.materialName` | String (Not null) | Catalog combobox or manual custom text |
| **Đơn vị** | ĐVT | `MaterialRequestItem.unit` | String (Not null) | Auto from Catalog or manual text |
| **Khối lượng theo hợp đồng** | Theo hợp đồng | `MaterialRequestItem.contractQuantity` | `Decimal(19,4)?` (Nullable) | Manual input (Nullable) |
| **Khối lượng thực tế** | Thực tế | `MaterialRequestItem.requestedQuantity` | `Decimal(19,4)` (Not null) | Reused existing field |
| **Quy cách / TS kỹ thuật** | Quy cách / Thông số kỹ thuật | `MaterialRequestItem.specification` | String? (Nullable) | User input line item |
| **Hãng sản xuất (xuất xứ)** | Hãng sản xuất / Xuất xứ | `MaterialRequestItem.manufacturerOrigin` | String? (Nullable) | User input line item |
| **Ghi chú** | Ghi chú | `MaterialRequestItem.note` | String? (Nullable) | User input line item |
| **Ngày cấp về công trình** | Ngày cấp về công trình | `MaterialRequest.neededDate` | `DateTime?` (Nullable DRAFT, Required SUBMIT) | Form Header DatePicker |

---

## 5. FINAL KEEP / MODIFY / ADD / REMOVE MATRIX

| Component / Feature | Decision | Business & Technical Rationale | Target Action Plan |
|---------------------|----------|--------------------------------|-------------------|
| **Catalog / Custom Combobox** | **KEEP** | Giúp người dùng chọn nhanh vật tư chuẩn hoặc tự nhập vật tư đặc thù. | Giữ nguyên Dual-mode Combobox. |
| **ERP Metadata (`wbsItemId`, `priority`)** | **KEEP (INTERNAL)** | Quan trọng cho truy vết ERP (Công việc $\rightarrow$ Nhu cầu $\rightarrow$ Đề xuất). Không làm biến dạng file Excel export. | Giữ trên DB & Form UI ERP. Xuất Excel mẫu công ty sẽ ẩn các cột này. |
| **`requestedQuantity` DB Field** | **KEEP & REUSE** | Lưu trữ Khối lượng thực tế đề nghị. Bảo toàn công thức tồn kho (`remainingQuantity`). | Đổi label hiển thị UI/Excel thành *“Khối lượng thực tế”*. |
| **Automatic Stock Import in `approveMaterialRequest`** | **REMOVE FROM APPROVAL** | Phê duyệt đề xuất mua hàng không được tự động cộng tồn kho. | Xóa toàn bộ `ProjectMaterialStock.upsert` và `MaterialMovement.create` khỏi action duyệt. |
| **Approval Stage Model** | **MODIFY** | Chuyển từ 1 cấp duyệt đơn sang 2 Approval Stages (*Technical* $\rightarrow$ *Deputy Director*). | Sử dụng `ApprovalRequest` / `currentApprovalStep` để quản lý luồng 2 cấp. |
| **`contractQuantity`, `specification`, `manufacturerOrigin`, `sectionName`, `purchaseReason`** | **ADD** | Bổ sung các trường dữ liệu thiếu theo mẫu Excel. | Thêm các cột Nullable mới vào Schema (Phase 2). |

---

## 6. SECTION MODELING DECISION

### 6.1. Options Evaluation Matrix

| Criterion | OPTION A: Separate `MaterialRequestSection` Table | OPTION B: Inline `sectionName` + `sequence` on Item | OPTION C: Unified Ordered Row Model (`rowType` Enum / `isSectionHeader`) |
|-----------|---------------------------------------------------|-----------------------------------------------------|--------------------------------------------------------------------------|
| **Data Integrity** | High (Strict 1:N:N hierarchy) | Low (String duplication, cannot hold empty section) | High (Clean discriminator, row-level sequence integrity) |
| **Ordering & Sequence** | Complex (Requires section index + item index) | Medium (Dependent on item order) | **Best** (Single 1-N `sequence` integer covering both sections and items) |
| **Editing UX Grid** | Complex (Nested drag & drop UI) | Medium (Group by text header) | **Best** (Flat grid with Add Section / Add Material row controls) |
| **Excel 1-to-1 Rendering** | Requires two-level loop mapping | Grouping aggregation logic required | **Best** (Direct row-by-row streaming to ExcelJS worksheet) |
| **Migration Complexity** | High (New table, foreign keys, relation changes) | Low (New column) | **Low** (Additive columns `isSectionHeader` / `sectionName`, `sequence`) |
| **Prisma Query Overhead** | High (Deep `include` tree) | Low | **Best** (Single `orderBy: { sequence: 'asc' }`) |

### 6.2. Selected Recommendation

👉 **RECOMMENDED: OPTION C (Unified Ordered Row Model)**  
Bổ sung 2 cột vào `MaterialRequestItem`:
- `isSectionHeader`: `Boolean @default(false)`
- `sectionName`: `String?`
- `sequence`: `Int @default(0)`

**Quy tắc:**
- Khi `isSectionHeader = true`: Dòng này đại diện cho Tiêu đề Phân nhóm (VD: *“Phần Điện nhẹ”*). Trường `sectionName` chứa tên nhóm. Các trường `requestedQuantity`, `unit`, `contractQuantity` đặt `NULL`.
- Khi `isSectionHeader = false`: Dòng vật tư bình thường.
- Thứ tự xuất hiển thị và xuất Excel tuân theo duy nhất trường `sequence ASC`.

---

## 7. APPROVAL STAGE DECISION

Biểu mẫu Excel có **3 bên tham gia (3 Signature Parties)**:
1. **NGƯỜI ĐỀ NGHỊ** (Requester / Creator): Lập phiếu và bấm *"Gửi phê duyệt"*.
2. **PHÒNG KỸ THUẬT** (Technical Department): Kiểm tra kỹ thuật, định mức, nhu cầu $\rightarrow$ Thực hiện **Approval Stage 1**.
3. **PHÓ GIÁM ĐỐC** (Deputy Director): Phê duyệt hạn mức tài chính / mua hàng $\rightarrow$ Thực hiện **Approval Stage 2**.

```
[Requester (Creator)]
       │ Submit
       ▼
[Stage 1: Technical Department Approval]
       │ Approve
       ▼
[Stage 2: Deputy Director Approval]
       │ Approve
       ▼
[APPROVED (Final State)]
```

👉 **Kết luận:** Workflow gồm chính xác **2 Approval Stages** đại diện cho **3 Signature Parties**.

---

## 8. STATUS VS APPROVAL ARCHITECTURE DECISION

Để tránh làm phình to `MaterialRequestStatus` enum trong Prisma schema, hệ thống phân định rõ:
- **`MaterialRequest.status`**: Đại diện cho trạng thái nghiệp vụ vòng đời tổng thể (*Business Status*).
- **`MaterialRequest.currentApprovalStep`** (hoặc `ApprovalRequest.step`): Đại diện cho cấp duyệt hiện tại trong quy trình (*Approval Stage*).

### State & Step Mapping Baseline

| Business State (`MaterialRequest.status`) | Current Step (`currentApprovalStep`) | Target Description |
|-------------------------------------------|--------------------------------------|--------------------|
| `DRAFT` | `NULL` | Phiếu nháp, chỉ người tạo thấy/sửa được. |
| `SUBMITTED` | `TECHNICAL` | Đã gửi, chờ Phòng Kỹ thuật duyệt (Stage 1). |
| `WAITING_DIRECTOR` | `DEPUTY_DIRECTOR` | Phòng Kỹ thuật đã duyệt, chờ Phó Giám đốc duyệt (Stage 2). |
| `APPROVED` | `NULL` | Phó Giám đốc đã duyệt hoàn tất. Phiếu sẵn sàng cho Mua hàng. |
| `REJECTED` | `NULL` | Bị từ chối kết thúc ở bất kỳ cấp nào. |
| `REVISION_REQUESTED` | `NULL` | Trả về yêu cầu chỉnh sửa cho Người đề nghị. |

---

## 9. STATE TRANSITION MATRIX

| From State | Trigger Action | Allowed Actor | To State | Target Step | Editable by Requester? | Audit Log Event |
|------------|----------------|---------------|----------|-------------|------------------------|-----------------|
| `DRAFT` | `SUBMIT_REQUEST` | Requester | `SUBMITTED` | `TECHNICAL` | No | `MATERIAL_REQUEST_SUBMITTED` |
| `SUBMITTED` | `APPROVE_TECHNICAL` | Technical Reviewer / Admin | `WAITING_DIRECTOR` | `DEPUTY_DIRECTOR` | No | `MATERIAL_REQUEST_TECHNICAL_APPROVED` |
| `SUBMITTED` | `REQUEST_REVISION` | Technical Reviewer / Admin | `REVISION_REQUESTED` | `NULL` | **Yes** | `MATERIAL_REQUEST_REVISION_REQUESTED` |
| `SUBMITTED` | `REJECT` | Technical Reviewer / Admin | `REJECTED` | `NULL` | No | `MATERIAL_REQUEST_REJECTED` |
| `WAITING_DIRECTOR` | `APPROVE_FINAL` | Deputy Director / Director / Admin | `APPROVED` | `NULL` | No | `MATERIAL_REQUEST_FINAL_APPROVED` |
| `WAITING_DIRECTOR` | `REQUEST_REVISION` | Deputy Director / Director / Admin | `REVISION_REQUESTED` | `NULL` | **Yes** | `MATERIAL_REQUEST_REVISION_REQUESTED` |
| `WAITING_DIRECTOR` | `REJECT` | Deputy Director / Director / Admin | `REJECTED` | `NULL` | No | `MATERIAL_REQUEST_REJECTED` |
| `REVISION_REQUESTED` | `RESUBMIT` | Requester | `SUBMITTED` | `TECHNICAL` | No | `MATERIAL_REQUEST_RESUBMITTED` |

---

## 10. APPROVAL RBAC MAPPING

### 10.1. Trace Current Role Infrastructure
- **HR / Organization Mapping:** Phân hệ HR có `OrganizationUnit` (VD: *Phòng Kỹ thuật*) và `Position` (VD: *Trưởng phòng Kỹ thuật*). Tuy nhiên, phân hệ Vật tư (`materials-permissions.ts`) hiện đang sử dụng `UserRole` & `ProjectRole` độc lập.

### 10.2. Target Authorization Rule
- **STAGE 1 (TECHNICAL APPROVAL):**
  - **Required Permission:** `materials.request.approve_technical`
  - **Eligible Roles:** Users with `UserRole IN ['ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR']` OR `ProjectRole IN ['PROJECT_MANAGER', 'CHIEF_COMMANDER', 'QA_QC']` OR assigned to HR `OrganizationUnit` = "Phòng Kỹ thuật".
- **STAGE 2 (DEPUTY DIRECTOR FINAL APPROVAL):**
  - **Required Permission:** `materials.request.approve_final`
  - **Eligible Roles:** `UserRole IN ['DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMIN']`.
  - **Override Rule:** `DIRECTOR` và `ADMIN` có quyền duyệt đè (Bypass) cả 2 cấp khi cần thiết.

---

## 11. INVENTORY SEPARATION MATRIX

| Action / Event | Target `MaterialRequest.status` | Stock Mutation (`ProjectMaterialStock`) | Movement Record (`MaterialMovement`) | Item Received Qty (`receivedQuantity`) | Responsible Module |
|----------------|---------------------------------|-----------------------------------------|--------------------------------------|----------------------------------------|--------------------|
| **Submit Request** | `SUBMITTED` | **NONE** | **NONE** | 0 | Material Request |
| **Technical Approve** | `WAITING_DIRECTOR` | **NONE** | **NONE** | 0 | Material Request |
| **Deputy Director Approve** | `APPROVED` | **NONE** | **NONE** | 0 | Material Request |
| **Reject Request** | `REJECTED` | **NONE** | **NONE** | 0 | Material Request |
| **Real Warehouse Import** | `APPROVED` / `PROCESSING` | **INCREMENT STOCK** (`+qty`) | **CREATE `IMPORT` MOVEMENT** | **INCREMENT `receivedQuantity`** | **Warehouse / Inventory Module (`ledger.ts`)** |

👉 **Kiến trúc rõ ràng:** Phân hệ Đề xuất vật tư CHỈ chịu trách nhiệm phê duyệt nhu cầu. Phân hệ Kho (`Warehouse/Ledger`) chịu trách nhiệm ghi nhận giao dịch Nhập/Xuất kho thực tế.

---

## 12. CROSS-PROJECT RELATION VALIDATION MATRIX

Để triệt tiêu hoàn toàn rủi ro rò rỉ dữ liệu giữa các công trình (Cross-project Relation Leakage), tất cả các Server Actions tạo/sửa phiếu phải thực hiện kiểm tra quan hệ nghiêm ngặt trước khi ghi xuống DB:

| Input Relation Field | Target Foreign Table | Validation Rule (Server-side Enforced) | Failure Action |
|----------------------|----------------------|----------------------------------------|----------------|
| `projectId` | `Project` | Must exist and user must have active `ProjectMember` access. | Throw 403 Forbidden |
| `wbsItemId` | `WBSItem` | `WBSItem.projectId == payload.projectId` | Throw 400 Bad Request ("WBS không thuộc công trình này") |
| `fieldProgressItemId` | `FieldProgressItem` | `FieldProgressItem.template.projectId == payload.projectId` | Throw 400 Bad Request |
| `locationNodeId` | `ProjectLocationNode` | `ProjectLocationNode.projectId == payload.projectId` | Throw 400 Bad Request |
| `siteReportId` | `SiteReport` | `SiteReport.projectId == payload.projectId` | Throw 400 Bad Request |
| `materialItemId` / `materialCode` | `MaterialItem` | `MaterialItem.projectId == payload.projectId` | Throw 400 Bad Request |

---

## 13. HISTORICAL DATA MIGRATION RULES

Khi thực hiện Schema Migration ở Phase 2, tuân thủ nghiêm ngặt nguyên tắc: **UNKNOWN DATA MUST REMAIN UNKNOWN**.

1. **Rule 1 (`neededDate`):**
   - Dữ liệu lịch sử không có thông tin ngày cần cấp $\rightarrow$ Set `neededDate = NULL`.
   - **CẤM** suy đoán hoặc gán `requestDate + 3 days`.
2. **Rule 2 (`purchaseReason`):**
   - Dữ liệu lịch sử không có lý do mua hàng riêng $\rightarrow$ Set `purchaseReason = NULL`.
   - Legacy `note` giữ nguyên ở cột `note`. **CẤM** copy `note` sang `purchaseReason`.
3. **Rule 3 (`contractQuantity` & `specification` & `manufacturerOrigin`):**
   - Đặt `NULL` cho toàn bộ bản ghi cũ.
4. **Rule 4 (`sequence` & `isSectionHeader`):**
   - Auto-backfill `isSectionHeader = false`.
   - Auto-backfill `sequence` theo thứ tự `createdAt ASC` của từng item trong phiếu.

---

## 14. EXCEL GOLDEN TEMPLATE STRATEGY

### 14.1. Technical Assessment
- **Status:** `EXCEL PIXEL/PAGE FIDELITY: BLOCKED BY MISSING GOLDEN XLSX TEMPLATE`
- Repository hiện chưa chứa file mẫu `.xlsx` gốc của công ty.

### 14.2. Strategy Comparison

- **STRATEGY A (Generate from Scratch via ExcelJS):**
  - Xây dựng file Excel từ đầu bằng code TypeScript + `exceljs`.
  - Tự cấu hình Fonts, Font size, Merged Cells, Borders, Alignment, Column Widths, Row Heights và Print Setup (A4 Landscape, Fit to 1 page wide).
  - *Ưu điểm:* Hoạt động ngay không cần file template.
  - *Nhược điểm:* Cần căn chỉnh tỉ mỉ từng pixel để đạt độ chuẩn như file mẫu của công ty.
- **STRATEGY B (Inject Data into Loaded Golden `.xlsx` Template - RECOMMENDED WHEN AVAILABLE):**
  - Đọc file mẫu `template_de_xuat_vat_tu.xlsx` bằng `exceljs.Workbook.xlsx.readFile()`.
  - Giữ nguyên 100% định dạng Header, Font, Border, Print setup, Signature Block.
  - Inject dữ liệu phiếu & danh sách dòng vật tư vào đúng vùng cells.

👉 **Khuyến nghị Strategy:** Sử dụng **Strategy A** bằng ExcelJS với cấu hình bảng chuẩn mực trong Phase 2, và hỗ trợ **Strategy B** ngay khi nhận được file `.xlsx` gốc từ Chủ quản.

---

## 15. REMAINING BLOCKERS

1. **Phản hồi cho 11 câu hỏi nghiệp vụ (Business Clarification):** Cần Chủ quản dự án xác nhận chính thức trước khi unlock Phase 2.
2. **Cung cấp file mẫu `GOLDEN_MATERIAL_REQUEST_TEMPLATE.xlsx`:** Cần file `.xlsx` gốc để đạt 100% Pixel/Page Fidelity khi xuất file.

---

## 16. EXACT PHASE 2 IMPLEMENTATION SCOPE

1. **Schema Migration:**
   - Thêm `purchaseReason`, `currentApprovalStep` vào `MaterialRequest`.
   - Thêm `contractQuantity`, `specification`, `manufacturerOrigin`, `sequence`, `isSectionHeader`, `sectionName` vào `MaterialRequestItem`.
   - Thêm enum `MaterialRequestApprovalStep` (`TECHNICAL`, `DEPUTY_DIRECTOR`).
2. **Server Actions Update (`src/app/actions/material-request.ts`):**
   - Cập nhật Zod validation (Thêm cross-project relation checks).
   - Tách toàn bộ logic Nhập kho (`ProjectMaterialStock.upsert` & `MaterialMovement.create`) ra khỏi action `approveMaterialRequest`.
   - Xây dựng 2 actions duyệt theo 2 cấp: `approveTechnicalMaterialRequest` & `approveFinalMaterialRequest`.
3. **UI Form & Detail Updates:**
   - Cập nhật `MaterialRequestForm`: Bổ sung Lý do mua hàng, Ngày cần cấp, Khối lượng hợp đồng, Quy cách, Hãng SX và Nút Thêm Phân Nhóm.
   - Cập nhật `MaterialRequestDetail`: Hiển thị chi tiết 2 cấp duyệt và tiến trình phiếu.
4. **Excel Export Module (`src/lib/materials/material-request-excel-exporter.ts`):**
   - Xây dựng module xuất file ExcelJS theo đúng định dạng mẫu công ty.

---

## 17. EXACT FILES EXPECTED TO CHANGE (PHASE 2 ONLY)

- `prisma/schema.prisma`
- `src/app/actions/material-request.ts`
- `src/lib/material-requests/validation.ts`
- `src/lib/material-request/serializers.ts`
- `src/lib/materials/materials-permissions.ts`
- `src/components/material-request/material-request-form.tsx`
- `src/components/material-request/material-request-detail.tsx`
- `src/components/material-request/material-request-list.tsx`
- `src/app/(dashboard)/approvals/actions.ts`
- `src/lib/materials/material-request-excel-exporter.ts` *(File mới)*

---

## 18. EXACT TESTS REQUIRED (PHASE 2 TESTING PLAN)

1. **Unit Tests (`vitest`):**
   - Test validation Zod schema với các trường `contractQuantity`, `specification`, cross-project `wbsItemId`.
   - Test công thức tồn kho `remainingQuantity = requestedQuantity - issuedQuantity` khi đổi nhãn UI.
2. **Integration & Authorization Tests:**
   - Test Cross-project security: Thử tạo phiếu với `wbsItemId` của Dự án khác $\rightarrow$ Kỳ vọng ném lỗi 400.
   - Test Phê duyệt 2 cấp: Đăng nhập vai trò Kỹ thuật duyệt Stage 1 $\rightarrow$ Đăng nhập Phó Giám đốc duyệt Stage 2.
   - Test Inventory Isolation: Đăng nhập Phó Giám đốc duyệt Stage 2 $\rightarrow$ Xác minh `ProjectMaterialStock` KHÔNG bị thay đổi và KHÔNG có `MaterialMovement` nào được tạo.
3. **Excel Export Test:**
   - Test tạo phiếu mẫu có dòng Phân nhóm và xuất file `.xlsx` $\rightarrow$ Kiểm tra cấu trúc border, header và số liệu trong file Excel.

---

## 19. RELEASE DECISION

### FINAL PHASE 1.5 GATE DECISION:

- **CURRENT CODEBASE AUDIT:** `PASS` (Đã hoàn thành trace 100% ngữ nghĩa dữ liệu, luồng tồn kho và bảo mật).
- **SEMANTIC & ARCHITECTURE RECONCILIATION:** `FREEZE COMPLETE` (Đã chuẩn hóa toàn bộ ngữ nghĩa 2 cấp duyệt, 2 cột khối lượng, cách xử lý Section và ranh giới tồn kho).
- **PHASE 2 IMPLEMENTATION READINESS:** `CONDITIONAL GO` (Sẵn sàng bước vào Phase 2 Implementation ngay khi Chủ quản phê duyệt tài liệu này và giải đáp 11 câu hỏi nghiệp vụ).

---
*Tài liệu được biên soạn và kiểm chứng hoàn toàn tự động bởi AI Assistant - Không có bất kỳ dòng code nào bị thay đổi trong Phase 1.5.*
