/**
 * Auth Types
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  position?: string | null;
  isActive?: boolean;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
}

export type AuthStatus = 'BOOTSTRAPPING' | 'UNAUTHENTICATED' | 'AUTHENTICATED' | 'ERROR';

export interface AuthState {
  status: AuthStatus;
  user: UserProfile | null;
  token: string | null;
  error: string | null;
}
