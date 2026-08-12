import { apiRequest } from './client';
import { UserProfile, AuthSession } from '../auth/auth-types';

export async function loginApi(email: string, password: string): Promise<AuthSession> {
  const data = await apiRequest<any>('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuth: true,
  });
  return {
    token: data.token,
    user: data.user || data,
  };
}

export async function getMeApi(): Promise<{ user: UserProfile }> {
  const data = await apiRequest<any>('/me', {
    method: 'GET',
  });
  const user: UserProfile = {
    id: data.id || data.user?.id,
    name: data.name || data.user?.name || 'Người dùng ERP',
    email: data.email || data.user?.email || '',
    role: data.role || data.user?.role || 'STAFF',
    phone: data.phone || data.user?.phone || null,
  };
  return { user };
}

export async function logoutApi(): Promise<{ message: string }> {
  return await apiRequest<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}
