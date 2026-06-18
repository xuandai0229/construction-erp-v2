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

    if (!user) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng.' }, { status: 401 });
    }

    if (!user.isActive || user.deletedAt !== null) {
      return NextResponse.json({ error: 'Tài khoản đã bị khóa hoặc chưa được kích hoạt.' }, { status: 403 });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng.' }, { status: 401 });
    }

    await setSession(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Hệ thống đăng nhập đang gặp sự cố. Vui lòng thử lại hoặc liên hệ quản trị.' }, { status: 500 });
  }
}
