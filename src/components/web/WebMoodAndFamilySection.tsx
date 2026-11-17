import {
  AlertTriangle,
  BellRing,
  Frown,
  HeartHandshake,
  Meh,
  MessageSquareText,
  Send,
  Smile,
} from 'lucide-react';
import { useState } from 'react';
import aboutFamilyCareImg from '../../assets/images/about_family_care_1794787692522.jpg';
import type { FeelingMood, SmartHealthState } from '../../types/health';
import { buildSmsHref } from '../../utils/healthLogic';

interface WebMoodAndFamilySectionProps {
  state: SmartHealthState;
  darkMode: boolean;
  onSendFeeling: (
    mood: FeelingMood | 'Ghi chú',
    note?: string
  ) => Promise<void>;
  onTriggerPoorHealthAlert: (reason: string, note?: string) => Promise<void>;
}

type InfoTab = 'mood' | 'activity';

export function WebMoodAndFamilySection({
  state,
  darkMode,
  onSendFeeling,
  onTriggerPoorHealthAlert,
}: WebMoodAndFamilySectionProps) {
  const [activeTab, setActiveTab] = useState<InfoTab>('mood');
  const [imgFailed, setImgFailed] = useState(false);
  const [selectedMood, setSelectedMood] = useState<FeelingMood | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [journalNote, setJournalNote] = useState('');
  const [sending, setSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const { feelingLogs, sosEvents, familyAlerts, sosContacts } = state;

  const handleQuickMood = async (mood: FeelingMood) => {
    if (sending) return;
    setSelectedMood(mood);
    setSending(true);
    try {
      await onSendFeeling(mood, moodNote.trim() || undefined);
      setFeedbackMsg(
        mood === 'Hơi mệt'
          ? 'Đã phát thông báo trên trang web và mở hộp thoại gửi tin nhắn SMS cho người thân!'
          : moodNote.trim()
            ? `Đã lưu cảm nhận "${mood}" kèm lời nhắn cho người thân.`
            : `Đã gửi trạng thái nhanh "${mood}" cho người thân.`
      );
      setMoodNote('');
    } finally {
      setSending(false);
    }
  };

  const handleReportPoorHealthSms = async () => {
    if (sending) return;
    setSending(true);
    try {
      const cleanNote = moodNote.trim();
      await onTriggerPoorHealthAlert(
        'Sức khỏe không tốt, cần người thân kiểm tra ngay',
        cleanNote || undefined
      );
      setFeedbackMsg(
        'Đã phát thông báo trên trang web và chuẩn bị tin nhắn SMS gửi tới người thân.'
      );
      setMoodNote('');
    } finally {
      setSending(false);
    }
  };

  const handleSaveMoodNoteOnly = async () => {
    const clean = moodNote.trim();
    if (!clean || sending) return;
    setSending(true);
    try {
      await onSendFeeling(selectedMood ?? 'Ghi chú', clean);
      setFeedbackMsg('Đã lưu cảm nhận tự viết của bác hôm nay.');
      setMoodNote('');
    } finally {
      setSending(false);
    }
  };

  const handleSaveJournalNote = async () => {
    const clean = journalNote.trim();
    if (!clean || sending) return;
    setSending(true);
    try {
      await onSendFeeling('Ghi chú', clean);
      setJournalNote('');
      setFeedbackMsg('Đã thêm ghi chú mới vào Nhật ký gia đình.');
    } finally {
      setSending(false);
    }
  };

  const cardSurface = darkMode
    ? 'bg-slate-900 border-slate-700 text-white'
    : 'bg-white border-slate-200/80 text-[#0F172A]';
  const inputSurface = darkMode
    ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-400'
    : 'bg-[#F8FAFC] border-slate-300 text-[#0F172A] placeholder:text-slate-500';

  const totalLogs = feelingLogs.length + sosEvents.length + familyAlerts.length;
  const contactPhones = sosContacts.map((c) => c.phone).filter(Boolean);

  return (
    <div className={`rounded-[24px] border shadow-sm p-6 lg:p-8 ${cardSurface}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-5">
          <div className="h-full min-h-[260px] rounded-[20px] overflow-hidden bg-[#F0FDFA] border border-teal-100">
            {!imgFailed ? (
              <img
                src={aboutFamilyCareImg}
                alt="Gia đình quan tâm chăm sóc sức khỏe người cao tuổi tại nhà"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-[#0F766E] gap-2">
                <HeartHandshake className="w-14 h-14" aria-hidden="true" />
                <p className="font-bold text-[1.1rem]">Kết nối gia đình chăm sóc an toàn</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
          <div>
            <h3 className="text-[1.55rem] font-extrabold leading-snug">
              Cảm Nhận Hôm Nay &amp; Nhật Ký Gia Đình
            </h3>

            <div
              role="tablist"
              aria-label="Chọn mục cảm nhận hôm nay hoặc nhật ký gia đình"
              className="flex flex-wrap gap-2 border-b border-slate-200/70 mt-4"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'mood'}
                onClick={() => setActiveTab('mood')}
                className={`min-h-[46px] px-4 py-2 text-[0.98rem] font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'mood'
                    ? 'border-[#0D9488] text-[#0D9488]'
                    : darkMode
                      ? 'border-transparent text-slate-400 hover:text-white'
                      : 'border-transparent text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Cảm nhận hôm nay
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'activity'}
                onClick={() => setActiveTab('activity')}
                className={`min-h-[46px] px-4 py-2 text-[0.98rem] font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'activity'
                    ? 'border-[#0D9488] text-[#0D9488]'
                    : darkMode
                      ? 'border-transparent text-slate-400 hover:text-white'
                      : 'border-transparent text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Nhật ký gia đình ({totalLogs})
              </button>
            </div>
          </div>

          {activeTab === 'mood' && (
            <div className="flex flex-col gap-4">
              <p className={`text-[0.96rem] ${darkMode ? 'text-slate-300' : 'text-[#334155]'}`}>
                Chọn mức cảm nhận nhanh hoặc tự viết tâm trạng, triệu chứng hôm nay vào khung trống bên dưới:
              </p>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => void handleQuickMood('Khỏe')}
                  disabled={sending}
                  className="min-h-[82px] rounded-2xl bg-[#F0FDF4] hover:bg-[#DCFCE7] border-2 border-[#16A34A]/30 text-[#15803D] p-3 flex flex-col items-center justify-center gap-1.5 font-bold text-[1rem] transition-all active:scale-[0.98]"
                >
                  <Smile className="w-7 h-7 shrink-0" aria-hidden="true" />
                  <span>Khỏe</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleQuickMood('Tạm ổn')}
                  disabled={sending}
                  className="min-h-[82px] rounded-2xl bg-[#EFF6FF] hover:bg-[#DBEAFE] border-2 border-[#0284C7]/30 text-[#0056B3] p-3 flex flex-col items-center justify-center gap-1.5 font-bold text-[1rem] transition-all active:scale-[0.98]"
                >
                  <Meh className="w-7 h-7 shrink-0" aria-hidden="true" />
                  <span>Tạm ổn</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleQuickMood('Hơi mệt')}
                  disabled={sending}
                  className="min-h-[82px] rounded-2xl bg-[#FFFBEB] hover:bg-[#FEF3C7] border-2 border-[#D97706]/30 text-[#B45309] p-3 flex flex-col items-center justify-center gap-1.5 font-bold text-[1rem] transition-all active:scale-[0.98]"
                >
                  <Frown className="w-7 h-7 shrink-0" aria-hidden="true" />
                  <span>Hơi mệt</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="senior-mood-note" className="text-[0.9rem] font-bold">
                  Khung ghi cảm nhận hôm nay của bác (để trống để tự viết):
                </label>
                <textarea
                  id="senior-mood-note"
                  rows={3}
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  placeholder="Viết cảm nhận hôm nay (ví dụ: Sáng nay hơi mệt, chóng mặt nhẹ, cần con kiểm tra...)"
                  className={`w-full rounded-2xl border p-3.5 text-[0.96rem] focus:outline-none focus:ring-4 focus:ring-[#0D9488]/25 focus:border-[#0D9488] ${inputSurface}`}
                />
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => void handleReportPoorHealthSms()}
                    className="min-h-[46px] px-4 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-extrabold text-[0.9rem] flex items-center gap-2 shadow-sm"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Sức khỏe không tốt — Gửi thông báo Web &amp; SMS người thân</span>
                  </button>

                  <button
                    type="button"
                    disabled={sending || !moodNote.trim()}
                    onClick={() => void handleSaveMoodNoteOnly()}
                    className="min-h-[46px] px-5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-slate-400 text-white font-bold text-[0.92rem] flex items-center gap-2"
                  >
                    <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Lưu cảm nhận tự viết</span>
                  </button>
                </div>
              </div>

              {feedbackMsg && (
                <p
                  role="status"
                  className={`rounded-xl px-4 py-3 text-[0.94rem] font-semibold ${
                    darkMode ? 'bg-slate-800 text-teal-300' : 'bg-[#F4F7FA] text-[#0F172A]'
                  }`}
                >
                  {feedbackMsg}
                </p>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="family-journal-note" className="text-[0.9rem] font-bold">
                  Viết ghi chú mới vào Nhật ký gia đình (chừa trống để người thân / bác tự ghi):
                </label>
                <textarea
                  id="family-journal-note"
                  rows={2}
                  value={journalNote}
                  onChange={(e) => setJournalNote(e.target.value)}
                  placeholder="Ví dụ: Con đã chuẩn bị đủ 4 khay thuốc và nấu cháo để sẵn trên bàn cho ba/mẹ..."
                  className={`w-full rounded-2xl border p-3 text-[0.95rem] focus:outline-none focus:ring-4 focus:ring-[#0D9488]/25 focus:border-[#0D9488] ${inputSurface}`}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={sending || !journalNote.trim()}
                    onClick={() => void handleSaveJournalNote()}
                    className="min-h-[42px] px-4 rounded-xl bg-[#0056B3] hover:bg-[#0284C7] disabled:bg-slate-400 text-white font-bold text-[0.9rem] flex items-center gap-2"
                  >
                    <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Lưu vào nhật ký gia đình</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                {totalLogs === 0 ? (
                  <p
                    className={`text-[0.94rem] rounded-xl p-4 ${
                      darkMode ? 'bg-slate-800 text-slate-300' : 'bg-[#F8FAFC] text-[#475569]'
                    }`}
                  >
                    Chưa có ghi chú nhật ký mới trong ngày. Hãy viết vào khung trống bên trên hoặc bấm nút cảm nhận để lưu lại cho gia đình theo dõi.
                  </p>
                ) : (
                  <>
                    {familyAlerts.map((al) => (
                      <div
                        key={al.id}
                        className="rounded-xl bg-[#FFFBEB] border border-amber-200 text-[#92400E] px-4 py-2.5 flex flex-col gap-1.5 text-[0.9rem]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-extrabold flex items-center gap-1.5">
                            <BellRing className="w-4 h-4 text-[#D97706] shrink-0" aria-hidden="true" />
                            <span>[Thông báo Web + SMS] {al.title}</span>
                          </span>
                          <span className="font-bold tabular-nums shrink-0">{al.timestamp}</span>
                        </div>
                        <p className="text-[0.86rem]">{al.message}</p>
                        <div>
                          <a
                            href={buildSmsHref(contactPhones, al.smsBody)}
                            className="inline-flex items-center gap-1 text-[0.82rem] font-extrabold text-[#B91C1C] hover:underline"
                          >
                            <MessageSquareText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>Gửi lại SMS cho người thân</span>
                          </a>
                        </div>
                      </div>
                    ))}
                    {feelingLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-xl bg-[#F0FDFA] text-[#0F172A] px-4 py-2.5 flex items-start justify-between gap-3 text-[0.94rem]"
                      >
                        <div className="min-w-0">
                          <span className="font-extrabold text-[#0F766E]">
                            {log.mood === 'Ghi chú' ? 'Ghi chú gia đình:' : `Cảm nhận: ${log.mood}`}
                          </span>
                          {log.note && (
                            <p className="text-[#1E293B] mt-0.5 leading-snug">{log.note}</p>
                          )}
                        </div>
                        <span className="text-[#0F766E] font-bold tabular-nums shrink-0">
                          {log.timestamp}
                        </span>
                      </div>
                    ))}
                    {sosEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-xl bg-[#FEF2F2] px-4 py-2.5 flex items-center justify-between text-[0.94rem]"
                      >
                        <span className="font-semibold text-[#DC2626]">
                          Tín hiệu SOS ({ev.contactName || '115'}):{' '}
                          {ev.status === 'dispatched'
                            ? 'Đã gọi khẩn cấp'
                            : 'Đã hủy an toàn'}
                        </span>
                        <span className="text-[#DC2626] font-bold tabular-nums">
                          {ev.timestamp}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
