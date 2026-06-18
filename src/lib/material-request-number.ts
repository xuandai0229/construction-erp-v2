import { randomBytes } from "node:crypto";

export const MATERIAL_REQUEST_NO_PATTERN =
  /^MR-\d{8}-\d{6}-[0-9A-F]{4}$/;

export function generateMaterialRequestNo(now = new Date()): string {
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const timePart = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const randomPart = randomBytes(2).toString("hex").toUpperCase();
  return `MR-${datePart}-${timePart}-${randomPart}`;
}

function isRequestNoUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const prismaError = error as { code?: string; meta?: { target?: unknown } };
  if (prismaError.code !== "P2002") return false;
  const target = prismaError.meta?.target;
  return Array.isArray(target)
    ? target.includes("requestNo")
    : String(target || "").includes("requestNo");
}

export async function createWithUniqueMaterialRequestNo<T>(
  create: (requestNo: string) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await create(generateMaterialRequestNo());
    } catch (error) {
      if (!isRequestNoUniqueViolation(error)) throw error;
    }
  }
  throw new Error("Không thể tạo mã phiếu vật tư duy nhất. Vui lòng thử lại.");
}
