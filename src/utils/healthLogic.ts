import type {
  AutoPurifierStatus,
  DayPeriod,
  EnvironmentReading,
  HealthTone,
  MedicalRecordProfile,
  MedicationDose,
  SosContact,
} from '../types/health';

export const DAY_PERIODS: DayPeriod[] = ['Sáng', 'Trưa', 'Chiều', 'Tối'];

export const PERIOD_TRAY_MAP: Record<DayPeriod, 1 | 2 | 3 | 4> = {
  Sáng: 1,
  Trưa: 2,
  Chiều: 3,
  Tối: 4,
};

export function getTrayNumberForPeriod(period: DayPeriod): 1 | 2 | 3 | 4 {
  return PERIOD_TRAY_MAP[period] ?? 1;
}

export function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length !== 2) return 0;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return (
    Math.max(0, Math.min(23, hours)) * 60 +
    Math.max(0, Math.min(59, minutes))
  );
}

export function formatClockTime(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function getAllTraysSorted(doses: MedicationDose[]): MedicationDose[] {
  return [...doses].sort((a, b) => {
    if (a.trayNumber !== b.trayNumber) return a.trayNumber - b.trayNumber;
    return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
  });
}

export function getNextPriorityDose(
  doses: MedicationDose[]
): MedicationDose | null {
  const pending = doses.filter((dose) => !dose.taken);
  if (pending.length === 0) return null;
  return [...pending].sort(
    (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
  )[0];
}

export function groupDosesByPeriod(
  doses: MedicationDose[]
): Record<DayPeriod, MedicationDose[]> {
  const grouped: Record<DayPeriod, MedicationDose[]> = {
    Sáng: [],
    Trưa: [],
    Chiều: [],
    Tối: [],
  };
  const sorted = [...doses].sort(
    (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
  );
  for (const dose of sorted) {
    if (grouped[dose.period]) {
      grouped[dose.period].push(dose);
    }
  }
  return grouped;
}

export function findDueTrayAlarms(
  doses: MedicationDose[],
  currentHHMM: string
): MedicationDose[] {
  return doses.filter(
    (dose) => !dose.taken && !dose.alarmActive && dose.time === currentHHMM
  );
}

export function evaluateAirQuality(aqi: number): {
  label: string;
  tone: HealthTone;
  advice: string;
} {
  if (aqi <= 50) {
    return {
      label: 'Trong lành (Tốt)',
      tone: 'safe',
      advice:
        'Không khí phòng sạch sẽ. Máy lọc tự động tạm nghỉ để tiết kiệm điện năng.',
    };
  }
  if (aqi <= 100) {
    return {
      label: 'Ô nhiễm nhẹ',
      tone: 'warning',
      advice:
        'Phát hiện bụi/khí tăng nhẹ. Máy lọc tự động khởi động ở công suất nhẹ để làm sạch tiết kiệm điện.',
    };
  }
  if (aqi <= 150) {
    return {
      label: 'Ô nhiễm trung bình',
      tone: 'warning',
      advice:
        'Chất lượng không khí suy giảm. Máy lọc tự động tăng lên công suất vừa để lọc nhanh.',
    };
  }
  return {
    label: 'Ô nhiễm cao',
    tone: 'danger',
    advice:
      'Cảnh báo ô nhiễm không khí cao! Máy lọc tự động chạy công suất tối đa, nên mở cửa thông thoáng.',
  };
}

export function evaluateDht22Comfort(
  temperature: number,
  humidity: number
): {
  label: string;
  tone: HealthTone;
  advice: string;
} {
  if (temperature > 33 || temperature < 16 || humidity > 82 || humidity < 30) {
    return {
      label: 'Cần điều chỉnh phòng',
      tone: 'warning',
      advice:
        'Nhiệt độ hoặc độ ẩm phòng đang lệch ngưỡng thoải mái cho người cao tuổi.',
    };
  }
  return {
    label: 'Dễ chịu, ổn định',
    tone: 'safe',
    advice: 'Nhiệt độ và độ ẩm phòng đang ở mức phù hợp cho hô hấp và giấc ngủ.',
  };
}

export function computeAutoPurifierState(
  aqi: number,
  temperature: number,
  humidity: number
): AutoPurifierStatus {
  if (aqi > 150) {
    return {
      on: true,
      autoMode: true,
      level: 3,
      levelLabel: 'Mức 3 · Công suất tối đa (Bật tự động)',
      reason: `Chỉ số ô nhiễm đạt ${aqi} AQI (> 150) — tự động chạy công suất tối đa để lọc nhanh khí độc và bụi mịn.`,
      powerSavingNote: 'Đang ưu tiên công suất tối đa xử lý ô nhiễm cao.',
    };
  }
  if (aqi > 100) {
    return {
      on: true,
      autoMode: true,
      level: 2,
      levelLabel: 'Mức 2 · Công suất trung bình (Bật tự động)',
      reason: `Chỉ số ô nhiễm đạt ${aqi} AQI (101–150) — tự động chạy công suất vừa, cân bằng lọc sạch và điện năng.`,
      powerSavingNote: 'Điều chỉnh công suất vừa phù hợp mức ô nhiễm trung bình.',
    };
  }
  if (aqi > 50 || humidity > 78) {
    return {
      on: true,
      autoMode: true,
      level: 1,
      levelLabel: 'Mức 1 · Công suất nhẹ (Bật tự động)',
      reason: `Không khí ở mức ${aqi} AQI, ẩm ${humidity}% — tự động khởi động công suất nhẹ tiết kiệm điện.`,
      powerSavingNote: 'Chạy công suất nhẹ tối ưu điện năng khi ô nhiễm mức thấp.',
    };
  }
  return {
    on: false,
    autoMode: true,
    level: 0,
    levelLabel: 'Đang nghỉ · Chế độ Tiết kiệm điện',
    reason: `Không khí trong lành (${aqi} AQI, ${temperature.toFixed(1)}°C) — máy lọc tự động tạm nghỉ.`,
    powerSavingNote: 'Tự động tắt quạt khi không khí sạch để tiết kiệm điện tối đa.',
  };
}

export function buildSpeechSummary(
  env: EnvironmentReading,
  purifier: AutoPurifierStatus,
  doses: MedicationDose[]
): string {
  const airStatus = evaluateAirQuality(env.aqi);
  const pendingTrays = getAllTraysSorted(doses).filter((d) => !d.taken);

  const envPart = `Chất lượng không khí hiện tại là ${env.aqi} AQI, mức ${airStatus.label}. Nhiệt độ phòng ${env.temperature.toFixed(1)} độ C và độ ẩm ${env.humidity} phần trăm.`;
  const purifierPart = `Máy lọc không khí đang ở trạng thái ${purifier.levelLabel}.`;
  const medPart =
    pendingTrays.length > 0
      ? `Hôm nay còn ${pendingTrays.length} cữ thuốc chưa uống, gần nhất là khay số ${pendingTrays[0].trayNumber} lúc ${pendingTrays[0].time}: ${pendingTrays[0].medicineName}.`
      : 'Hôm nay bác đã uống đầy đủ các cữ thuốc.';

  return `${envPart} ${purifierPart} ${medPart}`;
}

export interface SosQuickSlots {
  contact1: SosContact | null;
  contact2: SosContact | null;
  doctor: SosContact | null;
}

export function resolveSosQuickSlots(contacts: SosContact[]): SosQuickSlots {
  const usedIds = new Set<string>();
  const takeBySlot = (slot: 'contact1' | 'contact2' | 'doctor'): SosContact | null => {
    const found = contacts.find((c) => c.slot === slot);
    if (found) usedIds.add(found.id);
    return found ?? null;
  };

  let contact1 = takeBySlot('contact1');
  let contact2 = takeBySlot('contact2');
  let doctor = takeBySlot('doctor');

  const remaining = contacts.filter((c) => !usedIds.has(c.id));
  for (const c of remaining) {
    if (!doctor && c.relationship.toLowerCase().includes('bác sĩ')) {
      doctor = c;
      usedIds.add(c.id);
    } else if (!contact1) {
      contact1 = c;
      usedIds.add(c.id);
    } else if (!contact2) {
      contact2 = c;
      usedIds.add(c.id);
    } else if (!doctor) {
      doctor = c;
      usedIds.add(c.id);
    }
  }

  return { contact1, contact2, doctor };
}

export function computeSosTargetCount(contacts: SosContact[]): number {
  const validContacts = contacts.filter((c) => c.phone.trim().length > 0);
  return validContacts.length + 1;
}

export function createEmptyMedicalRecord(): MedicalRecordProfile {
  return {
    managingAgency: '',
    facilityName: '',
    department: '',
    patientId: '',
    recordCode: '',
    archiveNumber: '',
    fullNameUpper: '',
    birthDate: '',
    gender: '',
    ethnicity: '',
    cccd: '',
    occupation: '',
    address: '',
    paymentType: '',
    bhytCode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    admissionTime: '',
    chiefComplaint: '',
    illnessHistory: '',
    allergyHistory: { status: '', details: '' },
    personalHistory: { status: '', details: '' },
    familyHistory: { status: '', details: '' },
    pulse: '',
    temperature: '',
    bloodPressure: '',
    respiratoryRate: '',
    weight: '',
    height: '',
    generalExam: '',
    organExam: '',
    labRows: [
      { stt: 1, group: 'Xét nghiệm (Huyết học, Sinh hóa...)', testName: '', resultSummary: '' },
      { stt: 2, group: 'Chẩn đoán hình ảnh (X-quang, Siêu âm, CT...)', testName: '', resultSummary: '' },
      { stt: 3, group: 'Thăm dò chức năng (Điện tim, Nội soi...)', testName: '', resultSummary: '' },
      { stt: 4, group: 'Dịch vụ khác', testName: '', resultSummary: '' },
    ],
    preliminaryDiagnosis: '',
    preliminaryIcd: '',
    confirmedDiagnosis: '',
    confirmedIcd: '',
    comorbidities: '',
    comorbiditiesIcd: '',
    prescriptions: [
      { stt: 1, drugName: '', unit: '', quantity: '', usage: '' },
      { stt: 2, drugName: '', unit: '', quantity: '', usage: '' },
      { stt: 3, drugName: '', unit: '', quantity: '', usage: '' },
      { stt: 4, drugName: '', unit: '', quantity: '', usage: '' },
    ],
    dischargeTime: '',
    dischargeOutcome: '',
    doctorAdvice: '',
    patientSignature: '',
    doctorSignature: '',
    directorSignature: '',
  };
}

export function buildHealthAlertSmsBody(params: {
  patientName?: string;
  reason: string;
  note?: string;
  timestamp: string;
}): string {
  const who = params.patientName?.trim() || 'Người cao tuổi trong gia đình';
  const notePart = params.note?.trim() ? ` Ghi chú: ${params.note.trim()}.` : '';
  return `[SMART HEALTHCARE] CANH BAO SUC KHOE (${params.timestamp}): ${who} - ${params.reason}.${notePart} Vui long kiem tra va lien he ngay.`;
}

export function buildSmsHref(phones: string[], message: string): string {
  const cleanPhones = phones
    .map((p) => p.replace(/[^\d+]/g, ''))
    .filter((p) => p.length > 0);
  const recipient = cleanPhones.join(',');
  return `sms:${recipient}?body=${encodeURIComponent(message)}`;
}

export function normalizeDocCategoryLabel(
  category: 'emergency' | 'respiratory' | 'medication' | 'daily'
): string {
  switch (category) {
    case 'emergency':
      return 'Cấp cứu & Đột quỵ';
    case 'respiratory':
      return 'Hô hấp & Không khí';
    case 'medication':
      return 'Uống thuốc an toàn';
    case 'daily':
    default:
      return 'Chăm sóc hàng ngày';
  }
}

