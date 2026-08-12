import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthState } from './auth-types';
import { getToken, setToken, deleteToken } from './secure-token';
import { loginApi, getMeApi, logoutApi } from '../api/auth-api';
import { registerUnauthorizedHandler } from '../api/client';
import { ApiError } from '../api/types';

interface AuthContextType extends AuthState {
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    status: 'BOOTSTRAPPING',
    user: null,
    token: null,
    error: null,
  });

  const bootstrap = useCallback(async () => {
    setState((s) => ({ ...s, status: 'BOOTSTRAPPING', error: null }));
    try {
      const savedToken = await getToken();
      if (!savedToken) {
        setState({ status: 'UNAUTHENTICATED', user: null, token: null, error: null });
        return;
      }

      try {
        const meRes = await getMeApi();
        setState({
          status: 'AUTHENTICATED',
          user: meRes.user,
          token: savedToken,
          error: null,
        });
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 401) {
          // Token is invalid/revoked -> clear token cleanly
          await deleteToken();
          setState({ status: 'UNAUTHENTICATED', user: null, token: null, error: null });
        } else {
          // Network error or server offline -> KEEP TOKEN, show error with retry option
          setState({
            status: 'ERROR',
            user: null,
            token: savedToken,
            error: err.message || 'Không thể kết nối máy chủ. Vui lòng kiểm tra lại mạng.',
          });
        }
      }
    } catch (error: any) {
      setState({
        status: 'UNAUTHENTICATED',
        user: null,
        token: null,
        error: error?.message || 'Lỗi khởi tạo phiên đăng nhập.',
      });
    }
  }, []);

  const handleUnauthorized = useCallback(async () => {
    await deleteToken();
    setState({
      status: 'UNAUTHENTICATED',
      user: null,
      token: null,
      error: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
    });
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(handleUnauthorized);
    bootstrap();
  }, [bootstrap, handleUnauthorized]);

  const login = async (email: string, pass: string) => {
    setState((s) => ({ ...s, error: null }));
    try {
      const session = await loginApi(email, pass);
      await setToken(session.token);

      const meRes = await getMeApi();
      setState({
        status: 'AUTHENTICATED',
        user: meRes.user,
        token: session.token,
        error: null,
      });
    } catch (err: any) {
      const msg = err.message || 'Đăng nhập không thành công. Vui lòng thử lại.';
      setState((s) => ({ ...s, status: s.status === 'BOOTSTRAPPING' ? 'UNAUTHENTICATED' : s.status, error: msg }));
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.warn('[Logout] Server logout call failed, proceeding to clear local token:', err);
    } finally {
      await deleteToken();
      setState({
        status: 'UNAUTHENTICATED',
        user: null,
        token: null,
        error: null,
      });
    }
  };

  const clearAuthError = () => {
    setState((s) => ({ ...s, error: null }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        bootstrap,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
