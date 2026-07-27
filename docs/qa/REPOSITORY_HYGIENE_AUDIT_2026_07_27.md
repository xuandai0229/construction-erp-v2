# Báo cáo rà soát và làm sạch repository ngày 27/07/2026

## Kết luận

Đã làm sạch theo nguyên tắc chỉ xóa khi có căn cứ tái tạo, không còn tham chiếu thực thi, là bản trùng lặp chính xác hoặc là output tạm. Không xóa dữ liệu nghiệp vụ, backup, biến môi trường, migration, mã nguồn module hoặc bằng chứng QA có giá trị.

## Phạm vi đã quét

- Toàn bộ file Git đang theo dõi.
- File không theo dõi và file bị `.gitignore` loại trừ.
- Dung lượng và số file theo từng thư mục gốc.
- Tham chiếu từ `package.json`, source, script, test và tài liệu.
- File trùng nội dung theo SHA-256.
- Thư mục rỗng và tiến trình đang khóa output QA.

## Các nhóm đã xóa

### 1. Build và cache có thể tái tạo

| Thư mục | Dung lượng trước khi xóa | Căn cứ |
|---|---:|---|
| `.next/` | 1.666,50 MiB | Output chuẩn của `next build`, đã nằm trong `.gitignore` |
| `.next-construction-supervisor-final/` | 957,43 MiB | Output Next.js QA nhưng bị Git theo dõi nhầm |
| `.next-qa/` | 599,35 MiB | Output Next.js QA, có thể tái tạo |
| `.next-role-dashboard-removal/` | 299,11 MiB | Output Next.js của kiểm thử phân quyền, có thể tái tạo |

Tổng dung lượng build/cache loại bỏ khoảng 3.522 MiB, tương đương 3,44 GiB.

Đã thêm `/.next-*/` vào `.gitignore` để ngăn tái diễn.

### 2. Workspace tạm và output kiểm thử

- `test-results/`.
- `qa/` gồm 13 screenshot lỗi chỉ có timestamp, không có tài liệu hoặc script nào tham chiếu.
- Các thư mục `.tmp-supervision*`.
- `tmp/construction-supervisor-final-render*`.
- `tmp/docx-render/`.
- `tsconfig*.tsbuildinfo`.
- `diff.sql` rỗng.

Các thư mục render LibreOffice bị ACL khóa đã được xóa bằng quyền nâng cao sau khi xác nhận đường dẫn nằm chính xác trong repository.

### 3. Script vá nguồn và kiểm tra một lần

Đã xóa:

- 60 file trong `scratch/`.
- 68 file root của `scripts/` thuộc nhóm `fix-*`, `update-*`, `rewrite-*`, `scaffold-*`, `scratch-check*`, bản trùng và output JSON cũ.
- Các script root như `fix.js`, `fix2.js`, `fix-approvals.js`, `patch.js`, `restore.js`, `unmark.js`, `append_schedule.js`, `check_db.js`, `drift.js`.

Căn cứ:

- Không được khai báo trong `package.json`.
- Không được source runtime import.
- Phần lớn sửa file bằng `fs.writeFileSync`, chứa ID cứng hoặc thao tác trực tiếp migration/database.
- Các báo cáo QA cũ đã xác nhận `scratch/*.js` và `patch.js` là nợ kỹ thuật làm lint toàn repository thất bại.
- Nội dung đã áp dụng vào source hiện tại; lịch sử Git vẫn cho phép khôi phục nếu cần.

### 4. Log, snapshot và file trùng

- Xóa `logs/` gồm log dev/lint/QA cũ.
- Xóa `dump.html`, `lint_output.txt`, `qa_output.txt`, `test_output.txt`.
- Xóa `.gemini-git-files.txt`, `temp_context_menu.txt`, `user_changes.diff`.
- Xóa bản trùng chính xác:
  - `tests/weekly-inspection-dossier-flow.spec.ts`, giữ bản canonical trong `scripts/qa/`.
  - `scripts/seed-test.js`, giữ `scripts/seed/seed-test.js`.
  - `scripts/check-entry-data.js`, giữ `scripts/utils/check-entry-data.js`.
  - `scripts/test-db.ts` và `scripts/test-db-connection.ts`, giữ bản trong `scripts/test/`.
- Xóa `.vscode/settings.json` vì nội dung chỉ là `{}`.
- Xóa `playwright/.auth/admin.json` vì là trạng thái đăng nhập có thể chứa cookie và được global setup tái tạo.

### 5. Thư mục rỗng

Đã xóa các thư mục module placeholder không chứa file:

- `projects/[id]/equipment`, `inspections`, `ncr`, `plans`, `punch-list`.
- `quality`, `resources`, `safety`, `schedule`, `work-permits`.
- `src/app/api/migrate-folders`.
- `src/components/dashboard/operational`.
- `src/components/schedule`.
- `src/templates`.

## Các mục được giữ lại và lý do

| Mục | Lý do giữ |
|---|---|
| `.env`, `.env.cutover.local` | Cấu hình môi trường có thể cần để chạy hệ thống; không tự xóa bí mật hoặc thông tin kết nối |
| `node_modules/` | Môi trường phụ thuộc đang hoạt động, tránh buộc tải lại khoảng 837 MiB |
| `storage/` | Chứa file nghiệp vụ, tuyệt đối không coi là cache |
| `backups/` | Nguồn phục hồi dữ liệu |
| `.local-audit-quarantine/` | Dữ liệu cách ly phục vụ audit/khôi phục |
| `prisma/migrations*`, schema backup | Lịch sử schema và điều tra drift; không xóa khi chưa có quyết định migration riêng |
| `docs/qa/`, `artifacts/` | Bằng chứng nghiệm thu; nhiều báo cáo liên kết trực tiếp tới artifact |
| `tmp/qa/` | Chứa baseline schema và manifest cleanup được Git theo dõi |
| `scripts/qa`, `scripts/test`, `scripts/maintenance` | Bộ kiểm thử và công cụ vận hành có cấu trúc, vẫn có giá trị tái sử dụng |
| `public/images/dashboard/dashboard-hero-2400x420-v4.png` | Được `executive-header.tsx` tham chiếu trực tiếp |

Ảnh hero trước đó bị quy tắc `*.png` ignore nhầm. Đã thêm ngoại lệ `!public/**/*.png`, `!public/**/*.jpg`, `!public/**/*.jpeg`.

Tài liệu `GLOBAL_OVERLAY_Z_INDEX_AND_CLOSE_BUTTON_FINAL_2026_07_10.md` có giá trị nhưng đặt sai ở root, nên được chuyển vào `docs/qa/` thay vì xóa.

## Kiểm tra sau làm sạch

| Kiểm tra | Kết quả |
|---|---|
| `npm run lint` | PASS, 0 lỗi; còn 197 cảnh báo unused legacy |
| `npx tsc --noEmit --pretty false` | PASS |
| `npm run build` | PASS |
| Route Next.js | Sinh thành công toàn bộ route ứng dụng |
| Cảnh báo build | Còn 1 cảnh báo NFT tracing từ `local-storage-provider.ts`, không liên quan file đã xóa |

Sau khi build xác minh, `.next/` và `tsconfig.tsbuildinfo` được xóa lại để repository kết thúc ở trạng thái sạch output.

## Khả năng phục hồi

Các file đã được Git theo dõi có thể phục hồi từ lịch sử Git. Cache/build và output tạm có thể tái tạo bằng lệnh build hoặc QA tương ứng. Không có database nào bị reset, không có migration nào được chạy và không có file trong `storage/` hoặc `backups/` bị xóa.
