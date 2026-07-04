const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts', 'utf8');

const targetStr = `const existingEntry = existingEntries[0];
      // Removed assertFieldProgressEntryWritable to allow Admin corrections`;

const newStr = `const existingEntry = existingEntries[0];
      
      if (existingEntry && existingEntry.note && existingEntry.note.includes("[SOURCE:SITE_REPORT:")) {
        if (existingEntry.status === "APPROVED" && session.role !== "ADMIN") {
          throw new Error("Không thể sửa khối lượng đã duyệt được đồng bộ từ Báo cáo hiện trường.");
        } else if (!isApprover) {
          throw new Error("Chỉ người duyệt mới có quyền điều chỉnh khối lượng từ Báo cáo hiện trường.");
        }
      }`;

content = content.replace(targetStr, newStr);

// Also block viewer/accountant writes
const targetStr2 = `const { start, end } = getWorkDateRange(entryDateStr);
    const isApprover = ["ADMIN", "DIRECTOR", "MANAGER", "SITE_MANAGER"].includes(session.role as string);`;

const newStr2 = `if (["VIEWER", "ACCOUNTANT", "STAFF"].includes(session.role as string)) {
      throw new Error("Tài khoản của bạn không có quyền nhập/sửa khối lượng.");
    }
    const { start, end } = getWorkDateRange(entryDateStr);
    const isApprover = ["ADMIN", "DIRECTOR", "MANAGER", "SITE_MANAGER"].includes(session.role as string);`;

content = content.replace(targetStr2, newStr2);

fs.writeFileSync('src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts', content);
