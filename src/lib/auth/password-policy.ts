import { randomBytes } from "node:crypto";

const PASSWORD_MIN_LENGTH = 10;

export function validateNewPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "Mật khẩu mới phải có ít nhất 10 ký tự.";
  if (!/[a-z]/.test(password)) return "Mật khẩu mới phải có chữ thường.";
  if (!/[A-Z]/.test(password)) return "Mật khẩu mới phải có chữ hoa.";
  if (!/[0-9]/.test(password)) return "Mật khẩu mới phải có chữ số.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Mật khẩu mới phải có ký tự đặc biệt.";
  return null;
}

/** Generates a one-time value. Callers must only show it once and must never log it. */
export function generateTemporaryPassword(): string {
  return `C!${randomBytes(12).toString("base64url")}9a`;
}
