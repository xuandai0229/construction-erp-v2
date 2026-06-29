# HANOI_POST_VERIFICATION_FIX_REPORT

Ngày thực hiện: 2026-06-27

## 1. Tóm tắt các lỗi đã fix

Sau khi kiểm chứng độc lập, đã thực hiện khắc phục các lỗi và rủi ro được liệt kê theo đúng thứ tự ưu tiên:
- **HIGH**: Vá lỗ hổng phân quyền (RBAC) trong `reports/actions.ts` (`getProjectWorkItems` và `createSiteReport`).
- **MEDIUM**: Sửa logic seed dữ liệu để đảm bảo tính idempotent tạm thời cho ChatMessage (tránh duplicate khi chạy lại seed).
- **MEDIUM**: Đồng bộ dữ liệu hợp đồng và yêu cầu thanh toán (Payment Supplier Mismatch) về đúng nhà cung cấp tương ứng.
- **MEDIUM**: Chuyển đổi mã route attachment của reports sang sử dụng `LocalStorageProvider` thay vì hardcode `process.cwd()` rải rác để quy chuẩn kiến trúc và giảm thiểu warning Turbopack.
- **LOW**: Dọn dẹp code rác không sử dụng (`ACCOUNTING_FOLDERS`, `ENGINEERING_FOLDERS` trong RBAC tài liệu) và cập nhật status `RECEIVED` cho các material request đã nhập kho 100%.

## 2. Danh sách file đã sửa

1. `src/app/(dashboard)/reports/actions.ts` - Thêm logic kiểm tra quyền dự án.
2. `src/app/api/reports/attachments/[attachmentId]/route.ts` - Thay thế việc gọi trực tiếp `process.cwd()` và `fs` bằng `LocalStorageProvider`.
3. `src/lib/documents/permissions.ts` - Xóa constants cũ dư thừa.
4. `scripts/seed-hanoi-full-project.ts` - Sửa seed lỗi thanh toán, bổ sung xóa chat cũ, cập nhật trạng thái vật tư.
5. `scripts/qa-hanoi-project-data-check.ts` - Thêm Assert QA để đảm bảo supplier luôn khớp và chat không bị duplicate.
6. `scripts/qa-reports-project-rbac-guard.ts` - (Tạo mới) Test script chứng minh server action đã được bảo vệ đúng cách.

## 3. Chi tiết fix HIGH: Reports RBAC Guard

- **Lỗi ban đầu**: Server action `getProjectWorkItems(projectId)` và `createSiteReport()` chỉ kiểm tra người dùng đã đăng nhập hay chưa nhưng không kiểm tra quyền thao tác trên `projectId` được truyền vào, có nguy cơ lộ lọt dữ liệu hoặc tạo rác giữa các dự án (Cross-Project Data Leak/Poisoning).
- **Cách sửa**: Thêm hàm lấy danh sách project user có quyền truy cập (`getAccessibleProjectIds`) vào đầu action. Nếu `projectId` không nằm trong danh sách này (với user không phải ADMIN), ném lỗi chặn lập tức.
- **Test chứng minh**: Đã tạo và chạy script `scripts/qa-reports-project-rbac-guard.ts`. Script tạo một user "STAFF" hoàn toàn không nằm trong công trình Hà Nội và cố gắng gọi server action, kết quả:
  - Gọi `getProjectWorkItems` -> `FAIL: Blocked successfully (Không có quyền truy cập dự án này)`.
  - Gọi `createSiteReport` -> `FAIL: Blocked successfully`.
  - Đảm bảo tính an toàn cho server actions.

## 4. Chi tiết fix MEDIUM: Payment Supplier Mismatch

- **Lỗi ban đầu**: 5 yêu cầu thanh toán trong script seed có trường `supplierId` hardcode là `MINHAN`, trong khi thực tế hợp đồng được tham chiếu (như cung cấp thép) thuộc về `HOAPHAT` hoặc `THX`, gây sai lệch dữ liệu thanh toán với hợp đồng.
- **Cách sửa**: Tạo một mapping `contractSupplierCode` khi tạo `Contract`, sau đó lấy `supplierId` trực tiếp từ contract tương ứng bằng `contractByNo[contractNo]` lúc tạo `PaymentRequest`.
- **Đánh giá sau fix**: Lỗi mismatch = 0. Script QA data `qa-hanoi-project-data-check.ts` đã thêm check báo PASS: `Payment requests have matching supplier`.

## 5. Chi tiết fix MEDIUM: Chat Seed Idempotent

