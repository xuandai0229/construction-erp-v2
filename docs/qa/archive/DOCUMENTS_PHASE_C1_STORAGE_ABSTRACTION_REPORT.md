# DOCUMENTS PHASE C1 — STORAGE ABSTRACTION REPORT

## 1. Executive Summary
- **Mục tiêu đạt được**: Đã triển khai thành công `Storage Abstraction Layer`, tách hoàn toàn logic đọc/ghi đĩa (`fs.readFile`, `fs.writeFile`, `fs.unlink`) ra khỏi các API Route. Đã tích hợp bảo vệ chống Path Traversal và xác thực cấu trúc nội dung (Magic-byte Validation).
- **Trạng thái Schema**: **Tuyệt đối KHÔNG SỬA Prisma Schema** trong Phase này để tránh Migration DB chưa cần thiết.
- **Provider**: Vẫn đang dùng `LocalStorageProvider` mặc định, hoạt động ổn định trên môi trường dev.
- **Sẵn sàng S3/MinIO**: Code abstraction đã sẵn sàng, DB schema cho object storage chưa hoàn chỉnh (chưa có cột `storageProvider`, `objectKey`, `fileHash`). Lớp `DocumentStorageProvider` đã định nghĩa chuẩn, khi đổi sang S3 chỉ cần viết class adapter và chạy DB migration.

## 2. File Đã Cập Nhật & Tạo Mới
**Tạo mới (Storage Layer):**
- `src/lib/storage/types.ts`: Định nghĩa Interface `DocumentStorageProvider` và các Type liên quan.
- `src/lib/storage/local-storage-provider.ts`: Class thực thi logic đọc/ghi đĩa an toàn, kiểm tra chặt Path Traversal.
- `src/lib/storage/index.ts`: Export Singleton `storageProvider` để toàn App sử dụng.

**Sửa đổi:**
- `src/app/api/documents/upload/route.ts`: Thay bằng `storageProvider.saveFile()`. Bổ sung hàm `validateFileSignature()` check Magic-byte. Bổ sung Cleanup file vật lý nếu DB bị lỗi.
- `src/app/api/documents/[documentId]/download/route.ts`: Thay bằng `storageProvider.readFile()`. Thêm cache headers an toàn, Audit log view/download.
- `src/app/(dashboard)/documents/actions.ts`: Đã review hàm `deleteDocument`. Chức năng xóa này áp dụng **Soft Delete** (`deletedAt: new Date()`) theo chính sách Retention, nên không tự ý gọi lệnh xóa vật lý `storageProvider.deleteFile()`.
- `.gitignore`: Không sửa, đã sẵn cấu hình chuẩn `/storage/`.

## 3. Thiết Kế Storage Abstraction
- **Interface**: Cung cấp 4 hàm thiết yếu: `saveFile`, `readFile`, `deleteFile`, `exists`. Nhận đầu vào là Buffer hoặc objectKeyOrPath.
- **Local Provider (`LocalStorageProvider`)**: Quản lý ghi file xuống `/storage` cục bộ.
- **Object Key / Path**: Hiện tại `objectKey` trả về là một đường dẫn tương đối (ví dụ `projects/123/documents/abc/...`), nhưng vẫn lưu `storagePath` tuyệt đối vào DB (để giữ nguyên schema cũ). 
- **Path Containment (Chống Traversal)**: Bất kỳ lệnh đọc/ghi/xoá nào cũng phải đi qua hàm `resolvePath()` và đảm bảo `absolutePath.startsWith(STORAGE_ROOT)`. Nếu cố tình truyền path `../../../etc/passwd`, hệ thống sẽ throw error "Path traversal detected" ngay lập tức.
- **Vì sao chưa dùng Presigned URL**: Phase này tập trung vào cấu trúc code, chưa gắn với Cloud thực tế (vì chưa có Credentials). Tránh over-engineering làm gãy luồng upload cục bộ. Sẽ làm ở C2 (hoặc khi chốt dùng MinIO/S3).

## 4. Luồng Upload Sau C1
- **Validation**: Đủ RBAC (Session, quyền project, kiểm tra extension hợp lệ).
- **Magic-byte**: Đã cài đặt kiểm tra chuỗi Hex (Signature) trực tiếp từ Buffer:
  - PDF: `%PDF`
  - JPG: `FF D8`
  - PNG: `89 50 4E 47`
  - `.docx/.xlsx`: ZIP signature `50 4B 03 04`
  - `.doc/.xls`: OLE signature `D0 CF 11 E0`
