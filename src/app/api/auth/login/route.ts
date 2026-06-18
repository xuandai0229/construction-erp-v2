import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { setSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email và mật khẩu không được bỏ trống' }, { status: 400 });
    }

    // Support login by email OR username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: email },
        ],
      },
    });

    if (!user || !user.isActive || user.deletedAt !== null) {
      return NextResponse.json({ error: 'Tài khoản không tồn tại, đã bị khóa hoặc đã bị xóa' }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Mật khẩu không chính xác' }, { status: 401 });
    }

    await setSession(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi đăng nhập' }, { status: 500 });
  }
}
