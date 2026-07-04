const fs = require('fs');

// Fix create-report-dialog.tsx validation and scrolling
let file = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

file = file.replace(
  `  const validate = (isDraft: boolean): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.projectId) newErrors.projectId = "Vui lòng chọn công trình";
    if (!form.date) newErrors.date = "Vui lòng chọn ngày";
    
    if (!isDraft && form.type === "DAILY" && form.workLines.length === 0) {
      newErrors.workLines = "Vui lòng thêm ít nhất một công việc";
    }
    
    // Check over design quantity
    const hasOverQty = form.workLines.some(l => (l.quantityToday || 0) > (l.remainingQuantity || 0));
    if (!isDraft && hasOverQty) {
      newErrors.workLines = "Có công việc vượt khối lượng thiết kế. Vui lòng kiểm tra lại.";
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      toast.error(Object.values(newErrors)[0]);
      return false;
    }
    return true;
  };`,
  `  const validate = (isDraft: boolean): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.projectId) newErrors.projectId = "Vui lòng chọn công trình";
    if (!form.date) newErrors.date = "Vui lòng chọn ngày";
    
    if (!isDraft && form.type === "DAILY" && form.workLines.length === 0) {
      newErrors.workLines = "Báo cáo ngày cần ít nhất 1 công việc. Bấm Thêm khối lượng để chọn công việc từ bảng khối lượng gốc.";
    }
    
    const hasOverQty = form.workLines.some(l => (l.quantityToday || 0) > (l.remainingQuantity || 0));
    if (!isDraft && hasOverQty) {
      newErrors.workLines = "Khối lượng không được vượt phần còn lại.";
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      if (newErrors.workLines) {
        document.getElementById('work-lines-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    return true;
  };`
);

// We should also check submitAction to see what we can do about the toast if submitAction throws from backend
file = file.replace(
  `    } catch (e: any) {
      toast.error(e.message || "Lỗi lưu báo cáo");
    }`,
  `    } catch (e: any) {
      toast.error(e.message || "Đã xảy ra lỗi không mong muốn khi tạo báo cáo");
    }`
);

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', file);

// Fix resources-and-quality.tsx chips logic
let file2 = fs.readFileSync('src/components/reports/create-dialog/resources-and-quality.tsx', 'utf8');
file2 = file2.replace(
  `                onClick={() => {
                  const current = form.issues ? form.issues + "\\\\n" : "";
                  updateField('issues', current + chip);
                }}`,
  `                onClick={() => {
                  const current = form.issues ? form.issues + "\\n" : "";
                  updateField('issues', current + chip);
                }}`
);
fs.writeFileSync('src/components/reports/create-dialog/resources-and-quality.tsx', file2);
