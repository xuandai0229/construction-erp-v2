const fs = require('fs');

const path = 'src/app/(dashboard)/documents/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

const regex = /        \{projects\.length > 0 \? \([\s\S]*?        \) : \(/;

const newGrid = `        {projects.length > 0 ? (
          <div className="p-5 sm:p-6 bg-slate-50/50">
            {(() => {
              const count = projects.length;
              const density = count >= 25 ? "list" : count >= 10 ? "compact" : "comfortable";
              
              return (
                <div className={\`\${
                  density === 'list' 
                    ? 'flex flex-col gap-2' 
                    : density === 'compact'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                }\`}>
                  {projects.map(project => (
                    <Link href={\`/documents/\${project.id}\`} key={project.id} className="block group outline-none">
                      <div className={\`\${
                        density === 'list'
                          ? 'flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all'
                          : density === 'compact'
                            ? 'rounded-xl border border-slate-200/80 bg-white p-4 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full flex flex-col'
                            : 'rounded-[20px] border border-slate-200/80 bg-white p-5 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full flex flex-col'
                      }\`}>
                        
                        {/* LIST VIEW */}
                        {density === 'list' ? (
                          <>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 shrink-0 rounded-lg bg-blue-50/80 flex items-center justify-center">
                                <FolderOpen className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 truncate text-[14px] leading-tight transition-colors">{project.name}</h3>
                                <p className="text-[12px] text-slate-500 font-medium truncate mt-0.5">{project.code}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 shrink-0">
                              <div className="flex items-center gap-1.5 text-[12px] text-slate-600 font-medium">
                                <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                                {project._count.documentFolders} thư mục
                              </div>
                              <div className="flex items-center gap-1.5 text-[12px] text-slate-600 font-medium w-[100px]">
                                <svg className="h-3.5 w-3.5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                {project.documents ? project.documents.length : 0} tài liệu
                              </div>
                            </div>
                          </>
                        ) : (
                          /* GRID VIEWS (Compact / Comfortable) */
                          <>
                            <div className="flex items-start gap-3.5 mb-4">
                              <div className={\`\${density === 'compact' ? 'h-10 w-10 rounded-lg' : 'h-12 w-12 rounded-xl'} bg-blue-50/80 flex items-center justify-center group-hover:bg-blue-100/80 group-hover:scale-105 transition-all duration-300 shrink-0 ring-4 ring-white shadow-sm\`}>
                                <FolderOpen className={\`\${density === 'compact' ? 'h-5 w-5' : 'h-6 w-6'} text-blue-600 drop-shadow-sm\`} />
                              </div>
                              <div className="flex-1 pt-1 min-w-0">
                                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 truncate text-[14px] sm:text-[15px] leading-tight mb-1 transition-colors" title={project.name}>{project.name}</h3>
                                <p className="text-[12px] sm:text-[13px] text-slate-500 font-medium flex items-center gap-1.5 truncate" title={project.code}>
                                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{project.code}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-slate-100/80">
                              <div className="flex items-center gap-5">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-6 w-6 rounded-md bg-amber-50 flex items-center justify-center shrink-0">
                                    <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
                                  </div>
                                  <span className="text-[13px] font-semibold text-slate-700">{project._count.documentFolders}</span>
                                  {density === 'comfortable' && <span className="text-[13px] text-slate-500">thư mục</span>}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="h-6 w-6 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                                    <svg className="h-3.5 w-3.5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                  </div>
                                  <span className="text-[13px] font-semibold text-slate-700">{project.documents ? project.documents.length : 0}</span>
                                  {density === 'comfortable' && <span className="text-[13px] text-slate-500">tài liệu</span>}
                                </div>
                              </div>
                              {project.updatedAt && density === 'comfortable' && (
                                <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400 mt-0.5">
                                  <svg className="h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                  <span className="truncate">Hoạt động gần nhất: {new Date(project.updatedAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (`;

content = content.replace(regex, newGrid);

fs.writeFileSync(path, content);
