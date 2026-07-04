"use client";

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Building2, Eye, EyeOff, AlertCircle, ChevronRight, Mail, LockKeyhole } from 'lucide-react';
import { LoginBackground3D } from '@/components/auth/LoginBackground3D';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    // Autofocus email on mount if empty
    if (emailInputRef.current && !email) {
      emailInputRef.current.focus();
    }
    
    // Check for reason=session_expired
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'session_expired') {
      setError('Phiên đăng nhập đã hết hạn hoặc không hợp lệ, vui lòng đăng nhập lại.');
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập thất bại');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      // Keep email, but clear password if there's an error
      setPassword('');
      if (emailInputRef.current) {
        emailInputRef.current.focus();
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 relative overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* 3D Background Decoration */}
      <LoginBackground3D />

      {/* Centered Login Card Container */}
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6 flex flex-col items-center">
        <div className="w-full bg-white/80 backdrop-blur-3xl p-8 sm:p-10 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/80">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-8 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-blue-500/20 rounded-full blur-xl pointer-events-none"></div>
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-indigo-500/20 mb-5 border border-white/20">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-center">
              Đăng nhập
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-500 text-center font-medium">
              Truy cập hệ thống ERP Công trình
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 text-red-900 border border-red-100 shadow-sm transition-all animate-in fade-in slide-in-from-top-2 rounded-xl p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="font-medium text-red-800 text-sm leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-slate-700 ml-1">
                  Email đăng nhập
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    required
                    ref={emailInputRef}
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="block w-full h-[52px] rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 sm:text-sm font-medium"
                    placeholder="admin@construction.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                    Mật khẩu
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    className="block w-full h-[52px] rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-12 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 sm:text-sm font-medium"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-[52px] text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/20 transition-all rounded-2xl border-0" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                  <span>Đang đăng nhập...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>Đăng nhập</span>
                  <ChevronRight className="h-5 w-5 opacity-70" />
                </div>
              )}
            </Button>
          </form>
        </div>

        {/* Footer Outside Card */}
        <div className="mt-8 text-center text-xs text-slate-400 font-medium tracking-wide">
          © {new Date().getFullYear()} Dành cho nội bộ công ty.
        </div>
      </div>
    </div>
  );
}
