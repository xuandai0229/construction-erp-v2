# Quality Assurance Report: Document Context Menu Portal & Cache Fix

## 1. Root Cause of Truncated Context Menu
The context menu was originally rendered directly inside the document workspace container hierarchy. Because the parent containers utilize utility classes like `overflow-hidden` or establish independent stacking contexts (`z-index`, `transform`), the context menu was clipped when it attempted to render near the viewport boundaries (specifically the bottom or right edges). Simply increasing the `z-index` does not bypass CSS `overflow: hidden` constraints within a parent block formatting context.

## 2. Portal & Collision Detection Fix
To resolve this, the context menu was decoupled from the local DOM hierarchy:
- **React Portal:** The `DocumentContextMenu` component now wraps its output in `createPortal(..., document.body)`. This guarantees the menu mounts at the root level of the DOM, completely immune to parent container overflow restrictions.
- **Dynamic Collision Detection:** Implemented `useState` and `useLayoutEffect`/`useEffect` to compute the menu's bounding box (`offsetWidth`, `offsetHeight`) against the `window.innerWidth` and `window.innerHeight`.
- **Logic:**
  - If `x + width > viewport_width`, the menu shifts left to `viewport_width - width - 12px`.
  - If `y + height > viewport_height`, the menu shifts up to `viewport_height - height - 12px`.
  - A subtle fade-in (`opacity: position.x ? 1 : 0`) prevents flickering while the coordinates are calculated.

## 3. Context Menu Actions Matrix
The context menu intelligently filters available actions based on the clicked entity and the current view state:

**Active Workspace:**
- **Folder:** Tải tài liệu lên đây, Tạo mục bên trong, Mở thư mục, Đổi tên, Sao chép đường dẫn, Chuyển vào thùng rác.
- **File:** Xem chi tiết, Mở thẻ mới, Tải xuống, Chỉnh sửa metadata, Đổi tên file, Sao chép liên kết, Chuyển vào thùng rác.
- **Empty Space (Workspace):** Tải tài liệu lên, Tạo mục bên trong, Làm mới, Bỏ chọn thư mục.

**Trash View:**
- **Folder:** Mở / Xem nội dung, Khôi phục, Xóa vĩnh viễn. (No creation/mutation actions allowed).
- **File:** Xem chi tiết, Tải xuống, Khôi phục, Xóa vĩnh viễn. (No metadata edits allowed).

## 4. MoreVertical (3-dots) Integration
A dedicated `MoreVertical` ghost button (`h-8 w-8 rounded-full`) was injected directly into the `flex items-start justify-between` wrapper of both Folder and Document cards.
- **Event Handling:** The `onClick` handler explicitly calls `e.stopPropagation()` and `e.preventDefault()`. This perfectly isolates the menu trigger from the parent card's generic "Open Folder/File" left-click behavior.
- **Coordinate Passing:** The button passes `e.clientX` and `e.clientY` to the `contextMenu` state, allowing the portal collision logic to position the menu exactly at the cursor, identical to a native right-click.

## 5. F5 Cache / PWA Ghost UI Fix
The issue where an `F5` refresh reverted the UI to an older state (requiring `Ctrl+F5`) was traced to Next.js App Router's aggressive Route Cache and potential client-side payload caching.
- **Fix:** Both `src/app/(dashboard)/documents/page.tsx` and `src/app/(dashboard)/documents/[projectId]/page.tsx` were explicitly marked with:
  ```typescript
  export const dynamic = "force-dynamic";
  export const revalidate = 0;
  ```
- **Result:** This enforces Server-Side Rendering (SSR) on every standard refresh. The server guarantees the latest React component tree is delivered, preventing stale cached HTML chunks from overriding recent structural changes.

## 6. Files Modified
- `src/components/documents/document-workspace.tsx` (Major rewrite of Context Menu & Card UI)
- `src/app/(dashboard)/documents/page.tsx` (Added force-dynamic)
- `src/app/(dashboard)/documents/[projectId]/page.tsx` (Added force-dynamic)

## 7. Verification & Build Results
- **Prisma Validate:** `npx prisma validate` - Passed.
- **Typecheck:** `npx tsc --noEmit` - Passed (0 errors).
- **Production Build:** `npm run build` - Passed cleanly.
- **String Audit:** "Bộ lọc" and "Lên thư mục cha" are strictly `0 matches` within the document source code.

## 8. Runtime Test Results
- [x] Standard `F5` preserves the new, clean UI without "Bộ lọc".
- [x] Right-clicking at the extreme bottom/right edges successfully pushes the context menu inward, preventing clipping.
- [x] Clicking the new 3-dot menu opens the exact same context menu at the exact cursor coordinates.
- [x] Left-clicking the empty space on the card still successfully opens the folder or document viewer.
- [x] Trash mode strictly limits actions (e.g. no upload/rename allowed).

**Status:** PASS. The Document Module's contextual UX is now stable, predictable, and fully aligned with File Explorer expectations.
