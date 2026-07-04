# BÁO CÁO FULL SYSTEM DATA CLEANUP PHASE 3.1: DRY RUN HARDENING
Mã phase: FULL_SYSTEM_CLEANUP_PHASE_3_1_RESTORE_AND_QUARANTINE_DRY_RUN_HARDENING_2026_07_03

## 1. KẾT LUẬN
- **Trạng thái:** PASS (Toàn bộ các luồng Dry-run đã đạt độ ổn định tuyệt đối).
- Script phục hồi (Restore) không còn báo lỗi (Exit 1) khi thiếu manifest, vì trạng thái chưa từng quarantine là trạng thái hợp lệ.
- Test quarantine dry-run chứng minh được khả năng chặn di chuyển nhầm file của Dự án Tây Hồ/Trần Quang Hiếu.
- **Không có dữ liệu DB bị xóa, không có file thật bị move/rename.**

## 2. RESTORE DRY-RUN ĐÃ SỬA THẾ NÀO
- Đã cấu trúc lại file `scripts/restore-quarantine-storage-files.ts`.
- Bổ sung logic bắt trường hợp thiếu manifest:
  - Nếu `DRY_RUN=true`, script nhẹ nhàng log `"No restore manifest found. Nothing to restore in dry-run."` và thoát an toàn với `exit(0)`.
  - Nếu `DRY_RUN=false` (Live mode), kịch bản sẽ giữ nguyên cảnh báo lỗi `exit(1)` vì cần thiết để ngăn user lạm dụng lệnh khi không có dữ liệu thực sự cần restore.

## 3. VÌ SAO RESTORE MANIFEST CHƯA TỒN TẠI LÀ HỢP LỆ
File `docs/qa/quarantine-restore-manifest-2026-07-03.json` là đầu ra (output artifact) của tiến trình Quarantine *chế độ Live* (khi `fs.rename` thực sự chạy). Do hệ thống 100% tuân thủ thiết kế an toàn chỉ chạy Dry-run, file log này chưa bao giờ được tạo. Do đó, Restore Script ở chế độ Dry-run phải ứng xử graceful, xem việc không có manifest là không có file để restore thay vì xem là lỗi hệ thống (Crash).

## 4. POSITIVE QUARANTINE DRY-RUN ĐÃ CHẠY CHƯA
**ĐÃ CHẠY.** 
- Tạo file `docs/qa/data-cleanup-approval-manifest-dryrun-test-2026-07-03.json`.
- Chèn một file giả lập (`doc_1782122050797_zkwxyc.pdf`).
- Chạy lệnh quarantine với cờ `APPROVED_MANIFEST_PATH` trỏ tới file test này.
- Kết quả: Console in đúng dòng `[DRY RUN] Would quarantine...`, không thực sự đổi tên file nào.

## 5. PROTECTED PATH TEST ĐÃ SKIP ĐÚNG CHƯA
**ĐÃ KIỂM CHỨNG THÀNH CÔNG.**
- Đã chèn 1 file vào file test manifest có chứa path `HN-TH-2026-001`.
- Chạy script quarantine dry-run.
- Hệ thống bắt chính xác và log: `[SKIPPED] ... (Protected path. Needs allowKeepProjectFileQuarantine)`.

## 6. INPUT REQUIREMENTS LÀ BASELINE HAY AUTOMATED SCAN
- Cần xác nhận rõ: Mảng `inputRequirements.modules` được xuất ra trong JSON hiện tại là một **Baseline Checklist** dựa trên hiểu biết sâu sắc về Prisma Schema và kiến trúc module. Nó KHÔNG PHẢI là kết quả của máy quét AST (Automated Syntax Tree) hay Regex phân tích UI component tự động.
- Đã chèn thêm trường `sourceEvidence` trong JSON để vạch rõ giới hạn kiến thức.

## 7. FILE ĐÃ SỬA VÀ TẠO MỚI
- `scripts/restore-quarantine-storage-files.ts` (Sửa đổi logic catch error).
- `scripts/audit-full-system-data-cleanup-readonly.ts` (Cập nhật ghi chú sourceEvidence).
- `docs/qa/data-cleanup-approval-manifest-dryrun-test-2026-07-03.json` (Tạo mới phục vụ test).

## 8. KẾT QUẢ LỆNH
Tất cả các lệnh sau đều Exit 0:
1. `npx prisma validate`: **PASS**
2. `npx tsc --noEmit`: **PASS**
3. `npx tsx scripts/audit-full-system-data-cleanup-readonly.ts`: **PASS**
4. `npx tsx scripts/cleanup-full-system-stale-data.ts --dry-run`: **PASS**
5. `npx tsx scripts/quarantine-orphan-storage-files.ts --dry-run`: **PASS**
6. `npx tsx scripts/restore-quarantine-storage-files.ts --dry-run`: **PASS** (Không còn exit 1).
7. `npx tsx scripts/quarantine...` (Test dương tính với test manifest): **PASS**

## 9. CÓ XÓA HAY MOVE GÌ KHÔNG
**KHÔNG**. Tuyệt đối không xóa bất kỳ bản ghi DB nào và cũng không thay đổi đường dẫn của bất kỳ file vật lý nào.

## 10. NHỮNG BƯỚC CẦN LÀM ĐỂ QUARANTINE THẬT
Nếu bạn đã sẵn sàng cô lập các file rác:
1. Copy các file từ `data-cleanup-manifest-redo-2026-07-03.json` (mục quarantineCandidates) sang `data-cleanup-approval-manifest-2026-07-03.json`.
2. Đổi `requiresUserEdit` thành `false`.
3. Chạy `DRY_RUN=false CONFIRM_QUARANTINE=true I_UNDERSTAND_FILE_MOVE=true npx tsx scripts/quarantine-orphan-storage-files.ts`.
4. Sau khi chạy, file `quarantine-restore-manifest-2026-07-03.json` sẽ tự sinh ra để backup đường quay lại.
