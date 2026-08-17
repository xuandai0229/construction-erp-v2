import { cache } from 'react';
import { cookies, headers } from 'next/headers';
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
  email: string | null;
  username: string | null;
  name: string;
  role: UserRole;
  phone: string | null;
  isActive: boolean;
  mustChangePassword?: boolean;
}

async function resolveSession(allowPasswordChangeRequired: boolean): Promise<SessionUser | null> {
  return measureServerPhase('auth.get-session', async () => {
    let sessionToken: string | undefined;

    try {
      const cookieStore = await cookies();
      sessionToken = cookieStore.get('auth_session')?.value;
    } catch {
      // Ignored outside cookie context
    }

    if (!sessionToken) {
      try {
        const headerStore = await headers();
        const authHeader = headerStore.get('authorization') || headerStore.get('x-session-token');
        if (authHeader) {
          if (authHeader.startsWith('Bearer ')) {
            sessionToken = authHeader.substring(7).trim();
          } else if (!authHeader.includes(' ')) {
            sessionToken = authHeader.trim();
          }
        }
      } catch {
        // Ignored outside request header context
      }
    }

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
          mustChangePassword: true,
          deletedAt: true,
          updatedAt: true,
        }
      });

      if (!user || !user.isActive || user.deletedAt !== null) return null;
      if (sessionData.credentialVersion !== user.updatedAt.toISOString()) return null;
      if (user.mustChangePassword && !allowPasswordChangeRequired) return null;

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      };
    } catch {
      return null;
    }
  });
}

export const getSession = cache(async (): Promise<SessionUser | null> => resolveSession(false));

export const getPasswordChangeSession = cache(async (): Promise<SessionUser | null> => {
  const session = await resolveSession(true);
  return session?.mustChangePassword ? session : null;
});

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  let isSecure = process.env.NODE_ENV === 'production';
  try {
    const headerStore = await headers();
    const proto = headerStore.get('x-forwarded-proto');
    const referer = headerStore.get('referer');
    if (proto === 'https' || (referer && referer.startsWith('https://'))) {
      isSecure = true;
    }
  } catch {
    // Header context unavailable
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { updatedAt: true, mustChangePassword: true },
  });
  if (!user) throw new Error("Không thể tạo phiên cho tài khoản không tồn tại.");
  const token = createSessionToken(
    userId,
    undefined,
    user.updatedAt.toISOString(),
    user.mustChangePassword,
  );
  
  cookieStore.set('auth_session', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_session');
}
