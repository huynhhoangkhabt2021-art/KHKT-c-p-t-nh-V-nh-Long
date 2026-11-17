import {
  ArrowLeft,
  Droplets,
  Eye,
  EyeOff,
  Grid3X3,
  HeartPulse,
  Lock,
  Phone,
  Pill,
  User,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { AuthUser, SmartHealthState } from '../../types/health';

interface WebAuthModalProps {
  darkMode: boolean;
  onClose: () => void;
  onAuthSuccess: (payload: {
    token: string;
    user: AuthUser;
    state: SmartHealthState;
  }) => void;
}

export function WebAuthModal({
  darkMode,
  onClose,
  onAuthSuccess,
}: WebAuthModalProps) {
  // Login card state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showForgotNote, setShowForgotNote] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register card state
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regPinDigits, setRegPinDigits] = useState<[string, string, string, string]>([
    '',
    '',
    '',
    '',
  ]);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const pinBoxRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = loginPhone.trim();
    const cleanPin = loginPin.replace(/\D/g, '').slice(0, 4);

    if (!cleanPhone && cleanPin.length !== 4) {
      setLoginError('Vui lòng nhập Số điện thoại hoặc mã PIN 4 số.');
      return;
    }
    if (!loginPassword && cleanPin.length !== 4) {
      setLoginError('Vui lòng nhập Mật khẩu hoặc mã PIN 4 số.');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanPhone,
          password: loginPassword,
          pin: cleanPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Đăng nhập chưa thành công.');
        return;
      }
      onAuthSuccess({ token: data.token, user: data.user, state: data.state });
    } catch {
      setLoginError('Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handlePinDigitChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    setRegPinDigits((prev) => {
      const next: [string, string, string, string] = [...prev] as [
        string,
        string,
        string,
        string,
      ];
      next[index] = digit;
      return next;
    });
    if (digit && index < 3) {
      pinBoxRefs[index + 1]?.current?.focus();
    }
  };

  const handlePinDigitKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && !regPinDigits[index] && index > 0) {
      pinBoxRefs[index - 1]?.current?.focus();
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = regPinDigits.join('');
    if (!regFullName.trim() || !regPhone.trim() || regPassword.length < 4) {
      setRegError(
        'Vui lòng nhập Họ và tên, Số điện thoại và Mật khẩu (tối thiểu 4 ký tự).'
      );
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setRegError('Vui lòng thiết lập đủ 4 chữ số cho mã PIN đăng nhập.');
      return;
    }

    setRegLoading(true);
    setRegError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regFullName.trim(),
          phone: regPhone.trim(),
          username: regPhone.trim(),
          password: regPassword,
          pin,
          role: 'caregiver',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || 'Đăng ký tài khoản chưa thành công.');
        return;
      }
      onAuthSuccess({ token: data.token, user: data.user, state: data.state });
    } catch {
      setRegError('Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally {
      setRegLoading(false);
    }
  };

  const backdropClass = darkMode
    ? 'bg-slate-950/95 text-white'
    : 'bg-[#FBF8F1]/98 text-[#102A3A]';
  const cardClass = darkMode
    ? 'bg-slate-900 border-slate-700 text-white shadow-2xl'
    : 'bg-[#FFFDF9] border-[#E8E2D5] text-[#102A3A] shadow-[0_14px_40px_rgba(15,23,42,0.08)]';
  const inputBoxClass = darkMode
    ? 'bg-slate-800 border-slate-600 focus-within:border-[#10B981] focus-within:ring-2 focus-within:ring-[#10B981]/30'
    : 'bg-white border-[#334155]/45 focus-within:border-[#059669] focus-within:ring-2 focus-within:ring-[#059669]/25';
  const badgeIconClass = darkMode
    ? 'bg-slate-700 text-teal-300'
    : 'bg-[#F4EFE4] text-[#1E3A4C]';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Đăng nhập và Đăng ký tài khoản Smart Healthcare"
      className={`fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm px-4 py-6 sm:py-10 flex flex-col ${backdropClass}`}
    >
      {/* Top Bar inside Auth Modal */}
      <div className="max-w-[980px] w-full mx-auto flex items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={onClose}
          className={`min-h-[44px] px-4 py-2 rounded-xl border font-bold text-[0.94rem] flex items-center gap-2 transition-colors ${
            darkMode
              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              : 'bg-white border-[#E2DACB] text-[#102A3A] hover:bg-[#F5F0E4]'
          }`}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Quay lại trang chính</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cửa sổ đăng nhập"
          className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center transition-colors ${
            darkMode
              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              : 'bg-white border-[#E2DACB] text-[#102A3A] hover:bg-[#F5F0E4]'
          }`}
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Main 2-Card Layout matching reference image */}
      <div className="max-w-[980px] w-full mx-auto my-auto grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-10 items-center">
        {/* Left Card: Đăng nhập */}
        <section
          aria-label="Đăng nhập tài khoản"
          className={`rounded-[24px] border p-6 sm:p-8 flex flex-col gap-5 ${cardClass}`}
        >
          <h2 className="text-[1.85rem] font-extrabold tracking-tight">Đăng nhập</h2>

          {loginError && (
            <div
              role="alert"
              className="rounded-xl bg-[#FEF2F2] border border-[#DC2626]/30 px-4 py-3 text-[0.92rem] font-bold text-[#DC2626]"
            >
              {loginError}
            </div>
          )}

          <form onSubmit={(e) => void handleLoginSubmit(e)} className="flex flex-col gap-4">
            {/* Phone / Identifier */}
            <label
              className={`min-h-[54px] rounded-xl border px-3 py-1.5 flex items-center gap-3 transition-all cursor-text ${inputBoxClass}`}
            >
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${badgeIconClass}`}
              >
                <Phone className="w-5 h-5" aria-hidden="true" />
              </span>
              <input
                id="login-phone"
                type="text"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                placeholder="Số điện thoại"
                aria-label="Số điện thoại đăng nhập"
                className="w-full bg-transparent text-[1.02rem] font-medium focus:outline-none"
              />
            </label>

            {/* Password */}
            <label
              className={`min-h-[54px] rounded-xl border px-3 py-1.5 flex items-center gap-3 transition-all cursor-text ${inputBoxClass}`}
            >
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${badgeIconClass}`}
              >
                <Lock className="w-5 h-5" aria-hidden="true" />
              </span>
              <input
                id="login-password"
                type={showLoginPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Mật khẩu"
                aria-label="Mật khẩu đăng nhập"
                className="w-full bg-transparent text-[1.02rem] font-medium focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="p-1.5 rounded-lg opacity-70 hover:opacity-100"
              >
                {showLoginPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </label>

            {/* 4-Digit PIN Login */}
            <label
              className={`min-h-[54px] rounded-xl border px-3 py-1.5 flex items-center gap-3 transition-all cursor-text ${inputBoxClass}`}
            >
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${badgeIconClass}`}
              >
                <Grid3X3 className="w-5 h-5" aria-hidden="true" />
              </span>
              <input
                id="login-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Đăng nhập bằng mã PIN 4 số"
                aria-label="Đăng nhập bằng mã PIN 4 số"
                className="w-full bg-transparent text-[1.02rem] font-medium focus:outline-none"
              />
            </label>

            <button
              type="submit"
              disabled={loginLoading}
              className="min-h-[54px] mt-1 rounded-xl bg-[#008C68] hover:bg-[#007456] active:scale-[0.99] text-white font-extrabold text-[1.04rem] tracking-wide shadow-md shadow-[#008C68]/20 transition-all disabled:opacity-60"
            >
              {loginLoading ? 'ĐANG XÁC THỰC...' : 'ĐĂNG NHẬP'}
            </button>
          </form>

          <div className="text-center flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setShowForgotNote((prev) => !prev)}
              className={`text-[0.95rem] font-semibold hover:underline ${
                darkMode ? 'text-teal-300' : 'text-[#1E3A4C]'
              }`}
            >
              Quên mật khẩu?
            </button>

            {showForgotNote && (
              <div
                className={`w-full rounded-xl border px-3.5 py-2.5 text-[0.86rem] text-left leading-relaxed ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-[#F8F5EC] border-[#E4DEC9] text-[#334155]'
                }`}
              >
                Bạn có thể nhập trực tiếp <strong>Mã PIN 4 số</strong> đã thiết lập để vào
                nhanh, hoặc tạo tài khoản mới ở khung <strong>Đăng ký</strong> bên cạnh.
              </div>
            )}
          </div>
        </section>

        {/* Center Decorative Care Icons Column matching reference */}
        <div
          aria-hidden="true"
          className="hidden md:flex flex-col items-center justify-center gap-10 px-2"
        >
          <div
            className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-sm ${
              darkMode
                ? 'bg-slate-800 border-slate-700'
                : 'bg-[#F3EDE0] border-[#E8E0CF]'
            }`}
          >
            <HeartPulse className="w-8 h-8 text-[#EF4444]" />
          </div>
          <div
            className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-sm ${
              darkMode
                ? 'bg-slate-800 border-slate-700'
                : 'bg-[#F3EDE0] border-[#E8E0CF]'
            }`}
          >
            <Droplets className="w-8 h-8 text-[#EA580C]" />
          </div>
          <div
            className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-sm ${
              darkMode
                ? 'bg-slate-800 border-slate-700'
                : 'bg-[#F3EDE0] border-[#E8E0CF]'
            }`}
          >
            <Pill className="w-8 h-8 text-[#0D9488]" />
          </div>
        </div>

        {/* Right Card: Đăng ký */}
        <section
          aria-label="Đăng ký tài khoản mới"
          className={`rounded-[24px] border p-6 sm:p-8 flex flex-col gap-5 ${cardClass}`}
        >
          <h2 className="text-[1.85rem] font-extrabold tracking-tight">Đăng ký</h2>

          {regError && (
            <div
              role="alert"
              className="rounded-xl bg-[#FEF2F2] border border-[#DC2626]/30 px-4 py-3 text-[0.92rem] font-bold text-[#DC2626]"
            >
              {regError}
            </div>
          )}

          <form onSubmit={(e) => void handleRegisterSubmit(e)} className="flex flex-col gap-4">
            {/* Full Name */}
            <label
              className={`min-h-[54px] rounded-xl border px-3 py-1.5 flex items-center gap-3 transition-all cursor-text ${inputBoxClass}`}
            >
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${badgeIconClass}`}
              >
                <User className="w-5 h-5" aria-hidden="true" />
              </span>
              <input
                id="reg-fullname"
                type="text"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="Họ và tên"
                aria-label="Họ và tên đăng ký"
                className="w-full bg-transparent text-[1.02rem] font-medium focus:outline-none"
              />
            </label>

            {/* Phone */}
            <label
              className={`min-h-[54px] rounded-xl border px-3 py-1.5 flex items-center gap-3 transition-all cursor-text ${inputBoxClass}`}
            >
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${badgeIconClass}`}
              >
                <Phone className="w-5 h-5" aria-hidden="true" />
              </span>
              <input
                id="reg-phone"
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="Số điện thoại"
                aria-label="Số điện thoại đăng ký"
                className="w-full bg-transparent text-[1.02rem] font-medium focus:outline-none"
              />
            </label>

            {/* Password */}
            <label
              className={`min-h-[54px] rounded-xl border px-3 py-1.5 flex items-center gap-3 transition-all cursor-text ${inputBoxClass}`}
            >
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${badgeIconClass}`}
              >
                <Lock className="w-5 h-5" aria-hidden="true" />
              </span>
              <input
                id="reg-password"
                type={showRegPassword ? 'text' : 'password'}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Mật khẩu"
                aria-label="Mật khẩu đăng ký"
                className="w-full bg-transparent text-[1.02rem] font-medium focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowRegPassword((prev) => !prev)}
                aria-label={showRegPassword ? 'Ẩn mật khẩu đăng ký' : 'Hiện mật khẩu đăng ký'}
                className="p-1.5 rounded-lg opacity-70 hover:opacity-100"
              >
                {showRegPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </label>

            {/* 4-Box PIN Setup matching reference */}
            <div className="flex items-start gap-3 pt-0.5">
              <span
                className={`w-10 h-10 mt-6 rounded-xl flex items-center justify-center shrink-0 ${badgeIconClass}`}
                aria-hidden="true"
              >
                <Grid3X3 className="w-5 h-5" />
              </span>
              <div className="flex-1">
                <p className="text-[0.98rem] font-semibold mb-2">
                  Thiết lập mã PIN 4 số
                </p>
                <div className="grid grid-cols-4 gap-2.5">
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={idx}
                      ref={pinBoxRefs[idx]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`Chữ số PIN thứ ${idx + 1}`}
                      value={regPinDigits[idx]}
                      onChange={(e) => handlePinDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinDigitKeyDown(idx, e)}
                      className={`h-12 w-full rounded-xl border text-center text-[1.25rem] font-extrabold tabular-nums focus:outline-none transition-all ${
                        darkMode
                          ? 'bg-slate-800 border-slate-600 text-white focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/30'
                          : 'bg-white border-[#334155]/45 text-[#102A3A] focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/25'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={regLoading}
              className="min-h-[54px] mt-1 rounded-xl bg-[#008C68] hover:bg-[#007456] active:scale-[0.99] text-white font-extrabold text-[1.04rem] tracking-wide shadow-md shadow-[#008C68]/20 transition-all disabled:opacity-60"
            >
              {regLoading ? 'ĐANG TẠO TÀI KHOẢN...' : 'ĐĂNG KÝ TÀI KHOẢN'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
