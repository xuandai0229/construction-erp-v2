# Quality Assurance Report: Document Trash Folder Inspection & UX Refinement

## 1. Context & Objectives
The goal of this phase was to enhance the Trash module to mimic native OS File Explorers (e.g., Windows Explorer, Finder), allowing users to open and inspect the contents of deleted folders *before* deciding to restore or permanently delete them.

### Key Requirements Addressed:
1. **Interactive Trash Folders**: Deleted folders can now be clicked (or accessed via context menu "Mở / Xem nội dung") to inspect their nested structure (deleted child folders and files) without leaving the Trash environment or leaking state into the active workspace.
2. **Context-Aware Breadcrumb Navigation**: Implemented a multi-level breadcrumb path specific to the Trash view (e.g., `Thùng rác / 02. Bản vẽ thiết kế / 01_Móng`).
3. **Targeted Context Menus**: The right-click context menu within Trash now accurately reflects only permissible actions (Restore, Permanent Delete, Open, Download). All active operations (Upload, Create Subfolder, Rename) are safely disabled or hidden.
4. **Hierarchical Deduplication**: The root Trash view strictly filters items whose parent folders are also deleted, preventing recursive duplicates from cluttering the root view.
5. **Safe Restoration**: Refined `restoreDocument` to validate parent folder integrity, blocking file restorations if their parent directory remains in the trash (preventing orphan records).

## 2. Implementation Details

### A. Trash Folder Exploration State (`document-workspace.tsx`)
- Configured `onClick` for deleted folder cards to set `selectedTrashFolderId = folder.id` while retaining `isTrashView = true` and `selectedFolderId = null`.
- Adjusted `displayFolders` and `displayDocs` to dynamically filter based on `selectedTrashFolderId`:
  - If `selectedTrashFolderId` is null (Root Trash): Queries items where `!parentId || !deletedFolderById.has(parentId)`.
  - If `selectedTrashFolderId` is set (Nested Trash): Queries items where `parentId === selectedTrashFolderId`.

### B. Dynamic Header & Breadcrumb UI
- Replaced the hardcoded "Thùng rác" header with a reactive Breadcrumb component mimicking the active workspace layout.
- Breadcrumbs are fully interactive, allowing users to drill backward through nested deleted structures.
- Empty states are context-aware:
  - Root: "Thùng rác đang trống"
  - Nested: "Không có tài liệu trong thư mục đã xóa này"

### C. Context Menu Hardening
- Rebuilt `DocumentContextMenu` to fork UI based on `isTrashView`.
- Trash Folder items now have: `Mở / Xem nội dung`, `Khôi phục`, `Xóa vĩnh viễn`.
- Trash File items now have: `Xem chi tiết`, `Tải xuống`, `Khôi phục`, `Xóa vĩnh viễn`.
- Clicking the blank workspace inside a nested trash folder triggers a context menu pointing to the `selectedTrashFolderId`.

### D. Parent Restoration Guard (`actions.ts`)
- In `restoreDocument`, added an explicit check verifying the status of the parent folder (`existing.folderId`). If the parent folder is soft-deleted, the server immediately returns a validation error: `"Cần khôi phục thư mục cha trước"`.
- This adheres to "Phương án A" from the project specification, ensuring referential integrity without magically moving active files into active roots without user consent.

## 3. Validation Checklist
- [x] Deleting an empty folder moves it to root Trash. Clicking it enters the folder and displays the empty state.
- [x] Deleting a folder containing files hides the files from root Trash; they only appear when opening the folder.
- [x] Opening files within a deleted folder succeeds without throwing non-null assertion crashes.
- [x] Context menus inside Trash lack all creation/upload/mutative actions.
- [x] Attempting to restore a file whose parent is still deleted returns a clear server error.
- [x] Recursive restoration of a parent folder reliably restores all child files and subdirectories.
- [x] F5 / Page Refresh does not cause React hydration errors or illegal navigation.
- [x] `npx prisma validate`, `npx tsc --noEmit`, and `npm run build` completed successfully with zero errors.

## 4. Architectural Notes & Next Steps
- The system correctly isolates `selectedTrashFolderId` from `selectedFolderId`.
- The architecture is extremely performant due to the optimistic UI cache invalidations introduced previously. No further performance degradations were noted.
- Status: **PASS** – All runtime and compile-time criteria are met.
