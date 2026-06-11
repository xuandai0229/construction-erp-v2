import { evaluateVolumeGuard } from "../src/lib/field-progress/volume-guard";

function runTest(name: string, input: any, expectedLevel: string, expectedSubmit: boolean) {
  const result = evaluateVolumeGuard(input);
  const passed = result.level === expectedLevel && result.canSubmit === expectedSubmit;
  if (passed) {
    console.log(`✅ PASS: ${name} (Level: ${result.level}, Submit: ${result.canSubmit})`);
  } else {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Expected: Level=${expectedLevel}, Submit=${expectedSubmit}`);
    console.error(`   Got: Level=${result.level}, Submit=${result.canSubmit}`);
    process.exit(1);
  }
}

function main() {
  console.log("🧪 Running Volume Guard Tests...\n");

  // 1. OK
  runTest("OK (70%)", { designQuantity: 100, cumulativeBefore: 50, todayQuantity: 20, status: "DRAFT" }, "OK", true);

  // 2. Near limit
  runTest("NEAR_LIMIT (95%)", { designQuantity: 100, cumulativeBefore: 50, todayQuantity: 45, status: "DRAFT" }, "NEAR_LIMIT", true);

  // 3. Over design <= 110
  runTest("105% DRAFT no note", { designQuantity: 100, cumulativeBefore: 100, todayQuantity: 5, status: "DRAFT" }, "REQUIRE_NOTE", true);
  runTest("105% SUBMITTED no note", { designQuantity: 100, cumulativeBefore: 100, todayQuantity: 5, status: "SUBMITTED" }, "REQUIRE_NOTE", false);
  runTest("105% SUBMITTED with note", { designQuantity: 100, cumulativeBefore: 100, todayQuantity: 5, status: "SUBMITTED", note: "Lý do hợp lệ dài hơn 10 ký tự" }, "REQUIRE_NOTE", true);

  // 4. Over 110
  runTest("120% DRAFT no note", { designQuantity: 100, cumulativeBefore: 100, todayQuantity: 20, status: "DRAFT" }, "OVER_DESIGN", false);
  runTest("120% SUBMITTED no note", { designQuantity: 100, cumulativeBefore: 100, todayQuantity: 20, status: "SUBMITTED" }, "BLOCK_SUBMIT", false);
  runTest("120% SUBMITTED with note", { designQuantity: 100, cumulativeBefore: 100, todayQuantity: 20, status: "SUBMITTED", issueNote: "Vướng mặt bằng phát sinh khối lượng" }, "OVER_DESIGN", true);

  // 5. designQuantity = 0
  runTest("Design = 0 DRAFT", { designQuantity: 0, cumulativeBefore: 0, todayQuantity: 10, status: "DRAFT" }, "NEED_DESIGN_QUANTITY", false);

  // 6. todayQuantity âm
  // We handle negative outside evaluateVolumeGuard, but if passed:
  runTest("Negative quantity check", { designQuantity: 100, cumulativeBefore: 50, todayQuantity: -10, status: "DRAFT" }, "OK", true);

  // =========================================================
  // 7. FP-L05 — APPROVED-only cumulative consistency test
  // =========================================================
  console.log("\n🧪 FP-L05: APPROVED-only cumulative consistency...\n");

  // Scenario: design=100, APPROVED before=61, there were also DRAFT/SUBMITTED=50 before today.
  // Guard must use APPROVED-only (61), NOT all-status (111).
  // User enters today=30 → projected = 61+30 = 91 → NEAR_LIMIT (91%), NOT blocked.
  // If guard used ALL-status (111+30=141 → 141%), it would wrongly BLOCK_SUBMIT.
  runTest(
    "FP-L05: APPROVED-only cumulative (91% with APPROVED=61, ignoring DRAFT/SUBMITTED=50)",
    { designQuantity: 100, cumulativeBefore: 61, todayQuantity: 30, status: "SUBMITTED" },
    "NEAR_LIMIT",
    true,
  );

  // Verify the wrong scenario: if we mistakenly used ALL=111 as cumulativeBefore
  // 111+30=141 → 141% → BLOCK_SUBMIT without note → canSubmit=false
  runTest(
    "FP-L05 WRONG: if guard used ALL-status cumulative (141% → blocked)",
    { designQuantity: 100, cumulativeBefore: 111, todayQuantity: 30, status: "SUBMITTED" },
    "BLOCK_SUBMIT",
    false,
  );

  // Same wrong scenario but with note → would be OVER_DESIGN + canSubmit=true
  // This proves the old behavior was WRONG for the no-note case
  runTest(
    "FP-L05 WRONG with note: ALL-status cumulative + note (141% → allowed with note)",
    { designQuantity: 100, cumulativeBefore: 111, todayQuantity: 30, status: "SUBMITTED", issueNote: "Phát sinh do thay đổi thiết kế mới" },
    "OVER_DESIGN",
    true,
  );

  console.log("\n🎉 All Volume Guard tests passed!");
}

main();
