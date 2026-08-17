import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  createPerformanceRequestId,
  isPerformanceProfilingEnabled,
  logPerformanceEvent,
} from '@/lib/performance/perf-core';

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

type SessionState = { valid: boolean; mustChangePassword: boolean };

async function readSessionState(request: NextRequest): Promise<SessionState> {
  const token = request.cookies.get('auth_session')?.value;
  const secret = process.env.AUTH_SECRET || process.env.SESSION_SECRET;
  if (!token || !secret) return { valid: false, mustChangePassword: false };

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { valid: false, mustChangePassword: false };

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
    if (!signatureValid) return { valid: false, mustChangePassword: false };

    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(parts[0]))
    ) as { userId?: unknown; iat?: unknown; exp?: unknown; mustChangePassword?: unknown };
    const now = Math.floor(Date.now() / 1000);
    const valid = (
      typeof payload.userId === "string" &&
      Number.isInteger(payload.iat) &&
      Number.isInteger(payload.exp) &&
      Number(payload.iat) <= now + 60 &&
      Number(payload.exp) > now &&
      Number(payload.exp) > Number(payload.iat)
    );
    return {
      valid,
      mustChangePassword: valid && payload.mustChangePassword === true,
    };
  } catch {
    return { valid: false, mustChangePassword: false };
  }
}

export default async function proxy(request: NextRequest) {
  const startedAt = performance.now();
  const performanceProfiling = isPerformanceProfilingEnabled();
  const requestId = performanceProfiling
    ? request.headers.get("x-perf-request-id") || createPerformanceRequestId()
    : undefined;
  const logProxy = () => logPerformanceEvent({
    requestId,
    route: request.nextUrl.pathname,
    phase: "proxy",
    durationMs: performance.now() - startedAt,
  });
  const addPerfResponseHeader = (response: NextResponse) => {
    if (requestId) response.headers.set("x-perf-request-id", requestId);
    return response;
  };

  if (request.nextUrl.pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  if (isRetiredRoute(request.nextUrl.pathname)) {
    logProxy();
    return addPerfResponseHeader(new NextResponse(null, { status: 404 }));
  }

  const sessionState = await readSessionState(request);
  const hasSession = sessionState.valid;
  
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isPasswordChangePage = request.nextUrl.pathname === '/change-password';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isAuthApiRoute = request.nextUrl.pathname.startsWith('/api/auth');
  const isPasswordChangeApi = request.nextUrl.pathname === '/api/auth/change-password'
    || request.nextUrl.pathname === '/api/v1/auth/change-password'
    || request.nextUrl.pathname === '/api/auth/logout'
    || request.nextUrl.pathname === '/api/v1/auth/logout';
  
  if (!hasSession && !isAuthPage && (!isApiRoute || isAuthApiRoute)) {
    if (!isApiRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
      logProxy();
      return addPerfResponseHeader(NextResponse.redirect(url));
    }
  }

  if (hasSession && sessionState.mustChangePassword && !isPasswordChangePage && !isPasswordChangeApi) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Bạn phải đổi mật khẩu tạm thời trước khi tiếp tục.", code: "PASSWORD_CHANGE_REQUIRED" },
        { status: 403 },
      );
    }
    const passwordUrl = request.nextUrl.clone();
    passwordUrl.pathname = '/change-password';
    passwordUrl.search = '';
    logProxy();
    return addPerfResponseHeader(NextResponse.redirect(passwordUrl));
  }

  if (hasSession && !sessionState.mustChangePassword && isPasswordChangePage) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    homeUrl.search = '';
    logProxy();
    return addPerfResponseHeader(NextResponse.redirect(homeUrl));
  }

  if (hasSession && isAuthPage) {
    if (request.nextUrl.searchParams.get('reason') === 'session_expired') {
      const response = NextResponse.next();
      response.cookies.delete('auth_session');
      return response;
    }
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    homeUrl.search = '';
    logProxy();
    return addPerfResponseHeader(NextResponse.redirect(homeUrl));
  }

  const requestHeaders = new Headers(request.headers);
  if (requestId) {
    requestHeaders.set("x-perf-request-id", requestId);
    requestHeaders.set("x-perf-route", request.nextUrl.pathname);
  }
  const response = requestId
    ? NextResponse.next({ request: { headers: requestHeaders } })
    : NextResponse.next();
  // Clear cookie if reason=session_expired on any route? No, only on login is fine, but let's be safe.
  if (request.nextUrl.searchParams.get('reason') === 'session_expired') {
    response.cookies.delete('auth_session');
  }

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  logProxy();
  return addPerfResponseHeader(response);
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|images|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)',
  ],
};
