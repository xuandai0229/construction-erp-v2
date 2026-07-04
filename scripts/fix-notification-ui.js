const fs = require('fs');

let file = fs.readFileSync('src/components/layout/global-notification-bell.tsx', 'utf8');

// Update panel classes: width, z-index, shadow, max-height, custom-scrollbar
file = file.replace(
  'className="absolute right-0 top-full z-[100] mt-2 w-[calc(100vw-2rem)] max-w-96 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl sm:w-96"',
  'className="absolute right-0 top-full z-[80] mt-2 w-[calc(100vw-2rem)] max-w-[420px] overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-2xl shadow-slate-900/10 sm:w-[420px] animate-in slide-in-from-top-2 fade-in duration-200"'
);

file = file.replace(
  '<div className="max-h-[28rem] overflow-y-auto">',
  '<div className="max-h-[min(65vh,500px)] overflow-y-auto custom-scrollbar">'
);

// Fix title & tabs padding
file = file.replace(
  '<div className="border-b border-slate-100 px-4 pt-3 flex flex-col gap-2">',
  '<div className="border-b border-slate-200/60 px-5 pt-4 flex flex-col gap-3 bg-slate-50/50">'
);

// Better mark all as read button
file = file.replace(
  '<h3 className="font-bold text-slate-900 text-base">Thông báo</h3>',
  '<h3 className="font-bold text-slate-900 text-[17px]">Thông báo</h3>\n                {unreadCount > 0 && (\n                  <button \n                    type="button"\n                    className="text-[12px] font-medium text-blue-600 hover:text-blue-700 transition-colors"\n                    onClick={() => { /* TODO: mark all as read */ }}\n                  >\n                    Đánh dấu đã đọc tất cả\n                  </button>\n                )}'
);

// Better padding for list items
file = file.replace(
  /className={cn\(\n\s*"group relative flex gap-3 p-4 transition-colors hover:bg-slate-50",/g,
  'className={cn(\n                      "group relative flex gap-3.5 px-5 py-4 transition-all hover:bg-slate-50/80 cursor-pointer",'
);

fs.writeFileSync('src/components/layout/global-notification-bell.tsx', file);
