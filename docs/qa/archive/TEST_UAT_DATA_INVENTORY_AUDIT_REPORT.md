# TEST / UAT DATA INVENTORY AUDIT REPORT

## 1. Môi trường Audit
- **Branch hiện tại**: `main`
- **Commit hiện tại**: `eb5ebea (HEAD -> main) Chuan hoa confirm dialog toast va thong bao he thong`
- **Tình trạng Git**: Working tree clean (Sạch sẽ, không có file chưa được theo dõi).
- **Database env**: `postgresql://***:***@127.0.0.1:5432/construction_erp_v2?schema=public`

---

## 2. Tổng quan số lượng dữ liệu toàn hệ thống
Dựa trên script quét bằng Prisma ORM (Chỉ Read-Only):

- **Tổng số User**: 6 (5 Active, 1 Locked, 1 Soft-deleted)
- **Tổng số Project**: 40 (38 Active, 5 Soft-deleted)
- **Tổng số FieldProgressItem (WBS)**: 388
- **Tổng số FieldProgressEntry (Cập nhật tiến độ)**: 515
- **Tổng số MaterialRequest (Phiếu vật tư)**: 58
- **Tổng số MaterialRequestItem (Chi tiết phiếu)**: 131
- **Tổng số DocumentFolder**: 300
- **Tổng số Document**: 4
- **Tổng số AuditLog**: 1060

---

## 3. Danh sách dữ liệu Test / UAT / QA phát hiện

Qua việc scan keyword (`QA_`, `TEST`, `demo`, v.v.):
- **User Test**: 5 tài khoản Seed hệ thống (`admin@`, `director@`, `deputy@`, `commander1@`, `commander2@`). Tài khoản thứ 6 có thể là tài khoản soft-delete đã được dọn nhưng vẫn tồn tại do test kịch bản soft-delete.
- **Project Test**: 39 công trình có chữ "test" hoặc "QA_" (VD: `QA_UAT_Cải tạo tuyến thoát nước Nguyễn Trãi 2026`, `QA_RBAC_CT_001`, `QA_RBAC_CT_002`, `Công Trình test`).
- **Material Request Test**: 5 phiếu vật tư có prefix `TEST_CRUD_MR_*`.
- **Field Progress Entry Test**: 40 bản ghi khối lượng có issue/proposal note chứa keyword test.
- **Document Folder Test**: 3 thư mục có tên `SubFolder Test`.

---

## 4. Phân loại dữ liệu (A, B, C, D) và Đề xuất

| Nhóm | Loại dữ liệu | Định danh / Prefix | Số lượng | Liên kết bị ảnh hưởng | Đề xuất | Ghi chú |
|---|---|---|---:|---|---|---|
| **A** | User | `admin@`, `director@`, `commander1@`, `commander2@`, `deputy@` | 5 | ProjectMember, AuditLog, MaterialRequest | **GIỮ LẠI** | Đây là các tài khoản Seed mặc định cần thiết để đăng nhập và giữ quyền quản trị/test hệ thống. |
| **B** | Project | Project duy nhất không có chữ "QA_UAT" hoặc "Test" | 1 | Tất cả bảng (WBS, Entry, Folder, Material) | **GIỮ LẠI** | Dự án gốc làm demo (ví dụ Cải tạo đường Cầu Giấy nếu có). |
| **C** | Project | `QA_UAT_178...`, `QA_RBAC_CT_*`, `CT0011`, `ct_01` | 39 | FieldProgressTemplate, Items, Entries, Folders | **NÊN DỌN** (Hard delete) | Các dự án rác sinh ra từ script Playwright test liên tục. Nên hard-delete qua Transaction (Do schema bật `onDelete: Cascade` nên sẽ dọn sạch dữ liệu con). |
| **C** | Material Request | `TEST_CRUD_MR_*` | 5 | MaterialRequestItem | **NÊN DỌN** (Hard delete) | Dữ liệu rác sinh ra từ script CRUD test. |
| **C** | Document Folder | `SubFolder Test` | 3 | Documents bên trong | **NÊN DỌN** (Hard delete) | |
| **D** | Field Progress Entry | Các entry trên công trình gốc nhưng sinh ra do UAT script | ~40 | MaterialRequestItem | **Cần check lại** | Nếu thuộc Project Nhóm C thì sẽ bị xóa theo cascade. Nếu thuộc Project Nhóm B (Demo), cần hỏi xem có muốn reset tiến độ demo về 0 hay không. |

---

## 5. Rủi ro nếu xóa và Liên kết dữ liệu

