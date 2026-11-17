import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHealthAlertSmsBody,
  buildSmsHref,
  buildSpeechSummary,
  computeAutoPurifierState,
  computeSosTargetCount,
  createEmptyMedicalRecord,
  evaluateAirQuality,
  evaluateDht22Comfort,
  findDueTrayAlarms,
  formatClockTime,
  getAllTraysSorted,
  getNextPriorityDose,
  getTrayNumberForPeriod,
  groupDosesByPeriod,
  normalizeDocCategoryLabel,
  parseTimeToMinutes,
  resolveSosQuickSlots,
} from './healthLogic';
import type { MedicationDose } from '../types/health';

const sampleDoses: MedicationDose[] = [
  {
    id: 'd4',
    trayNumber: 4,
    period: 'Tối',
    time: '20:30',
    medicineName: 'Thuốc Mỡ Máu',
    dosageNote: '1 viên trước ngủ',
    preMealNote: 'Uống sau ăn tối 1 giờ',
    servoAngle: 135,
    taken: false,
  },
  {
    id: 'd1',
    trayNumber: 1,
    period: 'Sáng',
    time: '07:00',
    medicineName: 'Vitamin B & Dạ Dày',
    dosageNote: '1 viên trước ăn sáng',
    preMealNote: 'Uống trước ăn 30 phút',
    servoAngle: 0,
    taken: true,
    takenAt: '07:05',
  },
  {
    id: 'd1b',
    trayNumber: 1,
    period: 'Sáng',
    time: '08:15',
    medicineName: 'Túm thuốc Huyết áp sáng',
    dosageNote: '1 viên sau ăn no',
    preMealNote: 'Ăn no trước khi uống',
    servoAngle: 0,
    taken: false,
  },
  {
    id: 'd2',
    trayNumber: 2,
    period: 'Trưa',
    time: '12:00',
    medicineName: 'Thuốc Tim mạch',
    dosageNote: '1 viên sau ăn trưa',
    preMealNote: 'Uống với nước ấm',
    servoAngle: 45,
    taken: false,
  },
  {
    id: 'd3',
    trayNumber: 3,
    period: 'Chiều',
    time: '17:30',
    medicineName: 'Thuốc Tiểu Đường',
    dosageNote: '1 viên trước bữa tối',
    preMealNote: 'Đo đường huyết trước khi uống',
    servoAngle: 90,
    taken: false,
  },
];

test('parseTimeToMinutes converts HH:MM accurately', () => {
  assert.equal(parseTimeToMinutes('07:30'), 450);
  assert.equal(parseTimeToMinutes('12:00'), 720);
  assert.equal(parseTimeToMinutes('invalid'), 0);
});

test('getAllTraysSorted orders trays 1..4 and sorts multiple schedules within same tray by time', () => {
  const sorted = getAllTraysSorted(sampleDoses);
  assert.deepEqual(
    sorted.map((d) => `${d.trayNumber}:${d.time}`),
    ['1:07:00', '1:08:15', '2:12:00', '3:17:30', '4:20:30']
  );
});

test('getTrayNumberForPeriod maps Sáng/Trưa/Chiều/Tối to trays 1..4', () => {
  assert.equal(getTrayNumberForPeriod('Sáng'), 1);
  assert.equal(getTrayNumberForPeriod('Trưa'), 2);
  assert.equal(getTrayNumberForPeriod('Chiều'), 3);
  assert.equal(getTrayNumberForPeriod('Tối'), 4);
});

test('getNextPriorityDose returns earliest untaken dose', () => {
  const next = getNextPriorityDose(sampleDoses);
  assert.ok(next);
  assert.equal(next.id, 'd1b');
  assert.equal(next.trayNumber, 1);
});

test('groupDosesByPeriod supports multiple schedules in the same period', () => {
  const grouped = groupDosesByPeriod(sampleDoses);
  assert.equal(grouped['Sáng'].length, 2);
  assert.equal(grouped['Trưa'].length, 1);
  assert.equal(grouped['Chiều'].length, 1);
  assert.equal(grouped['Tối'].length, 1);
});

test('findDueTrayAlarms identifies untaken non-active schedules matching exact time', () => {
  const due = findDueTrayAlarms(sampleDoses, '08:15');
  assert.equal(due.length, 1);
  assert.equal(due[0].id, 'd1b');
  assert.equal(findDueTrayAlarms(sampleDoses, '07:00').length, 0); // already taken
});

