import {
  Check,
  Code2,
  Copy,
  Cpu,
  Minus,
  Moon,
  Plus,
  Radio,
  Settings,
  Sun,
  Type,
  Usb,
} from 'lucide-react';
import { useState } from 'react';
import type { SmartHealthState } from '../../types/health';

interface WebSettingsSectionProps {
  state: SmartHealthState;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  fontSize: number;
  onChangeFontSize: (nextSize: number) => void;
  onSendEsp32Packet: (packet: {
    mq135Aqi: number;
    mq135Ppm: number;
    temperature: number;
    humidity: number;
    source?: 'esp32-http' | 'esp32-serial';
  }) => Promise<void>;
  onIrClearedByTrayNumber: (trayNumber: 1 | 2 | 3 | 4) => Promise<void>;
  onAckCommands: () => Promise<void>;
}

interface SerialPortLike {
  open: (opts: { baudRate: number }) => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
}

export function WebSettingsSection({
  state,
  darkMode,
  onToggleDarkMode,
  fontSize,
  onChangeFontSize,
  onSendEsp32Packet,
  onIrClearedByTrayNumber,
  onAckCommands,
}: WebSettingsSectionProps) {
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showSketch, setShowSketch] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [testingEsp32, setTestingEsp32] = useState(false);
  const [serialStatus, setSerialStatus] = useState<string | null>(null);

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const telemetryEndpoint = `${baseUrl}/api/esp32/telemetry`;
  const commandsEndpoint = `${baseUrl}/api/esp32/commands`;
  const irClearedEndpoint = `${baseUrl}/api/tray/ir-cleared`;

  const arduinoSketch = `// ESP32 SMART HEALTHCARE: MQ-135 + DHT22 + Máy lọc tiết kiệm điện + 4 Servo Khay + LED + Loa + Cảm biến vật cản hồng ngoại
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ESP32Servo.h>

const char* WIFI_SSID = "TEN_WIFI_NHA_BAN";
const char* WIFI_PASS = "MAT_KHAU_WIFI";
const char* SERVER_BASE = "${baseUrl}";

#define DHTPIN 4
#define DHTTYPE DHT22
#define MQ135_PIN 34
#define PURIFIER_PWM_PIN 25
#define LED_ALERT_PIN 26
#define AUDIO_TRIGGER_PIN 33

const int SERVO_PINS[4] = {13, 12, 14, 27};
const int IR_OBSTACLE_PINS[4] = {16, 17, 18, 19}; // Cảm biến hồng ngoại phát hiện đã lấy thuốc (HIGH = trống khay)

DHT dht(DHTPIN, DHTTYPE);
Servo trayServos[4];
bool trayAlarmRunning[4] = {false, false, false, false};

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(PURIFIER_PWM_PIN, OUTPUT);
  pinMode(LED_ALERT_PIN, OUTPUT);
  pinMode(AUDIO_TRIGGER_PIN, OUTPUT);
  for (int i = 0; i < 4; i++) {
    trayServos[i].attach(SERVO_PINS[i]);
    trayServos[i].write(0);
    pinMode(IR_OBSTACLE_PINS[i], INPUT);
  }
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void loop() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int rawMq = analogRead(MQ135_PIN);
  int aqi = constrain(map(rawMq, 300, 3200, 15, 220), 10, 400);

  // Điều khiển công suất máy lọc tiết kiệm điện theo mức độ ô nhiễm
  int pwmDuty = 0;
  if (aqi > 150) pwmDuty = 255;       // Mức 3: Tối đa
  else if (aqi > 100) pwmDuty = 175;  // Mức 2: Vừa
  else if (aqi > 50) pwmDuty = 95;    // Mức 1: Nhẹ
  analogWrite(PURIFIER_PWM_PIN, pwmDuty); // Không khí sạch -> PWM = 0 (Nghỉ tiết kiệm điện)

  // Kiểm tra cảm biến vật cản hồng ngoại: khi lấy thuốc khỏi khay -> Tắt LED & Âm thanh
  for (int i = 0; i < 4; i++) {
    if (trayAlarmRunning[i] && digitalRead(IR_OBSTACLE_PINS[i]) == HIGH) {
      trayAlarmRunning[i] = false;
      trayServos[i].write(0);
      digitalWrite(LED_ALERT_PIN, LOW);
      digitalWrite(AUDIO_TRIGGER_PIN, LOW);
      HTTPClient irHttp;
      irHttp.begin(String(SERVER_BASE) + "/api/tray/ir-cleared");
      irHttp.addHeader("Content-Type", "application/json");
      irHttp.POST("{\\"trayNumber\\":" + String(i + 1) + "}");
      irHttp.end();
    }
  }

  if (WiFi.status() == WL_CONNECTED && !isnan(temp) && !isnan(hum)) {
    HTTPClient http;
    http.begin(String(SERVER_BASE) + "/api/esp32/telemetry");
    http.addHeader("Content-Type", "application/json");
    String payload = "{\\"mq135Aqi\\":" + String(aqi) +
      ",\\"mq135Ppm\\":" + String(rawMq / 4) +
      ",\\"temperature\\":" + String(temp, 1) +
      ",\\"humidity\\":" + String((int)hum) + "}";
    http.POST(payload);
    http.end();

    // Nhận lệnh đẩy khay & bật LED + Loa nhắc "Đã đến giờ uống thuốc"
    HTTPClient cmdHttp;
    cmdHttp.begin(String(SERVER_BASE) + "/api/esp32/commands");
    if (cmdHttp.GET() == 200) {
      String res = cmdHttp.getString();
      for (int t = 1; t <= 4; t++) {
        if (res.indexOf("\\"type\\":\\"OPEN_TRAY\\"") >= 0 && res.indexOf("\\"trayNumber\\":" + String(t)) >= 0) {
          trayServos[t - 1].write(90);
          trayAlarmRunning[t - 1] = true;
          digitalWrite(LED_ALERT_PIN, HIGH);
          digitalWrite(AUDIO_TRIGGER_PIN, HIGH);
        }
      }
    }
    cmdHttp.end();
  }
  delay(3000);
}`;

  const handleCopy = async (text: string, which: 'endpoint' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'endpoint') {
        setCopiedEndpoint(true);
        window.setTimeout(() => setCopiedEndpoint(false), 2000);
      } else {
        setCopiedCode(true);
        window.setTimeout(() => setCopiedCode(false), 2000);
      }
    } catch {
      setNotice('Không thể tự sao chép, vui lòng bôi đen sao chép thủ công.');
    }
  };

  const handleConnectUsbSerial = async () => {
    const nav = navigator as Navigator & {
      serial?: { requestPort: () => Promise<SerialPortLike> };
    };
    if (!nav.serial) {
      setSerialStatus(
        'Trình duyệt hiện tại chưa hỗ trợ Web Serial USB. Bạn có thể dùng kết nối Wi-Fi HTTP API ở bên dưới cho mạch ESP32.'
      );
      return;
    }
    try {
      const port = await nav.serial.requestPort();
      await port.open({ baudRate: 115200 });
      setSerialStatus('Đã kết nối cổng USB Serial ESP32 (115200 baud). Đang chờ dòng JSON...');
      if (port.readable) {
        const reader = port.readable.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line.trim());
              if (parsed.temperature !== undefined || parsed.mq135Aqi !== undefined) {
                await onSendEsp32Packet({
                  mq135Aqi: Number(parsed.mq135Aqi ?? parsed.aqi ?? 35),
                  mq135Ppm: Number(parsed.mq135Ppm ?? 170),
                  temperature: Number(parsed.temperature ?? 26.5),
                  humidity: Number(parsed.humidity ?? 58),
                  source: 'esp32-serial',
                });
              }
            } catch {
              // ignore non-JSON debug lines
            }
          }
        }
      }
    } catch {
      setSerialStatus('Đã hủy chọn cổng USB Serial hoặc thiết bị chưa cắm vào máy.');
    }
  };

  const handleSimulatePacket = async (aqi: number, ppm: number, label: string) => {
    setTestingEsp32(true);
    try {
      await onSendEsp32Packet({
        mq135Aqi: aqi,
        mq135Ppm: ppm,
        temperature: 27.2,
        humidity: 60,
        source: 'esp32-http',
      });
      setNotice(label);
    } finally {
      setTestingEsp32(false);
    }
  };

  const cardSurface = darkMode
    ? 'bg-slate-900 border-slate-700 text-white'
    : 'bg-white border-slate-200 text-[#0F172A]';
  const subSurface = darkMode
    ? 'bg-slate-800 border-slate-700 text-slate-100'
    : 'bg-[#F8FAFC] border-slate-200 text-[#0F172A]';

  return (
    <section
      id="cai-dat"
      aria-label="Cài đặt hệ thống & Phần cứng ESP32"
      className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-6"
    >
      <div>
        <p className="text-[0.9rem] font-bold text-[#0D9488] flex items-center gap-1.5">
          <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Tùy chỉnh hiển thị &amp; Cấu hình kết nối mạch thực tế ESP32</span>
        </p>
        <h2 className="text-[1.85rem] font-extrabold tracking-tight">
          Cài đặt hệ thống
        </h2>
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-2xl bg-[#F0FDF4] border border-[#16A34A]/35 px-5 py-3.5 text-[0.95rem] font-bold text-[#15803D]"
        >
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Accessibility & Display Settings */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className={`rounded-[22px] p-6 border shadow-sm flex flex-col gap-4 ${cardSurface}`}>
            <div className="flex items-center gap-2 font-extrabold text-[1.08rem]">
              <Type className="w-5 h-5 text-[#0D9488] shrink-0" aria-hidden="true" />
              <span>Cỡ chữ hiển thị toàn trang ({fontSize}px)</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => onChangeFontSize(Math.max(15, fontSize - 2))}
                className={`min-h-[44px] rounded-xl border font-bold text-[0.9rem] flex items-center justify-center gap-1 ${subSurface}`}
              >
                <Minus className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Nhỏ hơn</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeFontSize(16)}
                className="min-h-[44px] rounded-xl bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E] font-bold text-[0.9rem]"
              >
                Chuẩn web
              </button>
              <button
                type="button"
                onClick={() => onChangeFontSize(Math.min(22, fontSize + 2))}
                className="min-h-[44px] rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-[0.9rem] flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Lớn hơn</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-[1rem]">Chế độ màu giao diện</p>
                <p className="text-[0.86rem] opacity-75">
                  Chuyển đổi Sáng / Tối phù hợp ban ngày hoặc ban đêm
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={`min-h-[44px] px-4 rounded-xl border font-bold text-[0.9rem] flex items-center gap-2 whitespace-nowrap ${subSurface}`}
              >
                {darkMode ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                    <span>Giao diện Sáng</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-[#0056B3] shrink-0" aria-hidden="true" />
                    <span>Giao diện Tối</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Hardware Simulation Panel */}
          <div className={`rounded-[22px] p-6 border shadow-sm flex flex-col gap-3.5 ${cardSurface}`}>
            <div className="flex items-center gap-2 font-extrabold text-[1.06rem] text-[#0D9488]">
              <Radio className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Kiểm tra nhanh tín hiệu phần cứng</span>
            </div>
            <p className="text-[0.88rem] opacity-80">
              Mô phỏng gói tin thực tế từ mạch để kiểm tra tự động điều chỉnh công suất máy lọc và cảm biến hồng ngoại khay thuốc:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={testingEsp32}
                onClick={() =>
                  void handleSimulatePacket(
                    30,
                    155,
                    'Không khí sạch (30 AQI): Máy lọc đã TỰ ĐỘNG chuyển về chế độ Nghỉ Tiết kiệm điện.'
                  )
                }
                className="min-h-[44px] rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[0.88rem] px-3"
              >
                Thử khí sạch (30 AQI → Nghỉ)
              </button>
              <button
                type="button"
                disabled={testingEsp32}
                onClick={() =>
                  void handleSimulatePacket(
                    165,
                    480,
                    'Ô nhiễm cao (165 AQI): Máy lọc đã TỰ ĐỘNG bật Mức 3 Công suất tối đa.'
                  )
                }
                className="min-h-[44px] rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-[0.88rem] px-3"
              >
                Thử ô nhiễm cao (165 AQI → Mức 3)
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/70">
              {([1, 2, 3, 4] as const).map((trayNum) => (
                <button
                  key={trayNum}
                  type="button"
                  onClick={() => void onIrClearedByTrayNumber(trayNum)}
                  className={`min-h-[40px] rounded-xl border text-[0.82rem] font-bold px-2 ${subSurface}`}
                >
                  IR Khay {trayNum} đã lấy
                </button>
              ))}
            </div>

            {state.pendingEsp32Commands.length > 0 && (
              <button
                type="button"
                onClick={() => void onAckCommands()}
                className="min-h-[42px] rounded-xl bg-slate-200 hover:bg-slate-300 text-[#0F172A] font-bold text-[0.86rem]"
              >
                Xóa hàng đợi lệnh phần cứng ({state.pendingEsp32Commands.length})
              </button>
            )}
          </div>
        </div>

        {/* Right: ESP32 Endpoints + Arduino C++ Code */}
        <div className={`lg:col-span-7 rounded-[22px] p-6 border shadow-sm flex flex-col gap-4 ${cardSurface}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#0D9488] font-extrabold text-[1.08rem]">
              <Cpu className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Kết nối Mạch ESP32 (Wi-Fi HTTP &amp; USB Serial)</span>
            </div>
            <button
              type="button"
              onClick={() => void handleConnectUsbSerial()}
              className="min-h-[40px] px-3.5 rounded-xl bg-[#0F2D4A] hover:bg-[#134E4A] text-white font-bold text-[0.85rem] flex items-center gap-1.5"
            >
              <Usb className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Kết nối USB Serial</span>
            </button>
          </div>

          {serialStatus && (
            <p className="rounded-xl bg-[#FFFBEB] text-[#B45309] px-3.5 py-2.5 text-[0.88rem] font-semibold">
              {serialStatus}
            </p>
          )}

          <div className="rounded-xl bg-slate-950 text-teal-300 p-4 text-[0.82rem] font-mono space-y-1.5 break-all">
            <div>POST {telemetryEndpoint}</div>
            <div className="text-sky-300">GET  {commandsEndpoint}</div>
            <div className="text-amber-300">POST {irClearedEndpoint}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => void handleCopy(telemetryEndpoint, 'endpoint')}
              className={`min-h-[44px] rounded-xl border font-bold text-[0.9rem] flex items-center justify-center gap-2 ${subSurface}`}
            >
              {copiedEndpoint ? (
                <>
                  <Check className="w-4 h-4 text-[#16A34A]" aria-hidden="true" />
                  <span>Đã sao chép Endpoint</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Chép URL API</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowSketch((prev) => !prev)}
              className="min-h-[44px] rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-[0.9rem] flex items-center justify-center gap-2"
            >
              <Code2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{showSketch ? 'Thu gọn code ESP32 (.ino)' : 'Mở code mẫu ESP32 (.ino)'}</span>
            </button>
          </div>

          {showSketch && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[0.86rem] font-bold text-[#0D9488]">
                  Code Arduino C++ (Cảm biến không khí + Máy lọc tiết kiệm điện + 4 Servo + LED + Loa + Hồng ngoại):
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopy(arduinoSketch, 'code')}
                  className="px-3.5 py-2 rounded-lg bg-[#0F2D4A] text-white text-[0.8rem] font-bold whitespace-nowrap shrink-0"
                >
                  {copiedCode ? 'Đã chép code' : 'Chép toàn bộ code'}
                </button>
              </div>
              <pre className="rounded-xl bg-slate-950 text-slate-100 p-4 text-[0.76rem] font-mono overflow-x-auto max-h-[300px]">
                {arduinoSketch}
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
