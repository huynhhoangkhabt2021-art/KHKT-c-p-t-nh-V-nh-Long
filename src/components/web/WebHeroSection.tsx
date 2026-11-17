import {
  Activity,
  ArrowRight,
  BookOpen,
  ClipboardList,
  HeartPulse,
  PhoneCall,
  Pill,
  Settings,
  Stethoscope,
} from 'lucide-react';
import { useState } from 'react';
import heroSeniorCareImg from '../../assets/images/hero_senior_care_1794787691811.jpg';
import type { AppView } from '../../types/health';

interface WebHeroSectionProps {
  darkMode: boolean;
  pendingCount: number;
  onSelectView: (view: AppView) => void;
}

const DIRECTORY_CARDS: Array<{
  view: Exclude<AppView, 'home'>;
  title: string;
  accent: string;
  icon: typeof Activity;
}> = [
  {
    view: 'sensors',
    title: 'Hệ thống đo sức khỏe',
    accent: 'text-[#0D9488] bg-[#F0FDFA]',
    icon: Activity,
  },
  {
    view: 'trays',
    title: '4 Khay Thuốc',
    accent: 'text-[#0056B3] bg-[#EFF6FF]',
    icon: Pill,
  },
  {
    view: 'health-record',
    title: 'Hồ sơ sức khỏe & Cảm nhận',
    accent: 'text-[#0F766E] bg-[#CCFBF1]/60',
    icon: ClipboardList,
  },
  {
    view: 'sos',
    title: 'Mục SOS Khẩn cấp',
    accent: 'text-[#DC2626] bg-[#FEF2F2]',
    icon: PhoneCall,
  },
  {
    view: 'doctor-ai',
    title: 'Bác sĩ AI',
    accent: 'text-[#0284C7] bg-[#E0F2FE]',
    icon: Stethoscope,
  },
  {
    view: 'docs',
    title: 'Tài liệu y tế',
    accent: 'text-[#B45309] bg-[#FFFBEB]',
    icon: BookOpen,
  },
  {
    view: 'settings',
    title: 'Cài đặt',
    accent: 'text-[#334155] bg-slate-100',
    icon: Settings,
  },
];

export function WebHeroSection({
  darkMode,
  pendingCount,
  onSelectView,
}: WebHeroSectionProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="flex flex-col">
      {/* Clean Hero Banner matching reference screenshot */}
      <section
        aria-label="Trang chủ SMART HEALTHCARE"
        className={`relative overflow-hidden border-b transition-colors ${
          darkMode
            ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-[#134E4A]/40 border-slate-800 text-white'
            : 'bg-gradient-to-br from-[#F0FDFA] via-white to-[#CCFBF1]/60 border-teal-100 text-[#0F172A]'
        }`}
      >
        <div
          aria-hidden="true"
          className="hidden lg:block absolute top-0 right-0 bottom-0 w-[44%] bg-gradient-to-br from-[#0F766E] to-[#134E4A]"
          style={{ clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 0% 100%)' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 flex flex-col gap-5">
              <h1
                className="font-extrabold leading-[1.15] tracking-tight"
                style={{
                  fontSize: 'clamp(1.9rem, 3.4vw, 3rem)',
                  textWrap: 'balance',
                }}
              >
                Chăm sóc sức khỏe thông minh &amp; nhắc 4 khay thuốc mỗi ngày
              </h1>

              <p
                className={`text-[1.06rem] leading-relaxed max-w-[52ch] ${
                  darkMode ? 'text-slate-300' : 'text-[#334155]'
                }`}
              >
                Không gian chăm sóc sức khỏe chủ động dành cho người cao tuổi và gia đình.
                Chọn từng mục chức năng bên dưới hoặc trên thanh menu để theo dõi, thiết lập
                lịch uống thuốc và tra cứu hỗ trợ khi cần thiết.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectView('trays')}
                  className="min-h-[52px] px-5 py-3 rounded-2xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-extrabold text-[1rem] shadow-lg shadow-[#0D9488]/25 flex items-center gap-2 transition-all whitespace-nowrap"
                >
                  <Pill className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span className="tabular-nums">
                    {pendingCount > 0
                      ? `Xem 4 khay thuốc (Còn ${pendingCount} cữ)`
                      : 'Đã uống đủ thuốc hôm nay'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectView('health-record')}
                  className={`min-h-[52px] px-5 py-3 rounded-2xl font-bold text-[1rem] border-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                    darkMode
                      ? 'bg-slate-800 border-[#2DD4BF] text-[#2DD4BF] hover:bg-slate-700'
                      : 'bg-white border-[#0D9488] text-[#0F766E] hover:bg-[#F0FDFA]'
                  }`}
                >
                  <ClipboardList className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>Mở Hồ sơ sức khỏe</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative rounded-[24px] overflow-hidden shadow-2xl border-4 border-white bg-[#0F766E] aspect-[16/10]">
                {!imgFailed ? (
                  <img
                    src={heroSeniorCareImg}
                    alt="Bác sĩ tư vấn chăm sóc sức khỏe cùng người cao tuổi"
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0D9488] to-[#134E4A] flex flex-col items-center justify-center text-white p-8 text-center gap-3">
                    <HeartPulse className="w-16 h-16 opacity-90" aria-hidden="true" />
                    <p className="text-[1.25rem] font-bold">
                      Hệ thống chăm sóc sức khỏe thông minh cho người cao tuổi
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Directory of Section Names (Click to enter each section) */}
      <section
        aria-label="Danh mục các chức năng trong hệ thống"
        className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8"
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-[1.25rem] font-extrabold tracking-tight">
            Các mục chức năng (Nhấn để mở)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DIRECTORY_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.view}
                type="button"
                onClick={() => onSelectView(card.view)}
                className={`rounded-[20px] p-5 border text-left shadow-sm hover:shadow-md hover:border-[#0D9488] transition-all flex items-center justify-between gap-3 group ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700 text-white'
                    : 'bg-white border-slate-200 text-[#0F172A]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.accent}`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="font-extrabold text-[1rem] leading-snug group-hover:text-[#0D9488]">
                    {card.title}
                  </span>
                </div>
                <ArrowRight
                  className="w-5 h-5 text-slate-400 group-hover:text-[#0D9488] shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
