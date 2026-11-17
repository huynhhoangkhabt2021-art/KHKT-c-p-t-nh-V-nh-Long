import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type {
  AuthUser,
  CustomMedicalDoc,
  EmergencyMedicalCard,
  Esp32PendingCommand,
  FamilyHealthAlert,
  FeelingMood,
  MedicalRecordProfile,
  MedicationDose,
  SmartHealthState,
  SosContact,
  UserRole,
} from './src/types/health';
import {
  buildHealthAlertSmsBody,
  computeAutoPurifierState,
  createEmptyMedicalRecord,
  formatClockTime,
  getTrayNumberForPeriod,
  normalizeDocCategoryLabel,
} from './src/utils/healthLogic';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'smart-healthcare-state.json');

interface StoredAccount {
  id: string;
  fullName: string;
  username: string;
  phone: string;
  role: UserRole;
  salt: string;
  passwordHash: string;
  pinSalt?: string;
  pinHash?: string;
  createdAt: string;
}

interface InternalPersistedData {
  publicState: SmartHealthState;
  accounts: StoredAccount[];
}

function hashSecret(secret: string, salt?: string): { salt: string; hash: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(secret, actualSalt, 32).toString('hex');
  return { salt: actualSalt, hash: derived };
}

function verifySecret(secret: string, salt: string, expectedHash: string): boolean {
  try {
    const derived = crypto.scryptSync(secret, salt, 32);
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (derived.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(derived, expectedBuf);
  } catch {
    return false;
  }
}

function createInitialPersistedData(): InternalPersistedData {
  const nowTime = formatClockTime(new Date());
  const initialEnv = {
    aqi: 32,
    mq135Ppm: 168,
    temperature: 26.4,
    humidity: 58,
    source: 'seed' as const,
    updatedAt: nowTime,
  };
  const demoPass = hashSecret('1234');
  const demoPin = hashSecret('1234');

  return {
    publicState: {
      environment: initialEnv,
      purifier: computeAutoPurifierState(
        initialEnv.aqi,
        initialEnv.temperature,
        initialEnv.humidity
      ),
      doses: [
        {
          id: 'tray-1',
          trayNumber: 1,
          period: 'Sáng',
          time: '07:00',
          medicineName: 'Vitamin B & Bảo Vệ Dạ Dày',
          dosageNote: '1 viên với 150ml nước ấm',
          preMealNote: 'Uống trước ăn sáng 30 phút',
          servoAngle: 0,
          taken: false,
          alarmActive: false,
        },
        {
          id: 'tray-2',
          trayNumber: 2,
          period: 'Trưa',
          time: '12:00',
          medicineName: 'Thuốc Hỗ Trợ Tim Mạch',
          dosageNote: '1 viên đúng cữ trưa',
          preMealNote: 'Ăn no trước khi uống thuốc',
          servoAngle: 45,
          taken: false,
          alarmActive: false,
        },
        {
          id: 'tray-3',
          trayNumber: 3,
          period: 'Chiều',
          time: '17:30',
          medicineName: 'Thuốc Ổn Định Đường Huyết',
          dosageNote: '1 viên buổi chiều',
          preMealNote: 'Đo đường huyết & ăn nhẹ trước khi uống',
          servoAngle: 90,
          taken: false,
          alarmActive: false,
        },
        {
          id: 'tray-4',
          trayNumber: 4,
          period: 'Tối',
          time: '20:30',
          medicineName: 'Thuốc Hoạt Huyết & Ngủ Ngon',
          dosageNote: '1 viên buổi tối',
          preMealNote: 'Tránh uống trà đậm hoặc cà phê trước khi uống',
          servoAngle: 135,
          taken: false,
          alarmActive: false,
        },
      ],
      sosContacts: [],
      emergencyCard: {
        fullName: '',
        bloodType: '',
        conditions: '',
        allergies: '',
      },
      medicalRecord: createEmptyMedicalRecord(),
      feelingLogs: [],
      sosEvents: [],
      customDocs: [],
      familyAlerts: [],
      pendingEsp32Commands: [],
      esp32LastSeen: null,
      setupCompleted: true,
    },
    accounts: [
      {
        id: 'acc-demo-1',
        fullName: 'Gia Đình Chăm Sóc',
        username: 'giadinh',
        phone: '0912345678',
        role: 'caregiver',
        salt: demoPass.salt,
        passwordHash: demoPass.hash,
        pinSalt: demoPin.salt,
        pinHash: demoPin.hash,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function loadPersistedData(): InternalPersistedData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as InternalPersistedData;
      if (
        parsed &&
        parsed.publicState &&
        parsed.publicState.environment &&
        Array.isArray(parsed.publicState.doses) &&
        Array.isArray(parsed.accounts)
      ) {
        if (!parsed.publicState.emergencyCard) {
          parsed.publicState.emergencyCard = {
            fullName: '',
            bloodType: '',
            conditions: '',
            allergies: '',
          };
        }
        if (!parsed.publicState.medicalRecord) {
          parsed.publicState.medicalRecord = createEmptyMedicalRecord();
        }
        if (!Array.isArray(parsed.publicState.customDocs)) {
          parsed.publicState.customDocs = [];
        }
        if (!Array.isArray(parsed.publicState.familyAlerts)) {
          parsed.publicState.familyAlerts = [];
        }
        parsed.publicState.doses = parsed.publicState.doses.map((d) => ({
          ...d,
          preMealNote: d.preMealNote ?? '',
          alarmActive: Boolean(d.alarmActive),
        }));
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read persisted state, resetting seed:', err);
  }
  const initial = createInitialPersistedData();
  savePersistedData(initial);
  return initial;
}

function savePersistedData(data: InternalPersistedData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist state:', err);
  }
}

let db: InternalPersistedData = loadPersistedData();

// Ephemeral in-memory session tokens (cleared on server restart or logout)
const sessionTokens = new Map<string, string>(); // token -> userId

function toPublicState(): SmartHealthState {
  return { ...db.publicState };
}

function toAuthUser(account: StoredAccount): AuthUser {
  return {
    id: account.id,
    fullName: account.fullName,
    username: account.username,
    phone: account.phone,
    role: account.role,
    createdAt: account.createdAt,
  };
}

function getAuthenticatedUser(req: express.Request): AuthUser | null {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const userId = sessionTokens.get(token);
  if (!userId) return null;
  const account = db.accounts.find((a) => a.id === userId);
  return account ? toAuthUser(account) : null;
}

function buildFallbackDoctorReply(question: string): string {
  const q = question.toLowerCase();
  const { aqi, temperature, humidity } = db.publicState.environment;

  // 1. Mệt + chóng mặt + huyết áp cao / tụt huyết áp
  if (
    q.includes('huyết áp') ||
    q.includes('chóng mặt') ||
    q.includes('chống mặt') ||
    q.includes('hoa mắt') ||
    q.includes('choáng')
  ) {
    return [
      'Với tình trạng đang hơi mệt, chóng mặt kèm bệnh nền huyết áp cao, bác cần làm ngay các bước sau:',
      '1. Ngồi hoặc nằm nghỉ ngay tại chỗ an toàn, kê đầu hơi cao và thả lỏng, tuyệt đối không đứng dậy đột ngột để tránh té ngã.',
      '2. Nếu có máy đo huyết áp tại nhà, nhờ người thân đo lại ngay sau khi nghỉ 5 phút và giữ bình tĩnh, thở chậm sâu.',
      '3. Không tự ý uống thêm hoặc uống gấp đôi thuốc huyết áp khi chưa biết chỉ số đo hiện tại; có thể nhấp từng ngụm nước lọc nhỏ.',
      '4. Gọi ngay người thân hoặc bấm nút Cấp cứu SOS / 115 nếu xuất hiện bất kỳ dấu hiệu nào như: huyết áp tăng vọt (từ 180/120 mmHg trở lên), đau tức ngực, khó thở, tê yếu tay chân, méo miệng hoặc nói khó.',
    ].join('\n');
  }

  // 2. Khó thở / đau ngực / tức ngực
  if (q.includes('khó thở') || q.includes('đau ngực') || q.includes('tức ngực') || q.includes('tim')) {
    return [
      'Khi thấy tức ngực hoặc khó thở, bác nên xử trí ngay:',
      '1. Dừng mọi hoạt động, ngồi thẳng hoặc tựa lưng góc 45–60 độ nơi thoáng khí, nới lỏng cổ áo.',
      '2. Tập thở chúm môi nhẹ nhàng (hít vào bằng mũi 2 giây, thổi nhẹ ra qua miệng 4 giây).',
      '3. Báo ngay cho người thân bên cạnh. Nếu cơn đau ngực lan lên vai/cổ, vã mồ hôi lạnh hoặc khó thở tăng sau 5 phút, hãy bấm nút SOS / gọi 115 ngay lập tức.',
    ].join('\n');
  }

  // 3. Tiểu đường / run tay / vã mồ hôi / tụt đường huyết
  if (q.includes('đường huyết') || q.includes('tiểu đường') || q.includes('run tay') || q.includes('vã mồ hôi')) {
    return [
      'Khi có biểu hiện mệt, run tay, vã mồ hôi ở người bệnh tiểu đường:',
      '1. Ngồi yên xuống ngay và đo đường huyết mao mạch nếu có máy.',
      '2. Nếu vẫn tỉnh táo hoàn toàn, uống ngay nửa cốc nước đường ấm hoặc 3–4 viên kẹo đường (quy tắc 15–15), sau 15 phút kiểm tra lại và ăn thêm bữa nhẹ.',
      '3. Tuyệt đối không uống thêm thuốc tiểu đường lúc đang mệt lả. Nếu có dấu hiệu lơ mơ, gọi ngay người thân và cấp cứu 115.',
    ].join('\n');
  }

  // 4. Lịch uống thuốc / khay thuốc / quên liều / trước hay sau ăn
  if (q.includes('khay') || q.includes('thuốc') || q.includes('quên liều') || q.includes('trước ăn') || q.includes('sau ăn')) {
    return [
      'Về cách uống thuốc an toàn theo 4 khay (Sáng – Trưa – Chiều – Tối):',
      '1. Kiểm tra kỹ ghi chú "Lưu ý trước khi uống" của từng túm thuốc (ví dụ: ăn no trước khi uống hay uống trước ăn 30 phút).',
      '2. Uống thuốc ở tư thế ngồi thẳng với 150–200 ml nước lọc ấm.',
      '3. Nếu lỡ quên một cữ và gần sát giờ cữ tiếp theo, hãy bỏ qua cữ đã quên — tuyệt đối không uống gấp đôi liều.',
    ].join('\n');
  }

  // 5. Không khí / nhiệt độ phòng / máy lọc
  if (q.includes('không khí') || q.includes('ô nhiễm') || q.includes('nhiệt độ') || q.includes('lọc') || q.includes('aqi')) {
    return [
      `Hiện chất lượng không khí phòng là ${aqi} AQI, nhiệt độ ${temperature.toFixed(1)}°C, độ ẩm ${humidity}% và máy lọc tự động đang ở chế độ "${db.publicState.purifier.levelLabel}".`,
      '1. Nếu chỉ số AQI cao trên 100, hãy giữ máy lọc chạy tự động ở mức cao và kiểm tra nguồn khói bụi trong nhà.',
      '2. Giữ nhiệt độ phòng ngủ dễ chịu khoảng 24–28°C và uống đủ nước ấm để bảo vệ đường hô hấp.',
    ].join('\n');
  }

  // 6. Xương khớp / đau nhức
  if (q.includes('xương') || q.includes('khớp') || q.includes('nhức') || q.includes('tê')) {
    return [
      'Khi bị đau nhức xương khớp:',
      '1. Giữ ấm vùng khớp đau (nhất là khớp gối và bàn chân khi trời lạnh ẩm), tránh ngồi xổm hoặc mang vác nặng.',
      '2. Nghỉ ngơi nhẹ nhàng, có thể chườm ấm 10–15 phút nếu không có sưng nóng đỏ cấp tính.',
      '3. Không tự ý uống thuốc giảm đau không rõ nguồn gốc; nếu khớp sưng nóng nhiều hoặc đau tăng nặng, hãy liên hệ bác sĩ khám trực tiếp.',
    ].join('\n');
  }

  // 7. Sốt / mệt mỏi chung
  return [
    `Bác sĩ đã ghi nhận tình trạng "${question}". Bác nên làm ngay các bước cơ bản sau:`,
    '1. Ngồi hoặc nằm nghỉ ngơi ở nơi thoáng mát, nới lỏng quần áo và uống từng ngụm nước ấm nhỏ.',
    '2. Nhờ người thân kiểm tra lại nhiệt độ cơ thể, huyết áp (nếu có máy) và xem bác đã ăn uống hoặc uống đúng cữ thuốc hôm nay chưa.',
    '3. Nếu triệu chứng không giảm sau 15–30 phút nghỉ ngơi hoặc kèm khó thở, đau ngực, chóng mặt nặng hay lơ mơ, hãy bấm ngay Mục SOS Khẩn cấp hoặc gọi 115.',
  ].join('\n');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // ---- Auth Endpoints ----
  app.post('/api/auth/register', (req, res) => {
    const body = req.body ?? {};
    const fullName = String(body.fullName || '').trim();
    const username = String(body.username || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');
    const pin = String(body.pin || '').trim();
    const role = (body.role || 'caregiver') as UserRole;

    if (!fullName || (!phone && !username) || password.length < 4) {
      res.status(400).json({
        error: 'Vui lòng nhập đầy đủ họ tên, số điện thoại và mật khẩu tối thiểu 4 ký tự.',
      });
      return;
    }

    if (pin && !/^\d{4}$/.test(pin)) {
      res.status(400).json({
        error: 'Mã PIN đăng nhập phải gồm đúng 4 chữ số (0-9).',
      });
      return;
    }

    const actualUsername = username || phone;
    const duplicate = db.accounts.find(
      (a) =>
        a.username.toLowerCase() === actualUsername ||
        (phone && a.phone === phone)
    );
    if (duplicate) {
      res.status(409).json({
        error: 'Số điện thoại hoặc tài khoản này đã được đăng ký.',
      });
      return;
    }

    const { salt, hash } = hashSecret(password);
    const pinSecret = pin ? hashSecret(pin) : null;
    const newAccount: StoredAccount = {
      id: `acc-${Date.now()}`,
      fullName,
      username: actualUsername,
      phone,
      role,
      salt,
      passwordHash: hash,
      ...(pinSecret ? { pinSalt: pinSecret.salt, pinHash: pinSecret.hash } : {}),
      createdAt: new Date().toISOString(),
    };
    db.accounts.push(newAccount);

    if (body.sosPhone && String(body.sosPhone).trim()) {
      const sosContact: SosContact = {
        id: `sos-${Date.now()}`,
        name: String(body.sosName || 'Người thân khẩn cấp').trim(),
        relationship: String(body.sosRelationship || 'Người thân').trim(),
        phone: String(body.sosPhone).trim(),
        priority: 1,
      };
      db.publicState.sosContacts = [
        sosContact,
        ...db.publicState.sosContacts.filter((c) => c.phone !== sosContact.phone),
      ];
    }

    db.publicState.setupCompleted = true;
    savePersistedData(db);

    const token = crypto.randomBytes(24).toString('hex');
    sessionTokens.set(token, newAccount.id);

    res.json({
      ok: true,
      token,
      user: toAuthUser(newAccount),
      state: toPublicState(),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const body = req.body ?? {};
    const identifier = String(body.identifier || body.phone || '').trim().toLowerCase();
    const password = String(body.password || '');
    const pin = String(body.pin || '').trim();

    if (!password && !pin) {
      res.status(400).json({
        error: 'Vui lòng nhập mật khẩu hoặc mã PIN 4 số để đăng nhập.',
      });
      return;
    }

    let account: StoredAccount | undefined;

    if (identifier) {
      account = db.accounts.find(
        (a) =>
          a.username.toLowerCase() === identifier ||
          (a.phone && a.phone === identifier)
      );
      if (!account) {
        res.status(401).json({
          error: 'Số điện thoại hoặc tài khoản chưa được đăng ký.',
        });
        return;
      }
      const passOk = password
        ? verifySecret(password, account.salt, account.passwordHash)
        : false;
      const pinOk =
        pin && account.pinSalt && account.pinHash
          ? verifySecret(pin, account.pinSalt, account.pinHash)
          : false;
      if (!passOk && !pinOk) {
        res.status(401).json({
          error: 'Mật khẩu hoặc mã PIN 4 số chưa đúng.',
        });
        return;
      }
    } else if (/^\d{4}$/.test(pin)) {
      const matchedAccounts = db.accounts.filter(
        (a) => a.pinSalt && a.pinHash && verifySecret(pin, a.pinSalt, a.pinHash)
      );
      if (matchedAccounts.length === 1) {
        account = matchedAccounts[0];
      } else if (matchedAccounts.length > 1) {
        res.status(400).json({
          error: 'Có nhiều tài khoản dùng cùng mã PIN này. Vui lòng nhập thêm Số điện thoại.',
        });
        return;
      } else {
        res.status(401).json({
          error: 'Mã PIN 4 số chưa đúng.',
        });
        return;
      }
    } else {
      res.status(400).json({
        error: 'Vui lòng nhập Số điện thoại hoặc mã PIN 4 số hợp lệ.',
      });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    sessionTokens.set(token, account.id);

    res.json({
      ok: true,
      token,
      user: toAuthUser(account),
      state: toPublicState(),
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Phiên đăng nhập hết hạn hoặc chưa đăng nhập.' });
      return;
    }
    res.json({ ok: true, user, state: toPublicState() });
  });

  app.post('/api/auth/logout', (req, res) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (token) sessionTokens.delete(token);
    res.json({ ok: true });
  });

  // ---- State & Setup Endpoints ----
  app.get('/api/state', (_req, res) => {
    res.json(toPublicState());
  });

  app.put('/api/settings', (req, res) => {
    const body = req.body ?? {};
    if (Array.isArray(body.sosContacts)) {
      db.publicState.sosContacts = (body.sosContacts as SosContact[])
        .map((c, idx) => ({
          id: c.id || `sos-${Date.now()}-${idx}`,
          ...(c.slot ? { slot: c.slot } : {}),
          name: String(c.name || '').trim(),
          relationship: String(c.relationship || 'Người thân').trim(),
          phone: String(c.phone || '').trim(),
          priority: Number(c.priority) || idx + 1,
        }))
        .filter((c) => c.name && c.phone);
    }

    if (body.emergencyCard && typeof body.emergencyCard === 'object') {
      const card = body.emergencyCard as Partial<EmergencyMedicalCard>;
      db.publicState.emergencyCard = {
        fullName: String(card.fullName ?? '').trim(),
        bloodType: String(card.bloodType ?? '').trim(),
        conditions: String(card.conditions ?? '').trim(),
        allergies: String(card.allergies ?? '').trim(),
      };
    }

    if (body.medicalRecord && typeof body.medicalRecord === 'object') {
      const rec = body.medicalRecord as Partial<MedicalRecordProfile>;
      db.publicState.medicalRecord = {
        ...createEmptyMedicalRecord(),
        ...db.publicState.medicalRecord,
        ...rec,
      };
    }

    if (Array.isArray(body.doses)) {
      db.publicState.doses = (body.doses as MedicationDose[])
        .slice(0, 24)
        .map((d, idx) => {
          const period = (['Sáng', 'Trưa', 'Chiều', 'Tối'].includes(d.period)
            ? d.period
            : 'Sáng') as MedicationDose['period'];
          return {
            ...d,
            id: d.id || `tray-${Date.now()}-${idx}`,
            period,
            trayNumber: getTrayNumberForPeriod(period),
            preMealNote: String(d.preMealNote ?? '').trim(),
            dosageNote: String(d.dosageNote ?? '').trim(),
            medicineName: String(d.medicineName ?? '').trim() || 'Túm thuốc cần uống',
            time: String(d.time || '07:00').trim(),
            servoAngle: Math.max(0, Math.min(180, Number(d.servoAngle) || 0)),
            taken: Boolean(d.taken),
            alarmActive: Boolean(d.alarmActive),
          };
        });
    }

    if (typeof body.setupCompleted === 'boolean') {
      db.publicState.setupCompleted = body.setupCompleted;
    }

    savePersistedData(db);
    res.json({ ok: true, state: toPublicState() });
  });



  // ---- Real ESP32 MQ-135 & DHT22 Telemetry + Servo Command Queue ----
  app.post('/api/esp32/telemetry', (req, res) => {
    const body = req.body ?? {};
    const nowTime = formatClockTime(new Date());

    const rawAqi = body.mq135Aqi ?? body.aqi;
    const rawPpm = body.mq135Ppm ?? body.ppm;
    const rawTemp = body.temperature ?? body.temp;
    const rawHum = body.humidity ?? body.hum;

    const parsedAqi = Number(rawAqi);
    const parsedPpm = Number(rawPpm);
    const parsedTemp = Number(rawTemp);
    const parsedHum = Number(rawHum);

    if (!Number.isNaN(parsedAqi) && parsedAqi >= 0 && parsedAqi <= 500) {
      db.publicState.environment.aqi = Math.round(parsedAqi);
    }
    if (!Number.isNaN(parsedPpm) && parsedPpm >= 0 && parsedPpm <= 5000) {
      db.publicState.environment.mq135Ppm = Math.round(parsedPpm);
    } else if (!Number.isNaN(parsedAqi)) {
      db.publicState.environment.mq135Ppm = Math.round(110 + parsedAqi * 2.1);
    }

    if (!Number.isNaN(parsedTemp) && parsedTemp >= -10 && parsedTemp <= 60) {
      db.publicState.environment.temperature = Number(parsedTemp.toFixed(1));
    }
    if (!Number.isNaN(parsedHum) && parsedHum >= 0 && parsedHum <= 100) {
      db.publicState.environment.humidity = Math.round(parsedHum);
    }

    db.publicState.environment.source =
      body.source === 'esp32-serial' ? 'esp32-serial' : 'esp32-http';
    db.publicState.environment.updatedAt = nowTime;
    db.publicState.esp32LastSeen = new Date().toISOString();

    // Air Purifier operates automatically based on MQ-135 & DHT22 readings
    db.publicState.purifier = computeAutoPurifierState(
      db.publicState.environment.aqi,
      db.publicState.environment.temperature,
      db.publicState.environment.humidity
    );

    savePersistedData(db);
    res.json({
      ok: true,
      purifierOn: db.publicState.purifier.on,
      purifierLevel: db.publicState.purifier.level,
      commands: db.publicState.pendingEsp32Commands,
      state: toPublicState(),
    });
  });

  app.get('/api/esp32/commands', (_req, res) => {
    res.json({
      ok: true,
      purifierOn: db.publicState.purifier.on,
      purifierLevel: db.publicState.purifier.level,
      commands: db.publicState.pendingEsp32Commands,
    });
  });

  app.post('/api/esp32/commands/ack', (req, res) => {
    const body = req.body ?? {};
    if (body.all) {
      db.publicState.pendingEsp32Commands = [];
    } else if (body.commandId) {
      db.publicState.pendingEsp32Commands =
        db.publicState.pendingEsp32Commands.filter((c) => c.id !== body.commandId);
    }
    savePersistedData(db);
    res.json({
      ok: true,
      commands: db.publicState.pendingEsp32Commands,
      state: toPublicState(),
    });
  });

  // ---- 4-Tray Servo Medication, LED, Audio & IR Obstacle Sensor Endpoints ----
  app.post('/api/tray/trigger-alarm', (req, res) => {
    const { doseId } = req.body ?? {};
    const target = db.publicState.doses.find((d) => d.id === doseId);
    if (!target) {
      res.status(404).json({ error: 'Không tìm thấy lịch uống thuốc này.' });
      return;
    }
    if (target.taken) {
      res.json({ ok: true, dose: target, state: toPublicState() });
      return;
    }

    const nowTime = formatClockTime(new Date());
    target.alarmActive = true;

    const cmd: Esp32PendingCommand = {
      id: `cmd-alarm-${Date.now()}`,
      type: 'OPEN_TRAY',
      trayNumber: target.trayNumber,
      servoAngle: target.servoAngle,
      medicineName: target.medicineName,
      ledOn: true,
      audioAlert: true,
      createdAt: nowTime,
    };
    db.publicState.pendingEsp32Commands = [
      cmd,
      ...db.publicState.pendingEsp32Commands,
    ].slice(0, 12);

    savePersistedData(db);
    res.json({ ok: true, dose: target, command: cmd, state: toPublicState() });
  });

  app.post('/api/tray/ir-cleared', (req, res) => {
    const { doseId, trayNumber } = req.body ?? {};
    const target = doseId
      ? db.publicState.doses.find((d) => d.id === doseId)
      : db.publicState.doses.find(
          (d) =>
            d.trayNumber === Number(trayNumber) && (d.alarmActive || !d.taken)
        );
    if (!target) {
      res.status(404).json({ error: 'Không tìm thấy khay thuốc đang chờ lấy.' });
      return;
    }

    const nowTime = formatClockTime(new Date());
    target.alarmActive = false;
    target.taken = true;
    target.takenAt = nowTime;
    target.irClearedAt = nowTime;

    const stopCmd: Esp32PendingCommand = {
      id: `cmd-stop-${Date.now()}`,
      type: 'STOP_ALARM',
      trayNumber: target.trayNumber,
      servoAngle: 0,
      medicineName: target.medicineName,
      ledOn: false,
      audioAlert: false,
      createdAt: nowTime,
    };
    db.publicState.pendingEsp32Commands = [
      stopCmd,
      ...db.publicState.pendingEsp32Commands.filter(
        (c) => c.trayNumber !== target.trayNumber
      ),
    ].slice(0, 12);

    savePersistedData(db);
    res.json({ ok: true, dose: target, command: stopCmd, state: toPublicState() });
  });

  app.post('/api/tray/open', (req, res) => {
    const { doseId } = req.body ?? {};
    const target = db.publicState.doses.find((d) => d.id === doseId);
    if (!target) {
      res.status(404).json({ error: 'Không tìm thấy khay thuốc này.' });
      return;
    }
    if (target.taken) {
      res.status(409).json({
        error: `Khay ${target.trayNumber} đã được mở uống lúc ${target.takenAt || 'trước đó'}.`,
        state: toPublicState(),
      });
      return;
    }

    const nowTime = formatClockTime(new Date());
    target.taken = true;
    target.takenAt = nowTime;
    target.alarmActive = false;

    const cmd: Esp32PendingCommand = {
      id: `cmd-${Date.now()}`,
      type: 'OPEN_TRAY',
      trayNumber: target.trayNumber,
      servoAngle: target.servoAngle,
      medicineName: target.medicineName,
      ledOn: true,
      audioAlert: true,
      createdAt: nowTime,
    };
    db.publicState.pendingEsp32Commands = [
      cmd,
      ...db.publicState.pendingEsp32Commands,
    ].slice(0, 12);

    savePersistedData(db);
    res.json({ ok: true, dose: target, command: cmd, state: toPublicState() });
  });

  app.post('/api/tray/reset', (_req, res) => {
    db.publicState.doses = db.publicState.doses.map((d) => ({
      ...d,
      taken: false,
      takenAt: undefined,
      alarmActive: false,
      irClearedAt: undefined,
    }));
    db.publicState.pendingEsp32Commands = [];
    savePersistedData(db);
    res.json({ ok: true, state: toPublicState() });
  });

  async function createAndStoreFamilyAlert(params: {
    severity: 'warning' | 'critical';
    title: string;
    reason: string;
    note?: string;
  }): Promise<FamilyHealthAlert> {
    const timestamp = formatClockTime(new Date());
    const patientName =
      db.publicState.medicalRecord.fullNameUpper ||
      db.publicState.emergencyCard.fullName ||
      undefined;
    const smsBody = buildHealthAlertSmsBody({
      patientName,
      reason: params.reason,
      note: params.note,
      timestamp,
    });
    const targets = db.publicState.sosContacts.map((c) => ({
      name: c.name,
      phone: c.phone,
    }));

    let smsWebhookSent = false;
    const webhookUrl = process.env.SMS_WEBHOOK_URL;
    if (webhookUrl && targets.length > 0) {
      try {
        const resp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targets,
            message: smsBody,
            severity: params.severity,
          }),
        });
        smsWebhookSent = resp.ok;
      } catch {
        smsWebhookSent = false;
      }
    }

    const alert: FamilyHealthAlert = {
      id: `alert-${Date.now()}`,
      severity: params.severity,
      title: params.title,
      message: params.note?.trim()
        ? `${params.reason} — Ghi chú: ${params.note.trim()}`
        : params.reason,
      smsBody,
      targets,
      channels: ['web', 'sms'],
      smsWebhookSent,
      acknowledged: false,
      timestamp,
    };

    db.publicState.familyAlerts = [
      alert,
      ...db.publicState.familyAlerts,
    ].slice(0, 25);
    return alert;
  }

  // ---- Daily Feeling & Senior Journal Notes + Web/SMS Family Alerts + SOS Logs ----
  app.post('/api/feeling', async (req, res) => {
    const rawMood = req.body?.mood as FeelingMood | 'Ghi chú' | undefined;
    const note = String(req.body?.note || '').trim();
    if (
      rawMood !== 'Khỏe' &&
      rawMood !== 'Tạm ổn' &&
      rawMood !== 'Hơi mệt' &&
      rawMood !== 'Ghi chú'
    ) {
      res.status(400).json({ error: 'Trạng thái cảm nhận không hợp lệ.' });
      return;
    }
    if (rawMood === 'Ghi chú' && !note) {
      res.status(400).json({ error: 'Vui lòng nhập nội dung ghi chú trước khi lưu.' });
      return;
    }
    const log = {
      id: `feel-${Date.now()}`,
      mood: rawMood,
      ...(note ? { note } : {}),
      timestamp: formatClockTime(new Date()),
    };
    db.publicState.feelingLogs = [log, ...db.publicState.feelingLogs].slice(0, 30);

    let alert: FamilyHealthAlert | undefined;
    if (rawMood === 'Hơi mệt') {
      alert = await createAndStoreFamilyAlert({
        severity: 'warning',
        title: 'Sức khỏe người cao tuổi không ổn định (Hơi mệt)',
        reason: 'Báo trạng thái Hơi mệt',
        note,
      });
    }

    savePersistedData(db);
    res.json({ ok: true, log, ...(alert ? { alert } : {}), state: toPublicState() });
  });

  app.post('/api/alerts/notify', async (req, res) => {
    const body = req.body ?? {};
    const severity = body.severity === 'critical' ? 'critical' : 'warning';
    const title =
      String(body.title || '').trim() || 'Cảnh báo sức khỏe người cao tuổi';
    const reason =
      String(body.reason || '').trim() || 'Sức khỏe không tốt, cần người thân kiểm tra';
    const note = String(body.note || '').trim();

    const alert = await createAndStoreFamilyAlert({
      severity,
      title,
      reason,
      note: note || undefined,
    });
    savePersistedData(db);
    res.json({ ok: true, alert, state: toPublicState() });
  });

  app.post('/api/alerts/ack', (req, res) => {
    const { alertId } = req.body ?? {};
    db.publicState.familyAlerts = db.publicState.familyAlerts.map((a) =>
      !alertId || a.id === alertId ? { ...a, acknowledged: true } : a
    );
    savePersistedData(db);
    res.json({ ok: true, state: toPublicState() });
  });

  app.post('/api/sos', async (req, res) => {
    const status = req.body?.status as
      | 'countdown'
      | 'dispatched'
      | 'cancelled'
      | undefined;
    if (
      status !== 'countdown' &&
      status !== 'dispatched' &&
      status !== 'cancelled'
    ) {
      res.status(400).json({ error: 'Trạng thái SOS không hợp lệ.' });
      return;
    }
    const primaryContact = db.publicState.sosContacts[0];
    const configuredTotal = db.publicState.sosContacts.length + 1; // configured contacts + 115
    const customTarget = req.body?.contactName
      ? String(req.body.contactName).trim()
      : undefined;
    const sentCount =
      status === 'dispatched'
        ? typeof req.body?.sentCount === 'number'
          ? req.body.sentCount
          : configuredTotal
        : 0;
    const event = {
      id: `sos-${Date.now()}`,
      status,
      timestamp: formatClockTime(new Date()),
      contactName: customTarget || primaryContact?.name || 'Cấp cứu 115',
      sentCount,
      totalTargets: configuredTotal,
    };
    db.publicState.sosEvents = [event, ...db.publicState.sosEvents].slice(0, 20);

    let alert: FamilyHealthAlert | undefined;
    if (status === 'dispatched') {
      alert = await createAndStoreFamilyAlert({
        severity: 'critical',
        title: 'KHẨN CẤP SOS — Cần liên hệ ngay!',
        reason: `Đã kích hoạt SOS khẩn cấp tới ${event.contactName}`,
      });
    }

    savePersistedData(db);
    res.json({ ok: true, event, ...(alert ? { alert } : {}), state: toPublicState() });
  });

  // ---- Custom Reference Medical Documents (Add & Cite Official Sources/Links) ----
  app.post('/api/docs', (req, res) => {
    const body = req.body ?? {};
    const category = (
      ['emergency', 'respiratory', 'medication', 'daily'].includes(body.category)
        ? body.category
        : 'daily'
    ) as CustomMedicalDoc['category'];
    const title = String(body.title || '').trim();
    const citationOrg = String(body.citationOrg || '').trim();
    const citationUrl = String(body.citationUrl || '').trim();
    const citationTitle = String(body.citationTitle || '').trim() || title;
    const citationRef = String(body.citationRef || '').trim() || 'Tài liệu tham khảo gia đình thêm';

    const rawSummary = Array.isArray(body.summaryPoints)
      ? body.summaryPoints.map(String)
      : String(body.summaryPoints || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);

    if (!title || rawSummary.length === 0 || !citationOrg || !citationUrl) {
      res.status(400).json({
        error:
          'Vui lòng nhập đầy đủ Tiêu đề, Tóm tắt nội dung, Nguồn gốc tài liệu và Đường link dẫn bài báo.',
      });
      return;
    }

    if (!/^https?:\/\/\S+/i.test(citationUrl)) {
      res.status(400).json({
        error: 'Đường link dẫn bài báo phải bắt đầu bằng https:// hoặc http://',
      });
      return;
    }

    const toList = (val: unknown): string[] =>
      Array.isArray(val)
        ? val.map((x) => String(x).trim()).filter(Boolean)
        : String(val || '')
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);

    const newDoc: CustomMedicalDoc = {
      id: `custom-doc-${Date.now()}`,
      category,
      categoryLabel: normalizeDocCategoryLabel(category),
      title,
      summaryPoints: rawSummary,
      warningSigns: toList(body.warningSigns),
      firstAidSteps: toList(body.firstAidSteps),
      avoidActions: toList(body.avoidActions),
      citationTitle,
      citationOrg,
      citationRef,
      citationUrl,
      createdAt: formatClockTime(new Date()),
    };

    db.publicState.customDocs = [newDoc, ...db.publicState.customDocs].slice(0, 40);
    savePersistedData(db);
    res.json({ ok: true, doc: newDoc, state: toPublicState() });
  });

  app.delete('/api/docs/:id', (req, res) => {
    const id = req.params.id;
    db.publicState.customDocs = db.publicState.customDocs.filter((d) => d.id !== id);
    savePersistedData(db);
    res.json({ ok: true, state: toPublicState() });
  });

  // ---- Doctor AI (MQ-135, DHT22 & 4-Tray Medicine Guidance) ----
  app.post('/api/doctor/ask', async (req, res) => {
    const question = String(req.body?.question || '').trim();
    if (!question) {
      res.status(400).json({
        error: 'Vui lòng nhập hoặc nói câu hỏi sức khỏe của bác.',
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json({
        answer: buildFallbackDoctorReply(question),
        source: 'local',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const env = db.publicState.environment;
      const trayList = db.publicState.doses
        .map(
          (d) =>
            `Khay ${d.trayNumber} (${d.time} ${d.period}): ${d.medicineName} - ${d.taken ? 'Đã uống' : 'Chưa uống'}`
        )
        .join('; ');
      const contextSummary = `Môi trường phòng đo bởi MQ-135: ${env.aqi} AQI (${env.mq135Ppm} ppm); cảm biến DHT22: ${env.temperature}°C, độ ẩm ${env.humidity}%. Máy lọc không khí tự động: ${db.publicState.purifier.levelLabel}. Lịch 4 khay thuốc: ${trayList}.`;

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Câu hỏi của người cao tuổi: "${question}"\n\n(Dữ liệu phụ trợ nếu người hỏi có đề cập — không khí phòng ${env.aqi} AQI, ${env.temperature}°C, độ ẩm ${env.humidity}%; lịch thuốc: ${trayList})`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'Bạn là Bác sĩ gia đình tận tâm tư vấn cho người cao tuổi Việt Nam. Hãy TRẢ LỜI TRỰC TIẾP VÀO ĐÚNG TRỌNG TÂM CÂU HỎI VÀ TRIỆU CHỨNG mà người bệnh nêu ra (ví dụ: nếu hỏi mệt, chóng mặt kèm huyết áp cao thì hướng dẫn từng bước 1-2-3 cần làm gì ngay lúc này, điều cần tránh, và dấu hiệu nguy hiểm cần gọi 115). KHÔNG lan man sang cảm biến không khí hay khay thuốc nếu câu hỏi không hỏi về chúng. Dùng tiếng Việt ấm áp, kính trọng (xưng "bác sĩ", gọi "bác"), trình bày từng bước ngắn gọn, KHÔNG dùng ký tự markdown (* hay #), trả lời khoảng 4-5 câu rõ ràng để hệ thống có thể đọc to.',
          },
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
      ]);

      const cleanText =
        response && response.text
          ? response.text.replace(/[*#`]/g, '').trim()
          : '';
      res.json({
        answer: cleanText || buildFallbackDoctorReply(question),
        source: cleanText ? 'gemini' : 'fallback',
      });
    } catch (err) {
      console.error('Gemini Doctor AI error:', err);
      res.json({
        answer: buildFallbackDoctorReply(question),
        source: 'fallback',
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SMART HEALTHCARE server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
