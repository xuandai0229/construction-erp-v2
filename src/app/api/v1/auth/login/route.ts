import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { setSession } from '@/lib/auth';
import { createSessionToken, SESSION_MAX_AGE_SECONDS } from '@/lib/session-token';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!rawEmail || !password) {
      return apiError('BAD_REQUEST', 'Email/tên đăng nhập và mật khẩu không được bỏ trống.', 400);
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: rawEmail, mode: 'insensitive' } },
          { username: { equals: rawEmail, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      return apiError('UNAUTHENTICATED', 'Email hoặc mật khẩu không chính xác.', 401);
    }

    if (user.deletedAt !== null || !user.isActive) {
      return apiError('FORBIDDEN', 'Tài khoản đã bị khóa hoặc ngừng hoạt động.', 403);
    }

    if (!user.password) {
      return apiError('UNAUTHENTICATED', 'Email hoặc mật khẩu không chính xác.', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return apiError('UNAUTHENTICATED', 'Email hoặc mật khẩu không chính xác.', 401);
    }

    // Set HTTP-Only Session Cookie for web clients
    await setSession(user.id);

    // Generate cryptographic token for mobile clients
    const token = createSessionToken(user.id, undefined, user.updatedAt.toISOString());
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

    return apiSuccess({
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    console.error('[API V1 Login Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi xử lý đăng nhập.', 500);
  }
}