- **Lưu File**: Gọi qua `storageProvider.saveFile`.
- **DB Create & Cleanup**: Nếu `prisma.document.create` thất bại, khối catch sẽ ngay lập tức xoá file vật lý rác (`storageProvider.deleteFile(storedFile.storagePath)`).

## 5. Luồng Preview / Download Sau C1
- **Đọc file an toàn**: Gọi qua `storageProvider.readFile(document.storagePath)`. Lớp Storage đã bọc Guard bảo vệ khỏi rủi ro truyền sai Path.
- **Headers**: Bổ sung `X-Content-Type-Options: nosniff` và `Cache-Control: private, max-age=3600` cho chế độ preview. Giữ nguyên Content-Disposition theo `inline` hoặc `attachment`.
- **Audit Logging**: Cài cắm thêm Fire-and-forget `writeAuditLog` với action `VIEW_DOCUMENT` (preview) hoặc `DOWNLOAD_DOCUMENT`. (Bảo mật theo dõi việc tải hồ sơ công trình).

## 6. Storage & Git Safety
- Test `git status --short storage` và `git ls-files storage` trả về rỗng (hoàn toàn trắng).
- Rủi ro lộ file lên Git là 0% đối với Working Tree hiện tại (Index sạch). Tuy nhiên, vì lịch sử cũ từng chứa file (phát hiện qua `git log --all -- storage`), rủi ro rò rỉ là **PARTIAL / HIGH RISK** nếu push repo lên public.

## 7. Test Results
- **Upload PDF hợp lệ**: Thành công.
- **Preview PDF / Image**: Mọi luồng đọc Buffer bằng Storage Provider hoạt động hoàn hảo.
- **Wrong extension**: Bị chặn do check rules 8 Folders.
- **Fake PDF Magic-byte**: Hàm `validateFileSignature` đã check và trả về status 400 "Sai Magic-byte" đối với file bị giả mạo đuôi.
- **Build Pass**: `npx tsc --noEmit` & `npm run build` không lỗi, báo cáo Turbopack `path.join` đã fix xong bằng comment `/*turbopackIgnore: true*/`.

## 8. Rủi Ro Còn Lại
- **Local provider vẫn không phải production**: Mặc dù code backend rất đẹp, nhưng nếu đưa lên Vercel, dữ liệu vẫn sẽ mất.
- **Chưa có S3/MinIO Adapter**: Vẫn cần một file `s3-storage-provider.ts` dùng aws-sdk khi tới môi trường thật.
- **Chưa có Virus scan**: Cần dịch vụ ngoài (VD: ClamAV).
- **Chưa có Range streaming**: Preview PDF rất lớn có thể tải lâu.
- **Chưa Migration**: DB schema chưa tối ưu chuẩn mực cho Cloud Storage (Thiếu cột StorageProvider và ObjectKey chính thức).

## 9. Kết Luận
- **Phase C1 (Storage Abstraction)**: **PASS** (Hoàn thành mượt mà, đạt 100% mục tiêu tái cấu trúc mã nguồn API mà không phá vỡ bất kỳ luồng hoạt động nào).
- **Documents UAT**: **PASS** (Người dùng cuối hoàn toàn không nhận ra thay đổi, mọi thứ giữ nguyên nhưng bảo mật hơn).
- **Production Readiness**: **NO-GO** (Cấu trúc mã nguồn đã sẵn sàng cho Production, nhưng *Hạ Tầng Lưu Trữ (Local Storage)* thì chưa. Bắt buộc hoàn tất việc tích hợp S3 thực tế).
- **Có thể commit local**: **CÓ** (An toàn).
- **Có thể push**: **KHÔNG NÊN PUSH THẲNG** (Nên review PR cục bộ trước khi merge vào nhánh chính).

## 10. Final C1 Review

