import { parseNonNegativeQuantity } from "../src/lib/materials/ledger";
import { strict as assert } from "assert";

async function main() {
  console.log("=== Bắt đầu QA: Numeric Input / Empty zero ===");

  try {
    assert.equal(parseNonNegativeQuantity(44, "test"), 44);
    assert.equal(parseNonNegativeQuantity(0, "test"), 0);

    const checkFormSubmit = (val: string) => {
      const minStockLevelRaw = val.trim();
      return minStockLevelRaw === "" ? 0 : Number(minStockLevelRaw);
    };

    assert.equal(checkFormSubmit(""), 0);
    assert.equal(checkFormSubmit("0"), 0);
    assert.equal(checkFormSubmit("44"), 44);
    assert.equal(checkFormSubmit("044"), 44);

    console.log("✅ Tất cả assertions đã qua!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

main();
