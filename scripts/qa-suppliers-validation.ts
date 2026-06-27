function normalizeTaxCode(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text.replace(/\s+/g, "") : null;
}

function main() {
  console.log("=== KIỂM TRA VALIDATION SUPPLIER ===");
  
  const testCases = [
    { input: " 010 123 456 ", expected: "010123456" },
    { input: "   ", expected: null },
    { input: null, expected: null },
    { input: "0101234567-001", expected: "0101234567-001" }
  ];

  let pass = true;
  testCases.forEach((tc, i) => {
    const res = normalizeTaxCode(tc.input);
    if (res !== tc.expected) {
      console.log(`❌ Test ${i+1} fail: input "${tc.input}", expected "${tc.expected}", got "${res}"`);
      pass = false;
    } else {
      console.log(`✅ Test ${i+1} pass: input "${tc.input}" -> "${res}"`);
    }
  });

  if (pass) console.log("=> Tất cả helper validation pass.");
  console.log("=> Lưu ý: Validation server-side trong actions.ts không thể chạy qua CLI do phụ thuộc Next.js headers.");
}

main();
