import { cookies } from 'next/headers';
import prisma from './prisma';
import { UserRole } from '@prisma/client';
import {
  createSessionToken,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from './session-token';

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
      }
    });
    
    if (!user || !user.isActive || user.deletedAt !== null) return null;
    
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
    };
  } catch (error) {
    return null;
  }
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  const token = createSessionToken(userId);
  
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
