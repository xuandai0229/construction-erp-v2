import { NextResponse } from "next/server";
import { changeRequiredPassword } from "@/lib/auth/change-required-password";
import { getPasswordChangeSession, setSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getPasswordChangeSession();
  if (!session) return NextResponse.json({ error: "Phiên đổi mật khẩu không hợp lệ." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = await changeRequiredPassword({
    userId: session.id,
    currentPassword: typeof body.currentPassword === "string" ? body.currentPassword : "",
    newPassword: typeof body.newPassword === "string" ? body.newPassword : "",
    confirmation: typeof body.confirmation === "string" ? body.confirmation : "",
  });
  if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });

  await setSession(result.userId);
  return NextResponse.json({ success: true, redirectTo: "/" });
}
