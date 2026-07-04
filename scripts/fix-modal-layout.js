const fs = require('fs');

let dialog = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

// Update imports
dialog = dialog.replace(
  'import { X, Save, Send, AlertCircle, FileText, CheckCircle2, ListTodo, FileImage, Files, MapPin, Building2, ChevronDown } from "lucide-react";',
  'import { X, Save, Send, AlertCircle, FileText, CheckCircle2, ListTodo, FileImage, Files, MapPin, Building2, ChevronDown, Plus } from "lucide-react";'
);

// Update Modal wrapper width
dialog = dialog.replace(
  'className="bg-slate-50 w-full h-full sm:h-auto sm:max-h-full sm:rounded-2xl shadow-2xl flex flex-col relative max-w-5xl overflow-hidden animate-in zoom-in-95 duration-300"',
  'className="bg-slate-50 w-full h-full sm:h-auto sm:max-h-full sm:rounded-2xl shadow-2xl flex flex-col relative w-[calc(100vw-16px)] md:w-[min(1180px,calc(100vw-48px))] max-w-6xl overflow-hidden animate-in zoom-in-95 duration-300"'
);

// Update Inner wrapper width
dialog = dialog.replace(
  'className="max-w-4xl mx-auto space-y-6"',
  'className="max-w-none md:max-w-[1100px] mx-auto space-y-6"'
);

// Update Footer wrapper width
dialog = dialog.replace(
  'className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3"',
  'className="max-w-none md:max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 w-full"'
);

// Update Work section header text
dialog = dialog.replace(
  '<p className="text-[12px] text-slate-500">Chỉ chọn từ khối lượng gốc của công trình</p>',
  '<p className="text-[12px] text-slate-500 mt-0.5">Chọn công việc từ bảng khối lượng gốc của công trình</p>'
);

// Update Add Work button
dialog = dialog.replace(
  '+ Thêm từ khối lượng gốc',
  '<Plus className="w-4 h-4 mr-1.5" /> Thêm khối lượng'
);
dialog = dialog.replace(
  'className={`${!form.projectId ? \'bg-slate-100 text-slate-400 cursor-not-allowed\' : \'bg-blue-600 hover:bg-blue-700 text-white shadow-sm\'} font-bold h-10 px-4 rounded-xl transition-all whitespace-nowrap`}',
  'className={`${!form.projectId ? \'bg-slate-100 text-slate-400 cursor-not-allowed\' : \'bg-blue-600 hover:bg-blue-700 text-white shadow-sm\'} font-bold h-10 px-5 rounded-xl transition-all whitespace-nowrap flex items-center`}'
);

// Update Work Empty State
dialog = dialog.replace(
  '<h4 className="font-bold text-slate-700 text-[15px]">Chưa có công việc nào trong báo cáo</h4>',
  '<h4 className="font-bold text-slate-700 text-[15px]">Chưa có khối lượng trong báo cáo</h4>'
);
dialog = dialog.replace(
  '<p className="text-[13px] text-slate-500 mt-1 mb-4 max-w-[300px]">\n                          Hệ thống đã tải {workItemsData.length} công việc từ khối lượng gốc. Hãy bấm nút thêm để bắt đầu nhập.\n                        </p>',
  '<p className="text-[13px] text-slate-500 mt-1 mb-4 max-w-[350px]">\n                          Bấm Thêm khối lượng để chọn công việc từ bảng khối lượng gốc.\n                        </p>'
);
dialog = dialog.replace(
  'Mở danh sách',
  '<span className="flex items-center"><Plus className="w-4 h-4 mr-1.5" /> Thêm khối lượng</span>'
);

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', dialog);