- **Lỗi ban đầu**: Bảng `ChatMessage` không có khóa ngoại `projectId`, do đó script reset công trình cũ không xóa được tin nhắn. Khi chạy lại seed nhiều lần, các đoạn chat demo sẽ bị nhân đôi.
- **Cách sửa**: Đây là fix tạm thời (chưa migrate DB). Đã bổ sung logic xóa tin nhắn dựa theo nội dung chuỗi (chứa mã công trình `[HN-TH-2026-001]`) vào hàm `removeExistingProject()` trong script seed.
- **Đánh giá sau fix**: Count tin nhắn công trình Hà Nội sau khi chạy seed luôn cố định = 30. Tránh được việc duplicate dữ liệu.

## 6. Chi tiết fix MEDIUM: Turbopack/NFT Warning Report Attachment

- **Lỗi ban đầu**: Quá trình `npm run build` xuất hiện warning NFT báo động việc import module động hoặc các tác vụ filesystem ở cấp độ toàn cục/dự án do có chứa `path.join(process.cwd(), ...)` trong route download attachment.
- **Cách sửa**: Gỡ toàn bộ logic resolve file thủ công trong route. Áp dụng chuẩn `LocalStorageProvider` (đã có ignore comment sẵn) của hệ thống quản lý tài liệu.
- **Kết quả Build sau sửa**:
  - Mã nguồn đã chuẩn và gọn gàng hơn. Tuy nhiên, warning `Encountered unexpected file in NFT list` trên Turbopack *VẪN CÒN*.
  - **Phân tích rủi ro thực tế**: Warning hiện tại chỉ ra gốc xuất phát từ `src/lib/storage/local-storage-provider.ts` do module này gán trực tiếp hằng số `STORAGE_ROOT` ở tầng module root (ngoài context của function). Về mặt runtime NodeJS/NextJS standalone không bị lỗi vật lý nào. Chỉ là Turbopack trace nhạy cảm với việc tính toán `process.cwd()` ở root file.
  - Sẽ không gây crash server, nhưng nếu muốn sạch warning hoàn toàn, cần refactor constructor/DI của `LocalStorageProvider` ở một task kiến trúc sau này.

## 7. Kết quả toàn bộ lệnh test/build

Tất cả lệnh đã chạy thành công (EXIT CODE 0):
- `npx prisma validate` -> PASS
- `npx prisma generate` -> PASS
- `npx tsc --noEmit` -> PASS
- `npx tsx --env-file=.env scripts/seed-hanoi-full-project.ts` -> PASS
- `npx tsx --env-file=.env scripts/qa-hanoi-project-data-check.ts` -> PASS 22/22 (thêm check chat, payment mismatch).
- `npx tsx scripts/qa-document-upload-settings.ts` -> PASS
- `npx tsx --env-file=.env scripts/qa-reports-project-rbac-guard.ts` -> PASS (tất cả access control đều bắt chặn được).
- `npm run build` -> PASS (compiled successfully, warning NFT còn nhưng an toàn để test UI).

## 8. Rủi ro còn lại

1. **Phân quyền Chat chưa triệt để (Architecture Risk)**:
   - Hiện tại chức năng Chat chỉ được fix idempotent tạm bằng text tag. Khóa ngoại `roomId` hay `projectId` vẫn chưa có. Nếu bật module chat lên UI, việc kiểm soát quyền riêng tư giữa các dự án chưa được DB đảm bảo.
2. **Heuristic Document Permission**:
   - Vẫn đang dùng từ khóa (keywords) để suy đoán thư mục thuộc "Accounting" hay "Engineering". Nếu user tự tạo thư mục có tên không nằm trong whitelist hoặc có tên dễ gây nhầm lẫn, permission có thể bị tính sai. Khuyến nghị cập nhật schema Folder chứa metadata `category`.
3. **Chưa có E2E Testing Browser**:
   - Tất cả kết quả PASS hiện tại tập trung ở cấp độ DB, Action và Server API. Cần manual test trên trình duyệt để confirm Hydration và UI state.

## 9. Đề xuất bước tiếp theo

1. **Thực hiện UAT trên UI/Browser (User Acceptance Testing)**: Mở server dev (`npm run dev`) để manual review flow tạo Báo Cáo Ngày, verify quyền truy cập Tài liệu và Quản lý Vật tư.
2. **Migration Module Chat (Schema Update)**: Trước khi làm UI Chat thật, CẦN THIẾT kế hoạch tạo bảng `ChatRoom` kết nối với `Project`, bổ sung `roomId` cho `ChatMessage` để an toàn bảo mật dữ liệu.
3. **Refactor Storage Provider Root**: Giải quyết triệt để NFT warning bằng cách không khai báo `STORAGE_ROOT` sử dụng `process.cwd()` ở root file module, mà chuyển vào class/instance initialization.
