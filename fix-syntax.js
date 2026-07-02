const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

const target = `          }}
          <div className="flex min-w-0 items-center gap-1.5">`;

const replacement = `          }}
        >
          <div className="flex min-w-0 items-center gap-1.5">`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
