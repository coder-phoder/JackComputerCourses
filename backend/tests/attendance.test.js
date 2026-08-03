const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Attendance = require('../models/attendance.model');
const {
    formatAttendanceData,
    buildAttendanceTrend,
    shiftMonthKey,
    TREND_MONTHS
} = require('../controllers/attendance.controller');

const buildRecord = (overrides = {}) => new Attendance({
    user: new mongoose.Types.ObjectId(),
    date: '2026-08-02',
    status: 'present',
    markedByRole: 'admin',
    markedByName: 'Admin',
    ...overrides
});

test('attendance requires a student, a day, a status and who marked it', () => {
    const error = new Attendance({}).validateSync();

    assert.ok(error.errors.user);
    assert.ok(error.errors.date);
    assert.ok(error.errors.status);
    assert.ok(error.errors.markedByRole);
    assert.ok(error.errors.markedByName);
});

test('attendance is only present or absent', () => {
    assert.deepEqual(Attendance.STATUSES, ['present', 'absent']);

    ['late', 'excused', 'holiday'].forEach((status) => {
        assert.ok(buildRecord({ status }).validateSync().errors.status, `${status} should be rejected`);
    });

    Attendance.STATUSES.forEach((status) => {
        assert.equal(buildRecord({ status }).validateSync(), undefined);
    });
});

test('attendance only accepts YYYY-MM-DD days', () => {
    ['2026-8-2', '02-08-2026', '2026-13-01', '2026-08-32', 'today'].forEach((date) => {
        assert.ok(buildRecord({ date }).validateSync().errors.date, `${date} should be rejected`);
    });

    assert.equal(buildRecord({ date: '2026-12-31' }).validateSync(), undefined);
});

test('attendance is marked by an admin or a faculty only', () => {
    assert.ok(buildRecord({ markedByRole: 'user' }).validateSync().errors.markedByRole);
    assert.equal(buildRecord({ markedByRole: 'faculty', markedByName: 'Jack' }).validateSync(), undefined);
});

test('attendance keeps one record per student per day', () => {
    const hasDayIndex = Attendance.schema.indexes().some(([fields, options]) => (
        fields.user === 1 && fields.date === 1 && options.unique
    ));

    assert.ok(hasDayIndex);
});

test('shiftMonthKey walks months across year boundaries', () => {
    assert.equal(shiftMonthKey('2026-08', 0), '2026-08');
    assert.equal(shiftMonthKey('2026-08', -5), '2026-03');
    assert.equal(shiftMonthKey('2026-02', -3), '2025-11');
    assert.equal(shiftMonthKey('2026-11', 2), '2027-01');
});

test('buildAttendanceTrend keeps a slot for every month, empty ones included', () => {
    const trend = buildAttendanceTrend([
        { _id: { month: '2026-08', status: 'present' }, count: 12 },
        { _id: { month: '2026-08', status: 'absent' }, count: 3 },
        { _id: { month: '2026-06', status: 'present' }, count: 20 }
    ], '2026-08');

    assert.equal(trend.length, TREND_MONTHS);
    assert.deepEqual(trend.map((month) => month.month), [
        '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'
    ]);
    assert.deepEqual(trend.at(-1), { month: '2026-08', present: 12, absent: 3 });
    assert.deepEqual(trend[3], { month: '2026-06', present: 20, absent: 0 });
    assert.deepEqual(trend[0], { month: '2026-03', present: 0, absent: 0 });
});

test('buildAttendanceTrend drops rows that are not a month and a known status', () => {
    const trend = buildAttendanceTrend([
        { _id: { month: '2026-8', status: 'present' }, count: 4 },
        { _id: { month: '2026-08', status: 'holiday' }, count: 6 },
        { _id: { month: '2025-12', status: 'present' }, count: 9 },
        { _id: { month: '2026-08', status: 'present' }, count: 1 }
    ], '2026-08');

    assert.deepEqual(trend.at(-1), { month: '2026-08', present: 1, absent: 0 });
    assert.ok(trend.every((month) => month.month !== '2025-12'));
});

test('formatAttendanceData hides who marked the day from faculties', () => {
    const record = buildRecord({ markedByRole: 'faculty', markedByName: 'Jack' });

    const facultyPayload = formatAttendanceData(record, false);
    assert.equal(facultyPayload.markedByName, undefined);
    assert.equal(facultyPayload.markedByRole, undefined);
    assert.equal(facultyPayload.status, 'present');
    assert.equal(facultyPayload.date, '2026-08-02');
    assert.equal(facultyPayload.user, record.user.toString());

    const adminPayload = formatAttendanceData(record, true);
    assert.equal(adminPayload.markedByName, 'Jack');
    assert.equal(adminPayload.markedByRole, 'faculty');
});
