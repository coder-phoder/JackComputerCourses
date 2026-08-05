const test = require('node:test');
const assert = require('node:assert/strict');

const {
    parseIsoDurationSeconds,
    sumVideoDurationSeconds
} = require('../controllers/course.controller');

test('parseIsoDurationSeconds reads every part of a YouTube duration', () => {
    assert.equal(parseIsoDurationSeconds('PT4M13S'), 253);
    assert.equal(parseIsoDurationSeconds('PT1H2M3S'), 3723);
    assert.equal(parseIsoDurationSeconds('PT2H'), 7200);
    assert.equal(parseIsoDurationSeconds('PT59S'), 59);
    assert.equal(parseIsoDurationSeconds('P1DT2H'), 93600);
    assert.equal(parseIsoDurationSeconds('P1W'), 604800);
});

test('parseIsoDurationSeconds treats anything unreadable as no length', () => {
    assert.equal(parseIsoDurationSeconds(''), 0);
    assert.equal(parseIsoDurationSeconds('PT0S'), 0);
    assert.equal(parseIsoDurationSeconds('4:13'), 0);
    assert.equal(parseIsoDurationSeconds(null), 0);
    assert.equal(parseIsoDurationSeconds(undefined), 0);
});

test('parseIsoDurationSeconds rounds fractional seconds to whole seconds', () => {
    assert.equal(parseIsoDurationSeconds('PT1M30.5S'), 91);
});

test('sumVideoDurationSeconds adds up a chapter and survives missing lengths', () => {
    assert.equal(
        sumVideoDurationSeconds([
            { duration: 'PT1H' },
            { duration: 'PT30M' },
            { duration: 'PT30S' }
        ]),
        5430
    );

    assert.equal(sumVideoDurationSeconds([{ duration: '' }, {}, { duration: 'PT10S' }]), 10);
    assert.equal(sumVideoDurationSeconds([]), 0);
    assert.equal(sumVideoDurationSeconds(undefined), 0);
});
