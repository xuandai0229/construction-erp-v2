import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const origin = "http://127.0.0.1:3100";
const password = process.env.QA_SUPERVISION_E2E_PASSWORD;
if (!password) throw new Error("QA_SUPERVISION_E2E_PASSWORD is required");

async function main() {
const login = await fetch(`${origin}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "QA_ADMIN_A", password }),
});
if (!login.ok) throw new Error(`QA login failed with HTTP ${login.status}`);
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("QA login did not return a session cookie");

const outputDirectory = join(
  process.cwd(),
  "artifacts",
  "supervision-weekly-e2e",
  "exports",
);
await mkdir(outputDirectory, { recursive: true });

const targets = [
  {
    dossierId: "fac16a22-2494-46c0-a67a-87943361266d",
    document: "RESULT",
  },
  {
    dossierId: "ed9c81e9-2611-4380-9e81-8d20c4b31edd",
    document: "NEXT_WEEK_PLAN",
  },
] as const;

const exported: Array<{ file: string; bytes: number; contentType: string }> = [];
for (const target of targets) {
  for (const format of ["docx", "pdf"] as const) {
    const response = await fetch(
      `${origin}/api/supervision/weekly/${target.dossierId}/export?document=${target.document}&format=${format}`,
      { headers: { cookie } },
    );
    if (!response.ok) {
      throw new Error(`${target.document}.${format} returned HTTP ${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const filename = `${target.document}-final-20260725.${format}`;
    await writeFile(join(outputDirectory, filename), bytes);
    exported.push({
      file: filename,
      bytes: bytes.length,
      contentType: response.headers.get("content-type") || "",
    });
  }
}

console.log(JSON.stringify({ exported }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Export download failed");
  process.exitCode = 1;
});
