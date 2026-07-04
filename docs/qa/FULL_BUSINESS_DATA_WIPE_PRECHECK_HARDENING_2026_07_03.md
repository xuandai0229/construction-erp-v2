# BÁO CÁO PRECHECK HARDENING & WIPE AUDIT (BUSINESS DATA)
Ngày tạo: 2026-07-03
Mã Phase: FULL_BUSINESS_DATA_WIPE_PRECHECK_HARDENING_2026_07_03

## 1. KẾT LUẬN
- **Trạng thái:** PRECHECK PASS - SẴN SÀNG LIVE.
- Đã khắc phục triệt để lỗi thiết kế cản trở luồng Dry-run. 100% kịch bản Dry-run (Audit, Wipe, Quarantine, Restore, Verify) đã thông suốt.
- Đã tiến hành backup thực tế (Full JSON Export).
- Input Matrix đã được chi tiết hóa theo module.
- **CHƯA CÓ BẤT KỲ LỆNH XÓA/DI CHUYỂN DỮ LIỆU NÀO ĐƯỢC THỰC THI THỰC TẾ.**

## 2. BACKUP ĐÃ THỰC HIỆN THÀNH CÔNG
- **Đường dẫn backup:** `D:\construction-erp-v2\backups\business-data-wipe\json-export-2026-07-03T10-10-06-694Z`
- **Trạng thái xuất (exportStatus):** SUCCESS.
- **Số model đã xuất:** 29 bảng.
- Không có lỗi nào xảy ra trong quá trình prisma query `.findMany()`. 

## 3. THAY ĐỔI CỐT LÕI CHO WIPE/QUARANTINE (DRY-RUN)
- Script `scripts/wipe-business-data-to-blank-app.ts` và `scripts/quarantine-business-storage-files.ts` đã được tách luồng.
- Ở chế độ Dry-run (`DRY_RUN=true`), script **không còn abort** khi chưa có xác nhận trong `approval-manifest.json` (ví dụ: `liveRunAllowed=false`).
- Kết quả: Console đã in ra rành mạch số count dự kiến sẽ bị xóa và số file dự kiến bị cách ly.
- Chế độ Live đã được bọc trong block `prisma.$transaction` để đảm bảo ACID.

## 4. STORAGE AUDIT KHÔNG CÒN STUB
- Thay vì lấy giả định số liệu DB, script audit nay dùng hàm `scanFileSystem` duyệt trực tiếp cấu trúc `/storage/`, `/public/uploads/` kết hợp với thuật toán đối chiếu đường dẫn `resolveStoragePath`.
- Phân tách rõ ràng file DB references và orphan files để lên danh sách đưa vào quarantine (Trừ các file code, document repo `.git`, `node_modules`).

## 5. THỐNG KÊ CHI TIẾT SẼ WIPE VÀ QUARANTINE
### Các bảng chính sẽ bị WIPE hoàn toàn (Count > 0):
- `Project`: 10
- `ProjectMember`: 10
- `WBSItem`: 22
- `DocumentFolder`: 69
- `Document`: 11
- `SiteReport`: 56
- `SiteReportLine`: 22
- `SiteReportAttachment`: 5
- `Contract`: 6
- `PaymentPlan`: 4
- `PaymentRequest`: 8
- `PaymentRecord`: 2
- `ApprovalRequest`: 8
- `MaterialMovement`: 22
- `ProjectMaterialStock`: 11
- `Notification`: 10
- `ChatMessage`: 30

### Quarantine Storage:
- Hệ thống đã nhận diện các file storage vật lý từ danh sách audit để sẵn sàng đưa vào `.cleanup-quarantine`.

## 6. INPUT MATRIX ĐÃ ĐƯỢC MỞ RỘNG
- Bảng ma trận `docs/qa/BLANK_APP_INPUT_REQUIREMENTS_MATRIX_2026_07_03.md` đã được chi tiết hóa sâu, bao quát 17 module chính (Dashboard, Projects, Daily/Weekly Reports, Materials, Payments...).
- Mô tả rõ requirement, minimum data for UI, professional demo data, và rủi ro nếu thiếu dữ liệu cho từng trang.

## 7. CẦN BẠN XÁC NHẬN ĐỂ CHẠY LIVE WIPE
Để nhấn nút xóa sạch App, bạn cần điền đầy đủ các thông tin sau vào file `docs/qa/business-data-wipe-approval-manifest-2026-07-03.json`:
1. `protectedUsers`: [Điền UUID của các User Admin mà bạn muốn giữ lại]. **(QUAN TRỌNG: Nếu để rỗng, lệnh wipe live sẽ bị Abort).**
2. `backupPathConfirmed`: Điền `D:\\construction-erp-v2\\backups\\business-data-wipe\\json-export-2026-07-03T10-10-06-694Z`.
3. `wipeOptions.suppliers`, `materialCatalog`, `auditLogs`, `demoUsers`: Sửa từ `"CONFIRM"` thành `true` (xóa) hoặc `false` (giữ).
4. `requiresUserEdit`: Đổi thành `false`.
5. `liveRunAllowed`: Đổi thành `true`.

Sau khi lưu file JSON, có thể cấp quyền bằng các lệnh env `CONFIRM_WIPE_BUSINESS_DATA=true I_UNDERSTAND_THIS_WILL_DELETE_PROJECT_DATA=true DRY_RUN=false` vào lệnh npx tsx tương ứng.
