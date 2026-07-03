# Báo cáo fix Documents, cache/F5, upload lớn, context menu và performance

Ngày kiểm thử: 2026-07-03  
Môi trường: Windows local, Next.js 16.2.7, `http://localhost:3000`

## 1. Tóm tắt vấn đề người dùng báo

Màn Documents có UI mới sau Ctrl+F5, nhưng F5 thường hoặc mở lại link có thể quay về UI cũ, làm mất dấu ba chấm và một số thay đổi. Workspace còn thiếu context menu khi bấm chuột phải vào vùng trống. Upload tài liệu/bản vẽ lớn không được khóa bằng giới hạn cứng nghiệp vụ, nhưng cũng không được buffer toàn bộ file vào RAM. Với công trình nhiều hồ sơ, UI không được tải toàn bộ cây folder/file một lần.

## 2. Root cause F5 thường không cập nhật UI

- Không tìm thấy service worker/PWA trong `public/sw.js`, `public/service-worker.js`, manifest hoặc code register service worker.
- Vấn đề chính là cache/route động chưa được ép rõ cho dashboard private, cộng với dev cache `.next`/Turbopack cũ và khả năng response private không có header no-store thống nhất.
- App Router có dữ liệu theo user/project/document nên không được dựa vào cache mặc định cho HTML/RSC/API private.

## 3. Xử lý cache/service worker/App Router

- Thêm `src/proxy.ts` set `Cache-Control: no-store, no-cache, must-revalidate`, `Pragma: no-cache`, `Expires: 0` cho route app/private/API được match.
- Matcher loại trừ `_next/static`, `_next/image`, favicon, images/public để static asset hash vẫn cache dài hạn.
- Thêm `src/components/layout/development-cache-reset.tsx` và render trong `src/app/layout.tsx` để development tự unregister service worker/cache storage nếu máy dev từng có cache cũ.
- Route upload trả JSON private no-store.
- Không dùng `suppressHydrationWarning`.

## 4. Xử lý Hydration mismatch

- Audit các vùng Documents/layout theo yêu cầu; không thêm branch server/client làm đổi cấu trúc HTML ban đầu.
- Runtime Playwright bắt console/pageerror theo từ khóa hydration/recoverable: kết quả 0 lỗi hydration.
- Không dùng Ctrl+F5 làm điều kiện PASS.

## 5. Sửa dấu ba chấm

- File chính: `src/components/documents/document-workspace.tsx`.
- Nút ba chấm trên card gọi `event.preventDefault()` và `event.stopPropagation()` để không mở folder/file khi bấm menu.
- Context menu dùng portal `createPortal(..., document.body)`, `position: fixed`, `z-index: 9999`.
- Collision detection clamp sát mép viewport, tối thiểu 12px.
- Test runtime root project sau F5 thường: tìm thấy 8 nút action card.

## 6. Context menu vùng trống workspace

- Thêm `onContextMenu` cho vùng workspace trống trong `DocumentWorkspace`.
- Right-click trên `article/button/a/input/textarea/select/dialog` không mở menu workspace, nên menu item vẫn ưu tiên đúng.
- Menu vùng active có Upload, tạo thư mục, copy link folder hiện tại, làm mới, bỏ chọn tùy context.
- Menu thùng rác không hiện upload/tạo mới/rename; có quay lại, khôi phục/xóa folder hiện tại nếu đang xem folder trong thùng rác.
- Menu tự đóng bằng click ngoài, Escape, scroll, resize và sau action.

## 7. Giới hạn upload đã bỏ/thay đổi

- `prisma/schema.prisma`: bỏ field `maxUploadSizeMb`.
- `scripts/seed-hanoi-full-project.ts`: bỏ seed `maxUploadSizeMb`.
- `src/lib/documents/validation.ts`: không còn app-level hard size limit; vẫn chặn extension nguy hiểm.
- `src/app/api/documents/upload/route.ts`: không dùng `request.formData()` hoặc `file.arrayBuffer()` cho route upload Documents.
- `src/lib/documents/upload-request.ts`: helper parse metadata upload qua query/header, bắt buộc `Content-Length` hợp lệ trước khi đọc body.

## 8. Tối ưu upload file nặng

- Frontend upload bằng `XMLHttpRequest` raw file body để có progress, cancel, retry khi lỗi.
- Server validate session, project access, folder access, permission, extension/rule trước khi stream file.
- Server chỉ đọc các byte đầu để validate magic-byte, sau đó replay chunk và stream xuống storage.
- Local storage dùng `pipeline(stream, writeStream)`; nếu fail thì cleanup file vật lý tạm.
- Metadata DB chỉ ghi sau khi storage save thành công; nếu DB fail thì xóa file đã lưu.
- Hiện tại là stream local-storage an toàn RAM hơn, chưa phải multipart/direct upload S3/R2/MinIO.

