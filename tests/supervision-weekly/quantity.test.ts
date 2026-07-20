import assert from "node:assert/strict";
import test from "node:test";
import { calculateSupervisionVariance, parseLocalizedNumber, parseSupervisionQuantityInput } from "../../src/lib/supervision-weekly/quantity";

test("parses Vietnamese and international quantity formats without changing thousands into decimals", () => {
  assert.equal(parseLocalizedNumber("120"), 120);
  assert.equal(parseLocalizedNumber("120,5"), 120.5);
  assert.equal(parseLocalizedNumber("120.5"), 120.5);
  assert.equal(parseLocalizedNumber("1.200"), 1200);
  assert.equal(parseLocalizedNumber("1,200"), 1200);
  assert.equal(parseLocalizedNumber("1.200,5"), 1200.5);
  assert.equal(parseLocalizedNumber("1,200.5"), 1200.5);
});

test("normalizes construction unit aliases", () => {
  for (const input of ["120 m3", "120m3", "120 m^3", "120 m³"]) {
    assert.deepEqual(parseSupervisionQuantityInput(input), { mode: "NUMBER", rawInput: input, numericValue: 120, unitCode: "CUBIC_METER", unitLabel: "m³" });
  }
  assert.equal(parseSupervisionQuantityInput("120,5 m2").mode, "NUMBER");
  const kilograms = parseSupervisionQuantityInput("50 KG");
  const asciiTon = parseSupervisionQuantityInput("2 tan");
  const vietnameseTon = parseSupervisionQuantityInput("2 tấn");
  assert.equal(kilograms.mode === "NUMBER" ? kilograms.unitLabel : null, "kg");
  assert.equal(asciiTon.mode === "NUMBER" ? asciiTon.unitLabel : null, "tấn");
  assert.equal(vietnameseTon.mode === "NUMBER" ? vietnameseTon.unitCode : null, "TON");
});

test("calculates variance only for equal normalized unit codes", () => {
  assert.equal(calculateSupervisionVariance({ value: 120, unitCode: "CUBIC_METER" }, { value: 115, unitCode: "CUBIC_METER" }), -5);
  assert.equal(calculateSupervisionVariance({ value: 2, unitCode: "TON" }, { value: 1.5, unitCode: "TON" }), -0.5);
  assert.equal(calculateSupervisionVariance({ value: 50, unitCode: "SQUARE_METER" }, { value: 40000, unitCode: "KILOGRAM" }), null);
});
