import {
  Ambulance,
  Edit3,
  MessageSquareText,
  Phone,
  Plus,
  Satellite,
  Save,
  Stethoscope,
  User,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type {
  EmergencyMedicalCard,
  SmartHealthState,
  SosContact,
} from '../../types/health';
import {
  buildHealthAlertSmsBody,
  buildSmsHref,
  computeSosTargetCount,
  formatClockTime,
  resolveSosQuickSlots,
} from '../../utils/healthLogic';
import { speakVietnamese } from '../../utils/speech';

interface WebSosEmergencySectionProps {
  state: SmartHealthState;
  darkMode: boolean;
  onSaveSettings: (payload: {
    sosContacts?: SosContact[];
    emergencyCard?: EmergencyMedicalCard;
  }) => Promise<void>;
  onTriggerSosDispatch: (opts?: {
    contactName?: string;
    sentCount?: number;
  }) => Promise<void>;
}

const HOLD_DURATION_MS = 3000;

export function WebSosEmergencySection({
  state,
  darkMode,
  onSaveSettings,
  onTriggerSosDispatch,
}: WebSosEmergencySectionProps) {
  const slots = resolveSosQuickSlots(state.sosContacts);
  const totalTargets = computeSosTargetCount(state.sosContacts);
  const latestSos = state.sosEvents[0];

  // 3-second hold state
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [holdHint, setHoldHint] = useState<string | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Emergency Medical Card inline editing
  const [editingCard, setEditingCard] = useState(false);
  const [cardForm, setCardForm] = useState<EmergencyMedicalCard>(
    state.emergencyCard
  );
  const [savingCard, setSavingCard] = useState(false);

  // Quick-call contacts inline editing
  const [editingContacts, setEditingContacts] = useState(false);
  const [contact1Name, setContact1Name] = useState('');
  const [contact1Phone, setContact1Phone] = useState('');
  const [contact2Name, setContact2Name] = useState('');
  const [contact2Phone, setContact2Phone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [savingContacts, setSavingContacts] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  useEffect(() => {
    setCardForm(state.emergencyCard);
  }, [state.emergencyCard]);

  useEffect(() => {
    setContact1Name(slots.contact1?.name ?? '');
    setContact1Phone(slots.contact1?.phone ?? '');
    setContact2Name(slots.contact2?.name ?? '');
    setContact2Phone(slots.contact2?.phone ?? '');
    setDoctorName(slots.doctor?.name ?? '');
    setDoctorPhone(slots.doctor?.phone ?? '');
  }, [
    slots.contact1?.name,
    slots.contact1?.phone,
    slots.contact2?.name,
    slots.contact2?.phone,
    slots.doctor?.name,
    slots.doctor?.phone,
  ]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const finishHoldTrigger = async () => {
    setHolding(false);
    setHoldProgress(0);
    holdStartRef.current = null;
    await onTriggerSosDispatch({
      contactName: slots.contact1?.name || 'Toàn bộ danh sách SOS & 115',
      sentCount: totalTargets,
    });
    setStatusFeedback(
      `Đã kích hoạt SOS khẩn cấp! Đã gửi cảnh báo tới ${totalTargets}/${totalTargets} đầu mối.`
    );
    speakVietnamese(
      'Đã kích hoạt tín hiệu cấp cứu khẩn cấp SOS và thông báo tới người thân cùng 115.'
    );
  };

  const cancelHold = (wasTooShort: boolean) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (holding && wasTooShort && holdProgress < 100) {
      setHoldHint('Hãy nhấn và giữ đủ 3 giây để kích hoạt cuộc gọi khẩn cấp.');
    }
    setHolding(false);
    setHoldProgress(0);
    holdStartRef.current = null;
  };

  const startHold = () => {
    if (holding) return;
    setHoldHint(null);
    setHolding(true);
    holdStartRef.current = performance.now();

    const tick = (now: number) => {
      if (holdStartRef.current === null) return;
      const elapsed = now - holdStartRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setHoldProgress(pct);
      if (elapsed >= HOLD_DURATION_MS) {
        rafRef.current = null;
        void finishHoldTrigger();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCard(true);
    try {
      await onSaveSettings({ emergencyCard: cardForm });
      setEditingCard(false);
      setStatusFeedback('Đã lưu Thẻ thông tin y tế khẩn cấp.');
    } finally {
      setSavingCard(false);
    }
  };

  const handleSaveContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContacts(true);
    try {
      const nextContacts: SosContact[] = [];
      if (contact1Phone.trim()) {
        nextContacts.push({
          id: slots.contact1?.id || 'sos-slot-1',
          slot: 'contact1',
          name: contact1Name.trim() || 'Liên hệ 1',
          relationship: slots.contact1?.relationship || 'Người thân 1',
          phone: contact1Phone.trim(),
          priority: 1,
        });
      }
      if (contact2Phone.trim()) {
        nextContacts.push({
          id: slots.contact2?.id || 'sos-slot-2',
          slot: 'contact2',
          name: contact2Name.trim() || 'Liên hệ 2',
          relationship: slots.contact2?.relationship || 'Người thân 2',
          phone: contact2Phone.trim(),
          priority: 2,
        });
      }
      if (doctorPhone.trim()) {
        nextContacts.push({
          id: slots.doctor?.id || 'sos-slot-doctor',
          slot: 'doctor',
          name: doctorName.trim() || 'Bác sĩ',
          relationship: 'Bác sĩ phụ trách',
          phone: doctorPhone.trim(),
          priority: 3,
        });
      }
      await onSaveSettings({ sosContacts: nextContacts });
      setEditingContacts(false);
      setStatusFeedback('Đã lưu danh sách gọi nhanh 1 chạm.');
    } finally {
      setSavingContacts(false);
    }
  };

  const handleQuickDial = async (
    label: string,
    phone: string | undefined,
    is115 = false
  ) => {
    if (!is115 && (!phone || !phone.trim())) {
      setEditingContacts(true);
      setStatusFeedback(`Chưa có số cho ${label}. Vui lòng nhập số điện thoại bên dưới.`);
      return;
    }
    const dialTarget = is115 ? '115' : phone!.trim();
    await onTriggerSosDispatch({
      contactName: `${label} (${dialTarget})`,
      sentCount: 1,
    });
    setStatusFeedback(`Đang thực hiện gọi nhanh tới ${label}: ${dialTarget}.`);
    speakVietnamese(`Đang kết nối cuộc gọi tới ${label}.`);
    if (typeof window !== 'undefined') {
      window.location.href = `tel:${dialTarget}`;
    }
  };

  const remainingSec = Math.max(
    1,
    Math.ceil(((100 - holdProgress) / 100) * 3)
  );
  const ringCircumference = 2 * Math.PI * 96;
  const ringOffset = ringCircumference * (1 - holdProgress / 100);

  const sentCountDisplay =
    latestSos && latestSos.status === 'dispatched'
      ? latestSos.sentCount ?? totalTargets
      : 0;

  const statusTextDisplay = holding
    ? `Đang giữ kích hoạt khẩn cấp (còn ${remainingSec} giây)...`
    : statusFeedback
      ? statusFeedback
      : latestSos
        ? latestSos.status === 'dispatched'
          ? `Đã phát tín hiệu khẩn cấp lúc ${latestSos.timestamp} (${latestSos.contactName || 'SOS'})`
          : `Đã hủy tín hiệu SOS an toàn lúc ${latestSos.timestamp}`
        : 'Sẵn sàng bảo vệ — Chưa có cảnh báo khẩn cấp nào';

  const sectionBg = darkMode
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-[#F6EFE2] border-[#E7DEC8] text-[#1E293B]';
  const cardBg = darkMode
    ? 'bg-slate-800 border-slate-700 text-white'
    : 'bg-[#FBF8F1] border-[#E5DEC9] text-[#1E293B]';
  const inputBg = darkMode
    ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-400'
    : 'bg-white border-[#D6CEB8] text-[#0F172A] placeholder:text-slate-400';

  return (
    <section
      id="sos-khan-cap"
      aria-label="Mục SOS Khẩn cấp"
      className={`border-y py-12 transition-colors ${sectionBg}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col gap-9">
        {/* Centered Heading */}
        <h2 className="text-center text-[2rem] sm:text-[2.25rem] font-extrabold tracking-tight uppercase">
          MỤC SOS KHẨN CẤP
        </h2>

        {/* Top Row: Warning Notice | Glowing Hold-3s Red Circle | Emergency Medical Info Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Warning Copy */}
          <div className="lg:col-span-3 flex flex-col items-center lg:items-start text-center lg:text-left gap-2">
            <p className="text-[1.15rem] sm:text-[1.25rem] font-bold leading-snug uppercase tracking-wide">
              CHỈ SỬ DỤNG KHI THỰC SỰ CẦN THIẾT.
            </p>
            <p
              className={`text-[0.88rem] ${
                darkMode ? 'text-slate-300' : 'text-[#475569]'
              }`}
            >
              Nhấn giữ nút đỏ 3 giây để phát cảnh báo tới người thân &amp; 115.
            </p>
          </div>

          {/* Center Glowing Hold-to-SOS Button */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center gap-3">
            <div className="relative flex items-center justify-center">
              {/* Outer soft red glow matching reference */}
              <div
                aria-hidden="true"
                className={`absolute -inset-2 rounded-full blur-2xl transition-opacity ${
                  holding ? 'bg-[#EF4444]/75 opacity-100' : 'bg-[#EF4444]/50 opacity-90'
                }`}
              />

              {/* Circular Hold Progress Ring */}
              <svg
                width="224"
                height="224"
                viewBox="0 0 224 224"
                className="relative -rotate-90 pointer-events-none"
                aria-hidden="true"
              >
                <circle
                  cx="112"
                  cy="112"
                  r="96"
                  fill="none"
                  stroke="rgba(239, 68, 68, 0.35)"
                  strokeWidth="14"
                />
                <circle
                  cx="112"
                  cy="112"
                  r="96"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                />
              </svg>

              <button
                type="button"
                aria-label="Nhấn để gọi khẩn cấp, giữ 3 giây để kích hoạt"
                onPointerDown={startHold}
                onPointerUp={() => cancelHold(true)}
                onPointerLeave={() => cancelHold(false)}
                onPointerCancel={() => cancelHold(false)}
                onKeyDown={(e) => {
                  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                    e.preventDefault();
                    startHold();
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    cancelHold(true);
                  }
                }}
                className={`absolute w-[184px] h-[184px] rounded-full bg-gradient-to-b from-[#EF4444] to-[#B91C1C] hover:from-[#DC2626] hover:to-[#991B1B] text-white shadow-2xl flex flex-col items-center justify-center px-4 text-center select-none touch-none transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white ${
                  holding ? 'scale-95' : 'active:scale-95'
                }`}
              >
                <span className="text-[1.22rem] font-extrabold leading-tight uppercase">
                  {holding ? `ĐANG GIỮ (${remainingSec}s)` : 'NHẤN ĐỂ GỌI KHẨN CẤP'}
                </span>
                <span className="text-[0.82rem] font-semibold text-red-50 mt-1.5">
                  (Giữ 3 giây để kích hoạt)
                </span>
              </button>
            </div>

            {holdHint && (
              <p className="text-[0.88rem] font-bold text-[#DC2626] text-center">
                {holdHint}
              </p>
            )}
          </div>

          {/* Right Card: Emergency Medical Info Card */}
          <div className="lg:col-span-4">
            <div className={`rounded-[20px] border p-5 shadow-sm ${cardBg}`}>
              <div className="flex items-start justify-between gap-2 mb-3.5">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
                    <Plus className="w-6 h-6 stroke-[3]" aria-hidden="true" />
                  </span>
                  <h3 className="text-[1.02rem] font-extrabold uppercase leading-tight">
                    THẺ THÔNG TIN Y TẾ KHẨN CẤP
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCard((prev) => !prev)}
                  aria-label="Chỉnh sửa thẻ thông tin y tế khẩn cấp"
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[0.78rem] font-bold flex items-center gap-1 shrink-0 ${
                    darkMode
                      ? 'border-slate-600 bg-slate-700 text-slate-100'
                      : 'border-[#DDD3BC] bg-white text-[#334155] hover:bg-slate-50'
                  }`}
                >
                  {editingCard ? (
                    <>
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Đóng</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Sửa</span>
                    </>
                  )}
                </button>
              </div>

              {editingCard ? (
                <form
                  onSubmit={(e) => void handleSaveCard(e)}
                  className="flex flex-col gap-2.5 text-[0.9rem]"
                >
                  <label className="flex flex-col gap-1 font-semibold">
                    <span>Họ và tên:</span>
                    <input
                      type="text"
                      value={cardForm.fullName}
                      onChange={(e) =>
                        setCardForm({ ...cardForm, fullName: e.target.value })
                      }
                      placeholder="Nhập họ tên người cần chăm sóc"
                      className={`min-h-[38px] rounded-lg border px-2.5 ${inputBg}`}
                    />
                  </label>
                  <label className="flex flex-col gap-1 font-semibold">
                    <span>Nhóm máu:</span>
                    <input
                      type="text"
                      value={cardForm.bloodType}
                      onChange={(e) =>
                        setCardForm({ ...cardForm, bloodType: e.target.value })
                      }
                      placeholder="VD: O+, A+, B+..."
                      className={`min-h-[38px] rounded-lg border px-2.5 ${inputBg}`}
                    />
                  </label>
                  <label className="flex flex-col gap-1 font-semibold">
                    <span>Bệnh nền:</span>
                    <input
                      type="text"
                      value={cardForm.conditions}
                      onChange={(e) =>
                        setCardForm({ ...cardForm, conditions: e.target.value })
                      }
                      placeholder="VD: Tiểu đường, khớp..."
                      className={`min-h-[38px] rounded-lg border px-2.5 ${inputBg}`}
                    />
                  </label>
                  <label className="flex flex-col gap-1 font-semibold">
                    <span>Dị ứng thuốc:</span>
                    <input
                      type="text"
                      value={cardForm.allergies}
                      onChange={(e) =>
                        setCardForm({ ...cardForm, allergies: e.target.value })
                      }
                      placeholder="VD: Không / Penicillin..."
                      className={`min-h-[38px] rounded-lg border px-2.5 ${inputBg}`}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={savingCard}
                    className="min-h-[40px] rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold flex items-center justify-center gap-1.5 mt-1"
                  >
                    <Save className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{savingCard ? 'Đang lưu...' : 'Lưu thẻ thông tin'}</span>
                  </button>
                </form>
              ) : (
                <div className="flex flex-col gap-2.5 text-[0.95rem]">
                  <div className="flex items-baseline gap-2 border-b border-current/20 pb-1">
                    <span className="font-semibold shrink-0">Họ và tên:</span>
                    <span className="font-bold truncate">
                      {state.emergencyCard.fullName || 'Chưa cập nhật'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 border-b border-current/20 pb-1">
                    <span className="font-semibold shrink-0">Nhóm máu:</span>
                    <span className="font-bold truncate">
                      {state.emergencyCard.bloodType || 'Chưa cập nhật'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 border-b border-current/20 pb-1">
                    <span className="font-semibold shrink-0">Bệnh nền:</span>
                    <span className="font-bold truncate">
                      {state.emergencyCard.conditions || 'Chưa cập nhật'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 border-b border-current/20 pb-1">
                    <span className="font-semibold shrink-0">Dị ứng thuốc:</span>
                    <span className="font-bold truncate">
                      {state.emergencyCard.allergies || 'Không ghi nhận'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle Section: 1-Touch Quick Call List */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[1.05rem] sm:text-[1.15rem] font-extrabold uppercase tracking-wide">
              DANH SÁCH GỌI NHANH 1 CHẠM (NGƯỜI THÂN &amp; CẤP CỨU)
            </h3>
            <button
              type="button"
              onClick={() => setEditingContacts((prev) => !prev)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-[0.86rem] font-bold flex items-center gap-1.5 ${
                darkMode
                  ? 'border-slate-600 bg-slate-800 text-teal-300'
                  : 'border-[#D9CEB6] bg-white text-[#0F766E] hover:bg-teal-50'
              }`}
            >
              <Edit3 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {editingContacts ? 'Đóng cài đặt số' : 'Cài đặt số liên hệ nhanh'}
              </span>
            </button>
          </div>

          {editingContacts && (
            <form
              onSubmit={(e) => void handleSaveContacts(e)}
              className={`rounded-[20px] border p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 ${cardBg}`}
            >
              <div className="flex flex-col gap-2">
                <span className="font-extrabold text-[0.94rem] text-[#C2410C]">
                  Liên hệ 1 (Người thân)
                </span>
                <input
                  type="text"
                  value={contact1Name}
                  onChange={(e) => setContact1Name(e.target.value)}
                  placeholder="Tên liên hệ 1"
                  aria-label="Tên liên hệ 1"
                  className={`min-h-[42px] rounded-xl border px-3 text-[0.92rem] ${inputBg}`}
                />
                <input
                  type="tel"
                  value={contact1Phone}
                  onChange={(e) => setContact1Phone(e.target.value)}
                  placeholder="Số điện thoại liên hệ 1"
                  aria-label="Số điện thoại liên hệ 1"
                  className={`min-h-[42px] rounded-xl border px-3 text-[0.92rem] tabular-nums ${inputBg}`}
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-extrabold text-[0.94rem] text-[#C2410C]">
                  Liên hệ 2 (Người thân)
                </span>
                <input
                  type="text"
                  value={contact2Name}
                  onChange={(e) => setContact2Name(e.target.value)}
                  placeholder="Tên liên hệ 2"
                  aria-label="Tên liên hệ 2"
                  className={`min-h-[42px] rounded-xl border px-3 text-[0.92rem] ${inputBg}`}
                />
                <input
                  type="tel"
                  value={contact2Phone}
                  onChange={(e) => setContact2Phone(e.target.value)}
                  placeholder="Số điện thoại liên hệ 2"
                  aria-label="Số điện thoại liên hệ 2"
                  className={`min-h-[42px] rounded-xl border px-3 text-[0.92rem] tabular-nums ${inputBg}`}
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-extrabold text-[0.94rem] text-[#9A3412]">
                  Bác sĩ gia đình / phụ trách
                </span>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Tên bác sĩ"
                  aria-label="Tên bác sĩ"
                  className={`min-h-[42px] rounded-xl border px-3 text-[0.92rem] ${inputBg}`}
                />
                <input
                  type="tel"
                  value={doctorPhone}
                  onChange={(e) => setDoctorPhone(e.target.value)}
                  placeholder="Số điện thoại bác sĩ"
                  aria-label="Số điện thoại bác sĩ"
                  className={`min-h-[42px] rounded-xl border px-3 text-[0.92rem] tabular-nums ${inputBg}`}
                />
              </div>

              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={savingContacts}
                  className="min-h-[44px] px-6 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-[0.94rem] flex items-center gap-2"
                >
                  <Save className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{savingContacts ? 'Đang lưu...' : 'Lưu danh sách gọi nhanh'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 4 Quick Call Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Liên hệ 1 */}
            <div className={`rounded-[20px] border p-4 shadow-sm flex flex-col justify-between gap-4 ${cardBg}`}>
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-full bg-[#DBEAFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <User className="w-6 h-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-[1.02rem] truncate">
                    {slots.contact1?.name || 'Liên hệ 1'}
                  </p>
                  <p className="text-[0.86rem] opacity-80 border-b border-current/25 pb-0.5 tabular-nums truncate">
                    {slots.contact1?.phone || 'Chưa cài số'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  void handleQuickDial(
                    slots.contact1?.name || 'Liên hệ 1',
                    slots.contact1?.phone
                  )
                }
                className="min-h-[46px] w-full rounded-xl bg-[#D97724] hover:bg-[#C26114] text-white font-extrabold text-[0.95rem] flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>GỌI NGAY</span>
              </button>
            </div>

            {/* Card 2: Liên hệ 2 */}
            <div className={`rounded-[20px] border p-4 shadow-sm flex flex-col justify-between gap-4 ${cardBg}`}>
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-full bg-[#FCE7F3] text-[#BE185D] flex items-center justify-center shrink-0">
                  <UserRound className="w-6 h-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-[1.02rem] truncate">
                    {slots.contact2?.name || 'Liên hệ 2'}
                  </p>
                  <p className="text-[0.86rem] opacity-80 border-b border-current/25 pb-0.5 tabular-nums truncate">
                    {slots.contact2?.phone || 'Chưa cài số'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  void handleQuickDial(
                    slots.contact2?.name || 'Liên hệ 2',
                    slots.contact2?.phone
                  )
                }
                className="min-h-[46px] w-full rounded-xl bg-[#D97724] hover:bg-[#C26114] text-white font-extrabold text-[0.95rem] flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>GỌI NGAY</span>
              </button>
            </div>

            {/* Card 3: Cấp cứu y tế 115 */}
            <div className={`rounded-[20px] border p-4 shadow-sm flex flex-col justify-between gap-4 ${cardBg}`}>
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
                  <Ambulance className="w-6 h-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-[1.02rem] truncate">
                    Cấp cứu y tế 115
                  </p>
                  <p className="text-[0.84rem] opacity-75 tabular-nums">
                    Đường dây nóng Quốc gia
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleQuickDial('Cấp cứu y tế 115', '115', true)}
                className="min-h-[46px] w-full rounded-xl bg-[#C23B14] hover:bg-[#9F2E0D] text-white font-extrabold text-[0.98rem] flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <span>GỌI 115</span>
              </button>
            </div>

            {/* Card 4: Bác sĩ */}
            <div className={`rounded-[20px] border p-4 shadow-sm flex flex-col justify-between gap-4 ${cardBg}`}>
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-full bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center shrink-0">
                  <Stethoscope className="w-6 h-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-[1.02rem] truncate">
                    {slots.doctor?.name || 'Bác sĩ'}
                  </p>
                  <p className="text-[0.86rem] opacity-80 border-b border-current/25 pb-0.5 tabular-nums truncate">
                    {slots.doctor?.phone || 'Chưa cài số'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  void handleQuickDial(
                    slots.doctor?.name || 'Bác sĩ',
                    slots.doctor?.phone
                  )
                }
                className="min-h-[46px] w-full rounded-xl bg-[#A44816] hover:bg-[#853910] text-white font-extrabold text-[0.95rem] flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <span>GỌI NGAY</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Status Card matching Satellite status strip + Instant SMS */}
        <div
          role="status"
          className={`rounded-[20px] border p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cardBg}`}
        >
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-full bg-[#D1FAE5] text-[#047857] flex items-center justify-center shrink-0">
              <Satellite className="w-7 h-7" aria-hidden="true" />
            </span>
            <div className="flex-1 flex flex-col gap-1.5">
              <p className="text-[1.02rem] font-extrabold">
                TRẠNG THÁI:{' '}
                <span className="font-semibold opacity-90">{statusTextDisplay}</span>
              </p>
              <p className="text-[0.96rem] font-bold tabular-nums">
                Đã gửi: {sentCountDisplay}/{totalTargets}
              </p>
            </div>
          </div>

          <a
            href={buildSmsHref(
              state.sosContacts.map((c) => c.phone),
              buildHealthAlertSmsBody({
                patientName: state.emergencyCard.fullName,
                reason: 'CANH BAO KHAN CAP SOS',
                timestamp: formatClockTime(new Date()),
              })
            )}
            onClick={() =>
              void onTriggerSosDispatch({
                contactName: 'Tin nhắn SMS SOS người thân',
                sentCount: Math.max(1, state.sosContacts.length),
              })
            }
            className="min-h-[48px] px-5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-extrabold text-[0.94rem] flex items-center justify-center gap-2 shadow-sm whitespace-nowrap shrink-0"
          >
            <MessageSquareText className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>Gửi tin nhắn SMS khẩn cấp cho người thân</span>
          </a>
        </div>
      </div>
    </section>
  );
}
