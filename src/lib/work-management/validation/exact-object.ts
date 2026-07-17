export type ExactObjectContract = Readonly<{
  requiredKeys: readonly string[];
  optionalKeys?: readonly string[];
}>;

const isObjectRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const requireExactObject = (
  value: unknown,
  contract: ExactObjectContract,
  fail: () => never,
): Readonly<Record<string, unknown>> => {
  if (!isObjectRecord(value)) {
    return fail();
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return fail();
  }

  const allowed = new Set([...contract.requiredKeys, ...(contract.optionalKeys ?? [])]);
  const ownKeys = Reflect.ownKeys(value);
  for (const key of ownKeys) {
    if (typeof key !== "string" || !allowed.has(key) || key === "__proto__" || key === "prototype" || key === "constructor") {
      return fail();
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || "get" in descriptor || "set" in descriptor) {
      return fail();
    }
  }

  for (const key of contract.requiredKeys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      return fail();
    }
  }

  return value;
};
