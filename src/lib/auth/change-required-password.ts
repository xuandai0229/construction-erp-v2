import * as bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { validateNewPassword } from "./password-policy";

export type RequiredPasswordChangeResult =
  | { ok: true; userId: string }
  | { ok: false; status: 400 | 401 | 403; code: string; message: string };

export async function changeRequiredPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmation: string;
}): Promise<RequiredPasswordChangeResult> {
  if (!input.currentPassword || !input.newPassword || !input.confirmation) {
    return { ok: false, status: 400, code: "BAD_REQUEST", message: "Vui lòng nhập đầy đủ thông tin." };
  }
  if (input.newPassword !== input.confirmation) {
    return { ok: false, status: 400, code: "PASSWORD_CONFIRMATION_MISMATCH", message: "Xác nhận mật khẩu không khớp." };
  }
  const policyError = validateNewPassword(input.newPassword);
  if (policyError) return { ok: false, status: 400, code: "PASSWORD_POLICY_FAILED", message: policyError };

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, password: true, mustChangePassword: true, isActive: true, deletedAt: true },
  });
  if (!user || !user.isActive || user.deletedAt) {
    return { ok: false, status: 401, code: "UNAUTHENTICATED", message: "Phiên đăng nhập không còn hợp lệ." };
  }
  if (!user.mustChangePassword) {
    return { ok: false, status: 403, code: "PASSWORD_CHANGE_NOT_REQUIRED", message: "Tài khoản không ở trạng thái yêu cầu đổi mật khẩu." };
  }
  if (!(await bcrypt.compare(input.currentPassword, user.password))) {
    return { ok: false, status: 400, code: "CURRENT_PASSWORD_INVALID", message: "Mật khẩu tạm thời không chính xác." };
  }
  if (await bcrypt.compare(input.newPassword, user.password)) {
    return { ok: false, status: 400, code: "PASSWORD_REUSE", message: "Mật khẩu mới phải khác mật khẩu tạm thời." };
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: passwordHash, mustChangePassword: false, passwordChangedAt: new Date() },
  });
  return { ok: true, userId: user.id };
}
