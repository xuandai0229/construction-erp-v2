# SAFE TEST DATA CLEANUP DRY-RUN REPORT

## 1. Thông tin Môi trường
- **Branch hiện tại**: `main`
- **Commit hiện tại**: `eb5ebea (HEAD -> main) Chuan hoa confirm dialog toast va thong bao he thong`
- **Tình trạng Git**: Cây làm việc sạch sẽ trước khi thực thi dry-run.
- **Database env**: `postgresql://***:***@127.0.0.1:5432/construction_erp_v2?schema=public`

---

## 2. Xác nhận An toàn
- **KHÔNG XÓA/SỬA DATABASE**: Phase này được chạy ở chế độ DRY-RUN 100%. Các thao tác chỉ là đọc (`findMany`, `count`).
- **KHÔNG COMMIT/PUSH**: Kết quả phân tích được lưu tạm để review.

---

## 3. Tổng hợp Dữ liệu Dry-Run

### Số lượng chắc chắn có thể dọn (Safe to Cleanup)
- **Projects**: 33
- **Material Requests**: 5
- **Users**: 0 (Tài khoản test `qa-soft-delete` đã được dọn tự động qua các script test trước đó).
- **Document Folders**: 0 (Các folder test lại thuộc về các project thuộc nhóm Needs Confirmation).

### Số lượng cần xác nhận thủ công (Needs Confirmation)
- **Projects**: 6
- **Material Requests**: 0
- **Field Progress Entries**: 40
- **Document Folders**: 3
- **Audit Logs**: 0 (Chưa tìm thấy log mồ côi không thuộc project nào).

### Số lượng giữ lại (Keep)
- **Projects**: 1 (Công trình thật/demo)
- **Users**: 6 (Các tài khoản admin và director).

---

## 4. Chi tiết Bảng Dữ liệu

### Bảng 1 — Safe Cleanup Candidates
| STT | Loại | ID | Code/RequestNo | Tên | Liên kết sẽ ảnh hưởng | Mức an toàn | Đề xuất |
|---:|---|---|---|---|---|---|---|
| 1 | Project | `cmqhx5z...` | `QA_UAT_CT_NGUYEN_TRAI_2026` | QA_UAT_Cải tạo tuyến thoát nước Nguyễn Trãi 2026 | WBS, Entry, Folders, MRs | CAO | Hard Delete (Cascade) |
| 2-29 | Project | Nhiều ID | `QA_UAT_178...` | QA_UAT_Cải tạo tuyến thoát nước Nguyễn Trãi 2026 | WBS, Entry, Folders, MRs | CAO | Hard Delete (Cascade) |
| 30 | Project | `cmqival...` | `QA_RBAC_CT_001` | Công trình RBAC Test 001 | WBS, Entry, Folders, MRs | CAO | Hard Delete (Cascade) |
| 31 | Project | `cmqival...` | `QA_RBAC_CT_002` | Công trình RBAC Test 002 | WBS, Entry, Folders, MRs | CAO | Hard Delete (Cascade) |
| 32-36| Mat. Req. | Nhiều ID | `TEST_CRUD_MR_...` | N/A | MR Items | CAO | Hard Delete |

### Bảng 2 — Needs Confirmation
| STT | Loại | ID | Code/Email/RequestNo | Tên | Lý do chưa chắc | Cần hỏi |
|---:|---|---|---|---|---|---|
| 1 | Project | `cmq1u...` | `CT001` | Tòa nhà Văn phòng ABC (test) | Có chữ `test` nhưng thiếu prefix `QA_` | Có dọn dự án này không? |
| 2 | Project | `cmq1u...` | `QA-TEST-001` | Dự án thử nghiệm 01 | Thiếu dấu `_` chuẩn (QA_UAT_) | Có dọn dự án này không? |
| 3 | Project | `cmq1u...` | `CT-QA-PROGRESS` | Công trình test tiến độ động | Có chữ `test` | Có dọn dự án này không? |
| 4 | Project | `cmq4o...` | `123` | test12 | Có chữ `test` | Có dọn dự án này không? |
| 5 | Project | `cmq4o...` | `CT0011` | test1 | Định danh blacklist | Có dọn dự án này không? |
| 6 | Project | `cmq6h...` | `ct_01` | Công Trình test | Định danh blacklist | Có dọn dự án này không? |
| 7-46| Field Entry | Nhiều | N/A | Entry khối lượng | Nằm trên Project thật/demo nhưng Note ghi chữ `test`. | Có muốn xóa để làm sạch tiến độ demo không? |
| 47-49| Doc Folder | Nhiều | N/A | `SubFolder Test` | Folder tên test nhưng nằm trên Project thật (chưa bị xóa) | Có muốn dọn các thư mục này không? |

