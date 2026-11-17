import {
  BellRing,
  Check,
  Lightbulb,
  MessageSquareText,
  Radio,
  Volume2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SosOverlay } from './components/SosOverlay';
import { WebAuthModal } from './components/web/WebAuthModal';
import { WebDoctorAiSection } from './components/web/WebDoctorAiSection';
import { WebFamilySmsAlertModal } from './components/web/WebFamilySmsAlertModal';
import { WebFooter } from './components/web/WebFooter';
import { WebHeader } from './components/web/WebHeader';
import { WebHealthRecordSection } from './components/web/WebHealthRecordSection';
import { WebHeroSection } from './components/web/WebHeroSection';
import {
  type NewCustomDocPayload,
  WebMedicalDocsSection,
} from './components/web/WebMedicalDocsSection';
import { WebMedicationFourTraysSection } from './components/web/WebMedicationFourTraysSection';
import { WebSensorsAndAutoPurifierSection } from './components/web/WebSensorsAndAutoPurifierSection';
import { WebSettingsSection } from './components/web/WebSettingsSection';
import { WebSosEmergencySection } from './components/web/WebSosEmergencySection';
import type {
  AppView,
  AuthUser,
  EmergencyMedicalCard,
  FamilyHealthAlert,
  FeelingMood,
  MedicalRecordProfile,
  MedicationDose,
  SmartHealthState,
  SosContact,
} from './types/health';
import {
  buildSmsHref,
  findDueTrayAlarms,
  formatClockTime,
} from './utils/healthLogic';
import { speakVietnamese, stopSpeaking } from './utils/speech';

const FONT_STORAGE_KEY = 'smart_healthcare_web_font_size';
const AUTH_TOKEN_KEY = 'smart_healthcare_auth_token';
const DARK_MODE_KEY = 'smart_healthcare_dark_mode';

function playAlertChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
    window.setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, 450);
  } catch {
    // Ignore autoplay restriction errors in headless browsers
  }
}

