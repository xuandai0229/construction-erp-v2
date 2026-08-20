import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

function main() {
  const devUrl = new URL(process.env.DATABASE_URL!);
  const qaAdminUrl = `postgresql://${devUrl.username}:${devUrl.password}@${devUrl.host}/construction_erp_v2_hr_qa?schema=public`;
  console.log("Deploying Prisma migrations to isolated QA database construction_erp_v2_hr_qa...");
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: qaAdminUrl },
    stdio: "inherit",
  });
  console.log("Prisma migrations deployed successfully to construction_erp_v2_hr_qa!");
}

main();
