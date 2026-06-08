import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  const session = request.cookies.get('auth_session');
  
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isAuthApiRoute = request.nextUrl.pathname.startsWith('/api/auth');
  
  if (!session && !isAuthPage && (!isApiRoute || isAuthApiRoute)) {
    if (!isApiRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
