const fs = require('fs');

let dialog = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

// Replace the ConfirmDialog usage with a custom one
const customExitDialog = `
      {showConfirmClose && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Bạn muốn xử lý báo cáo đang nhập thế nào?</h3>
              <p className="text-[14px] text-slate-500 mb-6">Có dữ liệu bạn đã nhập nhưng chưa được lưu lại.</p>
              
              <div className="flex flex-col gap-3">
                {canSaveDraft && (
                  <Button 
                    onClick={() => { setShowConfirmClose(false); submitAction("DRAFT"); }} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl"
                  >
                    <Save className="w-4 h-4 mr-2" /> Lưu bản nháp
                  </Button>
                )}
                <Button 
                  onClick={() => { setShowConfirmClose(false); onClose(); }} 
                  variant="outline" 
                  className="w-full border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold h-11 rounded-xl"
                >
                  <X className="w-4 h-4 mr-2" /> Bỏ thay đổi & Thoát
                </Button>
                <Button 
                  onClick={() => setShowConfirmClose(false)} 
                  variant="ghost" 
                  className="w-full text-slate-600 hover:bg-slate-100 font-bold h-11 rounded-xl"
                >
                  Tiếp tục chỉnh sửa
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
`;

dialog = dialog.replace(
  /<ConfirmDialog[\s\S]*?onClose=\{\(\) => setShowConfirmClose\(false\)\}\n      \/>\n    <\/>\n  \);\n}/m,
  customExitDialog
);

// We also need to fix:
// - "Khi tạo báo cáo mới, form vẫn bắt chọn lại hoặc projectId rỗng." -> I did it in fix-context.js by setting `projectId: currentProjectId || ""`
// Let's verify `currentProjectId` is used and updated when `activeProjects` loads?

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', dialog);
