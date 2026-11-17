import {
  AlertTriangle,
  CheckCircle2,
  MessageSquareText,
  PhoneCall,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SosContact } from '../types/health';
import {
  buildHealthAlertSmsBody,
  buildSmsHref,
  formatClockTime,
} from '../utils/healthLogic';
import { speakVietnamese, stopSpeaking } from '../utils/speech';

interface SosOverlayProps {
  contacts: SosContact[];
  onCancel: () => void;
  onDispatch: () => void;
}

export function SosOverlay({
  contacts,
  onCancel,
  onDispatch,
}: SosOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [dispatched, setDispatched] = useState(false);

  const primaryContact = contacts[0];
  const smsHref = buildSmsHref(
    contacts.map((c) => c.phone),
    buildHealthAlertSmsBody({
      reason: 'CANH BAO KHAN CAP SOS',
      timestamp: formatClockTime(new Date()),
    })
  );

  useEffect(() => {
    speakVietnamese(
      'Đang mở chế độ cấp cứu SOS. Nếu bấm nhầm, bác hãy chạm vào nút trắng phía dưới để hủy bỏ.'
    );
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (dispatched) return;
    if (secondsLeft <= 0) {
      setDispatched(true);
      onDispatch();
      speakVietnamese('Đang kết nối khẩn cấp tới người thân và tổng đài 115.');
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft, dispatched, onDispatch]);

  const handleCallNow = () => {
    setDispatched(true);
    onDispatch();
    speakVietnamese('Đang gọi ngay cho người thân và tổng đài cấp cứu 115.');
  };

  if (dispatched) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Đã phát tín hiệu cấp cứu SOS"
        className="fixed inset-0 z-50 bg-[#7F1D1D] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-[440px] bg-white rounded-[24px] p-6 shadow-2xl flex flex-col gap-5 text-center">
          <div className="w-20 h-20 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center mx-auto">
            <PhoneCall className="w-11 h-11" aria-hidden="true" />
          </div>
          <h2 className="text-[26px] font-extrabold text-[#DC2626] leading-tight">
            ĐÃ GỬI TÍN HIỆU CẤP CỨU
          </h2>
          <p className="text-[19px] text-[#0F172A] leading-relaxed">
            Hệ thống đã báo khẩn cấp trên trang web tới{' '}
            <strong className="font-bold">
              {primaryContact
                ? `${primaryContact.name} (${primaryContact.phone})`
                : 'Người thân'}
            </strong>{' '}
            và sẵn sàng gửi SMS / gọi 115.
          </p>

          <div className="flex flex-col gap-3.5 mt-2">
            {primaryContact && (
              <a
                href={`tel:${primaryContact.phone}`}
                className="min-h-[64px] w-full rounded-[20px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[19px] font-bold flex items-center justify-center gap-3 shadow-md"
              >
                <PhoneCall className="w-6 h-6 shrink-0" aria-hidden="true" />
                <span>Gọi {primaryContact.name} ({primaryContact.phone})</span>
              </a>
            )}
            <a
              href={smsHref}
              className="min-h-[64px] w-full rounded-[20px] bg-[#D97706] hover:bg-[#B45309] text-white text-[19px] font-bold flex items-center justify-center gap-3 shadow-md"
            >
              <MessageSquareText className="w-6 h-6 shrink-0" aria-hidden="true" />
              <span>Gửi tin nhắn SMS cho người thân</span>
            </a>
            <a
              href="tel:115"
              className="min-h-[64px] w-full rounded-[20px] bg-[#0056B3] hover:bg-[#0284C7] text-white text-[19px] font-bold flex items-center justify-center gap-3 shadow-md"
            >
              <PhoneCall className="w-6 h-6 shrink-0" aria-hidden="true" />
              <span>Gọi Tổng đài Cấp cứu 115</span>
            </a>
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[58px] w-full rounded-[20px] bg-[#16A34A] hover:bg-[#15803D] text-white text-[19px] font-bold flex items-center justify-center gap-2.5 mt-1"
            >
              <CheckCircle2 className="w-6 h-6 shrink-0" aria-hidden="true" />
              <span>Tôi đã an toàn (Đóng)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Màn hình xác nhận cấp cứu SOS"
      className="fixed inset-0 z-50 bg-[#991B1B] flex items-center justify-center p-4"
    >
      <div className="w-full max-w-[440px] flex flex-col gap-5">
        <div className="text-center text-white px-2">
          <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-10 h-10 text-white" aria-hidden="true" />
          </div>
          <p className="text-[22px] font-bold leading-snug">
            Tự động gọi cấp cứu sau{' '}
            <span className="text-[34px] font-extrabold tabular-nums underline underline-offset-4">
              {secondsLeft}
            </span>{' '}
            giây
          </p>
        </div>

        <button
          type="button"
          onClick={handleCallNow}
          className="min-h-[120px] w-full rounded-[24px] bg-[#DC2626] border-4 border-white text-white px-6 py-5 shadow-2xl hover:bg-[#B91C1C] active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
        >
          <PhoneCall className="w-10 h-10 shrink-0" aria-hidden="true" />
          <span className="text-[22px] font-extrabold leading-tight text-center">
            GỌI NGAY CHO NGƯỜI THÂN &amp; 115
          </span>
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="min-h-[104px] w-full rounded-[24px] bg-white text-[#0F172A] px-6 py-5 shadow-xl hover:bg-slate-100 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
        >
          <X className="w-9 h-9 text-[#0F172A] shrink-0" aria-hidden="true" />
          <span className="text-[21px] font-extrabold leading-tight text-center">
            TÔI BẤM NHẦM (HỦY BỎ)
          </span>
        </button>
      </div>
    </div>
  );
}
