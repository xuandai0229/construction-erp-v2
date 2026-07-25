import prisma from '../src/lib/prisma';
import { createSessionToken } from '../src/lib/session-token';
import fs from 'fs';
import path from 'path';

async function run() {
  const user = await prisma.user.findFirst({
    where: { email: 'qa_admin_2026_07@construction-erp-qa.local' }
  });
  if (!user) throw new Error("User not found");

  const token = createSessionToken(user.id);
  const authData = {
    cookies: [
      {
        name: "auth_session",
        value: token,
        domain: "127.0.0.1",
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
        httpOnly: true,
        secure: false,
        sameSite: "Lax"
      },
      {
        name: "auth_session",
        value: token,
        domain: "localhost",
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
        httpOnly: true,
        secure: false,
        sameSite: "Lax"
      }
    ],
    origins: []
  };

  const authDir = path.join(process.cwd(), 'playwright', '.auth');
  fs.mkdirSync(authDir, { recursive: true });
  fs.writeFileSync(path.join(authDir, 'admin.json'), JSON.stringify(authData, null, 2));
  console.log("Auth session generated for", user.email);
}

run().catch(console.error).finally(() => prisma.$disconnect());
