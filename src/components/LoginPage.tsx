import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import {
  AppUser,
  loginWithEmailPassword,
  loginWithGoogle,
} from '../services/firebase';

interface LoginPageProps {
  onLoginSuccess: (user: AppUser) => void;
  initialError?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, initialError = null }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(initialError);
  const [isEmailProviderDisabled, setIsEmailProviderDisabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsEmailProviderDisabled(false);

    if (!email.trim() || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    try {
      setLoading(true);
      const user = await loginWithEmailPassword(email, password);
      onLoginSuccess(user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تسجيل الدخول.';
      if (msg === 'AUTH_EMAIL_PROVIDER_DISABLED') {
        setIsEmailProviderDisabled(true);
        setError('مزود الدخول بالبريد الإلكتروني وكلمة المرور غير مفعل بعد في Firebase Console.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsEmailProviderDisabled(false);
    try {
      setLoading(true);
      const user = await loginWithGoogle();
      onLoginSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول عبر Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#F7FBFE] via-[#EEF7FC] to-[#F7FBFE] dark:from-[#0B1120] dark:via-[#0F172A] dark:to-[#0B1120] flex flex-col items-center justify-center p-4 select-none relative overflow-hidden font-sans">
      {/* Ambient background glowing circles */}
      <div className="absolute top-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-[#A9DDF5]/35 dark:bg-[#4A9FD8]/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[450px] h-[450px] rounded-full bg-[#E8742A]/10 blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Login Card */}
      <div className="w-full max-w-md bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-xl rounded-2xl border border-[#A9DDF5] dark:border-slate-700 shadow-lg relative overflow-hidden z-10 p-6 sm:p-8">
        {/* Top Luxury Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-1.5 gradient-brand-ribbon" />

        {/* Company Header */}
        <div className="flex flex-col items-center text-center mb-5 pt-2">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white p-1.5 shadow-sm border border-[#A9DDF5] dark:border-slate-600 flex items-center justify-center mb-3">
            <img
              src={`${import.meta.env.BASE_URL}assets/aistudio/logo_df9a0408.jpeg`}
              alt="شعار درة المنورة لنقل الحجاج والمعتمرين - DMTC"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-[#483878] dark:text-slate-100 tracking-tight">
              درة المنورة
            </h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[#483878] text-white">
              DMTC
            </span>
          </div>
          <span className="text-xs font-bold text-[#E8742A] mb-1">
            لنقل الحجاج والمعتمرين
          </span>
          <p className="text-xs text-[#444444] dark:text-slate-300 font-medium">
            مكتب التشغيل والعمليات | بوابة تسجيل الدخول
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F7FBFE] dark:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 text-[#483878] dark:text-[#A9DDF5] text-xs font-bold shadow-sm">
            <ShieldCheck className="w-4 h-4 text-[#4A9FD8]" />
            <span>بوابة الدخول المعتمدة</span>
          </div>
        </div>

        {/* Error Alert Message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#D92D20]/10 border border-[#D92D20]/35 text-[#D92D20] text-xs font-bold flex flex-col gap-2 leading-relaxed">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#D92D20] mt-0.5" />
              <span>{error}</span>
            </div>
            {isEmailProviderDisabled && (
              <a
                href="https://console.firebase.google.com/project/gen-lang-client-0104041039/authentication/providers"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-black text-[#483878] dark:text-[#A9DDF5] hover:underline mr-6"
              >
                <span>فتح إعدادات Sign-in method في Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* Standard Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#444444] dark:text-slate-200 mb-1.5">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@dmtc.sa"
                className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] focus:bg-white dark:focus:bg-slate-900 text-[#483878] dark:text-slate-100 text-xs sm:text-sm font-medium outline-none transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400 text-right"
                required
              />
              <Mail className="w-4 h-4 text-[#4A9FD8] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#444444] dark:text-slate-200 mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] focus:bg-white dark:focus:bg-slate-900 text-[#483878] dark:text-slate-100 text-xs sm:text-sm font-medium outline-none transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400"
                required
              />
              <Lock className="w-4 h-4 text-[#4A9FD8] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444] dark:text-slate-300 hover:text-[#483878] dark:hover:text-white cursor-pointer"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#E8742A] hover:bg-[#d5651e] active:scale-[0.98] disabled:opacity-60 text-white font-black text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'جارٍ تسجيل الدخول...' : 'دخول إلى لوحة العمليات'}</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#A9DDF5] dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-[#131C31] px-3 text-[#444444] dark:text-slate-300 font-medium">
                أو دخول المدير العام
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-800 hover:bg-[#EEF7FC] dark:hover:bg-slate-700 border border-[#A9DDF5] dark:border-slate-700 hover:border-[#4A9FD8] text-[#483878] dark:text-slate-100 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>تسجيل الدخول بحساب Google المعتمد</span>
          </button>
        </form>

        <p className="text-xs text-[#444444] dark:text-slate-300 text-center pt-4 font-medium">
          تُنشأ الحسابات وتُدار صلاحيات التفعيل حصرياً من قِبل المدير العام داخل النظام.
        </p>
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-[#444444] dark:text-slate-300 text-xs font-medium">
        <span>درة المنورة لنقل الحجاج والمعتمرين © {new Date().getFullYear()}</span>
      </div>
    </div>
  );
};
