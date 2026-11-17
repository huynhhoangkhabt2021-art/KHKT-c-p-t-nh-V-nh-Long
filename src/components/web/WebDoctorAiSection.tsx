import { Info, Mic, MicOff, Send, Stethoscope, Volume2, VolumeX } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  speakVietnamese,
  startVietnameseListening,
  stopSpeaking,
  type SpeechRecognitionHandle,
} from '../../utils/speech';

interface WebDoctorAiSectionProps {
  darkMode: boolean;
}

type TopicFilter = 'all' | 'symptoms' | 'medication' | 'air';

const TOPIC_QUESTIONS: Array<{
  id: string;
  topic: Exclude<TopicFilter, 'all'>;
  categoryLabel: string;
  question: string;
  summary: string;
}> = [
  {
    id: 'q-bp-dizzy',
    topic: 'symptoms',
    categoryLabel: 'Triệu chứng & Bệnh nền',
    question:
      'Tui cảm thấy hơi mệt, chóng mặt, tui có bệnh nền về huyết áp cao á, thì bây giờ tui cần làm gì?',
    summary: 'Hướng dẫn từng bước xử trí an toàn khi mệt, chóng mặt kèm tăng huyết áp.',
  },
  {
    id: 'q-med',
    topic: 'medication',
    categoryLabel: 'Uống 4 khay thuốc',
    question: 'Uống thuốc 4 khay trước hay sau ăn và nếu lỡ quên một cữ thì làm sao?',
    summary: 'Lưu ý trước khi uống thuốc cho từng buổi Sáng, Trưa, Chiều, Tối.',
  },
  {
    id: 'q-air',
    topic: 'air',
    categoryLabel: 'Không khí & Hô hấp',
    question: 'Khi phòng báo ô nhiễm không khí tăng cao hoặc khó thở nên làm gì?',
    summary: 'Cách kiểm tra máy lọc tự động, thông thoáng phòng và thở chúm môi.',
  },
];

const FILTERS: Array<{ id: TopicFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'symptoms', label: 'Triệu chứng & Bệnh nền' },
  { id: 'medication', label: 'Uống 4 khay thuốc' },
  { id: 'air', label: 'Không khí & Hô hấp' },
];

