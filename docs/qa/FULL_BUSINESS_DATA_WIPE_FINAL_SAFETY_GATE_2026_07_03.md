# BÁO CÁO FINAL SAFETY GATE WIPE PRECHECK
Ngày tạo: 2026-07-03
Mã Phase: FULL_BUSINESS_DATA_WIPE_FINAL_SAFETY_GATE_2026_07_03

## 1. KẾT LUẬN
- **Trạng thái:** FINAL SAFETY GATE PASS.
- Tất cả các lỗi pathing, lỗi backup verify, lỗi logic dry-run/live-run đã được vá hoàn toàn.
- Đã sẵn sàng cho quá trình Live Wipe và Quarantine thật.
- **CHƯA CÓ BẤT KỲ DỮ LIỆU/FILE NÀO BỊ XÓA HAY DI CHUYỂN.**

## 2. BUG QUARANTINE PATH ĐÃ SỬA THẾ NÀO
- Đã ngưng sử dụng chuỗi prefix cứng `storage/` trong script quarantine.
- `filesToQuarantine` giờ đây được xuất ra từ Audit script dưới dạng mảng **Objects** chứa `resolvedPhysicalPath` chính xác từ ổ đĩa (VD: `D:\...\storage\projects\...`).
- Quarantine script đọc đường dẫn tuyệt đối này để copy/move. Đồng thời script tự động chặn (SKIP) nếu path chứa các thư mục nhạy cảm (`.git`, `node_modules`, `src`, `docs`, `backups`, `prisma`).

## 3. FILE TO QUARANTINE ĐÃ LÀ OBJECT CHƯA
- **ĐÃ LÀ OBJECT.** Mỗi phần tử trong `filesToQuarantine` (xem file `business-data-wipe-audit-manifest-2026-07-03.json`) hiện có đầy đủ:
  - `sourceType`: `DB_REFERENCED` hoặc `ORPHAN_PHYSICAL`.
  - `resolvedPhysicalPath`: Đường dẫn vật lý tuyệt đối.
  - `relativePhysicalPath`: Đường dẫn tương đối từ gốc dự án.
  - `size`, `model`, `reason`, `exists`, `risk`.

## 4. BACKUP VERIFY ĐÃ CHẶT CHƯA
- **RẤT CHẶT.** Script `wipe-business-data-to-blank-app.ts` chế độ Live bắt buộc phải đọc file `metadata.json` trong thư mục backup.
- Yêu cầu `exportStatus === 'SUCCESS'`.
- Yêu cầu phải tồn tại vật lý các file quan trọng tối thiểu: `project.json`, `user.json`, `systemSetting.json`, `siteReport.json`, `document.json`. Thiếu bất kỳ file nào -> Abort.

## 5. PRODUCTION DB GUARD ĐÃ SỬA CHƯA
- Sửa toán tử logic `||` và `&&` thành kiểm tra `if (looksProd && process.env.I_KNOW_WHAT_I_AM_DOING_IN_PROD !== 'true')`. 
- Đảm bảo an toàn tuyệt đối, không vô tình chặn local và không vô tình thả production.

## 6. DRY-RUN RESULT JSON PATH
- Kết quả dry-run của lệnh wipe đã được xuất thành công ra file:
  `docs/qa/business-data-wipe-dry-run-result-2026-07-03.json`
- File này chứa metadata trước khi wipe, sau khi wipe (mô phỏng là 0), và deletedCount (bằng với before).

## 7. SỐ MODEL SẼ WIPE
- Sẽ wipe toàn bộ dữ liệu ở **25 model** lõi (Project, SiteReport, MaterialMovement, v.v.).
- Người dùng có thể chọn wipe thêm `Supplier`, `MaterialItem`, `AuditLog`, `User` thông qua `wipeOptions` trong approval manifest.

## 8. SỐ FILE SẼ QUARANTINE
- Đã liệt kê chi tiết 16+ file (bao gồm DB referenced file và các file orphan trong storage). Kịch bản quarantine dry-run in ra đầy đủ Size và Reason cho từng file.

## 9. INPUT MATRIX ĐỦ 26 KHU VỰC CHƯA
- Đã mở rộng `docs/qa/BLANK_APP_INPUT_REQUIREMENTS_MATRIX_2026_07_03.md` thành **27 phân hệ**.
- Bổ sung chi tiết Workflow, Chat, Print/Export, Search/Filter, v.v... đảm bảo đầy đủ thông tin để tester/developer nhập liệu lại từ con số 0.

## 10. CÓ XÓA/MOVE GÌ KHÔNG
**KHÔNG.** 100% dữ liệu nguyên vẹn.

## 11. ĐIỀU KIỆN ĐỂ DUYỆT LIVE WIPE
Bạn cần:
1. Sửa `docs/qa/business-data-wipe-approval-manifest-2026-07-03.json`:
   - `requiresUserEdit`: `false`
   - `liveRunAllowed`: `true`
   - `protectedUsers`: `["uuid-cua-admin"]`
   - `backupPathConfirmed`: `D:\\construction-erp-v2\\backups\\business-data-wipe\\json-export-2026-07-03T10-10-06-694Z`
2. Chạy lệnh:
   `$env:DRY_RUN="false"; $env:CONFIRM_WIPE_BUSINESS_DATA="true"; $env:I_UNDERSTAND_THIS_WILL_DELETE_PROJECT_DATA="true"; npx tsx scripts/wipe-business-data-to-blank-app.ts`
