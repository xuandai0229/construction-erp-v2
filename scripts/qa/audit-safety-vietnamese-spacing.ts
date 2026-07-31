/**
 * QA Audit Script: Scan Safety Plan entries in database for broken Vietnamese spacing.
 *
 * This script is READ-ONLY. It does NOT modify any data.
 * It reports any SafetyPlanEntry fields that contain suspicious spacing patterns
 * like "Chiề u:", "Tố i:", or replacement characters.
 *
 * Usage:
 *   npx tsx scripts/qa/audit-safety-vietnamese-spacing.ts
 */

import dotenv from "dotenv";
dotenv.config();

import { Client } from "pg";
import { hasBrokenVietnameseText } from "../../src/lib/safety-reporting/date-utils";

interface AuditFinding {
  planId: string;
  entryId: string;
  fieldName: string;
  value: string;
  codePoints: string[];
  issue: string;
}

async function auditSafetyVietnameseSpacing() {
  console.log("=== SAFETY PLAN VIETNAMESE SPACING AUDIT (READ-ONLY) ===\n");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  // Find actual table names in schema
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE '%safety%'
  `);

  console.log("Safety tables found in DB:", tablesRes.rows.map(r => r.table_name).join(", "));

  const planTable = tablesRes.rows.find(r => r.table_name.toLowerCase().includes("plan") && !r.table_name.toLowerCase().includes("entry"))?.table_name || "SafetyReportPlan";
  const entryTable = tablesRes.rows.find(r => r.table_name.toLowerCase().includes("entry"))?.table_name || "SafetyReportPlanEntry";

  const plansRes = await client.query(`SELECT * FROM "${planTable}"`);
  const entriesRes = await client.query(`SELECT * FROM "${entryTable}"`);

  console.log(`Found ${plansRes.rows.length} safety plans with ${entriesRes.rows.length} total entries.\n`);

  const findings: AuditFinding[] = [];

  // Check plan-level fields
  for (const plan of plansRes.rows) {
    const planFields: Record<string, string | null> = {
      title: plan.title,
      documentNumber: plan.documentNumber,
      officialDocumentNumber: plan.officialDocumentNumber,
    };

    for (const [fieldName, value] of Object.entries(planFields)) {
      if (value && hasBrokenVietnameseText(value)) {
        findings.push({
          planId: plan.id,
          entryId: "",
          fieldName: `plan.${fieldName}`,
          value,
          codePoints: Array.from(value).map(c => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`),
          issue: "Broken Vietnamese text detected",
        });
      }
    }
  }

  // Check entry-level fields
  for (const entry of entriesRes.rows) {
    const entryFields: Record<string, string | null> = {
      location: entry.location,
      inspectionContent: entry.inspectionContent,
      note: entry.note,
    };

    for (const [fieldName, value] of Object.entries(entryFields)) {
      if (value && hasBrokenVietnameseText(value)) {
        findings.push({
          planId: entry.planId || entry.safetyReportPlanId,
          entryId: entry.id,
          fieldName: `entry.${fieldName}`,
          value: value.substring(0, 200),
          codePoints: Array.from(value.substring(0, 50)).map(c => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`),
          issue: "Broken Vietnamese text detected",
        });
      }
    }
  }

  if (findings.length === 0) {
    console.log("✅ NO broken Vietnamese text found in any Safety Plan database records.");
    console.log("\nNote: Shift labels (Sáng:, Chiều:, Tối:) are NOT stored in the database.");
    console.log("They are generated at runtime from constants in date-utils.ts.");
    console.log("The 'Chiề u:' / 'Tố i:' bug was a FONT RENDERING issue, not a data issue.");
  } else {
    console.log(`❌ FOUND ${findings.length} broken Vietnamese text fields:\n`);
    for (const f of findings) {
      console.log(`  Plan: ${f.planId}`);
      console.log(`  Entry: ${f.entryId || "(plan-level)"}`);
      console.log(`  Field: ${f.fieldName}`);
      console.log(`  Value: "${f.value}"`);
      console.log(`  Codes: ${f.codePoints.join(" ")}`);
      console.log(`  Issue: ${f.issue}`);
      console.log();
    }
  }

  console.log("\n=== AUDIT COMPLETE ===");
  await client.end();
}

auditSafetyVietnameseSpacing().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
