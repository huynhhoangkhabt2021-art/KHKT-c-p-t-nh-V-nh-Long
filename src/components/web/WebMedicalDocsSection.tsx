import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
  Link2,
  Plus,
  ShieldAlert,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { CustomMedicalDoc } from '../../types/health';
import { speakVietnamese, stopSpeaking } from '../../utils/speech';

export interface NewCustomDocPayload {
  category: 'emergency' | 'respiratory' | 'medication' | 'daily';
  title: string;
  summaryPoints: string;
  warningSigns?: string;
  firstAidSteps?: string;
  avoidActions?: string;
  citationTitle?: string;
  citationOrg: string;
  citationRef?: string;
  citationUrl: string;
}

interface WebMedicalDocsSectionProps {
  darkMode: boolean;
  customDocs: CustomMedicalDoc[];
  onAddCustomDoc: (payload: NewCustomDocPayload) => Promise<void>;
  onDeleteCustomDoc: (id: string) => Promise<void>;
}

type DocCategory =
  | 'all'
  | 'emergency'
  | 'respiratory'
  | 'medication'
  | 'daily';

interface MedicalDoc {
  id: string;
  category: Exclude<DocCategory, 'all'>;
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
  isCustom?: boolean;
}

const DOC_FILTERS: Array<{ id: DocCategory; label: string }> = [
  { id: 'all', label: 'Tất cả tài liệu' },
  { id: 'emergency', label: 'Cấp cứu & Đột quỵ' },
  { id: 'respiratory', label: 'Hô hấp & Không khí' },
  { id: 'medication', label: 'Uống thuốc an toàn' },
  { id: 'daily', label: 'Chăm sóc hàng ngày' },
];

