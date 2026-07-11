import fs from "fs";
import path from "path";

const DIRECTORIES_TO_SCAN = ["src/app", "src/components", "src/lib"];
const UNACCENTED_PATTERNS = [
  "Da luu tru",
  "Tat ca trang thai",
  "Dang su dung",
  "Cho duyet",
  "Dang xu ly",
  "Da nhan",
  "Thieu vat tu",
  "Qua han",
  "Nhap kho",
  "Xuat kho",
  "Vat tu",
  "Cong trinh",
  "Phe duyet",
  "Bao cao",
  "Thanh toan",
  "Hop dong",
  "Tai lieu",
  "Khong co",
  "Chua co",
  "ngay can vat tu",
  "ngay de xuat",
  "don vi tinh",
  "so luong de xuat",
  "Co loi xay ra",
  "Vui long chon",
  "da xoa",
  "da khoa",
  "da huy"
];

function scanDirectory(dir: string, results: { file: string; lineNum: number; content: string; pattern: string }[]) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!["node_modules", ".next", "dist", "build", "public", ".git"].includes(file)) {
        scanDirectory(fullPath, results);
      }
    } else if (stat.isFile() && (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx"))) {
      const content = fs.readFileSync(fullPath, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        // basic heuristic: check if line contains string literal with pattern
        UNACCENTED_PATTERNS.forEach((pattern) => {
          const regex = new RegExp(`['"\`].*?\\b${pattern}\\b.*?['"\`]`, "i");
          if (regex.test(line)) {
            // Whitelisting technical identifiers
            if (
              line.includes("console.log") || 
              line.includes("console.error") || 
              line.includes("toast.error(error.message") ||
              line.includes("khong co") || 
              line.includes("không có") ||
              fullPath.includes("permissions.ts") ||
              fullPath.includes("test.ts") ||
              fullPath.includes("document-folders.ts") ||
              fullPath.includes("types.ts")
            ) {
               // ignore
            } else {
               results.push({ file: fullPath, lineNum: index + 1, content: line.trim(), pattern });
            }
          }
        });
      });
    }
  }
}

async function main() {
  console.log("=== Bắt đầu scan lỗi tiếng Việt không dấu trong UI ===");
  const results: { file: string; lineNum: number; content: string; pattern: string }[] = [];
  
  for (const dir of DIRECTORIES_TO_SCAN) {
    const absoluteDir = path.resolve(process.cwd(), dir);
    if (fs.existsSync(absoluteDir)) {
      scanDirectory(absoluteDir, results);
    }
  }

  if (results.length > 0) {
    console.error(`❌ Tìm thấy ${results.length} lỗi hiển thị tiếng Việt không dấu:`);
    results.forEach(r => {
      console.error(`- [${r.pattern}] File: ${r.file}:${r.lineNum} => ${r.content}`);
    });
    process.exit(1);
  } else {
    console.log("✅ Không tìm thấy lỗi tiếng Việt không dấu phổ biến trong UI.");
    process.exit(0);
  }
}

main().catch(console.error);