### Bảng 3 — Keep
| STT | Loại | ID | Code/Email | Tên | Lý do giữ |
|---:|---|---|---|---|---|
| 1 | User | `cmq4l...` | `admin@construction.local` | Admin | Tài khoản System Admin (Seed) |
| 2 | User | `cmqiv...` | `director@construction.local` | Director | Tài khoản Seed |
| 3 | User | `cmqiv...` | `deputy@construction.local` | Deputy Director | Tài khoản Seed |
| 4 | User | `cmqiv...` | `commander1@construction.local`| Chief Commander 1 | Tài khoản Seed |
| 5 | User | `cmqiv...` | `commander2@construction.local`| Chief Commander 2 | Tài khoản Seed |
| 6 | Project| `cmq4o...` | `CT-001` | Tòa nhà Văn phòng ABC | Không chứa bất kỳ cụm từ test nào |

---

## 5. Rủi ro nếu Hard Delete

- Theo Prisma Schema (`prisma/schema.prisma`), mọi bảng con như `FieldProgressTemplate`, `FieldProgressItem`, `FieldProgressEntry`, `MaterialRequest`, `DocumentFolder`, và `ProjectMember` đều gắn `onDelete: Cascade` với `Project`. 
- **Nếu xóa 33 Projects "Safe to Cleanup"**, Prisma sẽ tự động dọn sạch mọi dữ liệu liên quan nằm trong các dự án này một cách an toàn mà không để lại rác mồ côi (trừ `AuditLog`).
- Không có rủi ro nào đối với nhóm `Safe to Cleanup` bởi vì các định danh cực kỳ rõ ràng (`QA_UAT_`, `QA_RBAC_`). Dữ liệu demo chính (`CT-001`) hoàn toàn được bảo vệ.

---

## 6. Nhận xét về Script Test

- **`qa-material-requests-crud-test.ts`**: Đã dọn dẹp phần rác sinh ra *trước* khi chạy, nhưng kết thúc không dọn dẹp. Gây ra tình trạng để lại 5 Material Requests rác. **Nên sửa: Đưa lệnh delete vào block `finally` ở Phase sau.**
- **`qa-field-progress-uat-integration.ts`**: Thực hiện test luồng Soft Delete nên chỉ dùng `update({ deletedAt: new Date() })`, để lại rác trong DB.
- Đề xuất: Không chạy script tạo dữ liệu trực tiếp trên DB Production mà không có cơ chế rollback hoặc dọn rác tự động.

---

## 7. Đề xuất & Kết luận

**Có nên execute không?**
Có. Bạn nên execute dọn dẹp Nhóm 1 (Safe Cleanup Candidates).

**Đề xuất Phase Sau:**
1. Thực hiện lệnh `pg_dump` để backup DB hiện tại.
2. Thiết lập script execute sử dụng Prisma Transaction. Script này sẽ đọc từ file kết quả JSON (`test-data-cleanup-dry-run-results.json`), lặp qua mảng `safeToCleanup.projects` và `safeToCleanup.materialRequests` để xóa thông qua ID cụ thể bằng lệnh `deleteMany({ id: { in: ids } })`.
3. Chỉ execute những bản ghi có trong `safeToCleanup`, không động vào `needsConfirmation`.

---

## 8. Trạng thái Git Cuối Phase

`git status --short`:
```text
A  docs/qa/TEST_UAT_DATA_INVENTORY_AUDIT_REPORT.md
?? docs/qa/SAFE_TEST_DATA_CLEANUP_DRY_RUN_REPORT.md
?? docs/qa/test-data-cleanup-dry-run-results.json
```

**Xác nhận:** KHÔNG CÓ BẤT KỲ FILE NÀO BỊ COMMIT HAY PUSH TRONG PHASE NÀY. Dữ liệu Database vẫn nguyên vẹn. Mọi kết quả hiện đang dừng lại ở bước Dry-Run.