const MEDICAL_DOCS: MedicalDoc[] = [
  {
    id: 'doc-fast-stroke',
    category: 'emergency',
    categoryLabel: 'Cấp cứu & Đột quỵ',
    title: 'Tóm tắt nhận biết sớm Đột quỵ (Quy tắc F.A.S.T)',
    summaryPoints: [
      'Quan sát nhanh 4 điểm: Méo miệng (Face), Yếu tay chân một bên (Arm), Nói ngọng khó hiểu (Speech), Ghi nhớ giờ khởi phát (Time).',
      'Khi có bất kỳ 1 dấu hiệu nào, gọi ngay 115 để tận dụng giờ vàng cấp cứu.',
    ],
    warningSigns: [
      'Méo miệng, một bên mặt xệ xuống khi cười.',
      'Tê yếu một bên tay/chân, không nhấc đều hai tay.',
      'Nói dính chữ, nói ngọng đột ngột hoặc không hiểu lời nói.',
    ],
    firstAidSteps: [
      'Gọi ngay 115 hoặc bấm nút SOS Khẩn cấp và ghi lại giờ phát hiện.',
      'Đặt người cao tuổi nằm nghiêng an toàn, nới lỏng cổ áo vùng cổ.',
    ],
    avoidActions: [
      'Không tự ý chích máu đầu ngón tay, cạo gió hoặc cho uống thuốc hạ áp.',
      'Không cho ăn uống lúc đang lơ mơ hoặc nói khó vì dễ sặc.',
    ],
    citationTitle: 'Hướng dẫn chẩn đoán và xử trí Đột quỵ não',
    citationOrg: 'Bộ Y tế Việt Nam — Cục Quản lý Khám, chữa bệnh',
    citationRef: 'Quyết định số 5331/QĐ-BYT',
    citationUrl: 'https://kcb.vn/',
  },
  {
    id: 'doc-respiratory-mq135',
    category: 'respiratory',
    categoryLabel: 'Hô hấp & Không khí',
    title: 'Tóm tắt bảo vệ hô hấp khi không khí ô nhiễm hoặc khó thở',
    summaryPoints: [
      'Khi cảm biến phòng cảnh báo bụi khí tăng cao, giữ máy lọc chạy tự động và kiểm tra nguồn khói bụi.',
      'Nếu bác khó thở nhẹ, đỡ bác ngồi tựa lưng thoải mái và hướng dẫn thở chúm môi chậm rãi.',
    ],
    warningSigns: [
      'Thở nhanh, khò khè, co kéo cổ khi hít vào.',
      'Tức ngực, ho kéo dài hoặc môi/đầu ngón tay nhợt nhạt.',
    ],
    firstAidSteps: [
      'Đưa tới nơi thoáng khí sạch, ngồi tựa lưng góc 45–60 độ.',
      'Hướng dẫn hít bằng mũi 2 giây, thổi chậm qua môi chúm lại 4 giây; nếu không đỡ gọi 115.',
    ],
    avoidActions: [
      'Không đóng kín phòng khi còn mùi khói bếp, nhang hoặc khí đốt.',
      'Không dùng chung thuốc xịt hô hấp không phải đơn của bác.',
    ],
    citationTitle:
      'Global Air Quality Guidelines & Khuyến cáo bảo vệ sức khỏe hô hấp',
    citationOrg: 'Tổ chức Y tế Thế giới (WHO) & Bộ Y tế Việt Nam',
    citationRef: 'WHO Air Quality Guidelines (ISBN 978-92-4-003422-8)',
    citationUrl: 'https://www.who.int/publications/i/item/9789240034228',
  },
  {
    id: 'doc-hypoglycemia',
    category: 'emergency',
    categoryLabel: 'Cấp cứu & Đột quỵ',
    title: 'Tóm tắt xử trí Hạ đường huyết & Choáng váng đột ngột',
    summaryPoints: [
      'Người lớn tuổi uống thuốc tiểu đường hoặc ăn kém dễ bị run tay, vã mồ hôi lạnh và hoa mắt.',
      'Nếu còn tỉnh táo, áp dụng nguyên tắc 15–15 bổ sung đường nhanh rồi kiểm tra lại sau 15 phút.',
    ],
    warningSigns: [
      'Run tay chân, vã mồ hôi lạnh, tim đập nhanh.',
      'Hoa mắt, chóng mặt hoặc cáu gắt, lơ mơ bất thường.',
    ],
    firstAidSteps: [
      'Cho ngồi hoặc nằm xuống ngay để tránh té ngã.',
      'Nếu tỉnh táo hoàn toàn: uống nửa cốc nước đường ấm hoặc 3–4 viên kẹo đường; đợi 15 phút rồi cho ăn bữa nhẹ.',
    ],
    avoidActions: [
      'Tuyệt đối không đổ nước hay thức ăn vào miệng khi người bệnh đang lơ mơ.',
      'Không đứng bật dậy nhanh ngay sau khi nằm.',
    ],
    citationTitle: 'Hướng dẫn chẩn đoán và điều trị Đái tháo đường típ 2',
    citationOrg: 'Bộ Y tế Việt Nam & Hiệp hội Đái tháo đường Hoa Kỳ (ADA)',
    citationRef: 'Quyết định số 5481/QĐ-BYT',
    citationUrl: 'https://kcb.vn/',
  },
  {
    id: 'doc-med-safety',
    category: 'medication',
    categoryLabel: 'Uống thuốc an toàn',
    title: 'Tóm tắt nguyên tắc uống thuốc an toàn theo 4 khay',
    summaryPoints: [
      'Phân rõ liều theo Sáng – Trưa – Chiều – Tối và đọc kỹ ghi chú trước khi uống (trước ăn hay ăn no xong mới uống).',
      'Luôn uống ở tư thế ngồi thẳng với nước lọc ấm; không tự ý uống gấp đôi liều nếu lỡ quên.',
    ],
    warningSigns: [
      'Nhầm giờ giữa cữ sáng và cữ tối.',
      'Nôn ói, nổi mẩn đỏ hoặc ngứa sau khi dùng thuốc.',
    ],
    firstAidSteps: [
      'Kiểm tra nhãn thuốc và ghi chú trên khay trước khi đưa bác uống.',
      'Nếu quên gần sát giờ cữ sau thì bỏ qua cữ cũ và uống cữ mới đúng giờ.',
    ],
    avoidActions: [
      'Không tự bẻ hoặc nghiền viên phóng thích chậm (SR/XR) khi chưa hỏi dược sĩ.',
      'Không uống thuốc với trà đặc, cà phê hoặc nước trái cây bưởi.',
    ],
    citationTitle:
      'Dược thư Quốc gia Việt Nam & Chương trình An toàn dùng thuốc',
    citationOrg: 'Bộ Y tế Việt Nam & Tổ chức Y tế Thế giới (WHO)',
    citationRef: 'Dược thư Quốc gia VN (Lần xuất bản 3) · WHO-HIS-SDS',
    citationUrl: 'https://www.who.int/initiatives/medication-without-harm',
  },
  {
    id: 'doc-dht22-heat-cold',
    category: 'daily',
    categoryLabel: 'Chăm sóc hàng ngày',
    title: 'Tóm tắt giữ ổn định nhiệt độ & độ ẩm phòng cho người cao tuổi',
    summaryPoints: [
      'Môi trường phòng dễ chịu cho giấc ngủ và tim mạch thường nằm quanh 24–28°C với độ ẩm 45–65%.',
      'Tránh chênh lệch nhiệt độ quá lớn giữa phòng máy lạnh và ngoài trời để phòng sốc nhiệt.',
    ],
    warningSigns: [
      'Phòng quá nóng (> 33°C), quá lạnh (< 16°C) hoặc nồm ẩm (> 82%).',
      'Khô họng, đau khớp gối khi trời ẩm lạnh hoặc mệt lả khi nắng nóng.',
    ],
    firstAidSteps: [
      'Giữ ấm vùng cổ, ngực, bàn chân và hai gối khi trời lạnh.',
      'Nhắc bác uống nước ấm từng ngụm nhỏ đều đặn trong ngày.',
    ],
    avoidActions: [
      'Không để luồng gió máy lạnh thổi trực tiếp vào đầu hoặc ngực.',
      'Không tắm nước quá lạnh hoặc tắm quá khuya sau 21 giờ.',
    ],
    citationTitle:
      'Khuyến cáo bảo vệ sức khỏe người cao tuổi trước biến đổi thời tiết',
    citationOrg: 'Cục Y tế Dự phòng — Bộ Y tế VN & CDC Hoa Kỳ',
    citationRef: 'CDC Older Adults Heat & Cold Guidance',
    citationUrl: 'https://www.cdc.gov/extreme-heat/risk-factors/older-adults.html',
  },
  {
    id: 'doc-fall-prevention',
    category: 'daily',
    categoryLabel: 'Chăm sóc hàng ngày',
    title: 'Tóm tắt xử trí ban đầu khi người cao tuổi trượt ngã tại nhà',
    summaryPoints: [
      'Khi bác bị ngã, giữ bình tĩnh kiểm tra ý thức và vùng đau trước khi đỡ dậy.',
      'Nếu nghi ngờ đau dữ dội vùng hông, lưng hoặc đầu, giữ nguyên tư thế và gọi 115.',
    ],
    warningSigns: [
      'Đau nhói vùng háng, cột sống, cổ tay hoặc vùng đầu.',
      'Choáng váng, buồn nôn hoặc không nhấc chân được.',
    ],
    firstAidSteps: [
      'Trấn an bác nằm yên vài phút để đánh giá cảm giác đau.',
      'Nếu không có chấn thương nặng: đỡ lăn nhẹ sang bên, chống tay ngồi lên từ từ.',
    ],
    avoidActions: [
      'Tuyệt đối không bế xốc nách kéo đứng dậy ngay hoặc xoa dầu nóng lên vùng nghi gãy xương.',
      'Không để thảm trơn hoặc lối đi thiếu đèn ngủ ban đêm.',
    ],
    citationTitle:
      'Step Safely: Chiến lược phòng ngừa và xử trí té ngã ở người cao tuổi',
    citationOrg: 'Tổ chức Y tế Thế giới (WHO) & Bệnh viện Lão khoa TW',
    citationRef: 'WHO Step Safely Report (ISBN 978-92-4-002191-4)',
    citationUrl: 'https://www.who.int/publications/i/item/9789240021914',
  },
];

