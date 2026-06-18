import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface SessionTokenPayload {
  userId: string;
  iat: number;
  exp: number;
}

function getSessionSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET hoặc SESSION_SECRET chưa được cấu hình.");
  }
  return secret;
}

function sign(encodedPayload: string): Buffer {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest();
}

export function createSessionToken(
  userId: string,
  issuedAtSeconds = Math.floor(Date.now() / 1000)
): string {
  const payload: SessionTokenPayload = {
    userId,
    iat: issuedAtSeconds,
    exp: issuedAtSeconds + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const encodedSignature = sign(encodedPayload).toString("base64url");
  return `${encodedPayload}.${encodedSignature}`;
}

export function verifySessionToken(
  token: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): SessionTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [encodedPayload, encodedSignature] = parts;
  let suppliedSignature: Buffer;
  try {
    suppliedSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as Partial<SessionTokenPayload>;
    const { userId, iat, exp } = payload;
    if (
      typeof userId !== "string" ||
      !userId ||
      typeof iat !== "number" ||
      typeof exp !== "number" ||
      !Number.isInteger(iat) ||
      !Number.isInteger(exp) ||
      iat > nowSeconds + 60 ||
      exp <= nowSeconds ||
      exp <= iat
    ) {
      return null;
    }
    return { userId, iat, exp };
  } catch {
    return null;
  }
}
