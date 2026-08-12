import { NextResponse } from 'next/server';
import { getSession, SessionUser } from '@/lib/auth';
import { canAccessProject } from '@/lib/rbac';
import { UserRole } from '@prisma/client';
import { apiError } from './api-response';

export interface V1AuthContext {
  session: SessionUser;
  user: SessionUser;
}

export async function requireAuth(): Promise<V1AuthContext | NextResponse> {
  const session = await getSession();
  if (!session || !session.id) {
    return apiError('UNAUTHENTICATED', 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.', 401);
  }
  return {
    session,
    user: session,
  };
}

export async function verifyProjectScope(
  session: SessionUser,
  projectId: string
): Promise<NextResponse | null> {
  if (!projectId) {
    return apiError('BAD_REQUEST', 'Mã dự án (projectId) không được để trống.', 400);
  }

  const hasAccess = await canAccessProject({ id: session.id, role: session.role }, projectId);
  if (!hasAccess) {
    return apiError('FORBIDDEN', `Bạn không có quyền truy cập dữ liệu của dự án (${projectId}).`, 403);
  }

  return null;
}

export function verifyUserRoles(
  session: SessionUser,
  allowedRoles: UserRole[]
): NextResponse | null {
  if (!allowedRoles.includes(session.role)) {
    return apiError('FORBIDDEN', 'Tài khoản của bạn không có đủ quyền thực hiện thao tác này.', 403);
  }
  return null;
}
