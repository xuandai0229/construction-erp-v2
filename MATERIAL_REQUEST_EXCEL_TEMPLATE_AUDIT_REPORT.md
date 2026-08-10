# BÁO CÁO AUDIT & PHÂN TÍCH CẢI TỔ NGHỆP VỤ ĐỀ XUẤT VẬT TƯ / VẬT LIỆU / MÁY MÓC THIẾT BỊ
**Hệ thống:** `construction-erp-v2`  
**Ngày thực hiện:** 10/08/2026  
**Trạng thái audit:** Báo cáo độc lập - KHÔNG thay đổi source code / schema / database.

---

## 1. EXECUTIVE SUMMARY

Báo cáo này thực hiện kiểm toán toàn diện (Comprehensive Audit & Trace) phân hệ **Đề xuất vật tư / vật liệu / máy móc thiết bị** trên codebase `construction-erp-v2` đối chiếu với **Biểu mẫu Excel chính thức** của công ty: *“ĐỀ XUẤT VẬT TƯ, VẬT LIỆU, MÁY MÓC THIẾT BỊ”*.

### Kết quả chính:
1. **Kiến trúc hiện tại:** Hệ thống đã có sẵn nền tảng xử lý đề xuất vật tư (`MaterialRequest`, `MaterialRequestItem`), có kết nối với dự án, RBAC công trình, danh mục vật tư (`MaterialItem`), kho (`ProjectMaterialStock`, `MaterialMovement`) và trung tâm phê duyệt (`ApprovalRequest`).
2. **Khoảng trống dữ liệu (Data Gap):** Data model & UI hiện tại **thiếu 6 trường dữ liệu cốt lõi** có trên biểu mẫu Excel chính thức:
   - *Khối lượng theo hợp đồng* (`contractQuantity`)
   - *Khối lượng thực tế* (`actualQuantity`)
   - *Quy cách / thông số kỹ thuật* (`specification`)
   - *Hãng sản xuất / xuất xứ* (`manufacturerOrigin`)
   - *Dòng phân nhóm / hạng mục* (`groupName` / `sectionName`)
   - *Ngày cấp về công trình* (đã có field `neededDate` trong DB nhưng bị ẩn khỏi UI Form)
3. **Workflow phê duyệt:** Hiện tại hệ thống đang áp dụng phê duyệt **1 cấp đơn (Single-stage Approval)** qua `ApprovalRequest`, trong khi biểu mẫu Excel quy định luồng phê duyệt **3 cấp** (*Người đề nghị $\rightarrow$ Phòng Kỹ thuật $\rightarrow$ Phó Giám đốc*).
4. **Bất cập nghiệp vụ hiện tại:** Khi phiếu được duyệt, Server Action `approveMaterialRequest` đang **tự động sinh phiếu nhập kho (IMPORT)** và tăng tồn kho ngay lập tức. Đây là sai lệch nghiệp vụ nghiêm trọng vì *“Phiếu đề xuất được duyệt”* $\neq$ *“Vật tư đã mua & thực tế nhập về kho”*.
5. **Định hướng cải tổ:** Giữ lại toàn bộ hạ tầng cơ bản (Catalog, Inventory, Project Scoping, WBS tracing), **KHÔNG đập bỏ 100%**, thực hiện bổ sung mở rộng dữ liệu (Additive Migration) và tái cấu trúc luồng xuất Excel/PDF chuẩn 100% theo mẫu công ty.

---

## 2. CURRENT ARCHITECTURE (TRACE TOÀN BỘ CODEBASE)

Luồng dữ liệu của phân hệ Đề xuất vật tư hiện tại được trace chi tiết như sau:

```
[UI Layer]
  ├── /materials?tab=requests (MaterialsWorkspace -> MaterialRequestList)
  ├── /projects/[id]/material-requests (Project-scoped Material Request Page)
  └── Client Components:
        ├── MaterialRequestList (Danh sách phiếu & KPI ribbon)
        ├── MaterialRequestForm (Drawer form tạo/sửa phiếu)
        └── MaterialRequestDetail (Drawer xem chi tiết phiếu)
       │
       ▼ (Server Actions)
[Action & Service Layer]
  ├── src/app/actions/material-request.ts
  │     ├── createMaterialRequest()
  │     ├── updateMaterialRequest()
  │     ├── approveMaterialRequest() -> (Cảnh báo: Tự động cộng tồn kho)
  │     ├── rejectMaterialRequest()
  │     ├── deleteMaterialRequest()
  │     └── cancelMaterialRequest()
  ├── src/lib/material-request-number.ts (Sinh mã DXVT-YYYYMMDD-XXXX)
  ├── src/lib/material-request/serializers.ts (Serialize Decimal/Date)
  └── src/lib/materials/materials-access.ts & materials-permissions.ts (RBAC Guards)
       │
       ▼ (Prisma Client & Database)
[Database & Approval Infrastructure Layer]
  ├── Model MaterialRequest (Header phiếu đề xuất)
  ├── Model MaterialRequestItem (Chi tiết từng dòng vật tư)
  ├── Model ApprovalRequest (Bản ghi phê duyệt dùng chung tại Central Approval /approvals)
  ├── Model MaterialItem & ProjectMaterialStock (Danh mục & Tồn kho)
  └── Model AuditLog (Ghi vết thao tác duyệt/từ chối/sửa/xóa)
```

