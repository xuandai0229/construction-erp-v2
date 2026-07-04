const fs = require('fs');

let dialog = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

// Import getProjectWorkItems
if (!dialog.includes('import { getProjectWorkItems }')) {
  dialog = dialog.replace(
    'import { type CreateReportFormData, type FieldReport, type ReportWorkLine } from "./types";',
    'import { type CreateReportFormData, type FieldReport, type ReportWorkLine } from "./types";\nimport { getProjectWorkItems } from "@/app/(dashboard)/reports/actions";'
  );
}

// Replace fetch
dialog = dialog.replace(
  'const res = await fetch(`\/api\/projects\/${form.projectId}\/field-progress\/items`);',
  'const items = await getProjectWorkItems(form.projectId, form.date);'
);
dialog = dialog.replace(
  'if (res.ok) {\n          const data = await res.json();\n          setWorkItemsData(data.items || []);\n        }',
  'setWorkItemsData(items || []);'
);

// We need to also add form.date to dependencies of loadItems effect
dialog = dialog.replace(
  '}, [form.projectId]);',
  '}, [form.projectId, form.date]);'
);

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', dialog);
