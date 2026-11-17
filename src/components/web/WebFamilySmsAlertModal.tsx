import {
  AlertTriangle,
  BellRing,
  Check,
  Copy,
  MessageSquareText,
  Phone,
  Plus,
  Send,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { FamilyHealthAlert, SosContact } from '../../types/health';
import { buildSmsHref } from '../../utils/healthLogic';

interface WebFamilySmsAlertModalProps {
  alert: FamilyHealthAlert;
  contacts: SosContact[];
  darkMode: boolean;
  onClose: () => void;
  onAddContact: (name: string, phone: string) => Promise<void>;
}

export function WebFamilySmsAlertModal({
  alert,
  contacts,
  darkMode,
  onClose,
  onAddContact,
}: WebFamilySmsAlertModalProps) {
  const [copied, setCopied] = useState(false);
  const [showAddForm, setShowAddForm] = useState(contacts.length === 0);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const phones = contacts.map((c) => c.phone).filter((p) => p.trim().length > 0);
  const groupSmsHref = buildSmsHref(phones, alert.smsBody);

  const handleCopySms = async () => {
    try {
      await navigator.clipboard.writeText(alert.smsBody);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  const handleSaveQuickContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newPhone.trim();
    if (!cleanPhone) {
      setContactError('Vui lòng nhập số điện thoại người thân nhận tin nhắn SMS.');
      return;
    }
    setContactError(null);
    setSavingContact(true);
    try {
      await onAddContact(newName.trim() || 'Người thân', cleanPhone);
      setNewName('');
      setNewPhone('');
      setShowAddForm(false);
    } finally {
      setSavingContact(false);
    }
  };

  const modalSurface = darkMode
    ? 'bg-slate-900 border-slate-700 text-white'
    : 'bg-white border-slate-200 text-[#0F172A]';
  const inputSurface = darkMode
    ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-400'
    : 'bg-[#F8FAFC] border-slate-300 text-[#0F172A] placeholder:text-slate-400';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Thông báo khẩn trên web và gửi tin nhắn SMS cho người thân"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-2xl rounded-[24px] border shadow-2xl p-6 sm:p-7 my-auto flex flex-col gap-5 max-h-[92vh] overflow-y-auto ${modalSurface}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-4">
          <div className="flex items-start gap-3">
            <span
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                alert.severity === 'critical'
                  ? 'bg-[#FEE2E2] text-[#DC2626]'
                  : 'bg-[#FEF3C7] text-[#D97706]'
              }`}
            >
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.82rem] font-extrabold uppercase tracking-wide text-[#DC2626]">
                Cảnh báo sức khỏe &amp; Liên hệ người thân
              </p>
              <h3 className="text-[1.32rem] font-extrabold leading-snug">
                {alert.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại gửi SMS người thân"
            className="min-w-[42px] min-h-[42px] rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-500 shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Channel 1: Web Notification Status */}
        <div className="rounded-2xl bg-[#ECFDF5] border border-emerald-200 p-4 text-[#065F46] flex items-start gap-3">
          <BellRing className="w-5 h-5 shrink-0 mt-0.5 text-[#059669]" aria-hidden="true" />
          <div className="text-[0.92rem]">
            <p className="font-extrabold">
              1. Đã phát Thông báo trên trang web (Web Notification) lúc {alert.timestamp}
            </p>
            <p className="mt-0.5 text-[#047857]">
              {alert.message} — Đã ghim lên thanh cảnh báo đầu trang và lưu vào Nhật ký gia đình.
            </p>
          </div>
        </div>

        {/* Channel 2: SMS Dispatch to Relatives */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-extrabold text-[1rem] flex items-center gap-2 text-[#0056B3] dark:text-sky-300">
              <MessageSquareText className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>2. Gửi tin nhắn SMS cho người thân</span>
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="min-h-[36px] px-3 rounded-xl border border-[#0D9488] text-[#0D9488] font-bold text-[0.84rem] flex items-center gap-1 hover:bg-teal-50"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{showAddForm ? 'Ẩn thêm số' : 'Thêm số nhận SMS'}</span>
            </button>
          </div>

          {showAddForm && (
            <form
              onSubmit={(e) => void handleSaveQuickContact(e)}
              className={`rounded-2xl border p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-[#F8FAFC] border-slate-200'
              }`}
            >
              <div className="sm:col-span-4">
                <label className="block text-[0.82rem] font-bold mb-1">
                  Tên người thân
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="VD: Con gái Lan"
                  className={`w-full min-h-[40px] rounded-xl border px-3 text-[0.9rem] ${inputSurface}`}
                />
              </div>
              <div className="sm:col-span-5">
                <label className="block text-[0.82rem] font-bold mb-1">
                  Số điện thoại nhận SMS *
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="VD: 0912345678"
                  className={`w-full min-h-[40px] rounded-xl border px-3 text-[0.9rem] tabular-nums ${inputSurface}`}
                />
              </div>
              <div className="sm:col-span-3 flex items-end">
                <button
                  type="submit"
                  disabled={savingContact}
                  className="w-full min-h-[40px] rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-[0.88rem]"
                >
                  {savingContact ? 'Đang lưu...' : 'Lưu số'}
                </button>
              </div>
              {contactError && (
                <p className="sm:col-span-12 text-[0.84rem] font-bold text-[#DC2626]">
                  {contactError}
                </p>
              )}
            </form>
          )}

          {/* Exact SMS Text Preview */}
          <div
            className={`rounded-2xl border p-4 text-[0.9rem] ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-[#FFFBEB] border-amber-200 text-[#1E293B]'
            }`}
          >
            <p className="text-[0.8rem] font-extrabold uppercase tracking-wide opacity-75 mb-1">
              Nội dung tin nhắn SMS sẽ gửi:
            </p>
            <p className="font-mono text-[0.88rem] leading-relaxed break-words">
              {alert.smsBody}
            </p>
          </div>

          {/* Target Contacts Quick Individual SMS Buttons */}
          {contacts.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-[0.86rem] font-bold opacity-80">
                Chọn người thân để mở ứng dụng Tin nhắn (SMS) gửi ngay:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {contacts.map((c) => (
                  <a
                    key={c.id}
                    href={buildSmsHref([c.phone], alert.smsBody)}
                    className="min-h-[52px] px-4 py-2.5 rounded-xl bg-[#0056B3] hover:bg-[#0284C7] text-white font-bold text-[0.92rem] flex items-center justify-between gap-2.5 shadow-sm transition-colors"
                  >
                    <div className="min-w-0 text-left">
                      <p className="font-extrabold leading-tight truncate">
                        Gửi SMS: {c.name}
                      </p>
                      <p className="text-[0.84rem] text-sky-100 tabular-nums leading-tight mt-0.5">
                        {c.phone}
                      </p>
                    </div>
                    <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[0.88rem] font-semibold text-[#B45309]">
              Chưa cài số điện thoại người thân nào. Bạn có thể thêm số ở khung trên hoặc bấm nút bên dưới để chọn người nhận trực tiếp trong ứng dụng Tin nhắn.
            </p>
          )}

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href={groupSmsHref}
              className="flex-1 min-w-[230px] min-h-[50px] px-5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-extrabold text-[0.96rem] flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <MessageSquareText className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>
                {phones.length > 0
                  ? `Mở Tin nhắn (SMS) gửi tới ${phones.length} người thân`
                  : 'Mở ứng dụng Tin nhắn (SMS) gửi ngay'}
              </span>
            </a>

            {phones[0] && (
              <a
                href={`tel:${phones[0]}`}
                className="min-h-[50px] px-4 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-[0.92rem] flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Gọi điện ngay</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => void handleCopySms()}
              className={`min-h-[50px] px-4 rounded-xl border font-bold text-[0.9rem] flex items-center justify-center gap-2 ${
                darkMode
                  ? 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'border-slate-300 bg-slate-100 text-[#1E293B] hover:bg-slate-200'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0" aria-hidden="true" />
                  <span>Đã sao chép SMS</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Sao chép nội dung SMS</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
