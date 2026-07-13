import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RETIRED_ROUTE_PREFIXES = ["/suppliers", "/contracts", "/accounting"] as const;

function isRetiredRoute(pathname: string) {
  return RETIRED_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function decodeBase64Url(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(
    atob(padded),
    (character) => character.charCodeAt(0)
  ).buffer as ArrayBuffer;
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('auth_session')?.value;
  const secret = process.env.AUTH_SECRET || process.env.SESSION_SECRET;
  if (!token || !secret) return false;

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signatureValid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(parts[1]),
      new TextEncoder().encode(parts[0])
    );
    if (!signatureValid) return false;

    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(parts[0]))
    ) as { userId?: unknown; iat?: unknown; exp?: unknown };
    const now = Math.floor(Date.now() / 1000);
    return (
      typeof payload.userId === "string" &&
      Number.isInteger(payload.iat) &&
      Number.isInteger(payload.exp) &&
      Number(payload.iat) <= now + 60 &&
      Number(payload.exp) > now &&
      Number(payload.exp) > Number(payload.iat)
    );
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  if (isRetiredRoute(request.nextUrl.pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  const hasSession = await hasValidSession(request);
  
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isAuthApiRoute = request.nextUrl.pathname.startsWith('/api/auth');
  
  if (!hasSession && !isAuthPage && (!isApiRoute || isAuthApiRoute)) {
    if (!isApiRoute) {
      const url = new URL('/login', request.url);
      url.searchParams.set('next', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  if (hasSession && isAuthPage) {
    if (request.nextUrl.searchParams.get('reason') === 'session_expired') {
      const response = NextResponse.next();
      response.cookies.delete('auth_session');
      return response;
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const response = NextResponse.next();
  // Clear cookie if reason=session_expired on any route? No, only on login is fine, but let's be safe.
  if (request.nextUrl.searchParams.get('reason') === 'session_expired') {
    response.cookies.delete('auth_session');
  }

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|public).*)',
  ],
};
