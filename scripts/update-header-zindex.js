const fs = require('fs');

let header = fs.readFileSync('src/components/layout/header.tsx', 'utf8');
header = header.replace(
  'className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-md md:px-6"',
  'className="sticky top-0 z-60 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-md md:px-6"'
);
fs.writeFileSync('src/components/layout/header.tsx', header);

let sidebar = fs.readFileSync('src/components/layout/sidebar.tsx', 'utf8');
sidebar = sidebar.replace('className="relative z-40 lg:hidden"', 'className="relative z-50 lg:hidden"');
fs.writeFileSync('src/components/layout/sidebar.tsx', sidebar);