export function WebMedicalDocsSection({
  darkMode,
  customDocs,
  onAddCustomDoc,
  onDeleteCustomDoc,
}: WebMedicalDocsSectionProps) {
  const [filter, setFilter] = useState<DocCategory>('all');
  const [selectedDoc, setSelectedDoc] = useState<MedicalDoc | null>(null);
  const [speakingDocId, setSpeakingDocId] = useState<string | null>(null);

  // Add Custom Document Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [category, setCategory] =
    useState<NewCustomDocPayload['category']>('daily');
  const [title, setTitle] = useState('');
  const [summaryPoints, setSummaryPoints] = useState('');
  const [warningSigns, setWarningSigns] = useState('');
  const [firstAidSteps, setFirstAidSteps] = useState('');
  const [avoidActions, setAvoidActions] = useState('');
  const [citationOrg, setCitationOrg] = useState('');
  const [citationRef, setCitationRef] = useState('');
  const [citationUrl, setCitationUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allDocs: MedicalDoc[] = [
    ...customDocs.map((d) => ({ ...d, isCustom: true })),
    ...MEDICAL_DOCS,
  ];

  const visibleDocs =
    filter === 'all' ? allDocs : allDocs.filter((d) => d.category === filter);

  const handleToggleReadDoc = (doc: MedicalDoc) => {
    if (speakingDocId === doc.id) {
      stopSpeaking();
      setSpeakingDocId(null);
      return;
    }
    const text = `${doc.title}. ${doc.summaryPoints.join(' ')} ${
      doc.firstAidSteps.length > 0
        ? `Các bước xử trí: ${doc.firstAidSteps.join('. ')}.`
        : ''
    } Nguồn gốc: ${doc.citationOrg}.`;
    speakVietnamese(text, {
      onStart: () => setSpeakingDocId(doc.id),
      onEnd: () => setSpeakingDocId(null),
    });
  };

  const resetForm = () => {
    setCategory('daily');
    setTitle('');
    setSummaryPoints('');
    setWarningSigns('');
    setFirstAidSteps('');
    setAvoidActions('');
    setCitationOrg('');
    setCitationRef('');
    setCitationUrl('');
    setFormError(null);
  };

  const handleSubmitCustomDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanSummary = summaryPoints.trim();
    const cleanOrg = citationOrg.trim();
    const cleanUrl = citationUrl.trim();

    if (!cleanTitle || !cleanSummary || !cleanOrg || !cleanUrl) {
      setFormError(
        'Vui lòng nhập đầy đủ Tiêu đề, Tóm tắt nội dung, Nguồn gốc tài liệu và Đường link dẫn bài báo.'
      );
      return;
    }
    if (!/^https?:\/\/\S+/i.test(cleanUrl)) {
      setFormError(
        'Đường link dẫn bài báo phải là URL hợp lệ (bắt đầu bằng https:// hoặc http://).'
      );
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      await onAddCustomDoc({
        category,
        title: cleanTitle,
        summaryPoints: cleanSummary,
        warningSigns: warningSigns.trim() || undefined,
        firstAidSteps: firstAidSteps.trim() || undefined,
        avoidActions: avoidActions.trim() || undefined,
        citationOrg: cleanOrg,
        citationRef: citationRef.trim() || undefined,
        citationUrl: cleanUrl,
      });
      resetForm();
      setAddModalOpen(false);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Không thể lưu tài liệu mới, vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const cardSurface = darkMode
    ? 'bg-slate-900 border-slate-700 text-white'
    : 'bg-white border-slate-200 text-[#0F172A]';
  const inputSurface = darkMode
    ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-400'
    : 'bg-[#F8FAFC] border-slate-300 text-[#0F172A] placeholder:text-slate-400';

  return (
    <section
      id="tai-lieu-y-te"
      aria-label="Tài liệu y tế tóm tắt có trích dẫn khoa học"
      className="max-w-7xl mx-auto px-4 sm:px-6 py-10"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-[0.9rem] font-bold text-[#0D9488] flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Bản tóm tắt ngắn gọn · Trích dẫn nguồn gốc &amp; đường link bài báo bên dưới</span>
            </p>
            <h2 className="text-[1.85rem] font-extrabold tracking-tight">
              Tài liệu y tế dành cho gia đình
            </h2>
            <p
              className={`mt-1.5 text-[0.96rem] max-w-[66ch] ${
                darkMode ? 'text-slate-300' : 'text-[#475569]'
              }`}
            >
              Nội dung được tóm tắt ngắn gọn để gia đình nắm nhanh kỹ năng cơ bản, kèm đầy đủ nguồn gốc và đường link bài báo gốc ngay dưới mỗi tài liệu. Gia đình có thể thêm tài liệu tham khảo mới.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setAddModalOpen(true);
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0056B3] hover:bg-[#0284C7] text-white font-extrabold text-[0.9rem] flex items-center gap-2 shadow-sm whitespace-nowrap transition-colors"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Thêm tài liệu tham khảo</span>
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {DOC_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`min-h-[42px] px-3.5 py-2 rounded-xl text-[0.88rem] font-bold transition-colors whitespace-nowrap ${
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

        {/* Concise Summarized Cards with Citation & Link Directly Below */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleDocs.map((doc) => (
            <article
              key={doc.id}
              className={`rounded-[22px] p-6 border shadow-sm hover:shadow-md hover:border-[#0D9488]/60 transition-all flex flex-col justify-between gap-4 ${cardSurface}`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-[#F0FDFA] text-[#0F766E] border border-teal-200 text-[0.8rem] font-extrabold">
                      {doc.categoryLabel}
                    </span>
                    {doc.isCustom && (
                      <span className="px-2 py-0.5 rounded-lg bg-[#EFF6FF] text-[#0056B3] border border-sky-200 text-[0.76rem] font-extrabold">
                        Gia đình thêm
                      </span>
                    )}
                  </div>
                  {doc.isCustom ? (
                    <button
                      type="button"
                      onClick={() => void onDeleteCustomDoc(doc.id)}
                      aria-label={`Xóa tài liệu "${doc.title}"`}
                      className="min-w-[34px] min-h-[34px] rounded-lg border border-red-200 text-[#DC2626] hover:bg-red-50 flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <FileText
                      className="w-4 h-4 text-[#0D9488] shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <h3 className="text-[1.1rem] font-extrabold leading-snug">
                  {doc.title}
                </h3>

                <ul
                  className={`text-[0.9rem] leading-relaxed list-disc pl-4 space-y-1.5 ${
                    darkMode ? 'text-slate-300' : 'text-[#334155]'
                  }`}
                >
                  {doc.summaryPoints.map((pt, idx) => (
                    <li key={`${doc.id}-pt-${idx}`}>{pt}</li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3 pt-3 border-t border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(doc)}
                  className="min-h-[44px] w-full rounded-xl bg-[#0056B3] hover:bg-[#0284C7] text-white font-bold text-[0.92rem] flex items-center justify-center gap-2 transition-colors"
                >
                  <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Đọc chi tiết tóm tắt</span>
                </button>

                {/* Citation + Direct Article URL Explicitly Below Each Document */}
                <div
                  className={`rounded-xl border p-3 text-[0.8rem] leading-snug flex flex-col gap-1 ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-300'
                      : 'bg-[#F8FAFC] border-slate-200 text-[#334155]'
                  }`}
                >
                  <p className="font-extrabold text-[#0056B3] dark:text-sky-300">
                    Nguồn gốc: {doc.citationOrg}
                  </p>
                  <p>
                    {doc.citationTitle} ({doc.citationRef})
                  </p>
                  <div className="pt-0.5">
                    <span className="font-bold opacity-85">Link bài báo: </span>
                    <a
                      href={doc.citationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-[#0D9488] hover:underline break-all"
                    >
                      <span>{doc.citationUrl}</span>
                      <ExternalLink
                        className="w-3.5 h-3.5 shrink-0"
                        aria-hidden="true"
                      />
                    </a>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Add Custom Document Modal */}
      {addModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Thêm tài liệu y tế tham khảo mới"
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddModalOpen(false);
          }}
        >
          <div
            className={`w-full max-w-2xl rounded-[24px] border p-6 sm:p-8 shadow-2xl my-auto flex flex-col gap-4 max-h-[92vh] overflow-y-auto ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-slate-200 text-[#0F172A]'
            }`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-3">
              <div>
                <h3 className="text-[1.35rem] font-extrabold">
                  Thêm tài liệu y tế tham khảo mới
                </h3>
                <p className="text-[0.88rem] opacity-80 mt-0.5">
                  Lưu ý: Ghi rõ tóm tắt, nguồn gốc chính thống và đường link dẫn tới bài báo gốc.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                aria-label="Đóng biểu mẫu thêm tài liệu"
                className="min-w-[40px] min-h-[40px] rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-500 shrink-0"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleSubmitCustomDoc(e)}
              className="flex flex-col gap-3.5 text-[0.92rem]"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <label
                    htmlFor="doc-category-select"
                    className="block font-bold mb-1"
                  >
                    Nhóm tài liệu *
                  </label>
                  <select
                    id="doc-category-select"
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value as NewCustomDocPayload['category']
                      )
                    }
                    className={`w-full min-h-[42px] rounded-xl border px-3 ${inputSurface}`}
                  >
                    <option value="daily">Chăm sóc hàng ngày</option>
                    <option value="emergency">Cấp cứu &amp; Đột quỵ</option>
                    <option value="respiratory">Hô hấp &amp; Không khí</option>
                    <option value="medication">Uống thuốc an toàn</option>
                  </select>
                </div>
                <div className="sm:col-span-7">
                  <label htmlFor="doc-title-input" className="block font-bold mb-1">
                    Tiêu đề tài liệu / bài viết *
                  </label>
                  <input
                    id="doc-title-input"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Hướng dẫn chăm sóc người cao tuổi tăng huyết áp"
                    className={`w-full min-h-[42px] rounded-xl border px-3 ${inputSurface}`}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="doc-summary-input"
                  className="block font-bold mb-1"
                >
                  Tóm tắt nội dung chính (mỗi ý 1 dòng) *
                </label>
                <textarea
                  id="doc-summary-input"
                  rows={3}
                  required
                  value={summaryPoints}
                  onChange={(e) => setSummaryPoints(e.target.value)}
                  placeholder="Ví dụ:&#10;Đo huyết áp sáng chiều cùng một giờ mỗi ngày.&#10;Hạn chế muối, giữ ấm cơ thể và uống thuốc đúng cữ."
                  className={`w-full rounded-xl border p-3 ${inputSurface}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="doc-org-input"
                    className="block font-bold mb-1"
                  >
                    Nguồn gốc tài liệu (Cơ quan / Tạp chí) *
                  </label>
                  <input
                    id="doc-org-input"
                    type="text"
                    required
                    value={citationOrg}
                    onChange={(e) => setCitationOrg(e.target.value)}
                    placeholder="VD: Bộ Y tế Việt Nam / Bệnh viện Bạch Mai"
                    className={`w-full min-h-[42px] rounded-xl border px-3 ${inputSurface}`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="doc-ref-input"
                    className="block font-bold mb-1"
                  >
                    Mã số / Năm phát hành (nếu có)
                  </label>
                  <input
                    id="doc-ref-input"
                    type="text"
                    value={citationRef}
                    onChange={(e) => setCitationRef(e.target.value)}
                    placeholder="VD: Hướng dẫn Bộ Y tế 2025"
                    className={`w-full min-h-[42px] rounded-xl border px-3 ${inputSurface}`}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="doc-url-input"
                  className="block font-bold mb-1 flex items-center gap-1.5"
                >
                  <Link2 className="w-4 h-4 text-[#0D9488]" aria-hidden="true" />
                  <span>Đường link dẫn tới bài báo gốc (URL) *</span>
                </label>
                <input
                  id="doc-url-input"
                  type="url"
                  required
                  value={citationUrl}
                  onChange={(e) => setCitationUrl(e.target.value)}
                  placeholder="https://moh.gov.vn/..."
                  className={`w-full min-h-[42px] rounded-xl border px-3 ${inputSurface}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="doc-warning-input"
                    className="block font-bold mb-1 text-[0.84rem]"
                  >
                    Dấu hiệu cảnh báo (tùy chọn)
                  </label>
                  <textarea
                    id="doc-warning-input"
                    rows={2}
                    value={warningSigns}
                    onChange={(e) => setWarningSigns(e.target.value)}
                    placeholder="Mỗi ý 1 dòng"
                    className={`w-full rounded-xl border p-2.5 text-[0.86rem] ${inputSurface}`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="doc-steps-input"
                    className="block font-bold mb-1 text-[0.84rem]"
                  >
                    Cách xử trí (tùy chọn)
                  </label>
                  <textarea
                    id="doc-steps-input"
                    rows={2}
                    value={firstAidSteps}
                    onChange={(e) => setFirstAidSteps(e.target.value)}
                    placeholder="Mỗi bước 1 dòng"
                    className={`w-full rounded-xl border p-2.5 text-[0.86rem] ${inputSurface}`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="doc-avoid-input"
                    className="block font-bold mb-1 text-[0.84rem]"
                  >
                    Điều cần tránh (tùy chọn)
                  </label>
                  <textarea
                    id="doc-avoid-input"
                    rows={2}
                    value={avoidActions}
                    onChange={(e) => setAvoidActions(e.target.value)}
                    placeholder="Mỗi ý 1 dòng"
                    className={`w-full rounded-xl border p-2.5 text-[0.86rem] ${inputSurface}`}
                  />
                </div>
              </div>

              {formError && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#FEF2F2] border border-red-200 px-3.5 py-2.5 text-[0.88rem] font-bold text-[#DC2626]"
                >
                  {formError}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-300 font-bold hover:bg-slate-100 text-slate-700"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-6 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-extrabold flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{submitting ? 'Đang lưu...' : 'Lưu tài liệu vào thư viện'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reader Modal */}
      {selectedDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedDoc.title}
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              stopSpeaking();
              setSpeakingDocId(null);
              setSelectedDoc(null);
            }
          }}
        >
          <div
            className={`w-full max-w-3xl rounded-[24px] border p-6 sm:p-8 shadow-2xl my-auto flex flex-col gap-5 max-h-[90vh] overflow-y-auto ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-slate-200 text-[#0F172A]'
            }`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-4">
              <div>
                <span className="inline-block px-2.5 py-1 rounded-lg bg-[#F0FDFA] text-[#0F766E] border border-teal-200 text-[0.82rem] font-extrabold mb-2">
                  {selectedDoc.categoryLabel}
                </span>
                <h3 className="text-[1.4rem] font-extrabold leading-snug">
                  {selectedDoc.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setSpeakingDocId(null);
                  setSelectedDoc(null);
                }}
                aria-label="Đóng tài liệu y tế"
                className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-500 shrink-0"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[0.88rem] font-semibold text-[#92400E] bg-[#FFFBEB] border border-amber-200 rounded-xl px-3.5 py-2 flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Nội dung tóm tắt chỉ mang tính chất tham khảo. Khi nguy cấp hãy gọi 115.</span>
              </p>

              <button
                type="button"
                onClick={() => handleToggleReadDoc(selectedDoc)}
                className="min-h-[44px] px-4 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-[0.9rem] flex items-center gap-2 whitespace-nowrap"
              >
                {speakingDocId === selectedDoc.id ? (
                  <>
                    <VolumeX className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Dừng đọc</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Đọc to tóm tắt</span>
                  </>
                )}
              </button>
            </div>

            <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200 p-4 text-[#0F172A]">
              <h4 className="font-extrabold text-[1rem] text-[#0056B3] mb-2">
                Nội dung tóm tắt
              </h4>
              <ul className="flex flex-col gap-1.5 text-[0.94rem] leading-relaxed list-disc pl-5">
                {selectedDoc.summaryPoints.map((pt, idx) => (
                  <li key={idx}>{pt}</li>
                ))}
              </ul>
            </div>

            {selectedDoc.warningSigns.length > 0 && (
              <div className="rounded-2xl bg-[#FEF2F2] border border-red-200 p-4 text-[#0F172A]">
                <h4 className="font-extrabold text-[1rem] text-[#DC2626] flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>Dấu hiệu cần chú ý</span>
                </h4>
                <ul className="flex flex-col gap-1.5 text-[0.94rem] leading-relaxed list-disc pl-5">
                  {selectedDoc.warningSigns.map((sign, idx) => (
                    <li key={idx}>{sign}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedDoc.firstAidSteps.length > 0 && (
              <div className="rounded-2xl bg-[#F0FDF4] border border-green-200 p-4 text-[#0F172A]">
                <h4 className="font-extrabold text-[1rem] text-[#15803D] flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>Xử trí ban đầu</span>
                </h4>
                <ol className="flex flex-col gap-1.5 text-[0.94rem] leading-relaxed list-decimal pl-5">
                  {selectedDoc.firstAidSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {selectedDoc.avoidActions.length > 0 && (
              <div className="rounded-2xl bg-[#FFFBEB] border border-amber-200 p-4 text-[#0F172A]">
                <h4 className="font-extrabold text-[1rem] text-[#B45309] flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>Điều cần tránh</span>
                </h4>
                <ul className="flex flex-col gap-1.5 text-[0.94rem] leading-relaxed list-disc pl-5">
                  {selectedDoc.avoidActions.map((avoid, idx) => (
                    <li key={idx}>{avoid}</li>
                  ))}
                </ul>
              </div>
            )}

            <div
              className={`rounded-2xl border p-4 text-[0.9rem] ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-[#F8FAFC] border-slate-200 text-[#1E293B]'
              }`}
            >
              <p className="font-extrabold text-[#0056B3] dark:text-sky-300 uppercase text-[0.82rem] tracking-wide mb-1">
                Nguồn gốc &amp; Đường link bài báo
              </p>
              <p className="font-bold">{selectedDoc.citationTitle}</p>
              <p className="mt-1">
                <strong>Nguồn gốc:</strong> {selectedDoc.citationOrg}
              </p>
              <p className="mt-0.5">
                <strong>Tài liệu:</strong> {selectedDoc.citationRef}
              </p>
              <a
                href={selectedDoc.citationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 font-bold text-[#0D9488] hover:underline break-all"
              >
                <span>{selectedDoc.citationUrl}</span>
                <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
