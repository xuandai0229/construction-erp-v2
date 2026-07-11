import { parsePositiveQuantity, parseNonNegativeQuantity } from "../src/lib/materials/ledger";

async function main() {
  console.log("=== Bắt đầu test QA Numeric Validation ===");
  
  const testCases = [
    { val: "", expectedPos: NaN, expectedNonNeg: NaN },
    { val: "0", expectedPos: NaN, expectedNonNeg: 0 },
    { val: "44", expectedPos: 44, expectedNonNeg: 44 },
    { val: "044", expectedPos: 44, expectedNonNeg: 44 },
    { val: "440", expectedPos: 440, expectedNonNeg: 440 },
    { val: "p", expectedPos: NaN, expectedNonNeg: NaN },
    { val: "12a", expectedPos: NaN, expectedNonNeg: NaN }, // because Number("12a") is NaN
    { val: "1kg", expectedPos: NaN, expectedNonNeg: NaN },
    { val: "NaN", expectedPos: NaN, expectedNonNeg: NaN },
    { val: "Infinity", expectedPos: NaN, expectedNonNeg: NaN },
    { val: "-1", expectedPos: NaN, expectedNonNeg: NaN },
  ];
  
  let failed = 0;

  for (const tc of testCases) {
    let resPos = NaN;
    try {
       resPos = parsePositiveQuantity(tc.val);
    } catch(e: any) {
       resPos = NaN;
    }

    let resNonNeg = NaN;
    try {
       resNonNeg = parseNonNegativeQuantity(tc.val);
    } catch(e: any) {
       resNonNeg = NaN;
    }

    const matchPos = (isNaN(resPos) && isNaN(tc.expectedPos)) || resPos === tc.expectedPos;
    const matchNonNeg = (isNaN(resNonNeg) && isNaN(tc.expectedNonNeg)) || resNonNeg === tc.expectedNonNeg;

    if (!matchPos) {
      console.error(`❌ Lỗi Positive: "${tc.val}" => mong đợi ${tc.expectedPos}, kết quả ${resPos}`);
      failed++;
    }
    if (!matchNonNeg) {
      console.error(`❌ Lỗi NonNegative: "${tc.val}" => mong đợi ${tc.expectedNonNeg}, kết quả ${resNonNeg}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n❌ Thất bại ${failed} test cases.`);
    process.exit(1);
  } else {
    console.log(`\n✅ Tất cả numeric test passed.`);
  }
}

main().catch(console.error);
