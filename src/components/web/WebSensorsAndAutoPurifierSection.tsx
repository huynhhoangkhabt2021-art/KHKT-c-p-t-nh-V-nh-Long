import { Droplets, Fan, Leaf, Thermometer, Wind, Zap } from 'lucide-react';
import { useState } from 'react';
import type { SmartHealthState } from '../../types/health';
import {
  evaluateAirQuality,
  evaluateDht22Comfort,
} from '../../utils/healthLogic';

interface WebSensorsAndAutoPurifierSectionProps {
  state: SmartHealthState;
  darkMode: boolean;
  onSimulateAir?: (packet: {
    mq135Aqi: number;
    mq135Ppm: number;
    temperature: number;
    humidity: number;
  }) => Promise<void>;
}

export function WebSensorsAndAutoPurifierSection({
  state,
  darkMode,
  onSimulateAir,
}: WebSensorsAndAutoPurifierSectionProps) {
  const [testing, setTesting] = useState(false);
  const { environment, purifier } = state;
  const airStatus = evaluateAirQuality(environment.aqi);
  const dhtStatus = evaluateDht22Comfort(
    environment.temperature,
    environment.humidity
  );

  const handleTest = async (aqi: number, ppm: number, temp: number, hum: number) => {
    if (!onSimulateAir || testing) return;
    setTesting(true);
    try {
      await onSimulateAir({
        mq135Aqi: aqi,
        mq135Ppm: ppm,
        temperature: temp,
        humidity: hum,
      });
    } finally {
      setTesting(false);
    }
  };

  const cardClass = darkMode
    ? 'bg-slate-900 border-slate-700 text-white'
    : 'bg-white border-slate-200/90 text-[#0F172A]';

  const airTextColor =
    airStatus.tone === 'safe'
      ? 'text-[#0D9488]'
      : airStatus.tone === 'warning'
        ? 'text-[#D97706]'
        : 'text-[#DC2626]';

  const dhtTextColor =
    dhtStatus.tone === 'safe' ? 'text-[#0D9488]' : 'text-[#D97706]';

  return (
    <section
      id="cam-bien"
      aria-label="Hệ thống đo sức khỏe"
      className="max-w-7xl mx-auto px-4 sm:px-6 py-10"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[1.85rem] font-extrabold tracking-tight">
            Hệ thống đo sức khỏe
          </h2>
          <p
            className={`text-[0.96rem] mt-1 ${
              darkMode ? 'text-slate-300' : 'text-[#475569]'
            }`}
          >
            Theo dõi chất lượng không khí, nhiệt độ, độ ẩm phòng và tự động bật máy lọc
            theo mức độ ô nhiễm để tiết kiệm điện năng.
          </p>
        </div>

        {onSimulateAir && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={testing}
              onClick={() => void handleTest(30, 160, 26.2, 56)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#F0FDFA] border border-teal-200 text-[#0F766E] text-[0.82rem] font-bold hover:bg-teal-100"
            >
              Thử không khí sạch (30 AQI)
            </button>
            <button
              type="button"
              disabled={testing}
              onClick={() => void handleTest(85, 290, 27.5, 62)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#FFFBEB] border border-amber-200 text-[#B45309] text-[0.82rem] font-bold hover:bg-amber-100"
            >
              Ô nhiễm nhẹ (85 AQI)
            </button>
            <button
              type="button"
              disabled={testing}
              onClick={() => void handleTest(175, 490, 29.0, 68)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#FEF2F2] border border-red-200 text-[#DC2626] text-[0.82rem] font-bold hover:bg-red-100"
            >
              Ô nhiễm cao (175 AQI)
            </button>
          </div>
        )}
      </div>

      {/* 3-Column Sensor & Power-Saving Auto Purifier Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: MQ-135 Air Quality */}
        <article
          className={`rounded-[22px] p-6 border shadow-sm flex flex-col justify-between gap-4 ${cardClass}`}
        >
          <div>
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 font-bold text-[1.05rem]">
                <span className="w-10 h-10 rounded-xl bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center shrink-0">
                  <Wind className="w-5 h-5" aria-hidden="true" />
                </span>
                <span>Chất lượng không khí</span>
              </div>
              <span className={`text-[0.86rem] font-extrabold ${airTextColor}`}>
                {airStatus.label}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div
                className={`rounded-xl p-3.5 border ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-[#F8FAFC] border-slate-200'
                }`}
              >
                <p className="text-[0.82rem] font-semibold opacity-75">Chỉ số AQI</p>
                <p className="text-[2rem] font-extrabold leading-tight tabular-nums mt-0.5">
                  {environment.aqi}
                </p>
              </div>
              <div
                className={`rounded-xl p-3.5 border ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-[#F8FAFC] border-slate-200'
                }`}
              >
                <p className="text-[0.82rem] font-semibold opacity-75">Nồng độ khí</p>
                <p className="text-[1.65rem] font-extrabold leading-tight tabular-nums mt-1">
                  {environment.mq135Ppm}{' '}
                  <span className="text-[0.9rem] font-semibold opacity-75">ppm</span>
                </p>
              </div>
            </div>
          </div>

          <p
            className={`text-[0.9rem] leading-snug ${
              darkMode ? 'text-slate-300' : 'text-[#475569]'
            }`}
          >
            {airStatus.advice}
          </p>
        </article>

        {/* Card 2: Temperature & Humidity */}
        <article
          className={`rounded-[22px] p-6 border shadow-sm flex flex-col justify-between gap-4 ${cardClass}`}
        >
          <div>
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 font-bold text-[1.05rem]">
                <span className="w-10 h-10 rounded-xl bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center shrink-0">
                  <Thermometer className="w-5 h-5" aria-hidden="true" />
                </span>
                <span>Nhiệt độ &amp; Độ ẩm phòng</span>
              </div>
              <span className={`text-[0.86rem] font-extrabold ${dhtTextColor}`}>
                {dhtStatus.tone === 'safe' ? 'Thoải mái' : 'Cần chỉnh'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div
                className={`rounded-xl p-3.5 border ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-[#FFF7ED]/60 border-orange-200/70'
                }`}
              >
                <p className="text-[0.82rem] font-semibold opacity-75 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-[#EA580C]" aria-hidden="true" />
                  <span>Nhiệt độ</span>
                </p>
                <p className="text-[2rem] font-extrabold leading-tight tabular-nums mt-0.5 text-[#C2410C] dark:text-orange-300">
                  {environment.temperature.toFixed(1)}°C
                </p>
              </div>
              <div
                className={`rounded-xl p-3.5 border ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-[#EFF6FF]/70 border-blue-200/70'
                }`}
              >
                <p className="text-[0.82rem] font-semibold opacity-75 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-[#0284C7]" aria-hidden="true" />
                  <span>Độ ẩm</span>
                </p>
                <p className="text-[2rem] font-extrabold leading-tight tabular-nums mt-0.5 text-[#0056B3] dark:text-sky-300">
                  {environment.humidity}%
                </p>
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl p-3.5 border text-[0.88rem] leading-snug ${
              darkMode
                ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                : 'bg-[#F8FAFC] border-slate-200 text-[#475569]'
            }`}
          >
            <strong>Đánh giá môi trường:</strong> {dhtStatus.advice}
          </div>
        </article>

        {/* Card 3: Power-Saving Automatic Air Purifier */}
        <article
          className={`rounded-[22px] p-6 border-2 shadow-sm flex flex-col justify-between gap-4 ${
            purifier.on ? 'border-[#0D9488]/45' : 'border-[#16A34A]/35'
          } ${cardClass}`}
        >
          <div>
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 font-bold text-[1.05rem]">
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    purifier.on
                      ? 'bg-[#0D9488] text-white'
                      : 'bg-[#DCFCE7] text-[#15803D]'
                  }`}
                >
                  {purifier.on ? (
                    <Fan className="w-5 h-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Leaf className="w-5 h-5" aria-hidden="true" />
                  )}
                </span>
                <span>Máy lọc không khí tự động</span>
              </div>
              <span
                className={`text-[0.82rem] font-extrabold ${
                  purifier.on ? 'text-[#0D9488]' : 'text-[#16A34A]'
                }`}
              >
                {purifier.on ? 'ĐANG LỌC TỰ ĐỘNG' : 'TIẾT KIỆM ĐIỆN'}
              </span>
            </div>

            <div
              className={`mt-4 rounded-xl p-4 text-white ${
                purifier.on ? 'bg-[#0F766E]' : 'bg-[#15803D]'
              }`}
            >
              <p className="text-[0.78rem] uppercase tracking-wide text-white/85 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Điều chỉnh công suất theo mức ô nhiễm</span>
              </p>
              <p className="text-[1.15rem] font-extrabold mt-1">
                {purifier.levelLabel}
              </p>
              <p className="text-[0.86rem] text-white/90 mt-1.5 leading-snug">
                {purifier.reason}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center text-[0.76rem] font-bold">
            {[
              { lv: 0, title: 'Nghỉ', sub: '≤ 50' },
              { lv: 1, title: 'Nhẹ', sub: '51–100' },
              { lv: 2, title: 'Vừa', sub: '101–150' },
              { lv: 3, title: 'Tối đa', sub: '> 150' },
            ].map((tier) => {
              const active = purifier.level === tier.lv;
              return (
                <div
                  key={tier.lv}
                  className={`rounded-xl py-2 px-1.5 border ${
                    active
                      ? 'bg-[#CCFBF1] border-[#0D9488] text-[#0F766E]'
                      : darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-400'
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-500'
                  }`}
                >
                  <div>{tier.title}</div>
                  <div className="text-[0.7rem] opacity-80 tabular-nums">
                    {tier.sub}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
