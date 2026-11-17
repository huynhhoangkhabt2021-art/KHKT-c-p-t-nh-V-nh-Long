import {
  BellRing,
  CheckCircle2,
  Clock,
  Cpu,
  Lightbulb,
  Lock,
  Pill,
  Plus,
  Radio,
  RotateCcw,
  Save,
  Settings,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  DayPeriod,
  MedicationDose,
  SmartHealthState,
} from '../../types/health';
import {
  DAY_PERIODS,
  getTrayNumberForPeriod,
  groupDosesByPeriod,
} from '../../utils/healthLogic';

interface WebMedicationFourTraysSectionProps {
  state: SmartHealthState;
  darkMode: boolean;
  onTakeDose: (doseId: string) => Promise<void>;
  onTriggerAlarm: (doseId: string) => Promise<void>;
  onIrCleared: (doseId: string) => Promise<void>;
  onSaveDoses: (doses: MedicationDose[]) => Promise<void>;
  onResetDoses: () => Promise<void>;
  onOpenSettings: () => void;
}

const PRE_MEAL_QUICK_NOTES = [
  'Ăn no trước khi uống thuốc',
  'Uống trước ăn 30 phút',
  'Đo đường huyết trước khi uống',
  'Uống với nhiều nước ấm',
];

export function WebMedicationFourTraysSection({
  state,
  darkMode,
  onTakeDose,
  onTriggerAlarm,
  onIrCleared,
  onSaveDoses,
  onResetDoses,
  onOpenSettings,
}: WebMedicationFourTraysSectionProps) {
  const [editableDoses, setEditableDoses] = useState<MedicationDose[]>(state.doses);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setEditableDoses(state.doses);
  }, [state.doses]);

  const grouped = groupDosesByPeriod(editableDoses);
  const totalCount = editableDoses.length;
  const takenCount = editableDoses.filter((d) => d.taken).length;
  const activeAlarmCount = editableDoses.filter((d) => d.alarmActive).length;

  const updateDoseField = (
    id: string,
    field: keyof MedicationDose,
    value: string | number
  ) => {
    setEditableDoses((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleAddPackInPeriod = (period: DayPeriod) => {
    const trayNumber = getTrayNumberForPeriod(period);
    const defaultTimes: Record<DayPeriod, string> = {
      Sáng: '08:30',
      Trưa: '13:00',
      Chiều: '18:00',
      Tối: '21:15',
    };
    const newPack: MedicationDose = {
      id: `tray-${trayNumber}-${Date.now()}`,
      trayNumber,
      period,
      time: defaultTimes[period],
      medicineName: `Túm thuốc bổ sung (${period})`,
      dosageNote: '1 túi theo đơn',
      preMealNote: 'Ăn no trước khi uống thuốc',
      servoAngle: (trayNumber - 1) * 45,
      taken: false,
      alarmActive: false,
    };
    setEditableDoses((prev) => [...prev, newPack]);
    setNotice(
      `Đã thêm một lịch/túm thuốc mới vào Khay ${trayNumber} · Buổi ${period}. Hãy chỉnh giờ và bấm "Lưu toàn bộ lịch 4 khay".`
    );
  };

  const handleRemovePack = (doseId: string, period: DayPeriod) => {
    const countInPeriod = editableDoses.filter((d) => d.period === period).length;
    if (countInPeriod <= 1) return;
    setEditableDoses((prev) => prev.filter((d) => d.id !== doseId));
    setNotice('Đã xóa túm thuốc khỏi lịch. Bấm "Lưu toàn bộ lịch 4 khay" để xác nhận.');
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await onSaveDoses(editableDoses);
      setNotice(
        'Đã lưu lịch giờ đẩy khay & ghi chú trước khi uống cho cả 4 khay thuốc!'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (
    doseId: string,
    fn: (id: string) => Promise<void>
  ) => {
    if (busyId) return;
    setBusyId(doseId);
    try {
      await fn(doseId);
    } finally {
      setBusyId(null);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await onResetDoses();
      setNotice('Đã đặt lại trạng thái 4 khay thuốc cho ngày mới.');
    } finally {
      setResetting(false);
    }
  };

  const cardSurface = darkMode
    ? 'bg-slate-900 border-slate-700 text-white'
    : 'bg-white border-slate-200 text-[#0F172A]';
  const subCardSurface = darkMode
    ? 'bg-slate-800/80 border-slate-700 text-white'
    : 'bg-[#F8FAFC] border-slate-200 text-[#0F172A]';
  const inputSurface = darkMode
    ? 'bg-slate-900 border-slate-600 text-white'
    : 'bg-white border-slate-300 text-[#0F172A]';

  return (
    <section
      id="khay-thuoc"
      aria-label="Quản lý 4 khay thuốc thông minh"
      className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-6"
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.9rem] font-bold text-[#0D9488] flex items-center gap-1.5">
            <Pill className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              4 Khay (Sáng · Trưa · Chiều · Tối) — Tự đẩy khay + Đèn LED + Loa + Cảm biến hồng ngoại
            </span>
          </p>
          <h2 className="text-[1.85rem] font-extrabold tracking-tight">
            4 Khay Thuốc Thông Minh ({takenCount}/{totalCount} lịch đã lấy thuốc)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleSaveAll()}
            disabled={saving}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-[0.92rem] flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <Save className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{saving ? 'Đang lưu...' : 'Lưu toàn bộ lịch 4 khay'}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={resetting}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-[0.88rem] font-bold flex items-center gap-1.5 whitespace-nowrap ${
              darkMode
                ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-[#334155] hover:bg-slate-200'
            }`}
          >
            <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{resetting ? 'Đang đặt lại...' : 'Đặt lại ngày mới'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-[0.88rem] font-bold flex items-center gap-1.5 whitespace-nowrap ${
              darkMode
                ? 'bg-slate-800 border-slate-600 text-teal-300 hover:bg-slate-700'
                : 'bg-[#F0FDFA] border-teal-200 text-[#0F766E] hover:bg-teal-50'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Cài đặt mạch ESP32</span>
          </button>
        </div>
      </div>

      {/* Hardware Flow Explanation Banner */}
      <div
        className={`rounded-2xl border p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[0.9rem] ${
          darkMode
            ? 'bg-slate-900 border-slate-700 text-slate-200'
            : 'bg-[#F0FDFA] border-teal-200 text-[#134E4A]'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <Clock className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>1. Đúng giờ đã cài:</strong> Mạch tự đẩy khay thuốc theo từng khung giờ trong buổi (có thể thêm nhiều túm thuốc trong cùng 1 buổi).
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <Lightbulb className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>2. Đèn LED &amp; Âm thanh:</strong> Đèn LED sáng và loa phát liên tục <em>&ldquo;Đã đến giờ uống thuốc&rdquo;</em> để nhắc người cao tuổi.
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <Radio className="w-5 h-5 text-[#0056B3] shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>3. Cảm biến hồng ngoại:</strong> Khi bác lấy khay thuốc đi, cảm biến hồng ngoại báo về web để tắt đèn LED, dừng loa và khóa hoàn tất.
          </span>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-2xl bg-[#F0FDF4] border border-[#16A34A]/35 px-4 py-3 text-[0.95rem] font-bold text-[#15803D]"
        >
          {notice}
        </div>
      )}

      {activeAlarmCount > 0 && (
        <div
          role="alert"
          className="rounded-2xl bg-[#FFFBEB] border-2 border-[#D97706] px-5 py-4 text-[#92400E] flex flex-wrap items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3 font-extrabold text-[1rem]">
            <span className="w-4 h-4 rounded-full bg-[#DC2626] animate-ping shrink-0" />
            <span>
              Đèn LED đang sáng &amp; Âm thanh nhắc &ldquo;Đã đến giờ uống thuốc&rdquo; đang phát liên tục chờ cảm biến hồng ngoại xác nhận đã lấy thuốc!
            </span>
          </div>
        </div>
      )}

      {/* 4 Tray Panels (Sáng, Trưa, Chiều, Tối) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {DAY_PERIODS.map((period) => {
          const trayNumber = getTrayNumberForPeriod(period);
          const packs = grouped[period];

          return (
            <section
              key={period}
              aria-label={`Khay ${trayNumber} - Buổi ${period}`}
              className={`rounded-[24px] border p-5 sm:p-6 shadow-sm flex flex-col gap-4 ${cardSurface}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-xl bg-[#0D9488] text-white font-extrabold text-[0.9rem]">
                    Khay {trayNumber} · Buổi {period}
                  </span>
                  <span className="text-[0.86rem] font-bold opacity-75">
                    ({packs.length} lịch / túm thuốc)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddPackInPeriod(period)}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#0284C7]/30 text-[#0056B3] font-bold text-[0.84rem] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Thêm lịch / túm thuốc</span>
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {packs.map((dose, idx) => {
                  const isBusy = busyId === dose.id;
                  const canDelete = packs.length > 1;
                  return (
                    <article
                      key={dose.id}
                      className={`rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all ${
                        dose.alarmActive
                          ? 'bg-[#FFFBEB] border-[#D97706] text-[#0F172A]'
                          : dose.taken
                            ? darkMode
                              ? 'bg-[#052E16]/40 border-[#16A34A]/50'
                              : 'bg-[#F0FDF4] border-[#16A34A]/40'
                            : subCardSurface
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-extrabold text-[0.95rem] text-[#0056B3] dark:text-sky-300">
                          Lịch #{idx + 1} · Khay {trayNumber}
                        </span>

                        <div className="flex items-center gap-2">
                          {dose.alarmActive && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#DC2626] text-white text-[0.78rem] font-extrabold flex items-center gap-1.5 animate-pulse">
                              <Volume2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>LED SÁNG · ĐANG PHÁT NHẮC</span>
                            </span>
                          )}
                          {dose.taken && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#16A34A] text-white text-[0.78rem] font-extrabold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>Đã lấy lúc {dose.takenAt || 'xong'}</span>
                            </span>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleRemovePack(dose.id, period)}
                              aria-label={`Xóa lịch ${dose.medicineName}`}
                              className="min-w-[34px] min-h-[34px] rounded-lg border border-red-200 bg-white text-[#DC2626] hover:bg-red-50 flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Time & Servo Angle + Full-width Medicine Pack Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label
                            htmlFor={`time-${dose.id}`}
                            className="block text-[0.78rem] font-bold opacity-80 mb-1"
                          >
                            Giờ đẩy khay ra
                          </label>
                          <input
                            id={`time-${dose.id}`}
                            type="time"
                            value={dose.time}
                            onChange={(e) =>
                              updateDoseField(dose.id, 'time', e.target.value)
                            }
                            className={`w-full min-h-[42px] rounded-xl border px-2.5 text-[0.95rem] font-bold tabular-nums ${inputSurface}`}
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`angle-${dose.id}`}
                            className="block text-[0.78rem] font-bold opacity-80 mb-1"
                          >
                            Góc Servo (°)
                          </label>
                          <input
                            id={`angle-${dose.id}`}
                            type="number"
                            min={0}
                            max={180}
                            value={dose.servoAngle}
                            onChange={(e) =>
                              updateDoseField(
                                dose.id,
                                'servoAngle',
                                Number(e.target.value)
                              )
                            }
                            className={`w-full min-h-[42px] rounded-xl border px-2.5 text-[0.92rem] tabular-nums ${inputSurface}`}
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor={`med-${dose.id}`}
                          className="block text-[0.78rem] font-bold opacity-80 mb-1"
                        >
                          Tên túm thuốc / bệnh
                        </label>
                        <input
                          id={`med-${dose.id}`}
                          type="text"
                          value={dose.medicineName}
                          onChange={(e) =>
                            updateDoseField(dose.id, 'medicineName', e.target.value)
                          }
                          placeholder="VD: Thuốc huyết áp + Bảo vệ dạ dày"
                          className={`w-full min-h-[42px] rounded-xl border px-3 text-[0.94rem] font-semibold ${inputSurface}`}
                        />
                      </div>

                      {/* Pre-meal / Important Notes before taking medicine */}
                      <div>
                        <label
                          htmlFor={`note-${dose.id}`}
                          className="block text-[0.8rem] font-extrabold text-[#B45309] dark:text-amber-300 mb-1"
                        >
                          Lưu ý trước khi uống thuốc (ăn no / trước ăn / đo chỉ số...):
                        </label>
                        <input
                          id={`note-${dose.id}`}
                          type="text"
                          value={dose.preMealNote}
                          onChange={(e) =>
                            updateDoseField(dose.id, 'preMealNote', e.target.value)
                          }
                          placeholder="Ví dụ: Cần ăn no trước khi uống thuốc này..."
                          className={`w-full min-h-[42px] rounded-xl border px-3 text-[0.92rem] ${inputSurface}`}
                        />
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {PRE_MEAL_QUICK_NOTES.map((quick) => (
                            <button
                              key={quick}
                              type="button"
                              onClick={() =>
                                updateDoseField(dose.id, 'preMealNote', quick)
                              }
                              className={`px-2.5 py-1 rounded-lg text-[0.76rem] font-semibold border transition-colors ${
                                dose.preMealNote === quick
                                  ? 'bg-[#0D9488] text-white border-[#0D9488]'
                                  : darkMode
                                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-[#0D9488]'
                                    : 'bg-white border-slate-200 text-[#475569] hover:border-[#0D9488]'
                              }`}
                            >
                              {quick}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons for Tray Hardware Simulation & IR Obstacle Clearance */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {dose.taken ? (
                          <button
                            type="button"
                            disabled
                            aria-disabled="true"
                            className="min-h-[44px] flex-1 rounded-xl bg-[#16A34A] text-white px-3 py-2 font-bold text-[0.9rem] flex items-center justify-center gap-2 cursor-not-allowed opacity-95"
                          >
                            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>
                              Cảm biến hồng ngoại đã xác nhận lấy thuốc ({dose.takenAt || 'xong'})
                            </span>
                            <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                          </button>
                        ) : dose.alarmActive ? (
                          <button
                            type="button"
                            onClick={() => void handleAction(dose.id, onIrCleared)}
                            disabled={isBusy}
                            className="min-h-[46px] flex-1 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white px-4 py-2 font-extrabold text-[0.94rem] flex items-center justify-center gap-2 shadow-md"
                          >
                            <Radio className="w-5 h-5 shrink-0" aria-hidden="true" />
                            <span>
                              {isBusy
                                ? 'Đang tắt LED & Loa...'
                                : 'Cảm biến hồng ngoại: Đã lấy thuốc (Tắt LED & Loa)'}
                            </span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleAction(dose.id, onTriggerAlarm)}
                              disabled={isBusy}
                              className="min-h-[44px] flex-1 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white px-3 py-2 font-bold text-[0.9rem] flex items-center justify-center gap-2"
                            >
                              <BellRing className="w-4 h-4 shrink-0" aria-hidden="true" />
                              <span>Đẩy khay &amp; Báo LED/Loa ngay</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleAction(dose.id, onTakeDose)}
                              disabled={isBusy}
                              className="min-h-[44px] rounded-xl bg-[#0056B3] hover:bg-[#0284C7] text-white px-4 py-2 font-bold text-[0.9rem] flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                              <span>Đánh dấu đã uống</span>
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Live ESP32 Command Queue */}
      {state.pendingEsp32Commands.length > 0 && (
        <div
          role="status"
          className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 ${
            darkMode
              ? 'bg-slate-800 border-teal-700 text-teal-200'
              : 'bg-[#F0FDFA] border-teal-200 text-[#0F766E]'
          }`}
        >
          <div className="flex items-center gap-2.5 text-[0.92rem] font-bold">
            <Cpu className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>
              Tín hiệu ESP32 gần nhất:{' '}
              {state.pendingEsp32Commands
                .slice(0, 3)
                .map((c) =>
                  c.type === 'STOP_ALARM'
                    ? `STOP_ALARM Khay #${c.trayNumber} (IR đã lấy thuốc - Tắt LED & Loa)`
                    : `OPEN_TRAY Khay #${c.trayNumber} (${c.servoAngle}° · LED ON · Loa ON)`
                )
                .join(' · ')}
            </span>
          </div>
          <span className="text-[0.82rem] font-mono opacity-85">
            GET /api/esp32/commands
          </span>
        </div>
      )}
    </section>
  );
}
