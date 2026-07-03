const fs = require('fs');
const dirs = ['approvals', 'materials', 'reports', 'documents', 'contracts', 'accounting', 'suppliers', 'users', 'audit', 'settings'];
const content = `import { PageSkeleton } from "@/components/ui/skeleton/page-skeleton";

export default function Loading() {
  return <PageSkeleton />;
}
`;

dirs.forEach(dir => {
  const path = `./src/app/(dashboard)/${dir}/loading.tsx`;
  if (fs.existsSync(`./src/app/(dashboard)/${dir}`)) {
    fs.writeFileSync(path, content);
    console.log('Created ' + path);
  }
});
