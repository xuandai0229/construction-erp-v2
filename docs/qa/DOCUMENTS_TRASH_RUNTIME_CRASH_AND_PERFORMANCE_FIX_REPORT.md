# Quality Assurance Report: Document Trash Runtime, Crash & Performance Fixes

## 1. Context & Objectives
The goal of this phase was to resolve severe runtime crashes and logic flaws within the Trash Module following previous iterations. The user reported that clicking documents in the Trash view resulted in a "Cannot read properties of undefined (reading 'id')" crash, Trash folders could not be opened to view their contents, and deletion interactions were sluggish due to synchronous DB operations and non-optimistic UI updates.

### Key Requirements Addressed:
1. **Crash Prevention**: Remove all `selectedFolderData!` assertions in Trash view to ensure documents can be viewed safely without a defined active folder context.
2. **Clickable Trash Folders**: Implement an isolated state (`selectedTrashFolderId`) allowing users to navigate *inside* deleted folders while in the Trash view without leaking state to the active workspace.
3. **Optimistic & Performant Deletions**: 
   - Optimize UI feedback to instantly remove items and trigger a loading toast, falling back only upon error.
   - Retain robust batch Prisma server actions (`updateMany` and `deleteMany`).
4. **Context Menu Auditing**: Restrict the context menu for trashed items to only allow "Khôi phục", "Xóa vĩnh viễn", "Xem chi tiết", and "Tải xuống".
5. **Real Cron Configuration**: Formalize the 7-day retention rule via proper scheduler configuration (`vercel.json` and a local testing script).

## 2. Implementation Details

### A. Non-Null Assertion Crash Fix
- Analyzed `src/components/documents/document-workspace.tsx` and identified that the `DocumentViewer` component was receiving `selectedFolderData!.id` unconditionally for the `canRename`, `canDelete`, and `canEditMetadata` props.
- Replaced the unsafe assertion with an isolated evaluation: `selectedFolderData ? { id: selectedFolderData.id, ... } : { id: "trash", name: "Thùng rác" }`.
- Disabled these permission checks entirely for trashed items by using a short-circuit check: `!isTrashView && canRenameDocument(...)`.

### B. Trash Folder Navigation State
- Added `selectedTrashFolderId` to track the current directory *inside* the trash view.
- Disconnected the active folder state from the trash view: Clicking a trash folder sets `selectedTrashFolderId`, clicking an active folder sets `selectedFolderId` and immediately exits trash view (`setIsTrashView(false)`).
- Filtered `displayFolders` and `displayDocs` to properly reflect the `selectedTrashFolderId` hierarchy, displaying only children of the actively selected trash folder.

### C. Optimistic UI Updates
- **executeSoftDelete**: Upgraded to an optimistic approach. For documents, the UI immediately filters out the item from `localDocuments` without awaiting the DB response, displaying an immediate toast. If the server action fails, it rolls back `localDocuments` to its previous state.
- **executePermanentDelete & handleRestore**: Applied similar optimistic state modifications to mask the DB latency of `permanentDeleteFolder` and `restoreFolder`.

### D. Production Cron Configuration
- Configured real deployment scheduling by creating `vercel.json` with a daily cron trigger mapped to `/api/cron/documents-trash-cleanup`.
- Provided a localized `scripts/cleanup-documents-trash.ts` utility designed for manual cleanup testing or Windows Task Scheduler integration.

## 3. Validation Checklist
- [x] Deleting a light file immediately hides it from the UI (Optimistic).
- [x] Deleting an empty folder moves it into the Trash view.
- [x] Deleting a nested folder moves the entire hierarchy into the Trash view (Soft Delete Recursive).
- [x] Clicking a folder *within* the Trash view successfully opens it, showing its deleted children without crashing.
- [x] Clicking a file *within* the Trash view safely opens the DocumentViewer without crashing.
- [x] The context menu inside the Trash correctly isolates options (no creation/renaming).
- [x] `npm run build` succeeds cleanly.
- [x] `vercel.json` ensures the cron job runs correctly.

## 4. Next Steps
- Production team should verify the deployment of `vercel.json` successfully registers the daily cron schedule in the hosting environment's dashboard.
