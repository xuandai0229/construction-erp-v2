const fs = require('fs');

let file = fs.readFileSync('src/components/reports/reports-workspace.tsx', 'utf8');

// Insert handleQuickFilter
const insertPos = file.indexOf('const handlePageChange = ');
if (insertPos !== -1) {
  const quickFilterCode = `
  const handleQuickFilter = (status: string) => {
    setTab("all");
    setStatusFilter(status);
    updateUrl({ tab: undefined, status: status || undefined, type: undefined, page: "1" });
  };

  `;
  file = file.slice(0, insertPos) + quickFilterCode + file.slice(insertPos);
}

// Replace KPI cards to use handleQuickFilter and active styling
const kpiRegex = /<div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-2">[\s\S]*?<\/div>\s*\{\/\* Tabs \*\/\}/;

const newKpiCode = `<div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-2">
        <div 
          onClick={() => handleQuickFilter('')}
          className={\`rounded-xl p-3 border flex items-center justify-between cursor-pointer transition-colors shadow-sm \${
            !statusFilter && tab === 'all'
              ? 'bg-blue-50/50 border-blue-400 ring-1 ring-blue-400' 
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }\`}
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
          onClick={() => handleQuickFilter('SUBMITTED')}
          className={\`rounded-xl p-3 border flex items-center justify-between cursor-pointer transition-colors shadow-sm \${
            statusFilter === 'SUBMITTED'
              ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400' 
              : stats.pending === 0 
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
          onClick={() => handleQuickFilter('APPROVED')}
          className={\`rounded-xl p-3 border flex items-center justify-between cursor-pointer transition-colors shadow-sm \${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400' 
              : stats.approved === 0 
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
          onClick={() => handleQuickFilter('REJECTED')}
          className={\`rounded-xl p-3 border flex items-center justify-between cursor-pointer transition-colors shadow-sm \${
            statusFilter === 'REJECTED'
              ? 'bg-red-50 border-red-400 ring-1 ring-red-400' 
              : stats.rejected === 0 
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

      {/* Tabs */}`;

file = file.replace(kpiRegex, newKpiCode);

fs.writeFileSync('src/components/reports/reports-workspace.tsx', file);
