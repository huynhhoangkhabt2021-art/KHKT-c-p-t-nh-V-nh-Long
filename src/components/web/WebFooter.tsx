import { HeartPulse, PhoneCall } from 'lucide-react';
import type { AppView, SosContact } from '../../types/health';

interface WebFooterProps {
  primaryContact?: SosContact;
  onSelectView: (view: AppView) => void;
}

export function WebFooter({ primaryContact, onSelectView }: WebFooterProps) {
  return (
    <footer className="bg-[#0F172A] text-slate-300 border-t border-slate-800 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-white font-extrabold text-[1.1rem]">
            <span className="w-9 h-9 rounded-xl bg-[#0D9488] text-white flex items-center justify-center">
              <HeartPulse className="w-5 h-5" aria-hidden="true" />
            </span>
            <span>SMART HEALTHCARE</span>
          </div>
          <p className="text-[0.9rem] text-slate-400 leading-relaxed">
            Hệ thống chăm sóc sức khỏe thông minh cho người cao tuổi theo thời gian thực.
          </p>
        </div>

        <div>
          <h3 className="text-white font-bold text-[1rem] mb-3">Điều hướng nhanh</h3>
          <ul className="flex flex-col gap-2 text-[0.9rem]">
            <li>
              <button
                type="button"
                onClick={() => onSelectView('home')}
                className="hover:text-[#2DD4BF] transition-colors text-left"
              >
                Trang chủ
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectView('sensors')}
                className="hover:text-[#2DD4BF] transition-colors text-left"
              >
                Hệ thống đo sức khỏe
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectView('trays')}
                className="hover:text-[#2DD4BF] transition-colors text-left"
              >
                4 Khay Thuốc
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectView('health-record')}
                className="hover:text-[#2DD4BF] transition-colors text-left"
              >
                Hồ sơ sức khỏe
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-bold text-[1rem] mb-3">Tư vấn &amp; Tài liệu</h3>
          <ul className="flex flex-col gap-2 text-[0.9rem]">
            <li>
              <button
                type="button"
                onClick={() => onSelectView('doctor-ai')}
                className="hover:text-[#2DD4BF] transition-colors text-left"
              >
                Bác sĩ AI
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectView('docs')}
                className="hover:text-[#2DD4BF] transition-colors text-left"
              >
                Tài liệu y tế chính thống
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectView('sos')}
                className="hover:text-[#2DD4BF] transition-colors text-left"
              >
                Mục SOS Khẩn cấp
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectView('settings')}
                className="hover:text-[#2DD4BF] transition-colors text-left"
              >
                Cài đặt hệ thống &amp; ESP32
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-bold text-[1rem] mb-3">Hỗ trợ khẩn cấp</h3>
          <div className="flex flex-col gap-2.5 text-[0.9rem]">
            <p className="flex items-center gap-2 text-white font-bold">
              <PhoneCall className="w-4 h-4 text-[#EF4444] shrink-0" aria-hidden="true" />
              <span>Cấp cứu Quốc gia: 115</span>
            </p>
            {primaryContact ? (
              <p className="tabular-nums text-slate-300">
                {primaryContact.name} ({primaryContact.relationship}):{' '}
                <strong className="text-white">{primaryContact.phone}</strong>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => onSelectView('sos')}
                className="text-teal-300 hover:text-teal-200 underline underline-offset-4 font-semibold text-left"
              >
                Thiết lập danh sách gọi nhanh SOS →
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 py-4 px-4 sm:px-6 text-center text-[0.84rem] text-slate-400">
        SMART HEALTHCARE · Hệ thống chăm sóc sức khỏe thông minh cho người cao tuổi theo thời gian thực
      </div>
    </footer>
  );
}