test('evaluateAirQuality categorizes AQI pollution levels', () => {
  assert.equal(evaluateAirQuality(32).tone, 'safe');
  assert.equal(evaluateAirQuality(78).tone, 'warning');
  assert.equal(evaluateAirQuality(165).tone, 'danger');
});

test('computeAutoPurifierState turns off for power saving when clean and scales level 1/2/3 by pollution', () => {
  const clean = computeAutoPurifierState(30, 26.4, 58);
  assert.equal(clean.on, false);
  assert.equal(clean.level, 0);

  const light = computeAutoPurifierState(75, 27, 60);
  assert.equal(light.on, true);
  assert.equal(light.level, 1);

  const medium = computeAutoPurifierState(125, 28, 62);
  assert.equal(medium.on, true);
  assert.equal(medium.level, 2);

  const high = computeAutoPurifierState(175, 29, 65);
  assert.equal(high.on, true);
  assert.equal(high.level, 3);
});

test('evaluateDht22Comfort flags out-of-range conditions', () => {
  assert.equal(evaluateDht22Comfort(26.5, 58).tone, 'safe');
  assert.equal(evaluateDht22Comfort(35.2, 85).tone, 'warning');
});

test('buildSpeechSummary describes environment, purifier, and pending trays cleanly', () => {
  const env = {
    aqi: 32,
    mq135Ppm: 165,
    temperature: 26.4,
    humidity: 58,
    source: 'seed' as const,
    updatedAt: '08:00',
  };
  const purifier = computeAutoPurifierState(32, 26.4, 58);
  const summary = buildSpeechSummary(env, purifier, sampleDoses);
  assert.match(summary, /32 AQI/);
  assert.doesNotMatch(summary, /Nhịp tim|SpO2|mmHg/);
});

test('formatClockTime pads hours and minutes', () => {
  const d = new Date(2026, 10, 15, 7, 5);
  assert.equal(formatClockTime(d), '07:05');
});

test('resolveSosQuickSlots maps explicit slots without preset demo contacts', () => {
  const empty = resolveSosQuickSlots([]);
  assert.equal(empty.contact1, null);
  assert.equal(empty.contact2, null);
  assert.equal(empty.doctor, null);
  assert.equal(computeSosTargetCount([]), 1);

  const slotted = resolveSosQuickSlots([
    {
      id: 'c1',
      slot: 'contact1',
      name: 'Chị Lan',
      relationship: 'Con gái',
      phone: '0911222333',
      priority: 1,
    },
    {
      id: 'doc',
      slot: 'doctor',
      name: 'BS. Hùng',
      relationship: 'Bác sĩ gia đình',
      phone: '0988777666',
      priority: 3,
    },
  ]);
  assert.equal(slotted.contact1?.name, 'Chị Lan');
  assert.equal(slotted.contact2, null);
  assert.equal(slotted.doctor?.name, 'BS. Hùng');
  assert.equal(computeSosTargetCount([slotted.contact1!, slotted.doctor!]), 3);
});

test('createEmptyMedicalRecord returns blank form fields matching PDF structure', () => {
  const rec = createEmptyMedicalRecord();
  assert.equal(rec.fullNameUpper, '');
  assert.equal(rec.labRows.length, 4);
  assert.equal(rec.prescriptions.length, 4);
});

test('buildHealthAlertSmsBody and buildSmsHref build clean SMS URI for family phones', () => {
  const body = buildHealthAlertSmsBody({
    patientName: 'Bác Lan',
    reason: 'Cảm thấy hơi mệt, chóng mặt',
    note: 'Cần đo huyết áp',
    timestamp: '08:45',
  });
  assert.match(body, /SMART HEALTHCARE/);
  assert.match(body, /Bác Lan/);
  assert.match(body, /08:45/);

  const href = buildSmsHref(['0911 222 333', '0988-777-666'], body);
  assert.match(href, /^sms:0911222333,0988777666\?body=/);
});

test('normalizeDocCategoryLabel returns proper Vietnamese category name', () => {
  assert.equal(normalizeDocCategoryLabel('emergency'), 'Cấp cứu & Đột quỵ');
  assert.equal(normalizeDocCategoryLabel('medication'), 'Uống thuốc an toàn');
});
