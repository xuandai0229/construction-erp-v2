import { cookies } from 'next/headers';
import prisma from './prisma';
import { UserRole } from '@prisma/client';

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
    const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString('utf-8'));
    if (!sessionData.userId) return null;
    
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
      }
    });
    
    if (!user || !user.isActive) return null;
    
    return user;
  } catch (error) {
    return null;
  }
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  const payload = Buffer.from(JSON.stringify({ userId })).toString('base64');
  
  cookieStore.set('auth_session', payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_session');
}
