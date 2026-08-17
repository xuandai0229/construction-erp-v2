import { createSessionToken, SESSION_MAX_AGE_SECONDS } from "@/lib/session-token";
import { apiError, apiSuccess } from "@/lib/api-response";
import { changeRequiredPassword } from "@/lib/auth/change-required-password";
import { getPasswordChangeSession, setSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getPasswordChangeSession();
  if (!session) return apiError("UNAUTHENTICATED", "Phiên đổi mật khẩu không hợp lệ.", 401);

  const body = await request.json().catch(() => ({}));
  const result = await changeRequiredPassword({
    userId: session.id,
    currentPassword: typeof body.currentPassword === "string" ? body.currentPassword : "",
    newPassword: typeof body.newPassword === "string" ? body.newPassword : "",
    confirmation: typeof body.confirmation === "string" ? body.confirmation : "",
  });
  if (!result.ok) return apiError(result.code, result.message, result.status);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: result.userId }, select: { updatedAt: true } });
  await setSession(result.userId);
  const token = createSessionToken(result.userId, undefined, user.updatedAt.toISOString(), false);
  return apiSuccess({
    token,
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
    mustChangePassword: false,
  });
}
