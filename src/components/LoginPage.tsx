import React, { useState } from 'react';
import {
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
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
    <div
      dir="rtl"
      className="min-h-screen w-full font-['Cairo',sans-serif] bg-[linear-gradient(135deg,#EAF1FB_0%,#F8FAFD_50%,#FFF4EA_100%)] flex items-center justify-center p-0 min-[480px]:p-6"
    >
      <main className="w-full max-w-[520px] min-[960px]:max-w-[1080px] min-h-screen min-[480px]:min-h-[660px] bg-white rounded-none min-[480px]:rounded-[28px] shadow-none min-[480px]:shadow-[0_24px_64px_-16px_rgba(11,37,69,0.16),0_8px_24px_-8px_rgba(11,37,69,0.08)] overflow-hidden grid grid-cols-1 min-[960px]:grid-cols-[520px_1fr]">
        {/* Right Part: Login Form (520px on desktop) */}
        <section
          aria-label="نموذج تسجيل الدخول"
          className="flex flex-col justify-center gap-[22px] p-[24px] min-[480px]:px-[56px] min-[480px]:py-[48px] bg-white"
        >
          {/* 1. Brand Row */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F8FAFD] border border-[#D5DFEF] p-1.5 flex items-center justify-center shrink-0">
              <img
                src={`${import.meta.env.BASE_URL}assets/aistudio/logo_df9a0408.jpeg`}
                alt="شعار درة المنورة لنقل الحجاج والمعتمرين - DMTC"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[18px] font-bold leading-snug text-[#0B2545]">
                درة المنورة
              </span>
              <span className="text-[13px] font-medium leading-snug text-[#3B4C69]">
                لنقل الحجاج والمعتمرين
              </span>
            </div>
          </div>

          {/* 2. Heading & Subtitle */}
          <div>
            <h1 className="text-[28px] min-[480px]:text-[32px] font-extrabold leading-tight tracking-tight text-[#0B2545]">
              تسجيل الدخول
            </h1>
            <p className="mt-1.5 text-[15px] font-medium text-[#3B4C69]">
              مكتب التشغيل والعمليات
            </p>
          </div>

          {/* Standard Login Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-[16px]" noValidate>
            {/* 3. Email Field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-email"
                className="text-[14px] font-bold text-[#0B2545]"
              >
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail
                  className="w-[18px] h-[18px] text-[#3B4C69] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@dmtc.sa"
                  className="w-full h-[46px] pr-11 pl-3.5 rounded-xl bg-[#F8FAFD] border-[1.5px] border-[#B9C7DD] text-[#0B2545] text-[15px] font-medium text-right placeholder:text-[#5B6B86] transition-colors outline-none focus:bg-white focus:border-[#1459D9] focus:ring-4 focus:ring-[#1459D9]/15"
                  required
                />
              </div>
            </div>

            {/* 4. Password Field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-password"
                className="text-[14px] font-bold text-[#0B2545]"
              >
                كلمة المرور
              </label>
              <div className="relative">
                <Lock
                  className="w-[18px] h-[18px] text-[#3B4C69] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[46px] pr-11 pl-12 rounded-xl bg-[#F8FAFD] border-[1.5px] border-[#B9C7DD] text-[#0B2545] text-[15px] font-medium placeholder:text-[#5B6B86] transition-colors outline-none focus:bg-white focus:border-[#1459D9] focus:ring-4 focus:ring-[#1459D9]/15"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="w-[44px] h-[44px] absolute left-0.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-lg text-[#3B4C69] hover:text-[#0B2545] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1459D9]"
                >
                  {showPassword ? (
                    <EyeOff className="w-[18px] h-[18px]" aria-hidden="true" />
                  ) : (
                    <Eye className="w-[18px] h-[18px]" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* 5. Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="remember-device"
                className="min-h-[44px] inline-flex items-center gap-2.5 text-[14px] font-medium text-[#3B4C69] cursor-pointer select-none"
              >
                {/* TODO: Wire remember-me checkbox to Firebase Auth setPersistence when persistence toggle logic is added */}
                <input
                  id="remember-device"
                  type="checkbox"
                  className="w-[18px] h-[18px] rounded border-[1.5px] border-[#B9C7DD] accent-[#1459D9] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1459D9] focus-visible:ring-offset-2"
                />
                <span>تذكّرني على هذا الجهاز</span>
              </label>

              {/* TODO: Wire forgot-password link to Firebase sendPasswordResetEmail flow when implemented */}
              <a
                href="#forgot-password"
                onClick={(e) => e.preventDefault()}
                className="min-h-[44px] inline-flex items-center text-[14px] font-bold text-[#1459D9] hover:text-[#0B3D91] hover:underline rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-[#1459D9]"
              >
                نسيت كلمة المرور؟
              </a>
            </div>

            {/* 6. Error Alert Area (above primary button) */}
            <div aria-live="polite">
              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#B42318] text-[13px] font-bold flex flex-col gap-2 leading-relaxed"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle
                      className="w-4 h-4 shrink-0 text-[#B42318] mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{error}</span>
                  </div>
                  {isEmailProviderDisabled && (
                    <a
                      href="https://console.firebase.google.com/project/gen-lang-client-0104041039/authentication/providers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#1459D9] hover:text-[#0B3D91] hover:underline mr-6 rounded outline-none focus-visible:ring-2 focus-visible:ring-[#1459D9]"
                    >
                      <span>فتح إعدادات Sign-in method في Firebase Console</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* 7. Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[54px] rounded-xl bg-[#C2570C] hover:bg-[#A64809] active:scale-[0.99] disabled:opacity-65 disabled:cursor-not-allowed text-white font-bold text-[15px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2.5 outline-none focus-visible:ring-4 focus-visible:ring-[#1459D9]/35"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>جارٍ تسجيل الدخول...</span>
                </>
              ) : (
                <span>دخول إلى لوحة العمليات</span>
              )}
            </button>
          </form>

          {/* 8. Divider */}
          <div className="relative flex items-center" role="separator" aria-label="أو للمدير العام">
            <div className="flex-1 border-t border-[#D5DFEF]" />
            <span className="px-3.5 text-[13px] font-semibold text-[#3B4C69] bg-white">
              أو للمدير العام
            </span>
            <div className="flex-1 border-t border-[#D5DFEF]" />
          </div>

          {/* 9. Secondary Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-[50px] rounded-xl bg-white hover:bg-[#F8FAFD] border-[1.5px] border-[#B9C7DD] hover:border-[#1459D9] text-[#0B2545] font-bold text-[15px] transition-colors cursor-pointer flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-65 disabled:cursor-not-allowed outline-none focus-visible:ring-4 focus-visible:ring-[#1459D9]/20"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
            <span>الدخول بحساب Google</span>
          </button>
        </section>

        {/* Left Part: Navy Visual & Route Panel (hidden below 960px) */}
        <aside
          aria-label="منظومة التشغيل والرقابة"
          className="hidden min-[960px]:flex flex-col justify-between p-12 bg-[#0B2545] text-white relative overflow-hidden"
        >
          {/* Soft Blue Radial Glow at Top Right */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,rgba(76,141,246,0.34)_0%,rgba(20,89,217,0.12)_48%,transparent_72%)]"
          />

          {/* Top Narrative Content */}
          <div className="relative z-10 flex flex-col gap-4">
            <span className="text-[14px] font-bold tracking-wide text-[#F08A3C]">
              منظومة التشغيل والرقابة
            </span>
            <h2 className="text-[34px] font-extrabold leading-[1.3] text-white">
              كل رحلة تحت المتابعة، وكل حافلة في مكانها
            </h2>
          </div>

          {/* Center Route Curve Illustration */}
          <div className="relative z-10 my-4 w-full max-w-[440px] mx-auto" dir="ltr">
            <div className="relative w-full aspect-[440/210]">
              <svg
                viewBox="0 0 440 210"
                className="w-full h-full overflow-visible"
                aria-hidden="true"
              >
                {/* Soft subtle base glow path */}
                <path
                  d="M 366 168 C 306 168, 272 126, 220 105 C 168 84, 134 42, 74 42"
                  fill="none"
                  stroke="#4C8DF6"
                  strokeOpacity="0.22"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Dashed route curve */}
                <path
                  d="M 366 168 C 306 168, 272 126, 220 105 C 168 84, 134 42, 74 42"
                  fill="none"
                  stroke="#4C8DF6"
                  strokeWidth="3"
                  strokeDasharray="8 8"
                  strokeLinecap="round"
                />

                {/* Stop 1: Jeddah (bottom right) */}
                <circle cx="366" cy="168" r="14" fill="#4C8DF6" fillOpacity="0.22" />
                <circle cx="366" cy="168" r="7" fill="#4C8DF6" stroke="#FFFFFF" strokeWidth="2.5" />

                {/* Stop 2: Makkah (middle) */}
                <circle cx="220" cy="105" r="14" fill="#F08A3C" fillOpacity="0.24" />
                <circle cx="220" cy="105" r="7.5" fill="#F08A3C" stroke="#FFFFFF" strokeWidth="2.5" />

                {/* Stop 3: Madinah (top left) */}
                <circle cx="74" cy="42" r="14" fill="#4C8DF6" fillOpacity="0.22" />
                <circle cx="74" cy="42" r="7" fill="#4C8DF6" stroke="#FFFFFF" strokeWidth="2.5" />
              </svg>

              {/* Stop Labels positioned cleanly around the three SVG nodes */}
              <div
                dir="rtl"
                className="absolute right-[7%] bottom-[1%] px-3 py-1 rounded-lg bg-[#13335D]/95 border border-[#4C8DF6]/40 text-[13px] font-bold text-white shadow-sm"
              >
                جدة
              </div>
              <div
                dir="rtl"
                className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-4 px-3 py-1 rounded-lg bg-[#13335D]/95 border border-[#F08A3C]/55 text-[13px] font-bold text-white shadow-sm whitespace-nowrap"
              >
                مكة المكرمة
              </div>
              <div
                dir="rtl"
                className="absolute left-[4%] top-[2%] px-3 py-1 rounded-lg bg-[#13335D]/95 border border-[#4C8DF6]/40 text-[13px] font-bold text-white shadow-sm whitespace-nowrap"
              >
                المدينة المنورة
              </div>
            </div>
          </div>

          {/* Bottom Security & Access Note */}
          <p className="relative z-10 text-[14px] leading-relaxed font-medium text-[#CBD8EC] border-t border-white/15 pt-5">
            تُنشأ الحسابات وتُدار الصلاحيات حصريًا من قبل المدير العام داخل النظام.
          </p>
        </aside>
      </main>
    </div>
  );
};