1. **Prisma Cascade Delete**: Đa số các model (`ProjectMember`, `WBSItem`, `FieldProgressEntry`, `DocumentFolder`, `MaterialRequest`) đều đã được cấu hình `onDelete: Cascade` từ bảng `Project`. Do đó, nếu ta **hard-delete** các dự án nhóm C (`QA_UAT_*`), các dữ liệu rác ăn theo dự án đó sẽ **tự động bốc hơi an toàn** ở mức CSDL.
2. **AuditLog**: Model `AuditLog` có `userId` set `SetNull` nhưng `projectId` không liên kết Foreign Key cứng. Xóa Project có thể để lại các AuditLog mồ côi (có projectId nhưng không tìm thấy Project). Đây không phải rủi ro sập app, nhưng làm rác bảng Log. Nên xóa cả AuditLog của các QA_ projects.
3. **Mất dữ liệu thật**: Không được phép xóa các project không chứa chuỗi nhận diện Test/QA nếu không có xác nhận.

---

## 6. Đánh giá các script test có để lại dữ liệu không

Tại thư mục `scripts/`:

1. **`qa-material-requests-crud-test.ts`**:
   - **Tạo dữ liệu?** Có.
   - **Dọn dẹp?** Chỉ dọn dẹp **trước** khi chạy (xóa các phiếu `TEST_CRUD_MR_`), không dọn sau khi chạy xong. Đó là lý do trong DB đang có 5 phiếu này.
   - **Đề xuất**: Nên chuyển đoạn logic `deleteMany` xuống `finally {}` để dọn dẹp sau test.

2. **`qa-material-requests-integration-test.ts`**:
   - **Tạo dữ liệu?** Có.
   - **Dọn dẹp?** Có dọn dẹp ngay ở cuối file. Không để lại rác.

3. **`qa-user-management-soft-delete-restore-test.ts`**:
   - **Tạo dữ liệu?** Có (User `qa-soft-delete@construction.local`).
   - **Dọn dẹp?** Có thực hiện dọn dẹp trong block `finally {}`. Tốt, không rác.

4. **`qa-field-progress-uat-integration.ts`**:
   - **Tạo dữ liệu?** Có tạo tiến độ mới.
   - **Dọn dẹp?** Chủ yếu test tính năng "Soft Delete" bằng cách update `deletedAt = new Date()`. Nên sau khi chạy xong DB có chứa rất nhiều bản ghi soft-deleted (5 dự án, nhiều entry bị xóa mềm). Trạng thái DB có nguy cơ phình to nếu chạy script này liên tục.
   - **Đề xuất**: Thay vì test soft-delete rồi bỏ đó, nên có script dọn dẹp hard-delete các dữ liệu test đã bị soft-delete này định kỳ.

---

## 7. Phương án Cleanup An Toàn đề xuất (Chưa thực thi)

Dựa trên phân tích, dữ liệu có ranh giới cực kỳ rõ ràng giữa Test/UAT và Demo. Tôi đề xuất chiến lược Dọn Dẹp an toàn gồm các bước:

**Chỉ Hard Delete các dữ liệu RÁC SINH RA TỪ BOT/TEST SCRIPTS:**
- Hard Delete tất cả các Project có `code` chứa `QA_UAT_`, `QA_RBAC_`, `CT0011`, `ct_01`.
- Nhờ cơ chế `Cascade` của Prisma, việc này sẽ dọn sạch 95% WBS, Entry, Request rác.
- Hard Delete các Material Request chứa `requestNo` bắt đầu bằng `TEST_`.
- Xóa các AuditLog liên quan đến các ProjectId/UserId vừa bị xóa (nếu có thể).

**Quy trình thực thi đề xuất cho Phase kế tiếp:**
```text
PHASE: SAFE TEST DATA CLEANUP DRY-RUN
1. Chạy script tạo bản sao lưu (Backup / Dump DB local).
2. Viết một script Prisma thực hiện DRY-RUN (Chỉ in ra console số lượng bản ghi sẽ bị xóa ở các bảng).
3. Sau khi xác nhận an toàn, script mới được truyền cờ `--execute` để thực thi qua Database Transaction (`prisma.$transaction`).
4. Chạy lại bộ kiểm thử UI Regression để đảm bảo dữ liệu Demo còn nguyên và app không sập.
```

---

## 8. Kết luận và Xác nhận

- **Có nên cleanup ngay không?** Có, nên tiến hành Phase kế tiếp (DRY-RUN Cleanup) ngay lập tức để làm sạch môi trường, vì số lượng Project UAT rác (39 projects) đang làm chật chội UI, khó cho người dùng thật test nghiệm thu chức năng tìm kiếm/phân trang.
- **Xác nhận**: Tôi cam kết **chưa sửa / chưa xóa** bất cứ dòng dữ liệu nào trong cơ sở dữ liệu.
- **Xác nhận Git**: Tôi **chưa commit** hay **push** bất cứ file nào. Báo cáo này hoàn toàn ở chế độ read-only.
