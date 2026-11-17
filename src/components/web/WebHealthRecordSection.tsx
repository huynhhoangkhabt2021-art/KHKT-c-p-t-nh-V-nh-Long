import {
  ClipboardList,
  FileSpreadsheet,
  HeartHandshake,
  Printer,
  Save,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  FeelingMood,
  MedicalRecordProfile,
  SmartHealthState,
} from '../../types/health';
import { createEmptyMedicalRecord } from '../../utils/healthLogic';
import { WebMoodAndFamilySection } from './WebMoodAndFamilySection';

interface WebHealthRecordSectionProps {
  state: SmartHealthState;
  darkMode: boolean;
  onSaveMedicalRecord: (record: MedicalRecordProfile) => Promise<void>;
  onSendFeeling: (
    mood: FeelingMood | 'Ghi chú',
    note?: string
  ) => Promise<void>;
  onTriggerPoorHealthAlert: (reason: string, note?: string) => Promise<void>;
}

type RecordSubTab = 'emr' | 'mood-journal';

export function WebHealthRecordSection({
  state,
  darkMode,
  onSaveMedicalRecord,
  onSendFeeling,
  onTriggerPoorHealthAlert,
}: WebHealthRecordSectionProps) {
  const [subTab, setSubTab] = useState<RecordSubTab>('emr');
  const [record, setRecord] = useState<MedicalRecordProfile>(() => ({
    ...createEmptyMedicalRecord(),
    ...state.medicalRecord,
  }));
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setRecord({
      ...createEmptyMedicalRecord(),
      ...state.medicalRecord,
    });
  }, [state.medicalRecord]);

  const updateField = <K extends keyof MedicalRecordProfile>(
    key: K,
    value: MedicalRecordProfile[K]
  ) => {
    setRecord((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveMedicalRecord(record);
      setSaveMessage('Đã lưu Hồ sơ Bệnh án Điện tử vào hệ thống.');
    } finally {
      setSaving(false);
    }
  };

  const cardSurface = darkMode
    ? 'bg-slate-900 border-slate-700 text-white'
    : 'bg-white border-slate-200 text-[#0F172A]';
  const inputSurface = darkMode
    ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-400'
    : 'bg-[#F8FAFC] border-slate-300 text-[#0F172A] placeholder:text-slate-400';
  const sectionBarClass = darkMode
    ? 'bg-sky-950/60 border-l-4 border-[#0284C7] text-sky-200'
    : 'bg-[#E6EEF8] border-l-4 border-[#1E4E8C] text-[#1E3A5F]';

  return (
    <section
      id="ho-so-suc-khoe"
      aria-label="Hồ sơ sức khỏe & Cảm nhận hôm nay"
      className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-6"
    >
      {/* Top Sub-navigation */}
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <p className="text-[0.9rem] font-bold text-[#0D9488] flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Quản lý Hồ sơ Bệnh án Điện tử &amp; Theo dõi Cảm nhận hàng ngày</span>
          </p>
          <h2 className="text-[1.85rem] font-extrabold tracking-tight">
            Hồ sơ sức khỏe
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('emr')}
            className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-[0.92rem] flex items-center gap-2 whitespace-nowrap transition-colors ${
              subTab === 'emr'
                ? 'bg-[#1E4E8C] text-white shadow-sm'
                : darkMode
                  ? 'bg-slate-800 text-slate-200 border border-slate-700'
                  : 'bg-white text-[#334155] border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Hồ sơ Bệnh án Điện tử</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('mood-journal')}
            className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-[0.92rem] flex items-center gap-2 whitespace-nowrap transition-colors ${
              subTab === 'mood-journal'
                ? 'bg-[#0D9488] text-white shadow-sm'
                : darkMode
                  ? 'bg-slate-800 text-slate-200 border border-slate-700'
                  : 'bg-white text-[#334155] border border-slate-200'
            }`}
          >
            <HeartHandshake className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Cảm nhận hôm nay &amp; Nhật ký gia đình</span>
          </button>
        </div>
      </div>

      {subTab === 'mood-journal' ? (
        <WebMoodAndFamilySection
          state={state}
          darkMode={darkMode}
          onSendFeeling={onSendFeeling}
          onTriggerPoorHealthAlert={onTriggerPoorHealthAlert}
        />
      ) : (
        <div
          className={`rounded-[24px] border shadow-sm p-6 sm:p-8 flex flex-col gap-6 ${cardSurface}`}
        >
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4 print:hidden">
            <p className="text-[0.9rem] opacity-80">
              Biểu mẫu tiêu chuẩn chừa trống để gia đình hoặc nhân viên y tế tự nhập liệu chính xác.
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className={`min-h-[42px] px-4 py-2 rounded-xl border font-bold text-[0.9rem] flex items-center gap-2 ${
                  darkMode
                    ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
                    : 'bg-slate-100 border-slate-300 text-[#1E293B] hover:bg-slate-200'
                }`}
              >
                <Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>In / Xuất PDF</span>
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-[0.92rem] flex items-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{saving ? 'Đang lưu...' : 'Lưu hồ sơ bệnh án'}</span>
              </button>
            </div>
          </div>

          {saveMessage && (
            <div
              role="status"
              className="rounded-xl bg-[#F0FDF4] border border-[#16A34A]/35 px-4 py-3 text-[0.94rem] font-bold text-[#15803D] print:hidden"
            >
              {saveMessage}
            </div>
          )}

          {/* Top Clinical Administrative Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b-2 border-[#1E4E8C] pb-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-[0.88rem] font-bold w-44 shrink-0">
                  Cơ quan chủ quản:
                </label>
                <input
                  type="text"
                  value={record.managingAgency}
                  onChange={(e) => updateField('managingAgency', e.target.value)}
                  className={`flex-1 min-h-[38px] rounded-lg border px-2.5 text-[0.92rem] ${inputSurface}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[0.88rem] font-bold w-44 shrink-0">
                  Cơ sở khám, chữa bệnh:
                </label>
                <input
                  type="text"
                  value={record.facilityName}
                  onChange={(e) => updateField('facilityName', e.target.value)}
                  className={`flex-1 min-h-[38px] rounded-lg border px-2.5 text-[0.92rem] ${inputSurface}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[0.88rem] font-bold w-44 shrink-0">
                  Khoa / Phòng:
                </label>
                <input
                  type="text"
                  value={record.department}
                  onChange={(e) => updateField('department', e.target.value)}
                  className={`flex-1 min-h-[38px] rounded-lg border px-2.5 text-[0.92rem] ${inputSurface}`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-[0.88rem] font-bold w-44 shrink-0">
                  Mã bệnh nhân (PID):
                </label>
                <input
                  type="text"
                  value={record.patientId}
                  onChange={(e) => updateField('patientId', e.target.value)}
                  className={`flex-1 min-h-[38px] rounded-lg border px-2.5 text-[0.92rem] ${inputSurface}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[0.88rem] font-bold w-44 shrink-0">
                  Mã hồ sơ bệnh án:
                </label>
                <input
                  type="text"
                  value={record.recordCode}
                  onChange={(e) => updateField('recordCode', e.target.value)}
                  className={`flex-1 min-h-[38px] rounded-lg border px-2.5 text-[0.92rem] ${inputSurface}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[0.88rem] font-bold w-44 shrink-0">
                  Số lưu trữ điện tử:
                </label>
                <input
                  type="text"
                  value={record.archiveNumber}
                  onChange={(e) => updateField('archiveNumber', e.target.value)}
                  className={`flex-1 min-h-[38px] rounded-lg border px-2.5 text-[0.92rem] ${inputSurface}`}
                />
              </div>
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-[1.5rem] font-extrabold text-[#1E4E8C] dark:text-sky-300 tracking-wide">
              HỒ SƠ BỆNH ÁN ĐIỆN TỬ
            </h3>
            <p className="text-[0.9rem] opacity-75">
              (Biểu mẫu tiêu chuẩn - Chừa trống thông tin nhập liệu)
            </p>
          </div>

          {/* Section I */}
          <div className="flex flex-col gap-3">
            <h4 className={`px-3.5 py-2 font-extrabold text-[1rem] rounded-r-lg ${sectionBarClass}`}>
              I. THÔNG TIN HÀNH CHÍNH &amp; ĐỊNH DANH NGƯỜI BỆNH
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[0.92rem]">
              <div>
                <label className="font-bold block mb-1">1. Họ và tên (In hoa):</label>
                <input
                  type="text"
                  value={record.fullNameUpper}
                  onChange={(e) => updateField('fullNameUpper', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 uppercase ${inputSurface}`}
                />
              </div>
              <div>
                <label className="font-bold block mb-1">2. Ngày sinh:</label>
                <input
                  type="text"
                  placeholder="dd / mm / yyyy"
                  value={record.birthDate}
                  onChange={(e) => updateField('birthDate', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>
              <div>
                <span className="font-bold block mb-1">3. Giới tính:</span>
                <div className="flex flex-wrap gap-4 pt-1">
                  {(['Nam', 'Nữ', 'Khác'] as const).map((g) => (
                    <label key={g} className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="radio"
                        name="emr-gender"
                        checked={record.gender === g}
                        onChange={() => updateField('gender', g)}
                        className="w-4 h-4 accent-[#1E4E8C]"
                      />
                      <span>{g}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">4. Dân tộc:</label>
                <input
                  type="text"
                  value={record.ethnicity}
                  onChange={(e) => updateField('ethnicity', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>
              <div>
                <label className="font-bold block mb-1">5. Số CCCD / Mã định danh cá nhân:</label>
                <input
                  type="text"
                  value={record.cccd}
                  onChange={(e) => updateField('cccd', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>
              <div>
                <label className="font-bold block mb-1">6. Nghề nghiệp:</label>
                <input
                  type="text"
                  value={record.occupation}
                  onChange={(e) => updateField('occupation', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>
              <div className="md:col-span-2">
                <label className="font-bold block mb-1">7. Địa chỉ cư trú hiện tại:</label>
                <input
                  type="text"
                  value={record.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>
              <div>
                <span className="font-bold block mb-1">8. Đối tượng:</span>
                <div className="flex flex-wrap gap-4 pt-1">
                  {(['BHYT', 'Thu phí', 'Khác'] as const).map((pt) => (
                    <label key={pt} className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="radio"
                        name="emr-payment"
                        checked={record.paymentType === pt}
                        onChange={() => updateField('paymentType', pt)}
                        className="w-4 h-4 accent-[#1E4E8C]"
                      />
                      <span>{pt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">9. Số thẻ BHYT:</label>
                <input
                  type="text"
                  value={record.bhytCode}
                  onChange={(e) => updateField('bhytCode', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>
              <div>
                <label className="font-bold block mb-1">10. Họ tên người nhà (khi cần báo tin):</label>
                <input
                  type="text"
                  value={record.emergencyContactName}
                  onChange={(e) => updateField('emergencyContactName', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>
              <div>
                <label className="font-bold block mb-1">11. Số điện thoại:</label>
                <input
                  type="tel"
                  value={record.emergencyContactPhone}
                  onChange={(e) => updateField('emergencyContactPhone', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>
              <div className="md:col-span-2">
                <label className="font-bold block mb-1">12. Thời gian tiếp nhận / vào viện:</label>
                <input
                  type="text"
                  placeholder="... giờ ... phút, ngày ... / ... / ......"
                  value={record.admissionTime}
                  onChange={(e) => updateField('admissionTime', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>
            </div>
          </div>

          {/* Section II */}
          <div className="flex flex-col gap-3">
            <h4 className={`px-3.5 py-2 font-extrabold text-[1rem] rounded-r-lg ${sectionBarClass}`}>
              II. LÝ DO KHÁM BỆNH &amp; TIỀN SỬ BỆNH LÝ
            </h4>
            <div>
              <label className="font-bold block mb-1 text-[0.92rem]">
                1. Lý do đến khám / vào viện:
              </label>
              <textarea
                rows={2}
                value={record.chiefComplaint}
                onChange={(e) => updateField('chiefComplaint', e.target.value)}
                className={`w-full rounded-xl border p-3 text-[0.92rem] ${inputSurface}`}
              />
            </div>
            <div>
              <label className="font-bold block mb-1 text-[0.92rem]">
                2. Quá trình bệnh lý (Diễn biến từ khi khởi phát đến lúc khám):
              </label>
              <textarea
                rows={3}
                value={record.illnessHistory}
                onChange={(e) => updateField('illnessHistory', e.target.value)}
                className={`w-full rounded-xl border p-3 text-[0.92rem] ${inputSurface}`}
              />
            </div>
            <div>
              <p className="font-bold mb-1.5 text-[0.92rem]">
                3. Tiền sử bệnh &amp; Yếu tố nguy cơ:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 text-[0.9rem]">
                  <thead>
                    <tr className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
                      <th className="border border-slate-300 p-2.5 text-left w-1/3">
                        Phân loại tiền sử
                      </th>
                      <th className="border border-slate-300 p-2.5 text-center w-1/5">
                        Tình trạng
                      </th>
                      <th className="border border-slate-300 p-2.5 text-left">
                        Chi tiết cụ thể (Tên thuốc, bệnh nền, thời gian...)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        {
                          key: 'allergyHistory',
                          label: 'Tiền sử dị ứng (Thuốc, thực phẩm...)',
                        },
                        {
                          key: 'personalHistory',
                          label: 'Tiền sử bệnh bản thân',
                        },
                        {
                          key: 'familyHistory',
                          label: 'Tiền sử bệnh gia đình',
                        },
                      ] as const
                    ).map((row) => {
                      const rowData = record[row.key];
                      return (
                        <tr key={row.key}>
                          <td className="border border-slate-300 p-2.5 font-semibold">
                            {row.label}
                          </td>
                          <td className="border border-slate-300 p-2.5 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`hist-${row.key}`}
                                  checked={rowData.status === 'Khong'}
                                  onChange={() =>
                                    updateField(row.key, { ...rowData, status: 'Khong' })
                                  }
                                />
                                <span>Không</span>
                              </label>
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`hist-${row.key}`}
                                  checked={rowData.status === 'Co'}
                                  onChange={() =>
                                    updateField(row.key, { ...rowData, status: 'Co' })
                                  }
                                />
                                <span>Có</span>
                              </label>
                            </div>
                          </td>
                          <td className="border border-slate-300 p-2">
                            <input
                              type="text"
                              value={rowData.details}
                              onChange={(e) =>
                                updateField(row.key, { ...rowData, details: e.target.value })
                              }
                              className={`w-full min-h-[36px] rounded border px-2.5 ${inputSurface}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section III */}
          <div className="flex flex-col gap-3">
            <h4 className={`px-3.5 py-2 font-extrabold text-[1rem] rounded-r-lg ${sectionBarClass}`}>
              III. KHÁM LÂM SÀNG
            </h4>
            <div className="rounded-xl border border-slate-300 p-3">
              <p className="font-bold text-center text-[0.92rem] mb-2.5">
                Chỉ số dấu hiệu sinh tồn
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-[0.88rem]">
                {[
                  { key: 'pulse', label: 'Mạch (l/ph)' },
                  { key: 'temperature', label: 'Nhiệt độ (°C)' },
                  { key: 'bloodPressure', label: 'Huyết áp (mmHg)' },
                  { key: 'respiratoryRate', label: 'Nhịp thở (l/ph)' },
                  { key: 'weight', label: 'Cân nặng (kg)' },
                  { key: 'height', label: 'Chiều cao (cm)' },
                ].map((v) => (
                  <div key={v.key}>
                    <label className="block font-semibold mb-1">{v.label}</label>
                    <input
                      type="text"
                      value={record[v.key as keyof MedicalRecordProfile] as string}
                      onChange={(e) =>
                        updateField(v.key as keyof MedicalRecordProfile, e.target.value)
                      }
                      className={`w-full min-h-[38px] rounded border px-2 ${inputSurface}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold block mb-1 text-[0.92rem]">
                1. Khám toàn thân (Ý thức, da niêm mạc, tuyến giáp, hạch ngoại vi...):
              </label>
              <textarea
                rows={2}
                value={record.generalExam}
                onChange={(e) => updateField('generalExam', e.target.value)}
                className={`w-full rounded-xl border p-3 text-[0.92rem] ${inputSurface}`}
              />
            </div>
            <div>
              <label className="font-bold block mb-1 text-[0.92rem]">
                2. Khám các cơ quan / chuyên khoa (Tuần hoàn, Hô hấp, Tiêu hóa, Thần kinh, Cơ xương khớp...):
              </label>
              <textarea
                rows={3}
                value={record.organExam}
                onChange={(e) => updateField('organExam', e.target.value)}
                className={`w-full rounded-xl border p-3 text-[0.92rem] ${inputSurface}`}
              />
            </div>
          </div>

          {/* Section IV */}
          <div className="flex flex-col gap-3">
            <h4 className={`px-3.5 py-2 font-extrabold text-[1rem] rounded-r-lg ${sectionBarClass}`}>
              IV. CHỈ ĐỊNH &amp; KẾT QUẢ CẬN LÂM SÀNG
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-[0.9rem]">
                <thead>
                  <tr className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
                    <th className="border border-slate-300 p-2 w-12 text-center">STT</th>
                    <th className="border border-slate-300 p-2 text-left w-1/4">Nhóm dịch vụ</th>
                    <th className="border border-slate-300 p-2 text-left">
                      Tên xét nghiệm / Kỹ thuật chỉ định
                    </th>
                    <th className="border border-slate-300 p-2 text-left">
                      Tóm tắt kết quả / Mã liên kết PACS-LIS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {record.labRows.map((row, idx) => (
                    <tr key={row.stt}>
                      <td className="border border-slate-300 p-2 text-center font-bold">
                        {row.stt}
                      </td>
                      <td className="border border-slate-300 p-2 font-semibold">{row.group}</td>
                      <td className="border border-slate-300 p-1.5">
                        <input
                          type="text"
                          value={row.testName}
                          onChange={(e) => {
                            const next = [...record.labRows];
                            next[idx] = { ...row, testName: e.target.value };
                            updateField('labRows', next);
                          }}
                          className={`w-full min-h-[36px] rounded border px-2 ${inputSurface}`}
                        />
                      </td>
                      <td className="border border-slate-300 p-1.5">
                        <input
                          type="text"
                          value={row.resultSummary}
                          onChange={(e) => {
                            const next = [...record.labRows];
                            next[idx] = { ...row, resultSummary: e.target.value };
                            updateField('labRows', next);
                          }}
                          className={`w-full min-h-[36px] rounded border px-2 ${inputSurface}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section V */}
          <div className="flex flex-col gap-3">
            <h4 className={`px-3.5 py-2 font-extrabold text-[1rem] rounded-r-lg ${sectionBarClass}`}>
              V. CHẨN ĐOÁN &amp; PHÁC ĐỒ ĐIỀU TRỊ
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-[0.92rem]">
              <div className="md:col-span-8">
                <label className="font-bold block mb-1">1. Chẩn đoán sơ bộ:</label>
                <input
                  type="text"
                  value={record.preliminaryDiagnosis}
                  onChange={(e) => updateField('preliminaryDiagnosis', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>
              <div className="md:col-span-4">
                <label className="font-bold block mb-1">Mã ICD-10:</label>
                <input
                  type="text"
                  value={record.preliminaryIcd}
                  onChange={(e) => updateField('preliminaryIcd', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>

              <div className="md:col-span-8">
                <label className="font-bold block mb-1">2. Chẩn đoán xác định (Bệnh chính):</label>
                <input
                  type="text"
                  value={record.confirmedDiagnosis}
                  onChange={(e) => updateField('confirmedDiagnosis', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>
              <div className="md:col-span-4">
                <label className="font-bold block mb-1">Mã ICD-10:</label>
                <input
                  type="text"
                  value={record.confirmedIcd}
                  onChange={(e) => updateField('confirmedIcd', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>

              <div className="md:col-span-8">
                <label className="font-bold block mb-1">3. Bệnh kèm theo (nếu có):</label>
                <input
                  type="text"
                  value={record.comorbidities}
                  onChange={(e) => updateField('comorbidities', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>
              <div className="md:col-span-4">
                <label className="font-bold block mb-1">Mã ICD-10:</label>
                <input
                  type="text"
                  value={record.comorbiditiesIcd}
                  onChange={(e) => updateField('comorbiditiesIcd', e.target.value)}
                  className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
                />
              </div>
            </div>

            <div>
              <p className="font-bold mb-1.5 text-[0.92rem]">
                4. Y lệnh điều trị &amp; Đơn thuốc / Can thiệp thủ thuật:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 text-[0.9rem]">
                  <thead>
                    <tr className={darkMode ? 'bg-slate-800' : 'bg-slate-100'}>
                      <th className="border border-slate-300 p-2 w-12 text-center">STT</th>
                      <th className="border border-slate-300 p-2 text-left">
                        Tên thuốc / Hàm lượng / Thủ thuật
                      </th>
                      <th className="border border-slate-300 p-2 w-24 text-left">Đơn vị</th>
                      <th className="border border-slate-300 p-2 w-24 text-left">Số lượng</th>
                      <th className="border border-slate-300 p-2 text-left">
                        Cách dùng / Liều dùng / Chỉ dẫn
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.prescriptions.map((row, idx) => (
                      <tr key={row.stt}>
                        <td className="border border-slate-300 p-2 text-center font-bold">
                          {row.stt}
                        </td>
                        <td className="border border-slate-300 p-1.5">
                          <input
                            type="text"
                            value={row.drugName}
                            onChange={(e) => {
                              const next = [...record.prescriptions];
                              next[idx] = { ...row, drugName: e.target.value };
                              updateField('prescriptions', next);
                            }}
                            className={`w-full min-h-[36px] rounded border px-2 ${inputSurface}`}
                          />
                        </td>
                        <td className="border border-slate-300 p-1.5">
                          <input
                            type="text"
                            value={row.unit}
                            onChange={(e) => {
                              const next = [...record.prescriptions];
                              next[idx] = { ...row, unit: e.target.value };
                              updateField('prescriptions', next);
                            }}
                            className={`w-full min-h-[36px] rounded border px-2 ${inputSurface}`}
                          />
                        </td>
                        <td className="border border-slate-300 p-1.5">
                          <input
                            type="text"
                            value={row.quantity}
                            onChange={(e) => {
                              const next = [...record.prescriptions];
                              next[idx] = { ...row, quantity: e.target.value };
                              updateField('prescriptions', next);
                            }}
                            className={`w-full min-h-[36px] rounded border px-2 ${inputSurface}`}
                          />
                        </td>
                        <td className="border border-slate-300 p-1.5">
                          <input
                            type="text"
                            value={row.usage}
                            onChange={(e) => {
                              const next = [...record.prescriptions];
                              next[idx] = { ...row, usage: e.target.value };
                              updateField('prescriptions', next);
                            }}
                            className={`w-full min-h-[36px] rounded border px-2 ${inputSurface}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section VI */}
          <div className="flex flex-col gap-3">
            <h4 className={`px-3.5 py-2 font-extrabold text-[1rem] rounded-r-lg ${sectionBarClass}`}>
              VI. TỔNG KẾT HỒ SƠ &amp; KẾT THÚC ĐỢT ĐIỀU TRỊ
            </h4>
            <div>
              <label className="font-bold block mb-1 text-[0.92rem]">
                1. Thời gian kết thúc điều trị / ra viện:
              </label>
              <input
                type="text"
                placeholder="... giờ ... phút, ngày ... / ... / ......"
                value={record.dischargeTime}
                onChange={(e) => updateField('dischargeTime', e.target.value)}
                className={`w-full min-h-[40px] rounded-lg border px-3 ${inputSurface}`}
              />
            </div>
            <div>
              <span className="font-bold block mb-1 text-[0.92rem]">
                2. Tình trạng người bệnh ra viện:
              </span>
              <div className="flex flex-wrap gap-4 pt-1 text-[0.92rem]">
                {(
                  ['Khỏi', 'Đỡ, giảm', 'Không thay đổi', 'Nặng hơn', 'Chuyển tuyến'] as const
                ).map((outcome) => (
                  <label key={outcome} className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="emr-outcome"
                      checked={record.dischargeOutcome === outcome}
                      onChange={() => updateField('dischargeOutcome', outcome)}
                      className="w-4 h-4 accent-[#1E4E8C]"
                    />
                    <span>{outcome}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="font-bold block mb-1 text-[0.92rem]">
                3. Lời dặn của bác sĩ, chế độ dinh dưỡng &amp; Lịch hẹn tái khám:
              </label>
              <textarea
                rows={3}
                value={record.doctorAdvice}
                onChange={(e) => updateField('doctorAdvice', e.target.value)}
                className={`w-full rounded-xl border p-3 text-[0.92rem] ${inputSurface}`}
              />
            </div>
          </div>

          {/* Section VII */}
          <div className="flex flex-col gap-3">
            <h4 className={`px-3.5 py-2 font-extrabold text-[1rem] rounded-r-lg ${sectionBarClass}`}>
              VII. XÁC THỰC ĐIỆN TỬ &amp; CHỮ KÝ SỐ
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-dashed border-slate-300 rounded-xl p-4 text-center text-[0.9rem]">
              <div className="flex flex-col gap-2">
                <p className="font-extrabold">NGƯỜI BỆNH / NGƯỜI ĐẠI DIỆN</p>
                <p className="text-[0.8rem] opacity-75">(Ký điện tử / Xác thực sinh trắc học)</p>
                <input
                  type="text"
                  placeholder="Chữ ký xác nhận..."
                  value={record.patientSignature}
                  onChange={(e) => updateField('patientSignature', e.target.value)}
                  className={`w-full min-h-[40px] rounded border px-2.5 text-center ${inputSurface}`}
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-extrabold">BÁC SĨ KHÁM / ĐIỀU TRỊ</p>
                <p className="text-[0.8rem] opacity-75">(Chữ ký số cá nhân &amp; Dấu thời gian)</p>
                <input
                  type="text"
                  placeholder="Chữ ký bác sĩ..."
                  value={record.doctorSignature}
                  onChange={(e) => updateField('doctorSignature', e.target.value)}
                  className={`w-full min-h-[40px] rounded border px-2.5 text-center ${inputSurface}`}
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-extrabold">TRƯỞNG KHOA / GIÁM ĐỐC</p>
                <p className="text-[0.8rem] opacity-75">(Chữ ký số tổ chức &amp; Dấu thời gian)</p>
                <input
                  type="text"
                  placeholder="Chữ ký xác thực..."
                  value={record.directorSignature}
                  onChange={(e) => updateField('directorSignature', e.target.value)}
                  className={`w-full min-h-[40px] rounded border px-2.5 text-center ${inputSurface}`}
                />
              </div>
            </div>
          </div>

          <p className="text-[0.8rem] italic opacity-75">
            Thông tin y tế mang tính tham khảo và lưu trữ theo dõi gia đình; mọi chẩn đoán điều trị thực tế cần tuân thủ hướng dẫn của bác sĩ chuyên khoa.
          </p>
        </div>
      )}
    </section>
  );
}
