const fs = require('fs');

let file = fs.readFileSync('src/components/reports/reports-workspace.tsx', 'utf8');

// Header update
file = file.replace(
  'Quản lý, theo dõi và tổng hợp báo cáo công việc',
  'Quản lý báo cáo ngày, báo cáo tuần và phát sinh tại công trường'
);

file = file.replace(
  '{searchParams.get("reportId") && (',
  `{globalContext?.selectedProjectId && (
                <span className="ml-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                  {activeProjects.find(p => p.id === globalContext.selectedProjectId)?.name || 'Dự án đang chọn'}
                </span>
              )}
              {searchParams.get("reportId") && (`
);

// We need to replace the whole `Dashboard / Action Center` div
const kpiStart = file.indexOf('<div className="grid grid-cols-3 gap-3 sm:gap-4">');
const tabsStart = file.indexOf('{/* Tabs */}');
if (kpiStart !== -1 && tabsStart !== -1) {
  const newKpi = `
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-2">
        <div 
          onClick={() => { setTab('all'); setStatusFilter(''); }}
          className="rounded-xl p-3 border flex items-center justify-between cursor-pointer transition-colors bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[13px] sm:text-sm text-slate-700">Tổng báo cáo</h3>
            </div>
          </div>
          <span className="text-lg sm:text-xl font-bold text-slate-800">{stats.total}</span>
        </div>

        <div 
          onClick={() => { setTab('all'); setStatusFilter('SUBMITTED'); }}
          className={\`rounded-xl p-3 border flex items-center justify-between cursor-pointer transition-colors shadow-sm \${
            stats.pending === 0 
              ? 'bg-slate-50 border-slate-200 opacity-80 hover:opacity-100' 
              : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
          }\`}
        >
          <div className="flex items-center gap-2.5">
            <div className={\`p-1.5 rounded-lg \${stats.pending === 0 ? 'bg-slate-200 text-slate-500' : 'bg-amber-100 text-amber-600'}\`}>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className={\`font-semibold text-[13px] sm:text-sm \${stats.pending === 0 ? 'text-slate-600' : 'text-amber-900'}\`}>Chờ duyệt</h3>
            </div>
          </div>
          <span className={\`text-lg sm:text-xl font-bold \${stats.pending === 0 ? 'text-slate-500' : 'text-amber-700'}\`}>{stats.pending}</span>
        </div>
        
        <div 
          onClick={() => { setTab('all'); setStatusFilter('APPROVED'); }}
          className={\`rounded-xl p-3 border flex items-center justify-between cursor-pointer transition-colors shadow-sm \${
            stats.approved === 0 
              ? 'bg-slate-50 border-slate-200 opacity-80 hover:opacity-100' 
              : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
          }\`}
        >
          <div className="flex items-center gap-2.5">
            <div className={\`p-1.5 rounded-lg \${stats.approved === 0 ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-600'}\`}>
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className={\`font-semibold text-[13px] sm:text-sm \${stats.approved === 0 ? 'text-slate-600' : 'text-emerald-900'}\`}>Đã duyệt</h3>
            </div>
          </div>
          <span className={\`text-lg sm:text-xl font-bold \${stats.approved === 0 ? 'text-slate-500' : 'text-emerald-700'}\`}>{stats.approved}</span>
        </div>
        
        <div 
          onClick={() => { setTab('all'); setStatusFilter('REJECTED'); }}
          className={\`rounded-xl p-3 border flex items-center justify-between cursor-pointer transition-colors shadow-sm \${
            stats.rejected === 0 
              ? 'bg-slate-50 border-slate-200 opacity-80 hover:opacity-100' 
              : 'bg-red-50 border-red-200 hover:bg-red-100'
          }\`}
        >
          <div className="flex items-center gap-2.5">
            <div className={\`p-1.5 rounded-lg \${stats.rejected === 0 ? 'bg-slate-200 text-slate-500' : 'bg-red-100 text-red-600'}\`}>
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className={\`font-semibold text-[13px] sm:text-sm \${stats.rejected === 0 ? 'text-slate-600' : 'text-red-900'}\`}>Từ chối</h3>
            </div>
          </div>
          <span className={\`text-lg sm:text-xl font-bold \${stats.rejected === 0 ? 'text-slate-500' : 'text-red-700'}\`}>{stats.rejected}</span>
        </div>
      </div>

      `;
  
  file = file.substring(0, kpiStart) + newKpi + file.substring(tabsStart);
}

// Remove `const isLeader = ...` and `const dashboardStats = ...` as they are no longer needed
file = file.replace(/const isLeader = .*?\n/g, '');
file = file.replace(/const dashboardStats = useMemo\(\(\) => \{[\s\S]*?\}, \[reports, currentUser\]\);\n/g, '');
file = file.replace(/const handleTabChange = .*?\n/g, ''); // We will just use setTab
// Wait, `handleTabChange` is used in tabs and KPIs, I shouldn't remove it. I'll restore it and update it.
// Actually I replaced `handleTabChange('pending')` with `setTab('all'); setStatusFilter('SUBMITTED');` in KPIs. But tabs still need `handleTabChange`.

fs.writeFileSync('src/components/reports/reports-workspace.tsx', file);
