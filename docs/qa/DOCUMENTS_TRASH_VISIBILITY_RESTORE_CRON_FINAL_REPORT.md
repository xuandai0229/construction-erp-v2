# Quality Assurance Report: Document Trash Module, Soft-Delete, Restore & Weekly Cleanup

## 1. Context & Objectives
The goal of this phase was to complete the "Thùng rác" (Trash) module for the Document Management System (DMS), implementing full soft-delete semantics, accurate recursive restoration logic, and automated batch cleanup of permanently deleted items according to project specifications.

### Key Requirements Addressed:
1. **Seamless UI for Normal Delete**: Removing the confirmation dialog from standard deletions within the workspace; executing immediate soft-deletions with a success toast ("Đã chuyển thư mục/tài liệu vào Thùng rác").
2. **Robust Server Actions**:
   - `deleteFolder` / `deleteDocument`: Recursive soft deletion without hard validation errors for containing documents.
   - `restoreFolder` / `restoreDocument`: Full recursive restoration that ensures all child folders and documents deleted together are accurately restored. Validating parent hierarchy dependency during restore.
   - `permanentDeleteFolder` / `permanentDeleteDocument`: Hard deletion mapped explicitly to the "Xóa vĩnh viễn" button in the Trash View, guarded by Admin/Director role checks.
3. **Automated Weekly Cleanup**: Implementation of an automated cron job to purge trash items older than 7 days, maintaining optimal database size and performance.
4. **Trash Visibility and Isolation**: Resolving UI issues where clicking the "Thùng rác" accidentally displayed active folder empty states instead of listing soft-deleted items.

## 2. Implementation Details

### A. Context Menu and Workspace Interaction
- Modified `document-workspace.tsx` to handle `executeSoftDelete` which triggers deletion instantly.
- Maintained `executePermanentDelete` solely for use in `Trash View` when the `isTrashView` flag is passed into `DocumentContextMenu`.
- Fixed the Trash Selection Logic: When `setIsTrashView(true)` is called via clicking the Trash icon in the sidebar, `setSelectedFolderId(null)` and `replaceUrlState` instantly trigger, clearing the active context. This explicitly prevents bugs where Trash displays "Chưa có tài liệu trong thư mục...".
- If the user is in Trash and clicks an active folder in the sidebar, `setIsTrashView(false)` is immediately invoked, returning the user strictly to the active workspace.

### B. Trash View Rendering (`document-workspace.tsx`)
- In Trash view, the system now displays the **deleted folders array** inside the main area alongside deleted documents.
- Deleted items render their deletion timestamp (`deletedAt`).
- `displayDocs` logic bypassed the standard `selectedFolderId` filter explicitly when `isTrashView === true`.

### C. Prisma & Server Logic (`actions.ts`)
- Leveraged Prisma `findMany` mapping and DFS/BFS patterns in memory to traverse folder parent/child schemas since Prisma doesn't support recursive relational `updateMany` natively.
- Implemented explicit RBAC checks using `session.role !== "ADMIN" && session.role !== "DIRECTOR"` within `permanentDelete` actions. Regular users trying to bypass the UI will receive a rejection prompt.
- The permanent deletion of folders now explicitly unlinks/deletes nested folders bottom-up to prevent foreign key cascade issues.

### D. Weekly Cleanup CRON Job (`api/cron/documents-trash-cleanup/route.ts`)
- Created a secure API endpoint (`/api/cron/documents-trash-cleanup`) to be executed automatically by a cron scheduler (e.g., Vercel Cron or a standard scheduler).
- Scans `deletedAt` for items older than 7 days (`< now - 7 days`).
- Performs a physical `deleteMany` for documents and bottom-up physical delete for nested document folders.
- Cleanups any associated physical object storage linked with the documents (implemented local unlink stub which can be replaced by AWS S3 delete object commands in the future).
- Logs a batch event to `AuditLog` for trackability.

## 3. Validation Checklist
- [x] Standard Deletion does not trigger confirm dialog and moves items into Trash instantly.
- [x] Toast messages are correct: "Đã chuyển thư mục/tài liệu vào Thùng rác".
- [x] Trash items can be restored recursively, returning them safely to the main active view.
- [x] Empty state correctly says "Thùng rác đang trống" instead of an active folder context.
- [x] Both Folders and Documents that are deleted appear properly in the main Trash panel.
- [x] Only Admin/Director can execute "Xóa vĩnh viễn". Non-admins receive the correct error toast.
- [x] The `api/cron/documents-trash-cleanup` endpoint handles physical DB cascade cleanup effectively.
- [x] Next.js compilation succeeds with zero TypeScript or Build-time errors.

## 4. Next Steps & Recommendations
- **System Administrator Action**: Configure a Cron Job platform (such as Vercel Crons or a Windows Task Scheduler script) pointing to `[PRODUCTION_URL]/api/cron/documents-trash-cleanup` running once daily at midnight. Ensure `process.env.CRON_SECRET` matches the authorization headers. (Currently, the cron is inactive until this webhook is formally configured on the hosting platform).
