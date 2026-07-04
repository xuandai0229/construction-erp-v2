const fs = require('fs');

// 1. Update ReportsWorkspaceProps in reports-workspace.tsx
let workspace = fs.readFileSync('src/components/reports/reports-workspace.tsx', 'utf8');
workspace = workspace.replace(
  '  currentUser: { id: string; name: string; role?: string };\n}',
  '  currentUser: { id: string; name: string; role?: string };\n  globalContext?: { selectedProjectId: string | null };\n}'
);

workspace = workspace.replace(
  '  currentUser,\n}: ReportsWorkspaceProps) {',
  '  currentUser,\n  globalContext,\n}: ReportsWorkspaceProps) {'
);

workspace = workspace.replace(
  '<CreateReportDialog\n        key={isCreateOpen ? "open" : "closed"} // Ensure remount to pick up initialReport if any\n        isOpen={isCreateOpen}\n        onClose={() => setIsCreateOpen(false)}\n        onSubmit={handleCreateSubmit}\n        isSubmitting={isSubmitting}\n        activeProjects={activeProjects}\n        currentUser={currentUser}\n        mode={dialogMode}\n        initialReport={editReportData}\n      />',
  '<CreateReportDialog\n        key={isCreateOpen ? "open" : "closed"} // Ensure remount to pick up initialReport if any\n        isOpen={isCreateOpen}\n        onClose={() => setIsCreateOpen(false)}\n        onSubmit={handleCreateSubmit}\n        isSubmitting={isSubmitting}\n        activeProjects={activeProjects}\n        currentUser={currentUser}\n        mode={dialogMode}\n        initialReport={editReportData}\n        currentProjectId={globalContext?.selectedProjectId || projectFilter || ""}\n      />'
);

fs.writeFileSync('src/components/reports/reports-workspace.tsx', workspace);

// 2. Update ReportsPage to pass globalContext
let page = fs.readFileSync('src/app/(dashboard)/reports/page.tsx', 'utf8');
page = page.replace(
  'currentUser={{ id: session.id, name: session.name || session.email || "Người dùng hiện tại", role: session.role }} \n  />;',
  'currentUser={{ id: session.id, name: session.name || session.email || "Người dùng hiện tại", role: session.role }} \n    globalContext={globalContext}\n  />;'
);
fs.writeFileSync('src/app/(dashboard)/reports/page.tsx', page);

// 3. Update CreateReportDialog to accept currentProjectId and use it in getDefaultForm
let dialog = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

if (!dialog.includes('currentProjectId?: string')) {
  dialog = dialog.replace(
    'isSubmitting: boolean;\n}',
    'isSubmitting: boolean;\n  currentProjectId?: string;\n}'
  );
}

dialog = dialog.replace(
  'isSubmitting,\n}: CreateReportDialogProps) {',
  'isSubmitting,\n  currentProjectId,\n}: CreateReportDialogProps) {'
);

dialog = dialog.replace(
  'projectId: "",',
  'projectId: currentProjectId || "",'
);

// We need to fix the case where currentProjectId might be set later
dialog = dialog.replace(
  'const getDefaultForm = useCallback((): CreateReportFormData => {',
  'const getDefaultForm = useCallback((): CreateReportFormData => {'
);
// It already uses useCallback, so we add currentProjectId to dependencies
dialog = dialog.replace(
  '}, [currentUser.name]);',
  '}, [currentUser.name, currentProjectId]);'
);

// We also want to auto-open WorkPicker if project is set and no items? No, that's annoying.

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', dialog);
