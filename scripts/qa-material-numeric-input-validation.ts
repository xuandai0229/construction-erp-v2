import prisma from '../src/lib/prisma';
import { parsePositiveQuantity, parseNonNegativeQuantity } from '../src/lib/materials/ledger';

async function main() {
  console.log('--- QA: MATERIAL NUMERIC INPUT VALIDATION ---');
  let hasErrors = false;

  const testCasesPositive = [
    { value: 'abc', expectError: true },
    { value: NaN, expectError: true },
    { value: Infinity, expectError: true },
    { value: -5, expectError: true },
    { value: 0, expectError: true },
    { value: '0', expectError: true },
    { value: 5, expectError: false },
    { value: '10.5', expectError: false },
  ];

  for (const tc of testCasesPositive) {
    try {
      parsePositiveQuantity(tc.value, "Test");
      if (tc.expectError) {
        console.error(`[FAIL] Expected error for parsePositiveQuantity(${tc.value}), but got none.`);
        hasErrors = true;
      }
    } catch (e) {
      if (!tc.expectError) {
        console.error(`[FAIL] Did not expect error for parsePositiveQuantity(${tc.value}), but got:`, e);
        hasErrors = true;
      }
    }
  }

  const testCasesNonNegative = [
    { value: 'xyz', expectError: true },
    { value: NaN, expectError: true },
    { value: Infinity, expectError: true },
    { value: -1, expectError: true },
    { value: 0, expectError: false },
    { value: '0', expectError: false },
    { value: 10, expectError: false },
  ];

  for (const tc of testCasesNonNegative) {
    try {
      parseNonNegativeQuantity(tc.value, "Test");
      if (tc.expectError) {
        console.error(`[FAIL] Expected error for parseNonNegativeQuantity(${tc.value}), but got none.`);
        hasErrors = true;
      }
    } catch (e) {
      if (!tc.expectError) {
        console.error(`[FAIL] Did not expect error for parseNonNegativeQuantity(${tc.value}), but got:`, e);
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    console.error('\n[FINAL RESULT] NO-GO: Numeric validation failed.');
    process.exit(1);
  } else {
    console.log('\n[FINAL RESULT] GO: Numeric validation passed.');
    process.exit(0);
  }
}

main().catch(console.error);
