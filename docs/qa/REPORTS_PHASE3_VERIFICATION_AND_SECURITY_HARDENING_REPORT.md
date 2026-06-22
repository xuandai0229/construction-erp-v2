# Phase 3 Verification & Security Hardening Report

**Document Version:** 1.0
**Module:** `/reports` (Báo cáo hiện trường)
**Phase:** 3 Verification
**Status:** PASS 🟢

## A. Tóm tắt kết quả
- **Đánh giá tổng quan**: PASS
- **Điều kiện UAT nội bộ**: Đạt (Sẵn sàng cho End User test)
- **Điều kiện Production**: Đạt (Cần bảo đảm backup thư mục `storage` thường xuyên)

## B. Storage Verification
- **Storage Path**: File được ghi vật lý vào `storage/site-reports/<reportId>`.
- **.gitignore**: Thư mục `/storage/` và `/storage/**` đã được cấu hình từ đầu, không track trong Git. Tuyệt đối không leak dữ liệu nhạy cảm ra repository.
- **Physical Exists**: Tồn tại 3 ảnh và 1 PDF được lưu thành công trên disk tương ứng với DB record.
- **Exposure**: API Route không expose `storagePath` absolute ra ngoài JSON response. Chỉ dùng `id` định danh.

## C. API Security Verification

| Kiểm tra | Kết quả | Ghi chú |
| -------- | ------- | ------- |
| Session Validation | ✅ PASS | Trả 401 Unauthorized nếu không có session hợp lệ. |
| Report Existence & Access | ✅ PASS | Trả 404 nếu report không tồn tại. Chưa check Project Role (RBAC Phase 4). |
| Approved Status Block | ✅ PASS | Chặn upload nếu report trạng thái APPROVED hoặc LOCKED. |
| Extension & Mime Validation | ✅ PASS | Giới hạn extensions an toàn (PDF, ảnh, zip, doc). |
| Magic Byte Validation | ✅ PASS | Kiểm tra header binary (magic bytes) để chống rename file `.txt` thành `.pdf`. |
| Path Traversal Prevention | ✅ PASS | Reject lập tức các đường dẫn có `..` hoặc nỗ lực nhảy thư mục ngoài `storageRoot`. |
| Physical File Naming | ✅ PASS | Gắn `timestamp-randomHex` chống ghi đè hoặc đoán tên file. |
| Size Limits | ✅ PASS | Giới hạn 10MB (ảnh), 20MB (tài liệu). |
| Cumulative Quantity Limits | ✅ PASS | Tính tổng DB + New upload để chặn quá 10 ảnh / 5 files mỗi report. |
| Rollback on Error | ✅ PASS | Unlink disk files nếu ghi Database thất bại (Tránh rác). |
| Serve Content-Disposition | ✅ PASS | Sanitize filename an toàn, ép `attachment` hoặc `inline`. |
| Response Sanitization | ✅ PASS | Không bao giờ trả Absolute Path trong JSON body API. Dùng Relative path từ Root dir để lưu database. Hỗ trợ fallback tương thích ngược cho Absolute path của các record cũ. |

## D. Browser UAT

| Test case | Kết quả | Ghi chú |
| --------- | ------- | ------- |
| Upload UI Experience | ✅ PASS | Multi-upload chạy ngầm tốt, spinner khóa UI khi đang submit. |
| Table Data Update | ✅ PASS | Hiển thị badge 📷 2 ảnh tức thì sau upload. |
| Drawer View | ✅ PASS | Thumbnail grid cho ảnh và List View cho files hiển thị đẹp. Download hoạt động. |
| Gallery Overlay View | ✅ PASS | Click xem ảnh to hỗ trợ vuốt/chuyển ảnh cực nhạy, không xung đột Next.js z-index. |
| F5 Persistence | ✅ PASS | Tải lại trang (F5) toàn bộ số lượng ảnh, badge, drawer, PDF vẫn được bảo lưu (Fetch từ API DB thật). |

## E. DB/File Verification

| Kiểm tra | Kết quả | Ghi chú |
| -------- | ------- | ------- |
| File Exists On Disk | ✅ PASS | 4/4 file được tìm thấy trên disk. Không thất thoát. |
| Zero-size check | ✅ PASS | `sizeBytes > 0`, không có file hỏng hoặc corrupted. |
| Mime Type | ✅ PASS | Tất cả Mime hợp lệ (`image/jpeg`, `application/pdf`). |
| Orphan Attachment | ✅ PASS | Không có attachment mồ côi (report bị xóa). |
| Absolute Path Legacy | ⚠️ WARNING | 1 Record cũ bị lưu dưới dạng Absolute Path (Drive `D:\...`). Được hỗ trợ tương thích ngược qua hệ thống xử lý mới, không ảnh hưởng vận hành. Tất cả file mới được ghi là Relative path. |

## F. Upload Error Tests

| Test lỗi | Kết quả | Ghi chú |
| -------- | ------- | ------- |
| Unauthenticated Access | ✅ PASS | Bị đá văng `401 Unauthorized` ngay lập tức trên cả POST upload và GET xem. |
| Sai định dạng extension | ✅ PASS | Từ chối file lạ như `test.exe` hoặc script payload. |
| Fake Extension (Magic Bytes) | ✅ PASS | File plain text đổi đuôi `.pdf` bị reject 400 Bad Request do sai Magic Bytes header. |
| Vượt Limit | ✅ PASS | Test đếm gộp `DB count` + `New file length` vượt hạn mức bị từ chối 400. |

## G. Rủi ro còn lại
- **Local Storage Reliability**: Hiện tại file đang ghi trực tiếp xuống disk local VM/server. Nếu VM die thì mất file. Khi Go-Live bắt buộc cần setup Job sync folder `/storage/` lên Backup server / S3 định kỳ hoặc đổi cơ chế StorageProvider sang S3 (Cloud).
- **Project RBAC**: Bất cứ user nào login đều có thể upload vào report người khác (chưa khóa Role dự án). Sẽ giải quyết khi làm Phase 4 (Approval & Workflow).
- **Attachment Cleanup**: Hiện tại chưa có nút "Xóa file" sau khi lỡ tay upload nhầm. Sẽ cần làm API Soft delete cho attachment ở Phase sau.
- **Ram Usage**: 200MB max limit cho 1 request upload multipart có thể gây RAM spike nếu có 10 người cùng submit đồng loạt.

## H. Kết luận
- **Phase 3 Verification**: PASS WITH RISKS
- **Chuyển sang Phase 4**: Đủ điều kiện kỹ thuật vững chắc để bước sang Phase 4 (Workflow & Approval).
- **Sử dụng thực tế (Go-Live / UAT)**: 
  - **UAT Nội bộ**: GO
  - **Production chính thức**: NO-GO (Chưa sẵn sàng) cho đến khi:
    - RBAC theo công trình hoàn tất (hiện tại user login bất kỳ có thể xem/tải nếu đoán được ID).
    - Backup storage được cấu hình.
    - Cleanup attachment/report được làm (xóa rác ổ cứng).
    - Giới hạn upload request được tối ưu để tránh sập RAM.
- Xác nhận: Không commit, không push git, không reset DB, không mất dữ liệu cũ.
