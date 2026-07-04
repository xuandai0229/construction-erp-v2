const fs = require('fs');

let file = fs.readFileSync('src/components/reports/reports-toolbar.tsx', 'utf8');

const replacement = `
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            disabled={isTypeDisabled}
            className={\`h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors \${
              isTypeDisabled 
                ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed' 
                : typeFilter ? 'bg-blue-50/50 text-blue-900 border border-blue-200' : 'bg-slate-50 text-slate-900 border border-slate-200'
            }\`}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={projectFilter}
            onChange={(e) => onProjectFilterChange(e.target.value)}
            className={\`h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors \${
              projectFilter ? 'bg-blue-50/50 text-blue-900 border border-blue-200' : 'bg-slate-50 text-slate-900 border border-slate-200'
            }\`}
          >
            <option value="">Tất cả công trình</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <div className="relative">
            <Calendar className={\`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none \${dateRange ? 'text-blue-500' : 'text-slate-400'}\`} />
            <select
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value)}
              className={\`w-full h-10 pl-9 pr-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none cursor-pointer \${
                dateRange ? 'bg-blue-50/50 text-blue-900 border border-blue-200' : 'bg-slate-50 text-slate-900 border border-slate-200'
              }\`}
            >
              <option value="">Mọi thời điểm</option>
              <option value="today">Hôm nay</option>
              <option value="thisWeek">Tuần này</option>
              <option value="thisMonth">Tháng này</option>
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            disabled={isStatusDisabled}
            className={\`h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors \${
              isStatusDisabled 
                ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed' 
                : statusFilter ? 'bg-blue-50/50 text-blue-900 border border-blue-200' : 'bg-slate-50 text-slate-900 border border-slate-200'
            }\`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500 mr-1">Đang lọc:</span>
          {typeFilter && !isTypeDisabled && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[12px] font-medium">
              Loại: {TYPE_OPTIONS.find(o => o.value === typeFilter)?.label}
              <button onClick={() => onTypeFilterChange('')} className="hover:text-blue-900 ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {statusFilter && !isStatusDisabled && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-[12px] font-medium">
              Trạng thái: {STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}
              <button onClick={() => onStatusFilterChange('')} className="hover:text-amber-900 ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {projectFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-[12px] font-medium">
              Công trình: {projects.find(p => p.id === projectFilter)?.name || 'Đã chọn'}
              <button onClick={() => onProjectFilterChange('')} className="hover:text-purple-900 ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {dateRange && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[12px] font-medium">
              Thời gian: {dateRange === 'today' ? 'Hôm nay' : dateRange === 'thisWeek' ? 'Tuần này' : 'Tháng này'}
              <button onClick={() => onDateRangeChange('')} className="hover:text-emerald-900 ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          <button onClick={onResetFilters} className="text-[12px] text-slate-500 hover:text-slate-800 font-medium ml-1 underline underline-offset-2">Xóa tất cả</button>
        </div>
      )}
`;

const startIdx = file.indexOf('{isOpen && (');
if (startIdx !== -1) {
  const endIdx = file.lastIndexOf('</div>');
  file = file.substring(0, startIdx) + replacement + '\n    </div>\n  );\n}';
}

fs.writeFileSync('src/components/reports/reports-toolbar.tsx', file);
