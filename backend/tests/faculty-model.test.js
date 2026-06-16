const test = require('node:test');
const assert = require('node:assert/strict');

const Faculty = require('../models/faculty.model');
const { formatFacultyData } = require('../controllers/faculty.controller');

test('faculty model requires name, phone and password', () => {
    const faculty = new Faculty({
        name: '   ',
        phone: '   ',
        password: ''
    });
    const error = faculty.validateSync();

    assert.ok(error.errors.name);
    assert.ok(error.errors.phone);
    assert.ok(error.errors.password);
});

test('faculty model trims public identity fields', () => {
    const faculty = new Faculty({
        name: ' Ada Lovelace ',
        phone: ' 9876543210 ',
        password: 'secret'
    });

    assert.equal(faculty.validateSync(), undefined);
    assert.equal(faculty.name, 'Ada Lovelace');
    assert.equal(faculty.phone, '9876543210');
});

test('faculty model keeps password out of default query selection', () => {
    assert.equal(Faculty.schema.path('password').options.select, false);
    assert.equal(Faculty.schema.path('phone').options.unique, true);
});

test('formatFacultyData returns safe public faculty fields', () => {
    const faculty = new Faculty({
        name: 'Ada Lovelace',
        phone: '9876543210',
        password: 'hashed-password'
    });
    const data = formatFacultyData(faculty);

    assert.deepEqual(Object.keys(data).sort(), ['_id', 'name', 'phone', 'role'].sort());
    assert.equal(data._id, faculty._id.toString());
    assert.equal(data.name, 'Ada Lovelace');
    assert.equal(data.phone, '9876543210');
    assert.equal(data.role, 'faculty');
    assert.equal(data.password, undefined);
});
