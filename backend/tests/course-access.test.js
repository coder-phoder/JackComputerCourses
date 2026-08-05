const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizePhoneArray,
    courseUserHasAccess,
    parseCourseDurationMonths,
    getCourseDurationDays,
    getCourseAccessWindow,
    collectActiveUserPhones
} = require('../controllers/course.controller');

test('normalizePhoneArray trims, splits comma lists, and removes duplicates', () => {
    assert.deepEqual(
        normalizePhoneArray(' 9876543210, 9876543210, +91 99999 99999 ,, '),
        ['9876543210', '+91 99999 99999']
    );
});

test('courseUserHasAccess allows only phones present on the course', () => {
    const course = {
        duration: '3',
        allowedUserPhones: ['9876543210', ' +91 99999 99999 '],
        accessGrants: [
            { phone: '9876543210', grantedAt: new Date('2026-01-01T10:00:00.000Z') },
            { phone: '+91 99999 99999', grantedAt: new Date('2026-01-01T10:00:00.000Z') }
        ]
    };

    const now = new Date('2026-03-31T23:59:59.999Z');

    assert.equal(courseUserHasAccess(course, '9876543210', { now }), true);
    assert.equal(courseUserHasAccess(course, '+91 99999 99999', { now }), true);
    assert.equal(courseUserHasAccess(course, '0000000000', { now }), false);
    assert.equal(courseUserHasAccess({ duration: '3', allowedUserPhones: [] }, '9876543210', { now }), false);
});

test('courseUserHasAccess allows any website user for open courses', () => {
    const course = {
        isOpenToAll: true,
        allowedUserPhones: []
    };

    assert.equal(courseUserHasAccess(course, '0000000000'), true);
    assert.equal(courseUserHasAccess(course, ''), false);
});

test('course duration accepts only positive month values and converts them to days', () => {
    assert.equal(parseCourseDurationMonths('3'), 3);
    assert.equal(parseCourseDurationMonths('1.5'), 1.5);
    assert.equal(parseCourseDurationMonths('0'), null);
    assert.equal(parseCourseDurationMonths('8 weeks'), null);
    assert.equal(getCourseDurationDays('1.5'), 45);
    assert.equal(getCourseDurationDays('0.1'), 3);
    assert.equal(getCourseDurationDays('0.01'), 1);
});

test('only a grant that is still running keeps an account active', () => {
    const now = new Date('2026-08-06T12:00:00.000Z');
    const activePhones = collectActiveUserPhones([
        {
            duration: '3',
            accessGrants: [
                { phone: '9000000001', grantedAt: new Date('2026-07-01T10:00:00.000Z') },
                { phone: '9000000002', grantedAt: new Date('2026-01-01T10:00:00.000Z') }
            ]
        },
        {
            // A second course the expired account is also on, still expired.
            duration: '1',
            accessGrants: [
                { phone: '9000000002', grantedAt: new Date('2026-05-01T10:00:00.000Z') }
            ]
        },
        {
            // Open to all is the public catalogue, not an enrolment.
            isOpenToAll: true,
            duration: '',
            allowedUserPhones: ['9000000003']
        },
        {
            // A course without a usable duration has no deadline to be inside of.
            duration: '',
            allowedUserPhones: ['9000000004'],
            createdAt: new Date('2026-08-01T10:00:00.000Z')
        }
    ], now);

    assert.deepEqual([...activePhones], ['9000000001']);
});

test('a grant with no date of its own falls back to the course it was made on', () => {
    const course = {
        duration: '1',
        allowedUserPhones: ['9000000005'],
        createdAt: new Date('2026-08-01T10:00:00.000Z')
    };

    assert.equal(collectActiveUserPhones([course], new Date('2026-08-06T12:00:00.000Z')).size, 1);
    assert.equal(collectActiveUserPhones([course], new Date('2026-09-06T12:00:00.000Z')).size, 0);
});

test('course access expires at midnight after the converted duration days', () => {
    const course = {
        duration: '3',
        accessGrants: [
            { phone: '9876543210', grantedAt: new Date('2026-01-01T10:00:00.000Z') }
        ]
    };

    const accessWindow = getCourseAccessWindow(course, '9876543210', new Date('2026-03-31T12:00:00.000Z'));

    assert.equal(accessWindow.startsOn, '2026-01-01');
    assert.equal(accessWindow.endsOn, '2026-04-01');
    assert.equal(accessWindow.endsAt.toISOString(), '2026-04-01T00:00:00.000Z');
    assert.equal(courseUserHasAccess(course, '9876543210', {
        now: new Date('2026-03-31T23:59:59.999Z')
    }), true);
    assert.equal(courseUserHasAccess(course, '9876543210', {
        now: new Date('2026-04-01T00:00:00.000Z')
    }), false);
});
