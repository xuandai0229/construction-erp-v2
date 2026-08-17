import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { setSession } from '@/lib/auth';
import { resolvePostLoginRoute } from '@/lib/roles/role-workspace-policy';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const loginIdentifier = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const next = typeof body.next === 'string' ? body.next : null;

    if (!loginIdentifier || !password) {
      return NextResponse.json({ error: 'Tên đăng nhập hoặc email và mật khẩu không được bỏ trống.' }, { status: 400 });
    }

    // Support login by email OR username (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: loginIdentifier, mode: 'insensitive' } },
          { username: { equals: loginIdentifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Tên đăng nhập, email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    if (user.deletedAt !== null) {
      return NextResponse.json({ error: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' }, { status: 403 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Tài khoản hiện không được phép truy cập hệ thống.' }, { status: 403 });
    }

    if (!user.password || typeof user.password !== 'string') {
      return NextResponse.json({ error: 'Tên đăng nhập, email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Tên đăng nhập, email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    await setSession(user.id);

    const redirectTo = user.mustChangePassword ? '/change-password' : resolvePostLoginRoute(user.role, next);

    return NextResponse.json({
      success: true,
      redirectTo,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Login internal error:', errorMsg);
    return NextResponse.json({ error: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
