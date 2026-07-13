import fs from 'fs';
import path from 'path';

// Define the terms to look for (case-sensitive or insensitive as needed)
const noAccentWords = [
  "Dang", "Da", "Chua", "Tat ca", "Luu tru", "Khoi phuc", "Xoa", "Sua", "Duyet", "Tu choi",
  "Cong trinh", "Vat tu", "Bao cao", "Thanh toan", "Hop dong", "Nguoi tao", "Ngay tao",
  "Trang thai", "Nhap", "Xuat", "Ton kho", "De xuat"
];

const englishWords = [
  "No data", "Submit", "Cancel", "Edit", "Delete", "View", "Create", "Update", "Restore",
  "Active", "Archived", "Pending", "Approved", "Rejected", "Import", "Export", "Material",
  "Stock", "Request", "Proposal"
];

const abbreviations = [
  "\\bVT\\b", "\\bSL\\b", "\\bĐVT\\b", "\\bCV\\b", "\\bGD\\b"
];

// Combine into regex patterns
const noAccentPattern = new RegExp(`\\b(${noAccentWords.join('|')})\\b`, 'i');
// Exclude variable names, enums, etc. for english words. We only care if they are in JSX text or strings.
// A simple heuristic: check strings inside JSX or quotes that contain spaces, or standalone words that look like labels.
// For now, we will do a rough scan and use an allowlist.
const englishPattern = new RegExp(`\\b(${englishWords.join('|')})\\b`, 'i');
const abbreviationPattern = new RegExp(`(${abbreviations.join('|')})`, 'g');

const targetDirs = ['src/app', 'src/components', 'src/lib', 'src/app/actions'];

let hasErrors = false;

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Skip imports, console.log, enums, interface, type, export
    if (line.match(/^(import|export|type|interface|enum|console\.log|const\s+[A-Z_]+|let|var)\b/)) return;
    // Skip if it's a URL or path
    if (line.match(/https?:\/\//) || line.match(/from\s+['"]/)) return;
    // Skip comment lines
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) return;
    // Skip internal property accesses (e.g. obj.status === 'APPROVED')
    // We want to find UI text like >Approved< or "Approved" or label: "Approved"
    
    // Check for abbreviations (VT, SL, etc.) - case sensitive
    const abbrMatch = line.match(abbreviationPattern);
    if (abbrMatch) {
      // Check if it's not a variable name like VT_SOMETHING
      if (!line.match(/[A-Z_]{3,}/)) {
         console.warn(`[WARNING] Found abbreviation in ${filePath}:${index + 1}: ${line.trim()}`);
         // Not setting hasErrors = true for warnings yet to avoid breaking everything immediately
      }
    }

    // Check for english words in UI (heuristic: inside tags >Word< or in label: "Word")
    // E.g. >Active<, label="Active", placeholder="Active"
    const uiEnglishPattern = new RegExp(`(>|label=["']|placeholder=["']|title=["']|tooltip=["'])\\s*(${englishWords.join('|')})\\s*(<|["'])`, 'i');
    if (uiEnglishPattern.test(line)) {
       console.error(`[ERROR] Found English UI text in ${filePath}:${index + 1}: ${line.trim()}`);
       hasErrors = true;
    }

    // Check for no-accent words in UI
    const uiNoAccentPattern = new RegExp(`(>|label=["']|placeholder=["']|title=["']|tooltip=["'])\\s*(${noAccentWords.join('|')})\\s*(<|["'])`, 'i');
    if (uiNoAccentPattern.test(line)) {
       console.error(`[ERROR] Found no-accent Vietnamese text in ${filePath}:${index + 1}: ${line.trim()}`);
       hasErrors = true;
    }
  });
}

function scanDir(dir: string) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      scanFile(fullPath);
    }
  }
}

console.log("=== STARTING VIETNAMESE UI COPY AUDIT ===");
for (const dir of targetDirs) {
  scanDir(dir);
}

if (hasErrors) {
  console.error("=== AUDIT FAILED: Found UI copy issues. ===");
  process.exit(1);
} else {
  console.log("=== AUDIT PASSED: No severe UI copy issues found. ===");
}
