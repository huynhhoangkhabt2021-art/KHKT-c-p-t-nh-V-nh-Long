export type DayPeriod = 'Sáng' | 'Trưa' | 'Chiều' | 'Tối';

export type FeelingMood = 'Khỏe' | 'Tạm ổn' | 'Hơi mệt';

export type HealthTone = 'safe' | 'warning' | 'danger';

export type UserRole =
  | 'elderly'
  | 'caregiver'
  | 'relative'
  | 'doctor';

export type PurifierLevel = 0 | 1 | 2 | 3;

export type AppView =
  | 'home'
  | 'sensors'
  | 'trays'
  | 'health-record'
  | 'sos'
  | 'doctor-ai'
  | 'docs'
  | 'settings';

export interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export interface MedicationDose {
  id: string;
  trayNumber: 1 | 2 | 3 | 4;
  period: DayPeriod;
  time: string; // HH:MM
  medicineName: string;
  dosageNote: string;
  preMealNote: string; // Lưu ý trước khi uống thuốc
  servoAngle: number;
  taken: boolean;
  takenAt?: string; // HH:MM
  alarmActive?: boolean; // Đang bật đèn LED & âm thanh nhắc uống chờ cảm biến hồng ngoại
  irClearedAt?: string;
}

export interface EnvironmentReading {
  aqi: number;
  mq135Ppm: number;
  temperature: number; // °C
  humidity: number; // %
  source: 'seed' | 'esp32-http' | 'esp32-serial';
  updatedAt: string;
}

export interface AutoPurifierStatus {
  on: boolean;
  autoMode: true;
  level: PurifierLevel;
  levelLabel: string;
  reason: string;
  powerSavingNote: string;
}

export interface SosContact {
  id: string;
  slot?: 'contact1' | 'contact2' | 'doctor';
  name: string;
  relationship: string;
  phone: string;
  priority: number;
}

export interface EmergencyMedicalCard {
  fullName: string;
  bloodType: string;
  conditions: string;
  allergies: string;
}

export interface MedicalRecordAllergyRow {
  status: '' | 'Khong' | 'Co';
  details: string;
}

export interface MedicalRecordLabRow {
  stt: number;
  group: string;
  testName: string;
  resultSummary: string;
}

export interface MedicalRecordPrescriptionRow {
  stt: number;
  drugName: string;
  unit: string;
  quantity: string;
  usage: string;
}

export interface MedicalRecordProfile {
  // Header metadata
  managingAgency: string;
  facilityName: string;
  department: string;
  patientId: string;
  recordCode: string;
  archiveNumber: string;

  // I. Thông tin hành chính & định danh người bệnh
  fullNameUpper: string;
  birthDate: string;
  gender: '' | 'Nam' | 'Nữ' | 'Khác';
  ethnicity: string;
  cccd: string;
  occupation: string;
  address: string;
  paymentType: '' | 'BHYT' | 'Thu phí' | 'Khác';
  bhytCode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  admissionTime: string;

  // II. Lý do khám bệnh & Tiền sử bệnh lý
  chiefComplaint: string;
  illnessHistory: string;
  allergyHistory: MedicalRecordAllergyRow;
  personalHistory: MedicalRecordAllergyRow;
  familyHistory: MedicalRecordAllergyRow;

  // III. Khám lâm sàng
  pulse: string;
  temperature: string;
  bloodPressure: string;
  respiratoryRate: string;
  weight: string;
  height: string;
  generalExam: string;
  organExam: string;

  // IV. Chỉ định & Kết quả cận lâm sàng
  labRows: MedicalRecordLabRow[];

  // V. Chẩn đoán & Phác đồ điều trị
  preliminaryDiagnosis: string;
  preliminaryIcd: string;
  confirmedDiagnosis: string;
  confirmedIcd: string;
  comorbidities: string;
  comorbiditiesIcd: string;
  prescriptions: MedicalRecordPrescriptionRow[];

  // VI. Tổng kết hồ sơ & Kết thúc đợt điều trị
  dischargeTime: string;
  dischargeOutcome:
    | ''
    | 'Khỏi'
    | 'Đỡ, giảm'
    | 'Không thay đổi'
    | 'Nặng hơn'
    | 'Chuyển tuyến';
  doctorAdvice: string;

  // VII. Xác thực điện tử & Chữ ký số
  patientSignature: string;
  doctorSignature: string;
  directorSignature: string;
}

export interface FeelingLog {
  id: string;
  mood: FeelingMood | 'Ghi chú';
  note?: string;
  timestamp: string;
}

export interface SosEvent {
  id: string;
  status: 'countdown' | 'dispatched' | 'cancelled';
  timestamp: string;
  contactName?: string;
  sentCount?: number;
  totalTargets?: number;
}

export interface Esp32PendingCommand {
  id: string;
  type: 'OPEN_TRAY' | 'STOP_ALARM';
  trayNumber: 1 | 2 | 3 | 4;
  servoAngle: number;
  medicineName: string;
  ledOn: boolean;
  audioAlert: boolean;
  createdAt: string;
}

export interface CustomMedicalDoc {
  id: string;
  category: 'emergency' | 'respiratory' | 'medication' | 'daily';
  categoryLabel: string;
  title: string;
  summaryPoints: string[];
  warningSigns: string[];
  firstAidSteps: string[];
  avoidActions: string[];
  citationTitle: string;
  citationOrg: string;
  citationRef: string;
  citationUrl: string;
  createdAt: string;
}

export interface FamilyHealthAlert {
  id: string;
  severity: 'warning' | 'critical';
  title: string;
  message: string;
  smsBody: string;
  targets: Array<{ name: string; phone: string }>;
  channels: Array<'web' | 'sms'>;
  smsWebhookSent: boolean;
  acknowledged: boolean;
  timestamp: string;
}

export interface SmartHealthState {
  environment: EnvironmentReading;
  purifier: AutoPurifierStatus;
  doses: MedicationDose[];
  sosContacts: SosContact[];
  emergencyCard: EmergencyMedicalCard;
  medicalRecord: MedicalRecordProfile;
  feelingLogs: FeelingLog[];
  sosEvents: SosEvent[];
  customDocs: CustomMedicalDoc[];
  familyAlerts: FamilyHealthAlert[];
  pendingEsp32Commands: Esp32PendingCommand[];
  esp32LastSeen: string | null;
  setupCompleted: boolean;
}