---

## 3. CURRENT DATABASE MODELS

### 3.1. Model `MaterialRequest` (Header)
- `id`: String (cuid) - Khóa chính.
- `projectId`: String - ID công trình (Khóa ngoại `Project`).
- `requestNo`: String (unique) - Mã phiếu (VD: `DXVT-20260810-1234`).
- `siteReportId`: String? - Liên kết nhật ký thi công (nếu tạo từ nhật ký).
- `requestedById`: String - ID người tạo (Khóa ngoại `User`).
- `requestDate`: DateTime - Ngày lập đề xuất.
- `neededDate`: DateTime? - Ngày cần cấp (Có trong DB nhưng chưa có field nhập trên UI Form).
- `status`: Enum `MaterialRequestStatus` (`DRAFT`, `REQUESTED`, `SUBMITTED`, `APPROVED`, `REJECTED`, `PROCESSING`, `ISSUED`, `RECEIVED`, `CANCELLED`).
- `priority`: Enum `MaterialRequestPriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
- `note`: String? - Ghi chú chung phiếu.
- `cancelReason`: String? - Lý do từ chối/hủy.

### 3.2. Model `MaterialRequestItem` (Line Items)
- `id`: String (cuid) - Khóa chính.
- `materialRequestId`: String - Khóa ngoại liên kết `MaterialRequest`.
- `wbsItemId`: String? - Khóa ngoại liên kết WBS Hạng mục công việc.
- `fieldProgressItemId`: String? - Khóa ngoại liên kết Nhật ký công việc hiện trường.
- `workItemNameSnapshot`: String? - Snapshot tên công việc liên quan.
- `materialCode`: String? - Mã vật tư (nếu chọn từ Danh mục `MaterialItem`).
- `materialName`: String - Tên vật tư (bắt buộc).
- `unit`: String - Đơn vị tính (bắt buộc).
- `requestedQuantity`: Decimal(19,4) - Số lượng đề xuất.
- `issuedQuantity`: Decimal(19,4) - Số lượng đã cấp.
- `receivedQuantity`: Decimal(19,4) - Số lượng đã nhận.
- `remainingQuantity`: Decimal(19,4) - Số lượng còn lại.
- `reason`: String? - Lý do đề xuất dòng.
- `note`: String? - Ghi chú riêng cho dòng vật tư.
- `locationNodeId`: String? - Vị trí thi công (Cấu trúc vị trí).

---

## 4. CURRENT RBAC & PROJECT SCOPING

Hệ thống hiện tại áp dụng phân quyền 2 lớp (Dual-layer Authorization):

1. **Lớp System Role (`UserRole`):**
   - `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`: Có quyền xem và duyệt toàn bộ phiếu đề xuất trên tất cả công trình (`canViewAllProjects`).
   - `CONSTRUCTION_SUPERVISOR`: Quyền Xem chỉ đọc (`READ_ONLY_MATERIAL_PERMISSIONS`).
2. **Lớp Project Role (`ProjectRole`):**
   - `PROJECT_MANAGER`, `SITE_COMMANDER`, `CHIEF_COMMANDER`, `ASSISTANT_COMMANDER`: Có đầy đủ quyền tạo, sửa, duyệt phiếu trong công trình được phân công.
   - Các vai trò khác (`QA_QC`, `HSE`, `SUPERVISOR`, `VIEWER`): Chỉ có quyền Xem hoặc Tạo nháp tùy cấu hình.

### Kết quả kiểm tra Lỗ hổng Bảo mật (Security Audit):
- **Server Action Protection:** TẤT CẢ các Server Action (`createMaterialRequest`, `updateMaterialRequest`, `approveMaterialRequest`, `rejectMaterialRequest`, `deleteMaterialRequest`) ĐỀU gọi `requireProjectAccess(projectId)` và `getProjectMaterialPermissions(session, projectId)`.
- **Chống IDOR / Cross-project Bypass:** Nếu người dùng cố tình gửi `projectId` của Công trình B mà họ không thuộc danh sách thành viên (`ProjectMember`), Server Action sẽ chặn lại và tung lỗi: *"Bạn không có quyền thao tác trên công trình này."* (ĐẠT).
- **Điểm yếu bảo mật cần khắc phục (Minor Risk):** Action `createMaterialRequest` chưa kiểm tra xem `wbsItemId` truyền vào có đúng thuộc `projectId` đó hay không (Có nguy cơ truyền `wbsItemId` của Dự án A vào phiếu của Dự án B).

---

## 5. CURRENT APPROVAL WORKFLOW

- **Hạ tầng hiện có:** Hệ thống sử dụng chung model `ApprovalRequest` với `entityType = "MATERIAL_REQUEST"`.
- **Luồng hiện tại:** 
  1. Người dùng nhấn *"Gửi phê duyệt"* $\rightarrow$ Phiếu chuyển sang `SUBMITTED` $\rightarrow$ Hệ thống tạo 1 bản ghi `ApprovalRequest` trạng thái `PENDING`.
  2. Người có quyền duyệt (Chỉ huy trưởng / GĐ / PGĐ / Admin) vào Trung tâm Phê duyệt (`/approvals`) hoặc ngay tại màn hình Đề xuất nhấn *"Duyệt"*.
  3. Action `approveMaterialRequest` cập nhật `MaterialRequest.status = APPROVED`, `ApprovalRequest.status = APPROVED`, ghi vết vào `AuditLog`.
- **Hạn chế:**
  - Chưa hỗ trợ luồng duyệt nhiều cấp (Multi-stage Approval).
  - Chưa có bảng lưu chi tiết lịch sử từng bước duyệt (Step Approval History).
  - Tự động thực hiện nhập kho ngay khi duyệt.

---

## 6. CURRENT UI INVENTORY

Tại giao diện `/materials?tab=requests` (Quản lý vật tư $\rightarrow$ Tab Đề xuất vật tư):

- **Thành phần Danh sách:**
  - KPI Ribbon: Tổng đề xuất, Chờ duyệt, Đã duyệt, Từ chối.
  - Bộ lọc: Ô tìm kiếm (`q`), Trạng thái (`requestStatus`).
  - Bảng danh sách đề xuất (Desktop Table & Mobile Cards).
- **Thành phần Form (Drawer):**
  - Ghi chú chung.
  - Danh sách dòng vật tư (Combobox 2 chế độ: Trong danh mục / Ngoài danh mục).
  - Tên vật tư, Đơn vị, Số lượng đề xuất, Công việc liên quan (Combobox WBS / Mô tả tự do).
  - Các nút hành động: *Hủy*, *Lưu nháp*, *Gửi phê duyệt*.

---

## 7. EXCEL TEMPLATE DOMAIN ANALYSIS

Biểu mẫu Excel chính thức: **“ĐỀ XUẤT VẬT TƯ, VẬT LIỆU, MÁY MÓC THIẾT BỊ”**

### Cấu trúc Biểu mẫu Đích:

#### A. THÔNG TIN PHIẾU (Header)
- Ngày lập đề xuất
- Tên công trình
- Địa điểm
- Người yêu cầu
- Lý do mua hàng

#### B. DANH SÁCH VẬT TƯ (Items Grid)
1. **STT** (Số thứ tự dòng)
2. **Tên vật tư / vật liệu**
3. **Đơn vị**
4. **Khối lượng:**
   - *Theo hợp đồng*
   - *Thực tế*
5. **Quy cách / thông số kỹ thuật**
6. **Hãng sản xuất (xuất xứ)**
7. **Ghi chú**
8. **Dòng phân nhóm / hạng mục:** Dòng gom nhóm tiêu đề (VD: *“Phần Điện nhẹ”*), không chứa số lượng vật tư.

#### C. THỜI GIAN CẤP (Footer Info)
- **Ngày cấp về công trình**

#### D. PHÊ DUYỆT (Signatures Block)
- **NGƯỜI ĐỀ NGHỊ** $\rightarrow$ **PHÒNG KỸ THUẬT** $\rightarrow$ **PHÓ GIÁM ĐỐC**

---

## 8. FIELD MAPPING MATRIX

| Excel Field (Biểu mẫu đích) | Current UI (Màn hình hiện tại) | Current DB (Data model hiện tại) | Status | Action Required |
|-----------------------------|--------------------------------|----------------------------------|--------|-----------------|
| **Ngày lập đề xuất** | Tự động sinh / Chọn ngày | `MaterialRequest.requestDate` | **MATCH** | **KEEP** |
| **Tên công trình** | Tự động theo Context công trình | `Project.name` qua `projectId` | **MATCH** | **KEEP** (Tự động điền) |
| **Địa điểm** | Chưa có trên Form đề xuất | `Project.location` | **PARTIAL** | **MODIFY** (Tự động lấy từ `Project.location` đưa lên phiếu & file Excel) |
| **Người yêu cầu** | Tự động lấy User đang đăng nhập | `User.name` qua `requestedById` | **MATCH** | **KEEP** (Tự động điền) |
| **Lý do mua hàng** | Input *"Ghi chú chung"* | `MaterialRequest.note` | **PARTIAL** | **MODIFY** (Đổi label UI thành *"Lý do mua hàng"* / Bổ sung field `purchaseReason`) |
| **STT** | Số thứ tự dòng trên UI | Tính toán động | **PARTIAL** | **MODIFY** (Bổ sung `sequence` Int để cố định thứ tự dòng) |
| **Tên vật tư / vật liệu** | Input/Combobox `materialName` | `MaterialRequestItem.materialName` | **MATCH** | **KEEP** |
| **Đơn vị** | Input `unit` | `MaterialRequestItem.unit` | **MATCH** | **KEEP** |
| **Khối lượng theo hợp đồng** | **CHƯA CÓ** | **CHƯA CÓ** | **MISSING** | **ADD** (`contractQuantity` Decimal?) |
| **Khối lượng thực tế** | **CHƯA CÓ** | **CHƯA CÓ** | **MISSING / AMBIGUOUS** | **ADD** (`actualQuantity` Decimal?) + Cần làm rõ nghiệp vụ |
| **Quy cách / TS kỹ thuật** | **CHƯA CÓ** | **CHƯA CÓ** | **MISSING** | **ADD** (`specification` String?) |
| **Hãng sản xuất (xuất xứ)** | **CHƯA CÓ** | **CHƯA CÓ** | **MISSING** | **ADD** (`manufacturerOrigin` String?) |
| **Ghi chú (từng dòng)** | Input `note` từng dòng | `MaterialRequestItem.note` | **MATCH** | **KEEP** |
| **Dòng phân nhóm/Hạng mục** (VD: *“Phần Điện nhẹ”*) | **CHƯA CÓ** | **CHƯA CÓ** | **MISSING** | **ADD** (Bổ sung `groupName`/`sectionName` hoặc `isSectionHeader`) |
| **Ngày cấp về công trình** | **CHƯA CÓ TRÊN FORM UI** | `MaterialRequest.neededDate` | **PARTIAL** | **MODIFY** (Hiển thị trường `neededDate` lên UI Form với nhãn *"Ngày cấp về công trình"*) |
| **Workflow phê duyệt** | Phê duyệt 1 cấp đơn | `ApprovalRequest` | **PARTIAL** | **MODIFY** (Mở rộng luồng duyệt 3 cấp: Người đề nghị $\rightarrow$ Phòng Kỹ thuật $\rightarrow$ Phó Giám đốc) |

---

## 9. KEEP / MODIFY / REMOVE / ADD MATRIX

| Thành phần hiện tại | Quyết định | Lý do nghiệp vụ & kỹ thuật | Phương án xử lý |
|---------------------|------------|----------------------------|-----------------|
| **Catalog / Non-catalog Combobox** | **KEEP** | UX linh hoạt, cho phép chọn vật tư có sẵn trong danh mục chuẩn hoặc tự nhập vật tư đặc thù ngoài danh mục. | Giữ nguyên cơ chế Dual-mode Combobox. |
| **Công việc liên quan (`wbsItemId`)** | **KEEP AS INTERNAL METADATA** | Tuy không có trên mẫu Excel, trường này cực kỳ quan trọng đối với ERP để truy vết: *Công việc $\rightarrow$ Nhu cầu vật tư $\rightarrow$ Đề xuất $\rightarrow$ Mua hàng $\rightarrow$ Nhập/Xuất kho*. | Giữ nguyên trên DB và UI như metadata nội bộ ERP. Khi xuất Excel mẫu công ty sẽ không in cột này (hoặc đưa vào phụ lục nếu cần). |
| **Mức độ ưu tiên (`priority`)** | **KEEP AS INTERNAL METADATA** | Giúp Phòng Kỹ thuật & Lãnh đạo lọc/sắp xếp các đề xuất khẩn cấp để xử lý trước. | Giữ nguyên trên ERP UI. |
| **Tự động nhập kho khi duyệt** | **MODIFY** | **Bất cập lớn:** Duyệt phiếu đề xuất hiện tại đang tự động tạo `MaterialMovement` (IMPORT) và cộng tồn kho. Đề xuất mua hàng chưa đồng nghĩa với vật tư đã về kho. | Tách biệt workflow: Đề xuất duyệt xong chỉ đổi trạng thái sang `APPROVED`. Việc nhập kho sẽ do kho thực hiện khi vật tư thực tế về công trình. |
| **Giao diện nhập liệu 1 phiếu nhiều vật tư (1:N)** | **KEEP & ENHANCE** | Cấu trúc UI hiện tại đã đúng bản chất 1 Phiếu $\rightarrow$ N Dòng vật tư. | Mở rộng bảng nhập liệu để bổ sung các cột: *Khối lượng hợp đồng, Khối lượng thực tế, Quy cách kỹ thuật, Hãng SX/Xuất xứ*. |
| **Project Scoping & Context** | **KEEP & ENFORCE** | Đảm bảo người dùng chỉ được đề xuất cho công trình mình được giao quyền. | Giữ nguyên cơ chế kiểm tra `requireProjectAccess` và tự động fill Tên/Địa điểm công trình. |
| **Danh sách Đề xuất (Header Level)** | **KEEP** | Danh sách hiện tại quản lý theo từng Phiếu đề xuất (có mã phiếu `DXVT-...`, ngày tạo, tổng số dòng), khi click xem chi tiết toàn bộ phiếu. | Giữ nguyên góc nhìn theo Phiếu (Proposal Level). |

---

## 10. PROPOSED TARGET DOMAIN MODEL (CONCEPTUAL ONLY)

*(Lưu ý: Đây CHỈ LÀ mô hình lý thuyết đề xuất để đối chiếu audit. KHÔNG sửa Prisma schema trong turn này).*

```prisma
// CONCEPTUAL TARGET MODEL FOR AUDIT ONLY
model MaterialRequest {
  id            String                  @id @default(cuid())
  projectId     String
  requestNo     String                  @unique
  requestedById String
  requestDate   DateTime                @default(now())
  neededDate    DateTime?               // Ngày cấp về công trình
  purchaseReason String?                // Lý do mua hàng
  status        MaterialRequestStatus   @default(DRAFT)
  currentStep   ApprovalStep            @default(TECHNICAL_REVIEW) // Cấp duyệt hiện tại
  priority      MaterialRequestPriority @default(MEDIUM)
  note          String?                 // Ghi chú nội bộ ERP
  cancelReason  String?
  createdAt     DateTime                @default(now())
  updatedAt     DateTime                @updatedAt

  items         MaterialRequestItem[]
  approvalLogs  MaterialRequestApprovalLog[]
}

