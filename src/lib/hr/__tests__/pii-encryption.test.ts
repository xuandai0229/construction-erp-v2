import { describe, it, expect } from "vitest";
import {
  normalizeIdentityNumber,
  encryptIdentityNumber,
  decryptIdentityNumber,
  generateIdentityBlindIndex,
  maskIdentityNumber,
  serializeEnvelope,
  deserializeEnvelope,
} from "../pii-encryption";

describe("PII Encryption Service", () => {
  it("normalizes identity number properly", () => {
    expect(normalizeIdentityNumber(" 001 200 123 456 ")).toBe("001200123456");
    expect(normalizeIdentityNumber("123-456-789")).toBe("123456789");
  });

  it("throws error when identity number length is invalid", () => {
    expect(() => normalizeIdentityNumber("12345")).toThrow("Invalid identity number length");
    expect(() => normalizeIdentityNumber("")).toThrow("Identity number cannot be empty");
  });

  it("encrypts and decrypts identity number correctly", () => {
    const rawCccd = "001204008899";
    const envelope = encryptIdentityNumber(rawCccd);

    expect(envelope.ciphertext).toBeDefined();
    expect(envelope.iv).toBeDefined();
    expect(envelope.authTag).toBeDefined();
    expect(envelope.keyVersion).toBe(1);

    const decrypted = decryptIdentityNumber(envelope);
    expect(decrypted).toBe(rawCccd);
  });

  it("generates different ciphertext for different IVs", () => {
    const rawCccd = "001204008899";
    const env1 = encryptIdentityNumber(rawCccd);
    const env2 = encryptIdentityNumber(rawCccd);

    expect(env1.iv).not.toBe(env2.iv);
    expect(env1.ciphertext).not.toBe(env2.ciphertext);
  });

  it("fails to decrypt if authTag is tampered with", () => {
    const envelope = encryptIdentityNumber("001204008899");
    const tampered = { ...envelope, authTag: "0".repeat(32) };

    expect(() => decryptIdentityNumber(tampered)).toThrow("Failed to decrypt identity number");
  });

  it("generates stable blind index for same normalized identity number", () => {
    const idx1 = generateIdentityBlindIndex("001 204 008 899");
    const idx2 = generateIdentityBlindIndex("001204008899");

    expect(idx1).toBe(idx2);
    expect(idx1).toHaveLength(64); // SHA256 hex string
  });

  it("masks identity number to standard format ********8899", () => {
    expect(maskIdentityNumber("001204008899")).toBe("********8899");
    expect(maskIdentityNumber("123456789")).toBe("********6789");
  });

  it("serializes and deserializes encryption envelope", () => {
    const env = encryptIdentityNumber("001204008899");
    const serialized = serializeEnvelope(env);
    const deserialized = deserializeEnvelope(serialized);

    expect(deserialized).toEqual(env);
  });
});
