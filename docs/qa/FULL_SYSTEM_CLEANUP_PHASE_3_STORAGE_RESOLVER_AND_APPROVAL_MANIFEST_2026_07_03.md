# BÁO CÁO FULL SYSTEM DATA CLEANUP PHASE 3: STORAGE RESOLVER & APPROVAL MANIFEST
Mã phase: FULL_SYSTEM_CLEANUP_PHASE_3_STORAGE_RESOLVER_AND_APPROVAL_MANIFEST_2026_07_03

## 1. KẾT LUẬN
- **Trạng thái:** PASS CÓ ĐIỀU KIỆN.
- Tất cả script (audit, cleanup, quarantine, restore) đều hoạt động ở chế độ **Dry-run**.
- **Không có dữ liệu DB bị xóa, không có file thật bị di chuyển.** 
- Tuyệt đối bảo vệ dữ liệu dự án Tây Hồ và Trần Quang Hiếu.

## 2. VÌ SAO PHASE 2 VẪN CHƯA ĐƯỢC XÓA THẬT
Phase 2 bị dừng lại do thuật toán kiểm tra file storage bị sai lệch (so sánh đường dẫn `projects/...` trong DB với `storage/projects/...` trên ổ cứng mà không normalize), dẫn đến false positive khi 16 file thật của dự án Tây Hồ bị đánh dấu là "missing". Ngoài ra, manifest Phase 2 gom chung file rác, file test và file thật của project KEEP vào danh sách quarantine, tạo rủi ro mất dữ liệu ngầm. Việc thiếu vắng script quarantine và file Approval Manifest độc lập cũng là nguyên nhân chặn đứng luồng xóa.

## 3. STORAGE RESOLVER TRƯỚC VÀ SAU
- **Trước (Phase 2):** Chỉ đối chiếu string match `fs.existsSync(dbPath)`.
- **Sau (Phase 3):** Hàm `resolveStoragePath` thử nghiệm 3 candidates:
  1. `path.resolve(process.cwd(), dbPath)`
  2. `path.resolve(process.cwd(), 'storage', dbPath)`
  3. `path.resolve(process.cwd(), 'public/uploads', dbPath)`
  Đồng thời áp dụng `normalizePath()` (chuyển sang chữ thường, chuẩn hóa slash) trước khi đưa vào tập hợp `Set` để phân loại. 

## 4. MISSING FILES TRƯỚC VÀ SAU
- **Trước khi sửa:** 16 files bị báo là Missing.
- **Sau khi sửa:** 0 files. Toàn bộ 16 files của Dự án Tây Hồ đã được resolve chính xác vào mảng `referencedFilesFound` với độ tin cậy (`matchConfidence: 'HIGH'`).

## 5. ORPHAN FILES TRƯỚC VÀ SAU
- **Trước khi phân loại:** 34 orphan files chung một rổ.
- **Sau khi phân loại:** Tách thành các nhóm:
  - `keepProjectPhysicalFiles`: Các file nằm dưới thư mục `HN-TH-2026-001` nhưng không có trong DB.
  - `qaTestArtifactFiles`: Các file sinh ra từ e2e tests (chứa từ khóa `QA_E2E_PROJ`, `codex`, `size-test`...).
  - `orphanPhysicalFiles`: Các file thuộc về dự án test như `123`, `ct_01`.
  - Kết quả cuối cùng: Orphan rác thực sự chỉ còn lại các file thuộc `ct_01` và `123`.

## 6. BẢO VỆ FILE THUỘC KEEP PROJECT NHƯ THẾ NÀO
- Dự án Tây Hồ (`HN-TH-2026-001`) và Trần Quang Hiếu (`HN-TQH-2026-002`) được add cứng vào danh sách `keepProtections` trong Approval Manifest.
- Bất kỳ file nào (dù orphan hay có DB) nếu đường dẫn chứa ID hoặc Code của 2 dự án này đều **BỊ CẤM** quarantine, trừ khi người dùng chủ động gắn cờ `allowKeepProjectFileQuarantine=true` trong approval.

