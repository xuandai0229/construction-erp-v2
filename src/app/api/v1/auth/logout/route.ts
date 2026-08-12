import { NextResponse } from 'next/server';
import { clearSession, getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { apiSuccess } from '@/lib/api-response';

export async function POST() {
  try {
    const session = await getSession();
    if (session && session.id) {
      // Invalidate credential version to revoke active Bearer tokens on logout
      await prisma.user.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      });
    }
    await clearSession();
    return apiSuccess({ message: 'Đã đăng xuất thành công.' });
  } catch (error: any) {
    await clearSession();
    return apiSuccess({ message: 'Đã đăng xuất.' });
  }
}
