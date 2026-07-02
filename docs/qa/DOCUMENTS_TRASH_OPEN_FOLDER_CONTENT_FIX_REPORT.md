# Quality Assurance Report: Document Trash Open Folder Content Fix

## 1. Context & Root Cause Analysis
The user reported that when opening a deleted folder in the Trash view (e.g., `02_Ket_cau`), the header and breadcrumb updated correctly, but the body content still displayed all deleted folders (including `02_Ket_cau` itself and its siblings).

### Root Cause Analysis:
- The `displayFolders` and `displayDocs` React `useMemo` hooks govern the content rendered in the main workspace body.
- While the previous phase successfully implemented `selectedTrashFolderId` to track navigation inside the Trash view, this variable (along with `deletedFolderById` and `isTrashView`) was **missing from the dependency arrays** of `displayFolders` and `displayDocs`.
- As a result, when a user clicked a folder, React re-rendered the component and successfully updated the header (which derived its state inline), but the `useMemo` hooks for the content body did not re-evaluate. They returned the cached root-level filter results.

## 2. Implementation Details & Fixes

### A. Dependency Array Fix (`document-workspace.tsx`)
- Added `selectedTrashFolderId`, `deletedFolderById`, and `isTrashView` to the `useMemo` dependency array for `displayFolders`.
- Added `selectedTrashFolderId`, `deletedFolderById`, and `isTrashView` to the `useMemo` dependency array for `displayDocs`.
- This ensures that navigating into a deleted folder triggers a correct re-evaluation of the list, rendering only direct children (`parentId === selectedTrashFolderId`).

### B. Dynamic Title Rendering in Content Body
- The section title in the body (previously hardcoded to `"Thư mục đã xóa"` or grouped names) is now fully dynamic based on the Trash state:
  - If grouped, it uses the group name.
  - If ungrouped, and `isTrashView` is true:
    - Root Trash: `"Tài liệu đã xóa"` / `"Thư mục đã xóa"`
    - Nested Trash: `"Tài liệu trong [Tên thư mục]"` / `"Thư mục trong [Tên thư mục]"`
  - For active workspace, it correctly falls back to `"Tài liệu trong thư mục"` or `"Thư mục con"`.

### C. Context-Aware Empty State
- Upgraded the central empty state component to handle nested trash folders.
- If `isTrashView` is true and `selectedTrashFolderId` is set, and the folder contains no children, it now displays:
  - **Title**: `"Không có tài liệu trong thư mục đã xóa này"`
  - **Description**: `"Mục này có thể được khôi phục hoặc xóa vĩnh viễn từ menu chuột phải."`
- If at root Trash with no deleted items, it displays:
  - **Title**: `"Thùng rác đang trống"`
  - **Description**: `"Không có thư mục hoặc tài liệu nào nằm trong thùng rác."`

## 3. Validation Checklist
- [x] Entering Trash view shows root-level deleted folders only.
- [x] Clicking `02_Ket_cau` properly filters the content body to show only children of `02_Ket_cau`.
- [x] The folder `02_Ket_cau` no longer appears within itself.
- [x] Siblings (e.g., `02_Phu_luc_hop_dong`, `04_PCCC`) no longer appear when a specific folder is open.
- [x] Section titles dynamically reflect the currently opened trash folder.
- [x] Empty state correctly identifies when a nested deleted folder has no contents.
- [x] Breadcrumb "Thùng rác" button correctly resets `selectedTrashFolderId` to `null` and navigates back to root Trash.
- [x] `npx prisma validate`, `npx tsc --noEmit`, and `npm run build` completed successfully with zero errors.

## 4. Status
**PASS** - The visual discrepancy between the header and the body content is completely resolved. The data pipeline is now reactive to nested trash navigation.
