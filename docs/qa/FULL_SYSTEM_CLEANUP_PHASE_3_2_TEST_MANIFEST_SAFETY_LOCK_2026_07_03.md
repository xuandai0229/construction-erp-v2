# BÁO CÁO FULL SYSTEM DATA CLEANUP PHASE 3.2: TEST MANIFEST SAFETY LOCK
Mã phase: FULL_SYSTEM_CLEANUP_PHASE_3_2_TEST_MANIFEST_SAFETY_LOCK_2026_07_03

## 1. KẾT LUẬN
- **Trạng thái:** PASS (Luồng bảo vệ Live Quarantine đã được kích hoạt thành công).
- Ngăn chặn tuyệt đối rủi ro người dùng chạy nhầm lệnh Live Quarantine (`DRY_RUN=false`) trên một Test Manifest giả lập.
- Ngăn chặn việc chạy Live Quarantine nếu manifest chưa được phê duyệt explicitly qua cờ `liveRunAllowed: true`.
- Mọi bài test đều hoạt động chuẩn xác (Exit 1 khi cố gắng chạy Live, Exit 0 khi chạy Dry-run).
- **Không có dữ liệu DB bị xóa, không có file thật bị move/rename.**

## 2. TEST MANIFEST ĐÃ BỊ KHÓA LIVE THẾ NÀO
- Đã thêm trường `"testOnly": true` và `"liveRunAllowed": false` vào top-level của file test `docs/qa/data-cleanup-approval-manifest-dryrun-test-2026-07-03.json`.
- Script `scripts/quarantine-orphan-storage-files.ts` được cập nhật thêm chốt chặn (Guard):
  - Khi script nhận diện `DRY_RUN=false`, nó kiểm tra ngay thuộc tính `testOnly` và `liveRunAllowed`.
  - Nếu gặp `testOnly === true` -> Văng lỗi: `Test manifest cannot be used for live quarantine.` và Abort (Exit 1).
  - Nếu gặp `liveRunAllowed !== true` -> Văng lỗi: `Manifest is not approved for live run.` và Abort (Exit 1).

## 3. APPROVAL MANIFEST THẬT ĐANG MẶC ĐỊNH AN TOÀN THẾ NÀO
- File approval chính thức (`docs/qa/data-cleanup-approval-manifest-2026-07-03.json`) được bổ sung cờ `"liveRunAllowed": false`.
- Kết hợp với cờ `"requiresUserEdit": true` có từ trước, hệ thống tạo ra **khóa kép an toàn**. Dù bạn vô tình truyền đủ biến môi trường như `CONFIRM_QUARANTINE=true`, hệ thống vẫn sẽ Abort trừ khi bạn chủ động đổi cờ trong file JSON.

## 4. TEST DRY-RUN ĐÃ PASS
- Chạy `quarantine` với file test ở chế độ Dry-run (`DRY_RUN=true` mặc định). Script bỏ qua các cờ chặn Live và thực thi thành công, giả lập move 1 file rác và chặn 1 file thuộc protected path Tây Hồ, sau đó kết thúc sạch sẽ với Exit Code 0.

## 5. TEST LIVE GUARD ABORT ĐÚNG
- Đã chạy giả lập biến môi trường ép chế độ Live:
  `DRY_RUN=false APPROVED_MANIFEST_PATH=docs/qa/data-cleanup-approval-manifest-dryrun-test-2026-07-03.json CONFIRM_QUARANTINE=true I_UNDERSTAND_FILE_MOVE=true npx tsx scripts/quarantine-orphan-storage-files.ts`
- **Kết quả đúng như mong đợi:** Hệ thống từ chối thực thi `fs.rename`, in ra lỗi `Test manifest cannot be used for live quarantine.` và trả về Exit Code 1.

## 6. CÓ XÓA HAY MOVE GÌ KHÔNG
**KHÔNG**. Toàn bộ hệ thống DB và File Storage gốc được bảo toàn 100%. Mọi hoạt động dừng lại ở mức mô phỏng (Dry-run) và thử nghiệm khóa an toàn (Safety Lock).
