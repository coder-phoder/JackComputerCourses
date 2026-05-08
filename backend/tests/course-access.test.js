const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizePhoneArray,
    courseUserHasAccess
} = require('../controllers/course.controller');

test('normalizePhoneArray trims, splits comma lists, and removes duplicates', () => {
    assert.deepEqual(
        normalizePhoneArray(' 9876543210, 9876543210, +91 99999 99999 ,, '),
        ['9876543210', '+91 99999 99999']
    );
});

test('courseUserHasAccess allows only phones present on the course', () => {
    const course = {
        allowedUserPhones: ['9876543210', ' +91 99999 99999 ']
    };

    assert.equal(courseUserHasAccess(course, '9876543210'), true);
    assert.equal(courseUserHasAccess(course, '+91 99999 99999'), true);
    assert.equal(courseUserHasAccess(course, '0000000000'), false);
    assert.equal(courseUserHasAccess({ allowedUserPhones: [] }, '9876543210'), false);
});
