import { execSync } from "node:child_process";
require("dotenv").config();

async function main() {
  const mainUrl = process.env.DATABASE_URL;
  if (!mainUrl) throw new Error("DATABASE_URL is missing");

  const urlObj = new URL(mainUrl);
  const host = urlObj.hostname;
  const port = urlObj.port || "5432";
  const user = urlObj.username;
  const password = urlObj.password;

  const currentDbUrl = mainUrl;
  const replayDbUrl = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/construction_erp_v2_phase07_replay_20260803?schema=public`;

  console.log("=== 1. DIFF: schema.prisma vs Current QA DB ===");
  try {
    const diffCurrent = execSync(
      `npx prisma migrate diff --from-schema prisma/schema.prisma --to-url "${currentDbUrl}"`,
      { encoding: "utf-8" }
    );
    console.log(diffCurrent || "No difference!");
  } catch (err: any) {
    console.log(err.stdout || err.message);
  }

  console.log("=== 2. DIFF: schema.prisma vs Replay DB ===");
  try {
    const diffReplay = execSync(
      `npx prisma migrate diff --from-schema prisma/schema.prisma --to-url "${replayDbUrl}"`,
      { encoding: "utf-8" }
    );
    console.log(diffReplay || "No difference!");
  } catch (err: any) {
    console.log(err.stdout || err.message);
  }

  console.log("=== 3. DIFF: Current QA DB vs Replay DB ===");
  try {
    const diffCurrentReplay = execSync(
      `npx prisma migrate diff --from-url "${currentDbUrl}" --to-url "${replayDbUrl}"`,
      { encoding: "utf-8" }
    );
    console.log(diffCurrentReplay || "No difference!");
  } catch (err: any) {
    console.log(err.stdout || err.message);
  }
}

main();
