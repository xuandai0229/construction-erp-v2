const fs = require('fs');
const path = 'src/components/documents/document-workspace.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Wipe out activeFilters logic block
const activeFiltersSearch = `            {(() => {
              const activeFilters = [];
              if (filterType !== "ALL") activeFilters.push({ id: "type", label: "Loại file", value: filterType });
              if (filterDateRange !== "ALL") activeFilters.push({ id: "date", label: "Thời gian", value: filterDateRange === "TODAY" ? "Hôm nay" : filterDateRange === "LAST_7_DAYS" ? "7 ngày qua" : filterDateRange === "THIS_MONTH" ? "Tháng này" : "Tháng trước" });
              if (filterUploader !== "ALL") activeFilters.push({ id: "uploader", label: "Người tải lên", value: availableUploaders.find(u => u.id === filterUploader)?.name || filterUploader });

              const activeFilterCount = activeFilters.length;
              return (
                <>
                  {smartSuggestions.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 bg-blue-50/50 border-t border-slate-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                      Gợi ý: {smartSuggestions[0]}
                    </div>
                  )}

                  {/* TODO: Advanced filters can be reintroduced as a polished popover later. */}`;
const replaceWith = `            {(() => {
              return (
                <>
                  {smartSuggestions.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 bg-blue-50/50 border-t border-slate-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                      Gợi ý: {smartSuggestions[0]}
                    </div>
                  )}
`;

content = content.replace(activeFiltersSearch, replaceWith);

// Wipe out empty state references
content = content.replace(/\{searchQuery \|\| filterType !== "ALL" \|\| filterDateRange !== "ALL" \|\| filterUploader !== "ALL"/g, '{searchQuery');
content = content.replace(/\(searchQuery \|\| filterType !== "ALL" \|\| filterDateRange !== "ALL" \|\| filterUploader !== "ALL"\)/g, '(searchQuery)');

const resetFilterSearch = `                      onClick={() => {
                        setSearchQuery("");
                        setFilterType("ALL");
                        setFilterDateRange("ALL");
                        setFilterUploader("ALL");
                      }}`;
const resetFilterReplace = `                      onClick={() => {
                        setSearchQuery("");
                      }}`;
content = content.replace(resetFilterSearch, resetFilterReplace);

fs.writeFileSync(path, content);
console.log("Cleaned up filter states from workspace.");
