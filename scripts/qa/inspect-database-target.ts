import fs from "node:fs";
import path from "node:path";
import { parse } from "dotenv";

type Source = "shell environment" | ".env.local" | ".env" | "not found";

function readEnvFile(fileName: string) {
  const filePath = path.join(process.cwd(), fileName);
  return fs.existsSync(filePath) ? parse(fs.readFileSync(filePath)) : undefined;
}

const shellUrl = process.env.DATABASE_URL;
const localUrl = readEnvFile(".env.local")?.DATABASE_URL;
const envUrl = readEnvFile(".env")?.DATABASE_URL;
const url = shellUrl || localUrl || envUrl;
const source: Source = shellUrl ? "shell environment" : localUrl ? ".env.local" : envUrl ? ".env" : "not found";

if (!url) {
  console.log(JSON.stringify({ source, configured: false }, null, 2));
  process.exitCode = 1;
} else {
  const parsed = new URL(url);
  console.log(JSON.stringify({
    source,
    configured: true,
    host: parsed.hostname || "local socket",
    port: parsed.port || "5432",
    database: parsed.pathname.replace(/^\//, ""),
    schema: parsed.searchParams.get("schema") || "public",
    isLocalHost: ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname),
  }, null, 2));
}
