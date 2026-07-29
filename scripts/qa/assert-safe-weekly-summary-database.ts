import "dotenv/config";

export function assertSafeDatabase() {
  const dbUrl = process.env.DATABASE_URL || "";
  const nodeEnv = process.env.NODE_ENV || "development";

  if (nodeEnv === "production" && !process.env.ALLOW_QA_SEED_IN_PROD) {
    throw new Error("❌ SAFEGUARD FAILED: Cannot run QA stress seed scripts in PRODUCTION environment.");
  }

  if (dbUrl.includes("prod_db") || dbUrl.includes("production")) {
    throw new Error("❌ SAFEGUARD FAILED: DATABASE_URL appears to point to production database.");
  }

  console.log("🔒 Safeguard check passed: Database target is safe for QA stress testing.");
}