## 9. Performance nhiều hồ sơ/folder/file

- `src/app/(dashboard)/documents/[projectId]/page.tsx` không còn load toàn bộ folder/document của project.
- Server chỉ lấy root folders, ancestor của folder đang chọn, children của folder đang chọn, và slice giới hạn.
- Content docs lấy theo folder đang xem, `take: 200`.
- Folder slice hiện tại `take: 500`.
- Large-list runtime đã seed 50 folder + 200 file metadata trong folder QA tạm; render 250 article trong 2418ms và cleanup sau test.
- Rủi ro còn lại: chưa có API pagination/infinite scroll hoàn chỉnh và chưa virtualization DOM cho mọi tình huống cực lớn.

## 10. Danh sách file đã sửa/thêm chính

- `src/proxy.ts`
- `src/app/layout.tsx`
- `src/components/layout/development-cache-reset.tsx`
- `src/app/(dashboard)/documents/[projectId]/page.tsx`
- `src/components/documents/document-workspace.tsx`
- `src/app/api/documents/upload/route.ts`
- `src/lib/documents/upload-request.ts`
- `src/lib/documents/upload-request.test.ts`
- `src/lib/documents/validation.ts`
- `src/lib/documents/validation.test.ts`
- `src/lib/storage/local-storage-provider.ts`
- `src/app/api/cron/documents-trash-cleanup/route.ts`
- `prisma/schema.prisma`
- `scripts/seed-hanoi-full-project.ts`
- `scripts/qa/documents-runtime-f5-context-menu-upload.ts`
- `scripts/qa/documents-large-list-runtime.ts`
- `scripts/qa/inspect-documents-runtime-context.ts`
- `eslint.config.mjs`
- `tsconfig.json`
- `src/app/(dashboard)/accounting/actions.ts`
- `src/app/(dashboard)/contracts/actions.ts`

## 11. Kết quả test runtime F5 thường

Script: `npx tsx scripts/qa/documents-runtime-f5-context-menu-upload.ts`

Kết quả:

- User: `daicongtu2910@gmail.com`
- Project: `test ct`
- Folder: `01_Hợp đồng`
- Routes test: `/`, `/documents`, `/documents/cmr005gog0000a4wka3dnsjwa`, `/documents/cmr005gog0000a4wka3dnsjwa?folder=cmr005gow0001a4wk1hpje5gm`
- Normal reloads: 5
- Three-dot/action buttons sau F5 thường: 8
- Hydration errors: 0
- Không dùng Ctrl+F5.

## 12. Kết quả test context menu

- Click nút ba chấm trên card mở portal menu.
- Right-click vùng trống workspace mở menu workspace.
- Menu được đo bounding box không tràn viewport dưới/phải.
- Escape đóng menu.
- Right-click trên card không bị menu workspace đè.

## 13. Kết quả test upload

- Upload PDF nhỏ qua UI thật bằng browser/Playwright.
- API response `POST /api/documents/upload?...` trả 200.
- Document metadata được tạo trong DB, sau đó script cleanup DB và file storage.
- Unit test upload metadata:
  - `npx tsx src/lib/documents/upload-request.test.ts`: 2/2 pass.
  - `npx tsx src/lib/documents/validation.test.ts`: 2/2 pass, gồm case file `.dwg` 8GB không bị app-level hard size limit.

## 14. Kết quả prisma/typecheck/build/lint

- `npx prisma validate`: PASS. Lần chạy trong sandbox bị chặn schema-engine network (`ECONNREFUSED 127.0.0.1:9`), chạy lại ngoài sandbox PASS.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS exit code 0, còn 163 warning unused legacy trong app, không có error.
- `npm run build`: PASS. Còn 1 Turbopack NFT warning do local storage provider trace `process.cwd()/storage`; không chặn build.

## 15. Rủi ro còn lại

- Upload lớn production vẫn phụ thuộc reverse proxy/hosting/body timeout. Nếu deploy sau này qua Nginx/Cloudflare/Vercel/serverless, cần cấu hình max body size, timeout và streaming support tương ứng.
- Chưa triển khai multipart/direct upload S3/R2/MinIO. Với bản vẽ rất lớn và đường truyền công trường yếu, hướng production nên là direct multipart upload tới object storage.
- Local storage hiện còn build warning Turbopack NFT vì có filesystem dynamic root; không ảnh hưởng runtime local nhưng nên xử lý kỹ khi đóng gói/deploy.
- Performance đã tránh load toàn bộ cây project ban đầu, nhưng chưa có pagination API/virtualization hoàn chỉnh cho mọi danh sách cực lớn.
- Lint còn nhiều warning unused trong các module khác, không chặn build nhưng nên dọn dần.
- Worktree hiện có nhiều thay đổi/xóa file ngoài phạm vi sửa Documents; không revert vì có thể là thay đổi có chủ đích của người dùng.
