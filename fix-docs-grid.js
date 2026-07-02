const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

const docsRegex = /                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">\n                        \{groupDocs\.map\(\(document\) => \{\n                          const matchesRule = hasAllowedDocumentExtension\(/;

const newDocsGrid = `                      <div className={\`\${density === 'list' ? 'flex flex-col gap-2' : density === 'compact' ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}\`}>
                        {groupDocs.map((document) => {
                          const matchesRule = hasAllowedDocumentExtension(`;

content = content.replace(docsRegex, newDocsGrid);

const articleRegex = /                              <article\n                                key=\{document\.id\}\n                                tabIndex=\{0\}\n                                className="group relative flex cursor-pointer flex-col rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"/;

const newArticle = `                              <article
                                key={document.id}
                                tabIndex={0}
                                className={\`group relative flex cursor-pointer transition-all hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 \${
                                  density === 'list'
                                    ? 'flex-row items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3'
                                    : 'flex-col rounded-lg border border-slate-200 bg-white p-4'
                                }\`}`;

content = content.replace(new RegExp(articleRegex.source, 'g'), newArticle);

const innerDocRegex = /                                <div className="mb-3 flex items-start justify-between gap-3">/g;

const newInnerDoc = `                                <div className={\`flex items-start justify-between gap-3 \${density === 'list' ? 'mb-0 flex-1' : 'mb-3'}\`}>`;

content = content.replace(innerDocRegex, newInnerDoc);

const docInfoRegex = /                                <div className="min-w-0 flex-1">\n                                  <p\n                                    className="truncate text-sm font-semibold text-slate-900"/;

const newDocInfo = `                                <div className={\`min-w-0 \${density === 'list' ? 'flex items-center gap-4' : 'flex-1'}\`}>
                                  <p
                                    className={\`truncate font-semibold text-slate-900 \${density === 'compact' ? 'text-sm' : 'text-sm'}\`}`;

content = content.replace(docInfoRegex, newDocInfo);

const pDetailsRegex = /                                  <\/p>\n                                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">/;
const newPDetails = `                                  </p>
                                  <p className={\`flex items-center gap-2 text-xs text-slate-500 \${density === 'list' ? 'mt-0 w-32 shrink-0' : 'mt-1'}\`}>`;

content = content.replace(pDetailsRegex, newPDetails);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
