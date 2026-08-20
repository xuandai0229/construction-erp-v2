import prisma from "@/lib/prisma";

// Sliding Window In-Memory Rate Limiter: Map<userId, timestamp[]>
const userRequestLog = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

export interface AIGuardResult {
  allowed: boolean;
  code?: "FEATURE_DISABLED" | "RATE_LIMITED";
  message?: string;
}

/**
 * Validates 2-Layer Kill-Switch and Per-User Rate Limits
 *
 * Layer 1 (Hard): process.env.AI_READ_ONLY_ENABLED !== "false"
 * Layer 2 (Soft): SystemSetting.ai_read_only_enabled !== "false"
 * Rate Limit: Max 10 requests / minute / user
 */
export async function evaluateAIGuards(userId: string): Promise<AIGuardResult> {
  // Layer 1: Hardware ENV Flag (Hard disable)
  if (process.env.AI_READ_ONLY_ENABLED === "false") {
    return {
      allowed: false,
      code: "FEATURE_DISABLED",
      message: "Tính năng Trợ lý AI đang tạm tắt theo cấu hình môi trường.",
    };
  }

  // Layer 2: Runtime Database Setting (Instant ADMIN Kill-switch without redeploy)
  try {
    const dbSetting = await prisma.systemSetting.findUnique({
      where: { singletonKey: "SYSTEM_SETTINGS" },
    });

    if (
      dbSetting &&
      ((dbSetting as any).aiReadOnlyEnabled === false ||
        (dbSetting as any).value === "false")
    ) {
      return {
        allowed: false,
        code: "FEATURE_DISABLED",
        message: "Tính năng Trợ lý AI đang tạm ngưng hoạt động bởi Quản trị viên hệ thống.",
      };
    }
  } catch {
    // If DB check fails gracefully, fall back to ENV flag
  }

  // Layer 3: Per-User Sliding Window Rate Limiter
  const now = Date.now();
  const timestamps = userRequestLog.get(userId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      code: "RATE_LIMITED",
      message: "Bạn đã vượt quá số lượt yêu cầu cho phép (tối đa 10 lượt/phút). Vui lòng đợi trong giây lát.",
    };
  }

  validTimestamps.push(now);
  userRequestLog.set(userId, validTimestamps);

  return { allowed: true };
}

/**
 * Reset rate limit cache (Useful for testing)
 */
export function resetAIGuardRateLimits() {
  userRequestLog.clear();
}