model MaterialRequestItem {
  id                   String   @id @default(cuid())
  materialRequestId    String
  sequence             Int      @default(0) // Số thứ tự / STT
  isSectionHeader      Boolean  @default(false) // Dòng tiêu đề nhóm (VD: "Phần Điện nhẹ")
  sectionName          String?  // Tên nhóm/hạng mục

  materialCode         String?
  materialName         String   // Tên vật tư / vật liệu
  unit                 String   // Đơn vị

  contractQuantity     Decimal? @db.Decimal(19, 4) // Khối lượng theo hợp đồng
  actualQuantity       Decimal? @db.Decimal(19, 4) // Khối lượng thực tế
  requestedQuantity    Decimal  @db.Decimal(19, 4) // Khối lượng đề xuất mua

  specification        String?  // Quy cách / thông số kỹ thuật
  manufacturerOrigin   String?  // Hãng sản xuất (xuất xứ)
  note                 String?  // Ghi chú dòng

  // Metadata nội bộ ERP
  wbsItemId            String?
  workItemNameSnapshot String?
}
```

---

## 11. PROPOSED UI INFORMATION ARCHITECTURE

### 11.1. Màn hình Danh sách Phiếu Đề xuất (`MaterialRequestList`)
- **Góc nhìn chính:** Quản lý theo **Phiếu đề xuất** (Header Level).
- **Cột thông tin chính:** Mã phiếu (`DXVT-2026-00018`), Ngày đề nghị, Công trình, Người đề nghị, Ngày cần cấp, Số dòng vật tư (VD: *15 loại*), Cấp duyệt hiện tại (*Chờ Phòng Kỹ thuật* / *Chờ Phó Giám đốc* / *Đã duyệt*), Thao tác.
- **Click vào dòng:** Mở Drawer/Modal Chi tiết xem toàn bộ biểu mẫu phiếu đề xuất đầy đủ thông tin.

### 11.2. Màn hình Form Tạo / Sửa Phiếu (`MaterialRequestForm`)
- **Header Block (Tự động fill + Nhập bổ sung):**
  - Tên công trình & Địa điểm: *Tự động lấy từ Project Context (Read-only)*.
  - Người yêu cầu: *Tự động lấy từ User đăng nhập (Read-only)*.
  - Ngày lập đề xuất: *Tự động lấy ngày hiện tại (Cho phép chỉnh sửa)*.
  - **[Mới]** Ngày cấp về công trình: *Field DatePicker bắt buộc/tùy chọn*.
  - **[Mới]** Lý do mua hàng: *Input Textarea*.
- **Grid nhập liệu Danh sách Vật tư (Table Grid):**
  - Hỗ trợ thêm dòng Vật tư hoặc Thêm dòng Phân nhóm (Section Header).
  - Các cột: STT | Tên vật tư | Đơn vị | KL Hợp đồng | KL Thực tế | KL Đề xuất | Quy cách TS kỹ thuật | Hãng SX (Xuất xứ) | Công việc liên quan (ERP Metadata) | Ghi chú.

---

## 12. PROPOSED APPROVAL WORKFLOW

Đề xuất cải tổ luồng phê duyệt 3 cấp phù hợp với biểu mẫu công ty:

```
[NGƯỜI ĐỀ NGHỊ] 
   │ (Tạo phiếu & Gửi phê duyệt)
   ▼
