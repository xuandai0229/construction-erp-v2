import fs from "fs";
import path from "path";

function walkSync(dir: string, filelist: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.ts') || dirFile.endsWith('.tsx')) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
}

async function main() {
  console.log("Running qa-next-server-action-export-audit...");
  
  const files = walkSync(path.join(process.cwd(), "src/app"));
  files.push(...walkSync(path.join(process.cwd(), "src/components")));

  let hasErrors = false;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    if (!content.includes('"use server"') && !content.includes("'use server'")) {
      continue;
    }

    const lines = content.split('\n');
    let isServer = false;
    for (const line of lines) {
      if (line.trim() === '"use server";' || line.trim() === "'use server';") {
        isServer = true;
        break;
      }
    }

    if (!isServer) continue;

    // Now check for exports
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Ignore type exports
      if (line.startsWith("export type") || line.startsWith("export interface")) {
        continue;
      }

      if (line.startsWith("export function ") || line.startsWith("export const ") || line.startsWith("export class ") || line.startsWith("export default function ")) {
        const error = `Error: File ${file.replace(process.cwd(), '')} has "use server" but exports a non-async element on line ${i + 1}: ${line}`;
        console.error(error);
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log("Server Action export audit passed.");
}

main().catch(console.error);
