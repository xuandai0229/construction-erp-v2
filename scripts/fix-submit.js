const fs = require('fs');
let content = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

content = content.replace(/onSubmit: \(data: CreateReportFormData, action: "DRAFT" \| "SUBMIT"\) => Promise<void>;/g, 'onSubmit: (data: CreateReportFormData, isDraft: boolean) => Promise<void>;');

// And submitAction
content = content.replace(/const submitAction = async \(action: "DRAFT" \| "SUBMIT"\) => \{/g, 'const submitAction = async (action: "DRAFT" | "SUBMIT") => {');
content = content.replace(/await onSubmit\(form, action\);/g, 'await onSubmit(form, action === "DRAFT");');

// Fix the activeProjects prop which I named `projects` in CreateReportDialog but ReportsWorkspace passed `activeProjects`.
// In reports-workspace.tsx: `<CreateReportDialog ... activeProjects={activeProjects} />`
// Wait, I named it `projects` in `CreateReportDialogProps`.
content = content.replace(/projects: \{ id: string; name: string \}\[\];/g, 'activeProjects: { id: string; name: string }[];');
content = content.replace(/projects,/g, 'activeProjects,');
content = content.replace(/activeProjects=\{(projects|activeProjects)\}/g, 'activeProjects={activeProjects}');

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', content);