[PHÒNG KỸ THUẬT] ────(Từ chối / Yêu cầu sửa)────► [NHÁP / DRAFT]
   │ (Kiểm tra quy cách, KL hợp đồng, nhu cầu thực tế & Duyệt)
   ▼
[PHÓ GIÁM ĐỐC / GIÁM ĐỐC] ───(Từ chối)──────────► [TỪ CHỐI / REJECTED]
   │ (Phê duyệt duyệt chi / Mua hàng)
   ▼
[ĐÃ DUYỆT / APPROVED] ───► (Sẵn sàng cho Khâu Mua hàng & Nhập kho)
```

### Hạ tầng kỹ thuật đề xuất:
- Tận dụng `ApprovalRequest` dùng chung hiện có của hệ thống.
- Bổ sung trường `currentStep` hoặc quản lý thông qua trạng thái mở rộng:
  - `DRAFT`: Nháp.
  - `WAITING_TECHNICAL_APPROVAL`: Chờ Phòng Kỹ thuật duyệt.
  - `WAITING_DIRECTOR_APPROVAL`: Chờ Phó Giám đốc duyệt.
  - `APPROVED`: Đã duyệt hoàn tất.
  - `REJECTED`: Từ chối.
  - `REVISION_REQUESTED`: Yêu cầu chỉnh sửa lại.

---

## 13. EXCEL / PDF / PRINT STRATEGY

### 13.1. Phân định ranh giới thiết kế
- **Web UI Form:** Tối ưu hóa UX nhập liệu hiện đại (Grid responsive, Combobox tìm kiếm nhanh, Validate realtime, gợi ý từ Catalog). Không ép giao diện Web phải trông giống hệt 100% trang giấy Excel vì sẽ làm giảm trải nghiệm người dùng trên màn hình máy tính/điện thoại.
- **Excel Export Engine:** Đảm bảo **tái tạo 100% chính xác biểu mẫu công ty**.

### 13.2. Hạ tầng xuất file (Export Engine)
- Sử dụng thư viện `exceljs` (Đã có sẵn trong `package.json` phiên bản `4.4.0` và đang dùng rất tốt ở phân hệ HR).
- Xây dựng module `material-request-excel-exporter.ts`:
  - Định dạng Font: `Times New Roman` / `Segoe UI`.
  - Header: Tên công ty, Quốc hiệu, Tiêu đề *“ĐỀ XUẤT VẬT TƯ, VẬT LIỆU, MÁY MÓC THIẾT BỊ”*.
  - Khối thông tin: Ngày lập, Tên công trình, Địa điểm, Người yêu cầu, Lý do mua hàng.
  - Bảng dữ liệu: Kẻ khung border, gộp ô Header (Merged Cells), căn lề chuẩn, định dạng dòng Phân nhóm in đậm (Bold Section Rows).
  - Khối chữ ký footer: 3 cột chữ ký (*NGƯỜI ĐỀ NGHỊ*, *PHÒNG KỸ THUẬT*, *PHÓ GIÁM ĐỐC*).

---

## 14. EXISTING DATA MIGRATION IMPACT

Nếu tiến hành nâng cấp Data Schema trong tương lai:

1. **Chiến lược Migration an toàn (Additive Migration Strategy):**
   - **KHÔNG DROP DB** hay xóa bảng/cột hiện có.
   - Thêm các cột mới dạng `Nullable` (`contractQuantity`, `actualQuantity`, `specification`, `manufacturerOrigin`, `sectionName`, `purchaseReason`).
2. **Backfill dữ liệu cũ:**
   - Đặt giá trị mặc định cho dữ liệu lịch sử: `purchaseReason = note`, `neededDate = requestDate + 3 days`.
   - Giữ nguyên các phiếu đề xuất cũ mà không làm vỡ giao diện.

---

## 15. DEPENDENCY & REGRESSION RISK

1. **Rủi ro Phân hệ Kho (`Inventory / Stock`):**
   - Hiện tại `approveMaterialRequest` đang tự động gọi `tx.projectMaterialStock.upsert` và `tx.materialMovement.create`.
   - Nếu sửa luồng duyệt mà không tách việc Nhập kho ra khỏi hành động Duyệt đề xuất, dữ liệu tồn kho sẽ bị sai lệch.
2. **Rủi ro Trung tâm Phê duyệt (`/approvals`):**
   - `ApprovalRequest` đang được đồng bộ trực tiếp với `MaterialRequest`. Nếu thay đổi enum trạng thái hoặc thêm bước duyệt, cần đảm bảo `src/app/(dashboard)/approvals/actions.ts` không bị crash.
3. **Rủi ro Báo cáo Nhật ký Thi công (`SiteReport`):**
   - Model `MaterialRequest` có quan hệ `siteReportId`. Cần đảm bảo các phiếu đề xuất tạo từ nhật ký vẫn truy vết bình thường.

---

## 16. SECURITY / RBAC RISK

1. **Cross-project Data Pollution:** Cần bổ sung validation server-side để đảm bảo `wbsItemId` được gửi lên thuộc về đúng `projectId` của phiếu đề xuất.
2. **Double-submit & Concurrent Approvals:** Cần sử dụng Prisma Transaction (`tx`) và kiểm tra trạng thái trước khi duyệt để tránh trường hợp 2 người dùng bấm duyệt đồng thời (Race Condition).
3. **State Mutation Guard:** Sau khi phiếu đã ở trạng thái `APPROVED` hoặc `WAITING_DIRECTOR_APPROVAL`, Người đề nghị KHÔNG được quyền sửa nội dung dòng vật tư.

---

## 17. BUSINESS CLARIFICATIONS REQUIRED (DANH SÁCH CẦN LÀM RÕ NGHỆP VỤ)

Dưới đây là 11 câu hỏi nghiệp vụ quan trọng chưa đủ bằng chứng trong codebase, cần Chủ quản dự án xác nhận trước khi triển khai code:

1. **“Khối lượng theo hợp đồng” lấy từ đâu?**  
   - Lấy tự động từ BOQ / WBS / Dự toán của dự án, hay cho phép Người đề nghị nhập thủ công trên từng dòng phiếu?
2. **“Khối lượng thực tế” chính xác có nghĩa là gì?**  
   - Là khối lượng đã thi công nghiệm thu tại hiện trường? Khối lượng thực tế đã nhập kho tính đến thời điểm đề xuất? Hay khối lượng cần dùng thực tế tại công trường?
3. **Có được phép đề xuất vượt khối lượng hợp đồng hay không?**  
   - (VD: Khối lượng hợp đồng = 100, nhưng thực tế đề xuất = 120).
4. **Nếu vượt khối lượng hợp đồng thì hệ thống CẢNH BÁO (Warning) hay CHẶN (Block không cho gửi)?**
5. **Cột "Hãng sản xuất (xuất xứ)" trên biểu mẫu là BẮT BUỘC hay TÙY CHỌN (Optional)?**
6. **Cột "Quy cách / thông số kỹ thuật" là BẮT BUỘC hay TÙY CHỌN?**
7. **"Ngày cấp về công trình" (`neededDate`) có BẮT BUỘC chọn không?**
8. **Workflow phê duyệt có chuẩn hóa cố định 3 cấp:**  
   `Người đề nghị` $\rightarrow$ `Phòng kỹ thuật` $\rightarrow$ `Phó giám đốc` hay không? Có trường hợp công trình bỏ qua Phòng kỹ thuật hoặc cần thêm Chỉ huy trưởng công trình không?
9. **Những người thuộc vai trò (`ProjectRole`) nào được phép tạo phiếu đề xuất?**  
   (Tất cả thành viên dự án, hay chỉ Kỹ sư hiện trường / Đội trưởng / QAQC?)
10. **Sau khi phiếu đề xuất được duyệt, hệ thống có tự động sinh Yêu cầu mua hàng (Purchase Request / PO) hay không?**  
    Hay chuyển sang trạng thái chờ Kho / Mua hàng xử lý?
11. **Phiếu đề xuất đã duyệt có tự động cộng vào tồn kho không?**  
    (Khuyến nghị: KHÔNG tự động cộng kho khi duyệt phiếu đề xuất, chỉ cộng kho khi có Phiếu Nhập Kho thực tế).

---

## 18. RECOMMENDED IMPLEMENTATION PHASES

- **Phase 1: Làm rõ Nghiệp vụ & Chốt thiết kế (Business Sign-off)**
  - Chốt trả lời cho 11 câu hỏi nghiệp vụ ở Mục 17.
  - Phê duyệt Báo cáo Audit này.
- **Phase 2: Nâng cấp Schema & Server Actions (Backend Migration)**
  - Thêm các field mới vào `schema.prisma` (`contractQuantity`, `actualQuantity`, `specification`, `manufacturerOrigin`, `sectionName`, `purchaseReason`).
  - Cập nhật Zod validation schema & Server Actions (`createMaterialRequest`, `updateMaterialRequest`).
  - Tách luồng Phê duyệt khỏi luồng Tự động Nhập kho.
- **Phase 3: Cải tạo Form & Danh sách UI (Frontend Polish)**
  - Cập nhật `MaterialRequestForm` để bổ sung các cột dữ liệu mới và dòng Phân nhóm.
  - Cập nhật `MaterialRequestDetail` & `MaterialRequestList` hiển thị cấp duyệt và thông tin chi tiết.
- **Phase 4: Xây dựng Module Xuất Excel & PDF (`ExcelJS Engine`)**
  - Xây dựng `material-request-excel-exporter.ts` sử dụng `exceljs` xuất chuẩn 100% biểu mẫu công ty.
  - Thêm nút *"Xuất Excel chuẩn"* và *"In phiếu"* trên giao diện xem chi tiết.
- **Phase 5: Kiểm thử E2E & Release Certification**
  - Kiểm thử phân quyền RBAC, cross-project security, luồng phê duyệt và xuất file Excel.

---

## 19. FILES THAT WOULD LIKELY NEED MODIFICATION (Khi triển khai)

- `prisma/schema.prisma` (Cập nhật Schema)
- `src/app/actions/material-request.ts` (Cập nhật Server Actions)
- `src/lib/material-requests/validation.ts` (Cập nhật Zod Schema)
- `src/lib/material-request/serializers.ts` (Cập nhật Serializers)
- `src/components/material-request/material-request-form.tsx` (Cập nhật Form UI)
- `src/components/material-request/material-request-detail.tsx` (Cập nhật Detail UI)
- `src/components/material-request/material-request-list.tsx` (Cập nhật List UI)
- `src/app/(dashboard)/approvals/actions.ts` (Cập nhật Approval Sync)
- `src/lib/materials/material-request-excel-exporter.ts` (File mới tạo cho ExcelJS)

---

## 20. FILES THAT MUST NOT BE TOUCHED UNNECESSARILY

- `src/lib/rbac.ts` (Hạ tầng RBAC cốt lõi hệ thống)
- `src/lib/auth.ts` (Hạ tầng Session/Auth)
- `src/lib/prisma.ts` (Prisma Singleton)
- các phân hệ không liên quan: `HR`, `Supervision`, `Safety`, `WBS`, `Documents`.

---

## 21. FINAL RECOMMENDATION & RELEASE DECISION

### QUYẾT ĐỊNH ĐÁNH GIÁ HỆ THỐNG:

- **CURRENT SYSTEM:** `PARTIAL`  
  *(Hệ thống hiện tại đã có khung hạ tầng tốt nhưng thiếu các trường dữ liệu biểu mẫu Excel công ty và bị lệch luồng tự động nhập kho khi duyệt).*
- **TARGET READINESS:** `NEEDS BUSINESS DECISION`  
  *(Cần làm rõ 11 câu hỏi nghiệp vụ tại Mục 17 trước khi chốt Schema).*
- **IMPLEMENTATION:** `CONDITIONAL GO`  
  *(Sẵn sàng triển khai ngay khi nhận được phản hồi làm rõ nghiệp vụ từ Chủ quản dự án).*

---
*Báo cáo được hoàn thành tự động bởi AI Coding Assistant - Không có bất kỳ thay đổi mã nguồn nào được thực hiện.*
