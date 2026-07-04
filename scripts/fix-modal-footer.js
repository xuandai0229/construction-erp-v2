const fs = require('fs');

let dialog = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

dialog = dialog.replace(
  'className="bg-white border-t border-slate-200 p-4 sm:px-6 absolute bottom-0 left-0 right-0 z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]"',
  'className="bg-white border-t border-slate-200 p-4 sm:px-6 shrink-0 z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]"'
);

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', dialog);


let resources = fs.readFileSync('src/components/reports/create-dialog/resources-and-quality.tsx', 'utf8');

resources = resources.replace(
  'const textareaClass = "w-full min-h-[100px]',
  'const textareaClass = "w-full min-h-[130px]'
);

resources = resources.replace(
  '<div className="grid grid-cols-1 md:grid-cols-3 gap-5">',
  '<div className="grid grid-cols-1 md:grid-cols-2 gap-5">'
);

resources = resources.replace(
  '<div className="space-y-2">\n              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">\n                <ShieldAlert className="w-4 h-4 text-slate-400" /> Chất lượng thi công',
  '<div className="space-y-2 md:col-span-2">\n              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">\n                <ShieldAlert className="w-4 h-4 text-slate-400" /> Chất lượng thi công'
);

// Add scroll-margin to the parent
resources = resources.replace(
  '<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">',
  '<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">\n'
);
resources = resources.replace(
  '<div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2.5">\n          <div className="bg-red-100 p-1.5 rounded-lg text-red-600">',
  '<div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2.5 scroll-mt-24">\n          <div className="bg-red-100 p-1.5 rounded-lg text-red-600">'
);


fs.writeFileSync('src/components/reports/create-dialog/resources-and-quality.tsx', resources);
