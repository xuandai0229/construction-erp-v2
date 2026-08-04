import crypto from "node:crypto";

export interface PiiEncryptionEnvelope {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

const DEFAULT_KEY_VERSION = 1;

/**
 * Normalizes identity number (CCCD/CMND):
 * - Keeps digits only.
 * - Strips whitespace, dashes, dots.
 * - Validates length (must be 9 or 12 digits).
 */
export function normalizeIdentityNumber(input: string): string {
  if (!input) {
    throw new Error("Identity number cannot be empty");
  }
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 9 && digits.length !== 12) {
    throw new Error("Invalid identity number length. Expected 9 or 12 digits");
  }
  return digits;
}

/**
 * Gets encryption secret key derived or formatted to 32 bytes.
 */
function getEncryptionKey(): Buffer {
  const rawKey = process.env.HR_PII_ENCRYPTION_KEY || "default_dev_hr_pii_encryption_key_32bytes!!";
  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Gets blind index secret key formatted to 32 bytes.
 */
function getBlindIndexKey(): Buffer {
  const rawKey = process.env.HR_PII_BLIND_INDEX_KEY || "default_dev_hr_pii_blind_index_key_32bytes!";
  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Encrypts a normalized identity number using AES-256-GCM.
 */
export function encryptIdentityNumber(
  identityNumber: string,
  keyVersion: number = DEFAULT_KEY_VERSION
): PiiEncryptionEnvelope {
  const normalized = normalizeIdentityNumber(identityNumber);
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let ciphertext = cipher.update(normalized, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    ciphertext,
    iv: iv.toString("hex"),
    authTag,
    keyVersion,
  };
}

/**
 * Decrypts a PII encryption envelope back to normalized identity number string.
 */
export function decryptIdentityNumber(envelope: PiiEncryptionEnvelope): string {
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(envelope.iv, "hex");
    const authTag = Buffer.from(envelope.authTag, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(envelope.ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (_err) {
    throw new Error("Failed to decrypt identity number: authentication tag mismatch or corrupted data");
  }
}

/**
 * Generates a deterministic HMAC-SHA256 blind index for fast DB lookup.
 */
export function generateIdentityBlindIndex(identityNumber: string): string {
  const normalized = normalizeIdentityNumber(identityNumber);
  const key = getBlindIndexKey();
  return crypto.createHmac("sha256", key).update(normalized).digest("hex");
}

/**
 * Formats identity number for display masking. Default: ********8899
 */
export function maskIdentityNumber(identityNumber: string): string {
  if (!identityNumber) return "";
  const normalized = identityNumber.replace(/\D/g, "");
  if (normalized.length < 4) return "****";
  const last4 = normalized.slice(-4);
  return "********" + last4;
}

/**
 * Encodes envelope to stored string format (JSON) or parses from string.
 */
export function serializeEnvelope(envelope: PiiEncryptionEnvelope): string {
  return JSON.stringify(envelope);
}

export function deserializeEnvelope(stored: string): PiiEncryptionEnvelope {
  return JSON.parse(stored) as PiiEncryptionEnvelope;
}

export const parseEnvelope = deserializeEnvelope;