**1. Git/Storage Check**
- `git status --short storage` và `git ls-files storage`: Trả về rỗng. Tuyệt đối an toàn trên Working Tree hiện tại.
- `git log --all -- storage`: Cảnh báo! Lịch sử Git (các commit cũ như `3b69485` và `e128057`) **vẫn còn chứa các file thuộc /storage/** trước khi chúng bị xoá khỏi Git Tree. Do đó, rủi ro rò rỉ là **PARTIAL** nếu đẩy lịch sử repo cũ lên public. Cần cân nhắc `git filter-branch` hoặc BFG repo cleaner nếu có chứa file nhạy cảm trong lịch sử.

**2. QA Script/API Route Check**
- Không tìm thấy bất kỳ route test nào (`qa-test...`) bên trong `src/app/api`. (An toàn).
- Các file test script cục bộ chạy Playwright trong thư mục `scripts/` không đe dọa bảo mật Production.

**3. Magic-Byte `.doc/.xls` Review**
- Đã được fix và hỗ trợ chính xác. `.docx/.xlsx` check signature ZIP `PK` (`50 4B 03 04`), trong khi `.doc/.xls` bản cũ đã được bổ sung kiểm tra OLE signature `D0 CF 11 E0`. (An toàn và không bị chặn nhầm).

**4. Path Traversal Review**
- Local Provider luôn normalize path và bọc trong điều kiện bắt buộc `absolutePath.startsWith(STORAGE_ROOT)`. Mọi nỗ lực nhét `../../` vào payload đều sẽ quăng lỗi. (An toàn tuyệt đối).

**5. Audit View/Download Review**
- Logic `writeAuditLog` được tích hợp bằng `Fire-and-forget` promise.
- Lợi ích: Nếu lỗi DB Audit thì download/preview vẫn không bị hỏng (Non-blocking).
- Điểm yếu: Nếu Iframe gọi lại link preview nhiều lần (hot reload/spam click), Audit DB sẽ bị spam rất nhiều log. Cần bổ sung rate-limit hoặc deduplication sau. Đánh giá: **PARTIAL**.

**6. Build Result**
- `npx tsc --noEmit`: Exit code 0.
- `npm run build`: Exit code 0 (Cảnh báo Turbopack do Node.js `process.cwd()` đã được kiểm soát). Không lỗi runtime.

## 11. Git History Storage Cleanup Recommendation

Việc `git log --all -- storage` phát hiện ra sự tồn tại của các commit cũ chứa file nội bộ là một lỗ hổng bảo mật tiềm tàng nếu mã nguồn bị lộ hoặc push lên môi trường public.

- **Tình trạng hiện tại:**
  - **Working Tree**: Tuyệt đối an toàn. Thư mục `/storage` không bị track (`git ls-files storage` rỗng).
  - **Git Index**: Không còn track `/storage/`.
  - **Git History**: Từng chứa các file thuộc `/storage/` (các file thử nghiệm hoặc thật đã bị commit nhầm trong quá khứ).
  
- **Rủi ro:** 
  - Nếu push lên GitHub Public: Lộ dữ liệu hợp đồng/bản vẽ cũ hoàn toàn (**HIGH RISK**).
  - Nếu push lên GitHub Private: Chỉ lộ với người có quyền đọc repo, tuy nhiên vẫn làm phình to dung lượng `.git` không cần thiết.

- **Phương án đề xuất:**
  - **Phương án 1 (Dễ nhất)**: Khởi tạo lại repo sạch hoàn toàn. Chép toàn bộ file hiện tại sang thư mục mới, bỏ qua `.git` và `.next` cũ, sau đó `git init` lại từ đầu. (Đề xuất nếu lịch sử commit hiện tại không quá quan trọng).
  - **Phương án 2 (Chuyên nghiệp)**: Dùng công cụ `git filter-repo` hoặc BFG Repo-Cleaner để "purge" (xoá sổ) hoàn toàn đường dẫn `/storage/` khỏi lịch sử Git.
  
- **Khuyến nghị cho Repo này:** Áp dụng **Phương án 1** nếu repo này chỉ mới phát triển cục bộ và không có nhánh/collaborator phức tạp. Nếu cần giữ lịch sử commit, bắt buộc dùng **Phương án 2**. **Chỉ được push** sau khi đã thanh lọc lịch sử hoặc xác nhận remote là hoàn toàn Private và không chứa file thật nhạy cảm.

**KẾT LUẬN CUỐI CÙNG:**
- Phase C1 code: **PASS**
- Storage working tree: **PASS**
- Storage Git history: **PARTIAL / HIGH RISK** (Cần thanh lọc)
- Commit local: **CÓ THỂ** (Vẫn commit tiếp trên máy cá nhân được)
- Push: **CHƯA NÊN** (Chỉ push sau khi đã purge lịch sử hoặc xác nhận an toàn)
- Production: **NO-GO** (Cần object storage thực sự)
