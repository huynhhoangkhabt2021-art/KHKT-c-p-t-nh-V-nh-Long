import {
  HeartPulse,
  LogIn,
  LogOut,
  Moon,
  PhoneCall,
  Sun,
  UserCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AppView, AuthUser, SosContact } from '../../types/health';

interface WebHeaderProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  user: AuthUser | null;
  primaryContact?: SosContact;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenSos: () => void;
}

const WEEKDAYS_VI = [
  'Chủ nhật',
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
];

function formatLiveDateTime(now: Date): { time: string; date: string } {
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const wd = WEEKDAYS_VI[now.getDay()] ?? 'Hôm nay';
  const dd = String(now.getDate()).padStart(2, '0');
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return {
    time: `${hh}:${mm}:${ss}`,
    date: `${wd}, ${dd}/${mo}/${yyyy}`,
  };
}

export const NAV_ITEMS: Array<{ view: AppView; label: string }> = [
  { view: 'home', label: 'Trang chủ' },
  { view: 'sensors', label: 'Hệ thống đo sức khỏe' },
  { view: 'trays', label: '4 Khay Thuốc' },
  { view: 'health-record', label: 'Hồ sơ sức khỏe' },
  { view: 'sos', label: 'Mục SOS Khẩn cấp' },
  { view: 'doctor-ai', label: 'Bác sĩ AI' },
  { view: 'docs', label: 'Tài liệu y tế' },
  { view: 'settings', label: 'Cài đặt' },
];

export function WebHeader({
  activeView,
  onSelectView,
  user,
  primaryContact,
  darkMode,
  onToggleDarkMode,
  onOpenAuth,
  onLogout,
  onOpenSos,
}: WebHeaderProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { time, date } = formatLiveDateTime(now);

  return (
    <div className="sticky top-0 z-40 print:hidden">
      {/* Topmost Teal Bar with Top-Right Login / Register Trigger */}
      <div className="bg-[#134E4A] text-white text-[0.82rem] py-1.5 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <p className="font-semibold opacity-95 truncate">
            Hệ thống chăm sóc sức khỏe thông minh cho người cao tuổi theo thời gian thực
          </p>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0 font-semibold tabular-nums">
            {primaryContact && (
              <span className="hidden md:inline text-teal-100">
                SOS ({primaryContact.name}): {primaryContact.phone}
              </span>
            )}
            <span className="hidden sm:inline text-teal-100">Cấp cứu: 115</span>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 text-white text-[0.8rem] font-bold">
                  <UserCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="max-w-[130px] truncate">{user.fullName}</span>
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="Đăng xuất tài khoản"
                  className="px-2.5 py-1 rounded-lg bg-white text-[#134E4A] hover:bg-teal-50 text-[0.8rem] font-extrabold flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3 py-1 rounded-lg bg-[#0D9488] hover:bg-[#14B8A6] border border-white/30 text-white text-[0.8rem] font-extrabold flex items-center gap-1.5 shadow-sm transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Đăng nhập / Đăng ký</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header
        className={`backdrop-blur-md border-b transition-colors ${
          darkMode
            ? 'bg-slate-900/95 border-slate-700 text-white'
            : 'bg-white/95 border-slate-200/90 text-[#0F172A]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => onSelectView('home')}
            className="flex-1 sm:flex-initial flex items-center gap-2 sm:gap-3 text-left min-w-0 overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0D9488]/30 rounded-xl"
          >
            <span className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-[#0F766E] text-white flex items-center justify-center shadow-sm shrink-0">
              <HeartPulse className="w-4 h-4 sm:w-6 sm:h-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="font-extrabold text-[0.88rem] sm:text-[1.15rem] tracking-tight truncate block">
                SMART HEALTHCARE
              </span>
              <p
                className={`text-[0.75rem] hidden md:block truncate ${
                  darkMode ? 'text-slate-300' : 'text-[#475569]'
                }`}
              >
                Hệ thống chăm sóc sức khỏe thông minh cho người cao tuổi theo thời gian thực
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label={darkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              className={`min-h-[42px] px-2.5 sm:px-3 py-1.5 rounded-xl border text-[0.84rem] font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                darkMode
                  ? 'bg-slate-800 border-slate-600 text-amber-300 hover:bg-slate-700'
                  : 'bg-[#F8FAFC] border-slate-200 text-[#334155] hover:bg-slate-100'
              }`}
            >
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="hidden md:inline">Giao diện Sáng</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="hidden md:inline">Giao diện Tối</span>
                </>
              )}
            </button>

            <div
              className={`hidden xl:flex flex-col items-end px-3 py-1 rounded-xl border tabular-nums ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-[#F8FAFC] border-slate-200 text-[#0F172A]'
              }`}
            >
              <span className="text-[0.88rem] font-extrabold leading-tight">{time}</span>
              <span className="text-[0.72rem] opacity-75 leading-tight">{date}</span>
            </div>

            <button
              type="button"
              onClick={onOpenSos}
              aria-label="Cấp cứu SOS"
              className="min-h-[42px] sm:min-h-[44px] px-2.5 sm:px-4 py-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.98] text-white font-extrabold text-[0.8rem] sm:text-[0.94rem] shadow-md shadow-[#DC2626]/20 flex items-center gap-1.5 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#DC2626]/40"
            >
              <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden="true" />
              <span className="sm:hidden">SOS</span>
              <span className="hidden sm:inline">Cấp cứu SOS</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Click to enter each section) */}
        <nav
          aria-label="Điều hướng các mục chính"
          className={`border-t px-3 sm:px-6 py-1.5 ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-[#F8FAFC] border-slate-200/80'
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.view;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => onSelectView(item.view)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-[0.82rem] sm:text-[0.88rem] font-bold whitespace-nowrap transition-colors shrink-0 ${
                    isActive
                      ? 'bg-[#0D9488] text-white shadow-sm'
                      : darkMode
                        ? 'text-slate-200 hover:bg-slate-800 hover:text-teal-300'
                        : 'text-[#334155] hover:bg-[#F0FDFA] hover:text-[#0F766E]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>
    </div>
  );
}
