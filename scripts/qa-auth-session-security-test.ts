import * as bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/session-token";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@construction.local";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "123456";
const QA_EMAIL_PREFIX = "qa-auth-security-";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function cookieHeaderFrom(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  assert(setCookie, "Login thành công nhưng không trả auth_session cookie.");
  const cookie = setCookie.split(";")[0];
  assert(cookie.startsWith("auth_session="), "Cookie trả về không phải auth_session.");
  return cookie;
}

async function requestProtected(cookie: string) {
  return fetch(`${BASE_URL}/projects`, {
    headers: { cookie },
    redirect: "manual",
  });
}

async function login(email: string, password: string) {
  return fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });
}

async function main() {
  console.log("=== QA AUTH SESSION SECURITY TEST ===");
  assert(
    process.env.AUTH_SECRET || process.env.SESSION_SECRET,
    "Test yêu cầu AUTH_SECRET hoặc SESSION_SECRET giống tiến trình Next.js."
  );

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const lockedEmail = `${QA_EMAIL_PREFIX}locked-${suffix}@construction.local`;
  const deletedEmail = `${QA_EMAIL_PREFIX}deleted-${suffix}@construction.local`;
  const password = "QaAuth@123456";
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    assert(adminLogin.status === 200, `Admin login thất bại, HTTP ${adminLogin.status}.`);
    const validCookie = cookieHeaderFrom(adminLogin);
    const token = validCookie.slice("auth_session=".length);
    const tokenParts = token.split(".");

    assert(tokenParts.length === 2, "auth_session không có dạng payload.signature.");
    assert(
      !token.trim().startsWith("eyJ1c2VySWQi") || token.includes("."),
      "auth_session vẫn là JSON Base64 trần, chưa có chữ ký."
    );

    const validResponse = await requestProtected(validCookie);
    assert(validResponse.status !== 307 && validResponse.status !== 308, "Cookie hợp lệ bị từ chối.");
    console.log("PASS: Login admin nhận signed cookie và truy cập route bảo vệ.");

    const tamperIndex = Math.max(0, token.length - 2);
    const tamperedToken =
      token.slice(0, tamperIndex) +
      (token[tamperIndex] === "A" ? "B" : "A") +
      token.slice(tamperIndex + 1);
    const tamperedResponse = await requestProtected(`auth_session=${tamperedToken}`);
    assert(
      [307, 308].includes(tamperedResponse.status) &&
        tamperedResponse.headers.get("location")?.includes("/login"),
      "Cookie bị sửa 1 ký tự không bị reject."
    );
    console.log("PASS: Cookie bị sửa 1 ký tự bị reject.");

    const malformedResponse = await requestProtected("auth_session=not-a-valid-session");
    assert(
      [307, 308].includes(malformedResponse.status) &&
        malformedResponse.headers.get("location")?.includes("/login"),
      "Cookie sai format không bị reject."
    );
    console.log("PASS: Cookie sai format bị reject.");

    const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    assert(admin, `Không tìm thấy admin ${ADMIN_EMAIL}.`);
    const expiredToken = createSessionToken(
      admin.id,
      Math.floor(Date.now() / 1000) - 8 * 24 * 60 * 60
    );
    const expiredResponse = await requestProtected(`auth_session=${expiredToken}`);
    assert(
      [307, 308].includes(expiredResponse.status) &&
        expiredResponse.headers.get("location")?.includes("/login"),
      "Cookie hết hạn không bị reject."
    );
    console.log("PASS: Cookie hết hạn bị reject.");

    await prisma.user.createMany({
      data: [
        {
          email: lockedEmail,
          password: hashedPassword,
          name: "QA Auth Locked",
          role: "STAFF",
          isActive: false,
        },
        {
          email: deletedEmail,
          password: hashedPassword,
          name: "QA Auth Deleted",
          role: "STAFF",
          isActive: true,
          deletedAt: new Date(),
        },
      ],
    });

    const lockedLogin = await login(lockedEmail, password);
    const deletedLogin = await login(deletedEmail, password);
    assert(lockedLogin.status === 401, "User bị khóa vẫn login được.");
    assert(deletedLogin.status === 401, "User đã xóa mềm vẫn login được.");
    console.log("PASS: User locked/deleted không login được.");
  } finally {
    await prisma.user.deleteMany({
      where: { email: { startsWith: QA_EMAIL_PREFIX } },
    });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
