const fs = require('fs');

// In create-report-dialog.tsx
let dialog = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

// The default form currently uses currentProjectId || "". But we also want to default to activeProjects[0] if there's only 1 project and currentProjectId is empty
dialog = dialog.replace(
  'projectId: currentProjectId || "",',
  'projectId: currentProjectId || (activeProjects.length === 1 ? activeProjects[0].id : ""), // Automatically select if 1 project'
);

// We should also ensure that the Select component respects currentProjectId initially or updates if currentProjectId changes
dialog = dialog.replace(
  '// Reset form when opened in create mode\n  useEffect(() => {\n    if (isOpen && mode === "create") {\n      setForm(getDefaultForm());\n      setErrors({});\n    }\n  }, [isOpen, mode, getDefaultForm]);',
  '// Reset form when opened in create mode\n  useEffect(() => {\n    if (isOpen && mode === "create") {\n      setForm(getDefaultForm());\n      setErrors({});\n    }\n  }, [isOpen, mode, getDefaultForm]);\n\n  // Force update project if currentProjectId changes while form is open\n  useEffect(() => {\n    if (isOpen && mode === "create" && currentProjectId && currentProjectId !== form.projectId) {\n      setForm(prev => ({ ...prev, projectId: currentProjectId }));\n    }\n  }, [currentProjectId, isOpen, mode, form.projectId]);'
);

// Also need to rewrite the selected work card to be a table
// Let's create a new component inline or update SelectedWorkCard

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', dialog);
