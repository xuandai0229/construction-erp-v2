const fs = require('fs');

const path = 'src/components/documents/document-workspace.tsx';
let content = fs.readFileSync(path, 'utf-8');

// FOLDER CARD: find where the text truncates
const folderCardSearch = `<p className={\`truncate font-semibold text-slate-900 \${density === 'compact' ? 'text-sm' : 'text-sm'}\`}>
                                      {formatDocumentFolderName(folder.name)}
                                    </p>`;
const folderCardReplace = `<div className="flex items-start justify-between gap-2">
                                      <p className={\`truncate font-semibold text-slate-900 \${density === 'compact' ? 'text-sm' : 'text-sm'}\`}>
                                        {formatDocumentFolderName(folder.name)}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setContextMenu({
                                            type: "folder",
                                            targetId: folder.id,
                                            x: e.clientX,
                                            y: e.clientY,
                                          });
                                        }}
                                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </button>
                                    </div>`;

content = content.replace(folderCardSearch, folderCardReplace);

// DOCUMENT CARD: 
const docCardSearch = `<p className={\`truncate font-semibold text-slate-900 \${density === 'compact' ? 'text-sm' : 'text-sm'}\`} title={document.originalName}>
                                  {document.displayName}
                                </p>`;
const docCardReplace = `<div className="flex items-start justify-between gap-2">
                                  <p className={\`truncate font-semibold text-slate-900 \${density === 'compact' ? 'text-sm' : 'text-sm'}\`} title={document.originalName}>
                                    {document.displayName}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setContextMenu({
                                        type: "file",
                                        targetId: document.id,
                                        x: e.clientX,
                                        y: e.clientY,
                                      });
                                    }}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </div>`;

content = content.replace(docCardSearch, docCardReplace);

fs.writeFileSync(path, content);
console.log("Updated 3-dot buttons");
