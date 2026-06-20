# Documents Phase A.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép người dùng xem và quản lý file ngay trong Documents mà không rời app, đồng thời thêm bước kiểm tra tên/folder trước upload.

**Architecture:** Tách logic phân loại preview và chuẩn hóa tên file thành utility dùng chung, giữ route file có guard hiện tại làm nguồn ảnh/PDF, và bổ sung viewer responsive ngay trong `DocumentManager`. Server action xử lý rename tên hiển thị; upload route nhận tên đã xác nhận từ dialog nhưng vẫn giữ stored filename độc lập.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma, Tailwind CSS, Node test runner qua `tsx`.

---

### Task 1: Document file utilities

**Files:**
- Create: `src/lib/document-file-utils.ts`
- Create: `src/lib/document-file-utils.test.ts`

- [ ] Viết test thất bại cho phân loại image/PDF/details, HEIC fallback, cảnh báo tên xấu, chuẩn hóa tên đổi và kiểm tra extension.
- [ ] Chạy `npx tsx --test src/lib/document-file-utils.test.ts` và xác nhận test fail vì utility chưa tồn tại.
- [ ] Implement utility tối thiểu.
- [ ] Chạy lại test và xác nhận pass.

### Task 2: Rename and upload naming contract

**Files:**
- Modify: `src/app/(dashboard)/documents/actions.ts`
- Modify: `src/app/api/documents/upload/route.ts`
- Modify: `src/app/(dashboard)/documents/[projectId]/page.tsx`

- [ ] Thêm `renameDocument` có session, project guard, extension-preserving validation, audit và revalidation.
- [ ] Cho upload route nhận `displayName`, validate ở server và dùng làm `originalName`; stored name vẫn sinh độc lập.
- [ ] Truyền capability thật xuống client: upload/rename cho project member; delete chỉ high-level theo policy hiện có.
- [ ] Chạy utility tests và TypeScript.

### Task 3: In-app viewer and file actions

**Files:**
- Modify: `src/components/documents/document-manager.tsx`

- [ ] Click card mở viewer thay vì tab mới.
- [ ] Desktop dùng right-side drawer; mobile/fullscreen dùng overlay toàn màn.
- [ ] Ảnh hỗ trợ contain, zoom, previous/next và fullscreen.
- [ ] PDF dùng iframe protected route và fallback download/open-new-tab.
- [ ] Word/Excel/CAD/XML hiển thị details-only với thông điệp đúng định dạng.
- [ ] Action tải xuống, mở tab mới, copy internal link, rename và delete hiển thị theo capability.
- [ ] Giữ folder/search/filter và đồng bộ document ID vào URL.

### Task 4: Upload preflight and file list clarity

**Files:**
- Modify: `src/components/documents/document-manager.tsx`

- [ ] Sau file picker, mở dialog xác nhận thay vì upload ngay.
- [ ] Hiển thị tên, loại, dung lượng, folder, naming hint và warning tên xấu.
- [ ] Khóa extension khi đổi tên và gửi `displayName` tới backend.
- [ ] Upload thành công tự mở viewer/details của file vừa upload.
- [ ] Action không phụ thuộc hover; thêm sort và badge file legacy sai rule.

### Task 5: Verification

**Files:**
- No production file additions.

- [ ] Chạy `npx tsx --test src/lib/document-file-utils.test.ts`.
- [ ] Chạy `npx tsc --noEmit`.
- [ ] Chạy `npm run lint`.
- [ ] Chạy `npm run build`.
- [ ] Dùng browser kiểm tra Documents desktop/mobile: chọn folder, upload preflight, mở ảnh/PDF/fallback, đóng viewer giữ context.
- [ ] Kiểm tra `git diff --check` và xác nhận không có migration/commit/push.
