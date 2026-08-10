import { cookies } from 'next/headers';
import prisma from './prisma';
import { UserRole } from '@prisma/client';
import {
  createSessionToken,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from './session-token';
import { measureServerPhase } from './performance/server';

export interface SessionUser {
  id: string;
  email: string;
  username: string | null;
  name: string;
  role: UserRole;
  phone: string | null;
  isActive: boolean;
}

export async function getSession(): Promise<SessionUser | null> {
  return measureServerPhase('auth.get-session', async () => {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('auth_session')?.value;

    if (!sessionToken) return null;
    
    try {
      const sessionData = verifySessionToken(sessionToken);
      if (!sessionData) return null;

      const user = await prisma.user.findUnique({
        where: { id: sessionData.userId },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          phone: true,
          isActive: true,
          deletedAt: true,
          updatedAt: true,
        }
      });

      if (!user || !user.isActive || user.deletedAt !== null) return null;
      if (sessionData.credentialVersion !== user.updatedAt.toISOString()) return null;

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
      };
    } catch {
      return null;
    }
  });
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { updatedAt: true } });
  if (!user) throw new Error("Không thể tạo phiên cho tài khoản không tồn tại.");
  const token = createSessionToken(userId, undefined, user.updatedAt.toISOString());
  
  cookieStore.set('auth_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_session');
}
