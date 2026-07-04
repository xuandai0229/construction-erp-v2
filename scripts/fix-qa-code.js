const fs = require('fs');

let script = fs.readFileSync('scripts/qa-report-ui-data-flow.ts', 'utf8');

script = script.replace(
  'const projectId = "CT-TAYHO-2026-001";',
  `const projectCode = "CT-TAYHO-2026-001";
  console.log(\`Đang tìm công trình: \${projectCode}\`);
  const project = await prisma.project.findFirst({ where: { code: projectCode } });
  if (!project) {
    console.error(\`LỖI: Không tìm thấy công trình với code \${projectCode}\`);
    return;
  }
  const projectId = project.id;`
);

fs.writeFileSync('scripts/qa-report-ui-data-flow.ts', script);