export function WebDoctorAiSection({ darkMode }: WebDoctorAiSectionProps) {
  const [filter, setFilter] = useState<TopicFilter>('all');
  const [question, setQuestion] = useState('');
  const [lastAsked, setLastAsked] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingAnswer, setSpeakingAnswer] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionHandle | null>(null);

  const visibleQuestions =
    filter === 'all'
      ? TOPIC_QUESTIONS
      : TOPIC_QUESTIONS.filter((item) => item.topic === filter);

  const askDoctor = async (textToAsk: string) => {
    const clean = textToAsk.trim();
    if (!clean || loading) return;
    setVoiceError(null);
    setLastAsked(clean);
    setLoading(true);
    stopSpeaking();
    setSpeakingAnswer(false);

    try {
      const res = await fetch('/api/doctor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: clean }),
      });
      const data = await res.json();
      const reply =
        data.answer ||
        'Bác sĩ đã nhận câu hỏi. Nếu có dấu hiệu mệt hoặc khó thở, hãy bấm nút Đỏ Cấp Cứu SOS ngay.';
      setAnswer(reply);
      setQuestion('');
      speakVietnamese(reply, {
        onStart: () => setSpeakingAnswer(true),
        onEnd: () => setSpeakingAnswer(false),
      });
    } catch {
      setAnswer(
        'Hiện chưa kết nối được với Bác sĩ AI. Nếu cần hỗ trợ gấp, xin bấm nút Đỏ Cấp Cứu SOS.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    setVoiceError(null);
    stopSpeaking();
    setSpeakingAnswer(false);
    setListening(true);

    const handle = startVietnameseListening({
      onResult: (transcript) => {
        setQuestion(transcript);
        setListening(false);
        void askDoctor(transcript);
      },
      onError: (msg) => {
        setVoiceError(msg);
        setListening(false);
      },
      onEnd: () => {
        setListening(false);
      },
    });

    if (!handle) {
      setListening(false);
    } else {
      recognitionRef.current = handle;
    }
  };

  const handleReplayAnswer = () => {
    if (!answer) return;
    if (speakingAnswer) {
      stopSpeaking();
      setSpeakingAnswer(false);
    } else {
      speakVietnamese(answer, {
        onStart: () => setSpeakingAnswer(true),
        onEnd: () => setSpeakingAnswer(false),
      });
    }
  };

  const cardSurface = darkMode
    ? 'bg-slate-900 border-slate-700 text-white'
    : 'bg-white border-slate-200 text-[#0F172A]';

  return (
    <section
      id="bac-si-ai"
      aria-label="Bác sĩ AI tư vấn sức khỏe"
      className={`border-y py-10 transition-colors ${
        darkMode
          ? 'bg-slate-900/60 border-slate-800 text-white'
          : 'bg-[#F0FDFA]/80 border-teal-100 text-[#0F172A]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.9rem] font-bold text-[#0D9488]">
              Bác sĩ gia đình trực tuyến 24/7
            </p>
            <h2
              className="text-[1.65rem] sm:text-[1.85rem] font-extrabold tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Tư vấn sức khỏe bằng giọng nói &amp; văn bản
            </h2>
            <p
              className={`mt-2 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[0.92rem] font-semibold ${
                darkMode
                  ? 'bg-amber-950/40 border-amber-700/60 text-amber-200'
                  : 'bg-[#FFFBEB] border-amber-200 text-[#92400E]'
              }`}
            >
              <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                <strong>Thông tin chỉ mang tính chất tham khảo.</strong> Không thay thế
                chẩn đoán hay đơn thuốc trực tiếp của bác sĩ chuyên khoa.
              </span>
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-[0.9rem] font-bold transition-colors whitespace-nowrap ${
                  filter === item.id
                    ? 'bg-[#0D9488] text-white shadow-sm'
                    : darkMode
                      ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:border-[#0D9488]'
                      : 'bg-white text-[#334155] border border-slate-200 hover:border-[#0D9488]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {visibleQuestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void askDoctor(item.question)}
              disabled={loading}
              className={`text-left rounded-[20px] p-5 border hover:border-[#0D9488] shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group ${cardSurface}`}
            >
              <div>
                <p className="text-[0.85rem] font-bold text-[#0D9488]">
                  {item.categoryLabel}
                </p>
                <h3 className="text-[1.08rem] font-extrabold mt-1 group-hover:text-[#0D9488] leading-snug">
                  {item.question}
                </h3>
                <p
                  className={`text-[0.92rem] mt-1.5 ${
                    darkMode ? 'text-slate-300' : 'text-[#475569]'
                  }`}
                >
                  {item.summary}
                </p>
              </div>
              <span className="text-[0.9rem] font-bold text-[#0056B3] dark:text-sky-300">
                Chạm để hỏi ngay →
              </span>
            </button>
          ))}
        </div>

        <div className={`rounded-[24px] p-6 border shadow-sm flex flex-col gap-4 ${cardSurface}`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <button
              type="button"
              onClick={handleToggleMic}
              className={`lg:col-span-4 min-h-[60px] rounded-2xl px-5 py-3 text-white font-extrabold text-[1rem] flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-[0.99] ${
                listening
                  ? 'bg-[#DC2626] shadow-[#DC2626]/25'
                  : 'bg-[#0D9488] hover:bg-[#0F766E] shadow-[#0D9488]/20'
              }`}
            >
              {listening ? (
                <>
                  <MicOff className="w-6 h-6 shrink-0" aria-hidden="true" />
                  <span>Đang nghe... Bấm để dừng</span>
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6 shrink-0" aria-hidden="true" />
                  <span>Hỏi Bác sĩ bằng giọng nói</span>
                </>
              )}
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void askDoctor(question);
              }}
              className="lg:col-span-8 flex items-stretch gap-3"
            >
              <label htmlFor="web-doctor-input" className="sr-only">
                Nhập câu hỏi sức khỏe cho Bác sĩ AI
              </label>
              <input
                id="web-doctor-input"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Nhập triệu chứng hoặc tình trạng hiện tại (ví dụ: mệt, chóng mặt, huyết áp cao...)"
                className={`flex-1 min-w-0 min-h-[60px] rounded-2xl border px-4 text-[1rem] focus:outline-none focus:ring-4 focus:ring-[#0D9488]/25 focus:border-[#0D9488] ${
                  darkMode
                    ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-400'
                    : 'bg-[#F8FAFC] border-slate-300 text-[#0F172A] placeholder:text-slate-500'
                }`}
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="min-h-[60px] px-6 rounded-2xl bg-[#0056B3] hover:bg-[#0284C7] disabled:bg-slate-400 text-white font-bold text-[1rem] flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <Send className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>Gửi câu hỏi</span>
              </button>
            </form>
          </div>

          {voiceError && (
            <p className="rounded-xl bg-[#FFFBEB] text-[#B45309] px-4 py-2.5 text-[0.92rem] font-medium">
              {voiceError}
            </p>
          )}

          {(loading || answer) && (
            <div
              className={`rounded-2xl border p-5 flex flex-col gap-3 ${
                darkMode
                  ? 'bg-slate-800 border-teal-700'
                  : 'bg-[#F0FDFA] border-[#0D9488]/25'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#0D9488] font-bold text-[0.98rem]">
                  <Stethoscope className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>
                    {lastAsked ? `Câu hỏi: "${lastAsked}"` : 'Lời khuyên từ Bác sĩ AI'}
                  </span>
                </div>
                {answer && !loading && (
                  <button
                    type="button"
                    onClick={handleReplayAnswer}
                    className="min-h-[44px] px-4 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-[0.9rem] flex items-center gap-2 whitespace-nowrap"
                  >
                    {speakingAnswer ? (
                      <>
                        <VolumeX className="w-5 h-5 shrink-0" aria-hidden="true" />
                        <span>Dừng đọc</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                        <span>Đọc to lời khuyên</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {loading ? (
                <p className="text-[1.05rem] font-bold text-[#0056B3] dark:text-sky-300">
                  Bác sĩ đang phân tích triệu chứng của bác để hướng dẫn đúng trọng tâm...
                </p>
              ) : (
                <>
                  <p className="text-[1.06rem] leading-relaxed font-medium whitespace-pre-line">
                    {answer}
                  </p>
                  <p
                    className={`text-[0.86rem] font-semibold pt-2 border-t flex items-center gap-1.5 ${
                      darkMode
                        ? 'border-teal-800/70 text-amber-300'
                        : 'border-[#0D9488]/20 text-[#92400E]'
                    }`}
                  >
                    <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      Thông tin chỉ mang tính chất tham khảo. Khi có dấu hiệu nguy hiểm,
                      vui lòng gọi 115 hoặc dùng Mục SOS Khẩn cấp.
                    </span>
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
