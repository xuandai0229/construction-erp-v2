const fs = require('fs');
const dirs = ['approvals', 'materials', 'reports', 'documents', 'contracts', 'accounting', 'suppliers', 'users', 'audit', 'settings'];
const content = `"use client";

import { PageError } from "@/components/ui/page-error";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError error={error} reset={reset} />;
}
`;

dirs.forEach(dir => {
  const path = `./src/app/(dashboard)/${dir}/error.tsx`;
  if (fs.existsSync(`./src/app/(dashboard)/${dir}`)) {
    fs.writeFileSync(path, content);
    console.log('Created ' + path);
  }
});