function triggerBrowserWebNotification(alert: FamilyHealthAlert) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    if (window.Notification.permission === 'granted') {
      new window.Notification(alert.title, { body: alert.message });
    }
  } catch {
    // Ignore browser notification restrictions
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('home');
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(DARK_MODE_KEY) === 'true';
  });

  const [sosOpen, setSosOpen] = useState(false);
  const [activeSmsModalAlert, setActiveSmsModalAlert] =
    useState<FamilyHealthAlert | null>(null);

  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window === 'undefined') return 16;
    const saved = Number(window.localStorage.getItem(FONT_STORAGE_KEY));
    return saved >= 15 && saved <= 22 ? saved : 16;
  });

  const [healthState, setHealthState] = useState<SmartHealthState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dosesRef = useRef<MedicationDose[]>([]);
  dosesRef.current = healthState?.doses ?? [];

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
    window.localStorage.setItem(FONT_STORAGE_KEY, String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    window.localStorage.setItem(DARK_MODE_KEY, String(darkMode));
  }, [darkMode]);

  const handleSelectView = useCallback((view: AppView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Không thể tải dữ liệu');
      const data = (await res.json()) as SmartHealthState;
      setHealthState(data);
      setLoadError(null);
    } catch {
      setLoadError('Đang kết nối lại với hệ thống...');
    }
  }, []);

  // Load main state & silently restore session if token exists
  useEffect(() => {
    let active = true;
    const initApp = async () => {
      await fetchState();
      if (!authToken) return;
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) {
          window.localStorage.removeItem(AUTH_TOKEN_KEY);
          if (active) {
            setAuthToken(null);
            setUser(null);
          }
          return;
        }
        const data = await res.json();
        if (active) {
          setUser(data.user);
          if (data.state) setHealthState(data.state);
        }
      } catch {
        // Keep public portal usable even if auth check fails
      }
    };
    void initApp();
    return () => {
      active = false;
    };
  }, [authToken, fetchState]);

  // Poll live ESP32 sensor updates every 5 seconds
  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchState();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [fetchState]);

  const handleTriggerAlarm = useCallback(async (doseId: string) => {
    const res = await fetch('/api/tray/trigger-alarm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doseId }),
    });
    const data = await res.json();
    if (data.state) setHealthState(data.state);
  }, []);

  const handleIrCleared = useCallback(async (doseId: string) => {
    stopSpeaking();
    const res = await fetch('/api/tray/ir-cleared', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doseId }),
    });
    const data = await res.json();
    if (data.state) setHealthState(data.state);
  }, []);

  const handleIrClearedByTrayNumber = useCallback(
    async (trayNumber: 1 | 2 | 3 | 4) => {
      stopSpeaking();
      const res = await fetch('/api/tray/ir-cleared', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trayNumber }),
      });
      const data = await res.json();
      if (data.state) setHealthState(data.state);
    },
    []
  );

  // Check real-time clock every 5s to auto-push due medication trays
  useEffect(() => {
    const timer = window.setInterval(() => {
      const nowHHMM = formatClockTime(new Date());
      const dueList = findDueTrayAlarms(dosesRef.current, nowHHMM);
      for (const due of dueList) {
        void handleTriggerAlarm(due.id);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [handleTriggerAlarm]);

  // Continuous LED + Audio loop ("Đã đến giờ uống thuốc") until IR obstacle sensor clears alarm
  const activeAlarms = healthState?.doses.filter((d) => d.alarmActive) ?? [];
  const activeAlarmKey = activeAlarms.map((d) => d.id).join(',');

  useEffect(() => {
    if (!activeAlarmKey) {
      return;
    }
    const triggerVoice = () => {
      const currentActive = dosesRef.current.filter((d) => d.alarmActive);
      if (currentActive.length === 0) return;
      const first = currentActive[0];
      const noteText = first.preMealNote ? `. Lưu ý: ${first.preMealNote}` : '';
      playAlertChime();
      speakVietnamese(
        `Đã đến giờ uống thuốc khay số ${first.trayNumber}: ${first.medicineName}${noteText}`
      );
    };
    triggerVoice();
    const loopId = window.setInterval(triggerVoice, 5500);
    return () => {
      window.clearInterval(loopId);
      stopSpeaking();
    };
  }, [activeAlarmKey]);

  const handleAuthSuccess = (payload: {
    token: string;
    user: AuthUser;
    state: SmartHealthState;
  }) => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
    setAuthToken(payload.token);
    setUser(payload.user);
    setHealthState(payload.state);
    setAuthModalOpen(false);
  };

  const handleLogout = async () => {
    stopSpeaking();
    if (authToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => undefined);
    }
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
  };

  const handleTakeDose = async (doseId: string) => {
    const res = await fetch('/api/tray/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doseId }),
    });
    const data = await res.json();
    if (data.state) {
      setHealthState(data.state);
      speakVietnamese(
        `Đã mở khay số ${data.dose?.trayNumber || ''} và ghi nhận uống ${data.dose?.medicineName || 'thuốc'}.`
      );
    }
  };

  const handleResetDoses = async () => {
    stopSpeaking();
    const res = await fetch('/api/tray/reset', { method: 'POST' });
    const data = await res.json();
    if (data.state) setHealthState(data.state);
  };

  const handleSendFeeling = async (
    mood: FeelingMood | 'Ghi chú',
    note?: string
  ) => {
    const res = await fetch('/api/feeling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood, ...(note ? { note } : {}) }),
    });
    const data = await res.json();
    if (data.state) setHealthState(data.state);
    if (data.alert) {
      playAlertChime();
      triggerBrowserWebNotification(data.alert as FamilyHealthAlert);
      setActiveSmsModalAlert(data.alert as FamilyHealthAlert);
    }
  };

  const handleTriggerPoorHealthAlert = async (
    reason: string,
    note?: string
  ) => {
    const res = await fetch('/api/alerts/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        severity: 'warning',
        title: 'Sức khỏe người cao tuổi không ổn định — Cần kiểm tra',
        reason,
        ...(note ? { note } : {}),
      }),
    });
    const data = await res.json();
    if (data.state) setHealthState(data.state);
    if (data.alert) {
      playAlertChime();
      triggerBrowserWebNotification(data.alert as FamilyHealthAlert);
      setActiveSmsModalAlert(data.alert as FamilyHealthAlert);
    }
  };

  const handleAckAlert = async (alertId?: string) => {
    const res = await fetch('/api/alerts/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId }),
    });
    const data = await res.json();
    if (data.state) setHealthState(data.state);
  };

  const handleAddCustomDoc = async (payload: NewCustomDocPayload) => {
    const res = await fetch('/api/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Không thể lưu tài liệu mới.');
    }
    if (data.state) setHealthState(data.state);
  };

  const handleDeleteCustomDoc = async (id: string) => {
    const res = await fetch(`/api/docs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.state) setHealthState(data.state);
  };

  const handleSaveSettings = async (payload: {
    sosContacts?: SosContact[];
    emergencyCard?: EmergencyMedicalCard;
    doses?: MedicationDose[];
    medicalRecord?: MedicalRecordProfile;
  }) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.state) setHealthState(data.state);
  };

  const handleAddQuickContact = async (name: string, phone: string) => {
    const current = healthState?.sosContacts ?? [];
    const next: SosContact[] = [
      ...current,
      {
        id: `sos-sms-${Date.now()}`,
        name,
        relationship: 'Người thân nhận SMS',
        phone,
        priority: current.length + 1,
      },
    ];
    await handleSaveSettings({ sosContacts: next });
  };

  const handleSendEsp32Packet = async (packet: {
    mq135Aqi: number;
    mq135Ppm: number;
    temperature: number;
    humidity: number;
    source?: 'esp32-http' | 'esp32-serial';
  }) => {
    const res = await fetch('/api/esp32/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packet),
    });
    const data = await res.json();
    if (data.state) setHealthState(data.state);
  };

  const handleAckCommands = async () => {
    const res = await fetch('/api/esp32/commands/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    const data = await res.json();
    if (data.state) setHealthState(data.state);
  };

  const handleSosCancel = async () => {
    setSosOpen(false);
    const res = await fetch('/api/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    const data = await res.json();
    if (data.state) setHealthState(data.state);
  };

  const handleSosDispatch = useCallback(
    async (opts?: { contactName?: string; sentCount?: number }) => {
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'dispatched',
          contactName: opts?.contactName,
          sentCount: opts?.sentCount,
        }),
      });
      const data = await res.json();
      if (data.state) setHealthState(data.state);
      if (data.alert) {
        triggerBrowserWebNotification(data.alert as FamilyHealthAlert);
      }
    },
    []
  );

  const primaryContact = healthState?.sosContacts[0];
  const pendingCount = healthState
    ? healthState.doses.filter((d) => !d.taken).length
    : 0;

  const unackedAlert =
    healthState?.familyAlerts?.find((a) => !a.acknowledged) ?? null;
  const contactPhones =
    healthState?.sosContacts.map((c) => c.phone).filter(Boolean) ?? [];

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        darkMode ? 'bg-slate-950 text-white' : 'bg-[#F7F7F2] text-[#0F172A]'
      }`}
    >
      <WebHeader
        activeView={activeView}
        onSelectView={handleSelectView}
        user={user}
        primaryContact={primaryContact}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={() => void handleLogout()}
        onOpenSos={() => {
          stopSpeaking();
          setSosOpen(true);
        }}
      />

      {/* Global Web Notification Banner When Elderly Health Is Poor or SOS Triggered */}
      {unackedAlert && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-[#FEF2F2] border-b-2 border-[#DC2626] text-[#991B1B] px-4 sm:px-6 py-3 print:hidden"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5 text-[0.94rem]">
              <BellRing
                className="w-5 h-5 text-[#DC2626] animate-pulse shrink-0 mt-0.5 sm:mt-0"
                aria-hidden="true"
              />
              <div>
                <span className="font-extrabold">{unackedAlert.title}: </span>
                <span className="font-semibold">
                  {unackedAlert.message} ({unackedAlert.timestamp})
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={buildSmsHref(contactPhones, unackedAlert.smsBody)}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-extrabold text-[0.86rem] flex items-center gap-1.5"
              >
                <MessageSquareText className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Gửi SMS người thân ngay</span>
              </a>
              <button
                type="button"
                onClick={() => setActiveSmsModalAlert(unackedAlert)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-red-300 text-[#991B1B] font-bold text-[0.86rem]"
              >
                Xem chi tiết &amp; Thêm số SMS
              </button>
              <button
                type="button"
                onClick={() => void handleAckAlert(unackedAlert.id)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[0.86rem] flex items-center gap-1"
              >
                <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Đã xem</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Active Tray Alarm Banner (LED + Continuous Audio until IR cleared) */}
      {activeAlarms.length > 0 && (
        <div
          role="alert"
          className="bg-[#FEF3C7] border-b-2 border-[#D97706] text-[#92400E] px-4 sm:px-6 py-3 print:hidden"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 font-extrabold text-[0.95rem]">
              <Lightbulb
                className="w-5 h-5 text-[#DC2626] animate-pulse shrink-0"
                aria-hidden="true"
              />
              <Volume2 className="w-5 h-5 text-[#D97706] shrink-0" aria-hidden="true" />
              <span>
                Đèn LED sáng &amp; Đang phát &ldquo;Đã đến giờ uống thuốc&rdquo; (Khay{' '}
                {activeAlarms[0].trayNumber}: {activeAlarms[0].medicineName})
                {activeAlarms[0].preMealNote
                  ? ` · Lưu ý: ${activeAlarms[0].preMealNote}`
                  : ''}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeView !== 'trays' && (
                <button
                  type="button"
                  onClick={() => handleSelectView('trays')}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-[#92400E] font-bold text-[0.86rem]"
                >
                  Xem 4 Khay Thuốc
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleIrCleared(activeAlarms[0].id)}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-[0.86rem] flex items-center gap-1.5"
              >
                <Radio className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Cảm biến hồng ngoại: Đã lấy thuốc</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {!healthState ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-16">
          <div
            className={`rounded-[24px] p-10 text-center border shadow-sm ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-teal-300'
                : 'bg-white border-slate-200 text-[#0D9488]'
            }`}
          >
            <p className="text-[1.15rem] font-bold">
              {loadError || 'Đang khởi tạo hệ thống Smart Healthcare...'}
            </p>
          </div>
        </main>
      ) : (
        <main className="flex-1">
          {activeView === 'home' && (
            <WebHeroSection
              darkMode={darkMode}
              pendingCount={pendingCount}
              onSelectView={handleSelectView}
            />
          )}

          {activeView === 'sensors' && (
            <WebSensorsAndAutoPurifierSection
              state={healthState}
              darkMode={darkMode}
              onSimulateAir={(packet) =>
                handleSendEsp32Packet({ ...packet, source: 'esp32-http' })
              }
            />
          )}

          {activeView === 'trays' && (
            <WebMedicationFourTraysSection
              state={healthState}
              darkMode={darkMode}
              onTakeDose={handleTakeDose}
              onTriggerAlarm={handleTriggerAlarm}
              onIrCleared={handleIrCleared}
              onSaveDoses={(doses) => handleSaveSettings({ doses })}
              onResetDoses={handleResetDoses}
              onOpenSettings={() => handleSelectView('settings')}
            />
          )}

          {activeView === 'health-record' && (
            <WebHealthRecordSection
              state={healthState}
              darkMode={darkMode}
              onSaveMedicalRecord={(medicalRecord) =>
                handleSaveSettings({ medicalRecord })
              }
              onSendFeeling={handleSendFeeling}
              onTriggerPoorHealthAlert={handleTriggerPoorHealthAlert}
            />
          )}

          {activeView === 'sos' && (
            <WebSosEmergencySection
              state={healthState}
              darkMode={darkMode}
              onSaveSettings={handleSaveSettings}
              onTriggerSosDispatch={handleSosDispatch}
            />
          )}

          {activeView === 'doctor-ai' && <WebDoctorAiSection darkMode={darkMode} />}

          {activeView === 'docs' && (
            <WebMedicalDocsSection
              darkMode={darkMode}
              customDocs={healthState.customDocs ?? []}
              onAddCustomDoc={handleAddCustomDoc}
              onDeleteCustomDoc={handleDeleteCustomDoc}
            />
          )}

          {activeView === 'settings' && (
            <WebSettingsSection
              state={healthState}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode((prev) => !prev)}
              fontSize={fontSize}
              onChangeFontSize={setFontSize}
              onSendEsp32Packet={handleSendEsp32Packet}
              onIrClearedByTrayNumber={handleIrClearedByTrayNumber}
              onAckCommands={handleAckCommands}
            />
          )}
        </main>
      )}

      <WebFooter primaryContact={primaryContact} onSelectView={handleSelectView} />

      {authModalOpen && (
        <WebAuthModal
          darkMode={darkMode}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {sosOpen && healthState && (
        <SosOverlay
          contacts={healthState.sosContacts}
          onCancel={() => void handleSosCancel()}
          onDispatch={() => void handleSosDispatch()}
        />
      )}

      {activeSmsModalAlert && healthState && (
        <WebFamilySmsAlertModal
          alert={activeSmsModalAlert}
          contacts={healthState.sosContacts}
          darkMode={darkMode}
          onClose={() => setActiveSmsModalAlert(null)}
          onAddContact={handleAddQuickContact}
        />
      )}
    </div>
  );
}
