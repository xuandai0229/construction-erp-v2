import { stripMoney, formatVndInput, getVndShortText } from '../src/lib/contracts/contract-money-utils';

function testMoneyLogic() {
  console.log("=== KIỂM TRA LOGIC NHẬP TIỀN (MONEY FORMAT) ===\n");

  const tests = [
    { input: "1000000000", expectedStrip: "1000000000", expectedFormat: "1.000.000.000" },
    { input: "1.000.000.000", expectedStrip: "1000000000", expectedFormat: "1.000.000.000" },
    { input: "1,000,000,000", expectedStrip: "1000000000", expectedFormat: "1.000.000.000" },
    { input: "999,999,999,999,999", expectedStrip: "999999999999999", expectedFormat: "999.999.999.999.999" }, // max length from UI validation
    { input: "abc1000xyz", expectedStrip: "1000", expectedFormat: "1.000" },
    { input: "-1000", expectedStrip: "1000", expectedFormat: "1.000" } // UI uses numeric pad and strip non-digit, so '-' is removed.
  ];

  let pass = true;

  tests.forEach((tc, i) => {
    const stripped = stripMoney(tc.input);
    const formatted = formatVndInput(tc.input);
    
    if (stripped !== tc.expectedStrip || formatted !== tc.expectedFormat) {
      console.log(`❌ FAIL Test ${i+1}: input "${tc.input}" -> stripped "${stripped}", format "${formatted}"`);
      pass = false;
    } else {
      console.log(`✅ PASS Test ${i+1}: input "${tc.input}" -> ${formatted} | Text: ${getVndShortText(tc.input)}`);
    }
  });

  if (pass) {
    console.log("\n=> TẤT CẢ TEST CASE MONEY LOGIC PASS.");
  } else {
    console.log("\n=> CÓ TEST CASE MONEY LOGIC FAIL.");
  }
}

testMoneyLogic();
