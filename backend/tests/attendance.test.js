const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Attendance = require('../models/attendance.model');
const { formatAttendanceData } = require('../controllers/attendance.controller');

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
