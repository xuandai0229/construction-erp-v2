import fs from "fs";
import path from "path";

async function main() {
  console.log("Running qa-material-request-ui-copy-audit...");
  
  const files = [
    "src/components/material-request/material-request-list.tsx",
    "src/components/material-request/material-request-form.tsx",
    "src/components/material-request/material-request-detail.tsx"
  ];

  const disallowed = ["Hủy", "Từ chối (Hủy)", "Đang xử lý", "Đã nhận", "Đã cấp"];

  for (const file of files) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;

    const content = fs.readFileSync(p, "utf8");
    for (const word of disallowed) {
      if (content.includes(`"${word}"`) || content.includes(`'${word}'`)) {
        throw new Error(`Found disallowed text '${word}' in ${file}`);
      }
    }
  }

  console.log("UI copy audit passed.");
}

main().catch(console.error);