## 7. PHÂN LOẠI QA/TEST ARTIFACT
Thuật toán regex chặn các từ khóa: `/QA_E2E_PROJ|test|uat-upload-fixtures|qa-realistic|size-test|codex/i`.
- File thỏa mãn sẽ vào `qaTestArtifactFiles` với Risk = LOW (hoặc MEDIUM nếu >10MB).
- Action yêu cầu là `MANUAL_APPROVE_QUARANTINE`.

## 8. MANIFEST INPUT REQUIREMENTS
Mảng `inputRequirements.modules` trong `data-cleanup-manifest-redo-2026-07-03.json` đã được điền đủ cấu trúc cho 14 modules: Dashboard, Settings, Users, Projects, WBS, Documents, Daily Reports, Weekly Reports, Materials, Material Requests, Suppliers, Contracts, Payments, Approvals.

## 9. APPROVAL MANIFEST MỚI
File `docs/qa/data-cleanup-approval-manifest-2026-07-03.json` ra đời.
- File JSON này hoạt động như một "hợp đồng" với User.
- Thuộc tính `requiresUserEdit` mặc định là `true`, sẽ block quá trình live delete cho tới khi bạn đổi nó thành `false`.
- Các mảng `projects`, `files` mặc định rỗng. Người dùng copy phần tử từ Audit Manifest sang đây và set cờ approval.

## 10. QUARANTINE DRY-RUN SCRIPT
File `scripts/quarantine-orphan-storage-files.ts` (100% dry-run trừ khi truyền env live delete cực đoan).
- Chỉ đọc từ Approval Manifest.
- Bypass file KEEP nếu thiếu cờ allow.
- Giả lập di chuyển file vào thư mục `.cleanup-quarantine/2026-07-03/storage/`.
- Nếu live mode, sẽ sinh ra log restore vào `docs/qa/quarantine-restore-manifest-2026-07-03.json`.

## 11. RESTORE SCRIPT
File `scripts/restore-quarantine-storage-files.ts` 
- Lấy input từ `quarantine-restore-manifest-2026-07-03.json`.
- Dry-run giả lập việc hoàn trả (restore) các file từ thư mục quarantine về lại thư mục gốc ban đầu nếu hệ thống phát hiện lỗi UI sau khi dọn dẹp.

## 12. CLEANUP SCRIPT ĐÃ KHÓA LIVE DELETE THẾ NÀO
- Buộc đọc từ Approval Manifest thay vì Audit Manifest.
- Abort ngay nếu `requiresUserEdit: true`.
- Nếu Project Approval thiếu `forceManualReviewApproved: true` (đối với dự án có dữ liệu con) -> Abort.
- Nếu Project Approval có Báo Cáo Hiện Trường mà thiếu `secondaryApproval: true` -> Abort.
- Nếu Project ID nằm trong `keepProtections` -> Critical Abort.

## 13. KẾT QUẢ TEST
1. `npx prisma validate`: **PASS**
2. `npx tsc --noEmit`: **PASS**
3. `npx tsx scripts/audit-full-system-data-cleanup-readonly.ts`: **PASS** (Xuất ra manifest phase 3 hoàn chỉnh với 0 missing files).
4. `npx tsx scripts/cleanup-full-system-stale-data.ts --dry-run`: **PASS** (Báo 0 project bị xóa, Abort gracefully vì requiresUserEdit=true).
5. `npx tsx scripts/quarantine-orphan-storage-files.ts --dry-run`: **PASS** (Báo 0 file bị di chuyển).
6. `npx tsx scripts/restore-quarantine-storage-files.ts --dry-run`: **PASS** (Báo lỗi không tìm thấy restore manifest hợp lệ - điều này là ĐÚNG vì chưa từng chạy live quarantine).

## 14. NHỮNG VIỆC VẪN CẦN BẠN XÁC NHẬN
Bạn hoàn toàn nắm quyền sinh sát dữ liệu. Để kích hoạt dọn dẹp:
- Copy JSON object project/file từ Audit Manifest sang `docs/qa/data-cleanup-approval-manifest-2026-07-03.json`.
- Gắn đủ các cờ an toàn (`approvedForDelete`, `forceManualReviewApproved`, v.v.).
- Đổi `requiresUserEdit` thành `false`.
- Gửi lệnh chạy script với biến `DRY_RUN=false`.
