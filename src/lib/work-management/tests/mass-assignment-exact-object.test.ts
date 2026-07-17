import assert from "node:assert/strict";
import test from "node:test";
import { requireExactObject } from "../validation/exact-object";

const reject = (): never => {
  throw new TypeError("rejected");
};

const contract = { requiredKeys: ["id"], optionalKeys: ["reason"] };

test("exact object guard rejects inherited required properties", () => {
  const inherited = Object.create({ id: "inherited" }) as object;
  assert.throws(() => requireExactObject(inherited, contract, reject));
});

test("exact object guard rejects objects with custom prototypes", () => {
  const object = Object.create({});
  Object.defineProperty(object, "id", { value: "value", enumerable: true });
  assert.throws(() => requireExactObject(object, contract, reject));
});

test("exact object guard rejects symbol keys and non-enumerable unknown keys", () => {
  const symbolObject = { id: "value", [Symbol("secret")]: 1 };
  const hiddenObject = { id: "value" };
  Object.defineProperty(hiddenObject, "status", { value: "ACTIVE" });
  assert.throws(() => requireExactObject(symbolObject, contract, reject));
  assert.throws(() => requireExactObject(hiddenObject, contract, reject));
});

test("exact object guard rejects accessor properties without invoking getters", () => {
  let reads = 0;
  const object = {};
  Object.defineProperty(object, "id", {
    enumerable: true,
    get: () => {
      reads += 1;
      return "value";
    },
  });
  assert.throws(() => requireExactObject(object, contract, reject));
  assert.equal(reads, 0);
});

test("exact object guard rejects constructor prototype and proto injection without pollution", () => {
  for (const object of [
    { id: "value", constructor: "injected" },
    { id: "value", prototype: "injected" },
    Object.create(null),
  ]) {
    assert.throws(() => requireExactObject(object, contract, reject));
  }
  assert.equal(Reflect.get(Object.prototype, "polluted"), undefined);
});
