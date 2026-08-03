const test = require('node:test');
const assert = require('node:assert/strict');

const Faculty = require('../models/faculty.model');
const { formatFacultyData } = require('../controllers/faculty.controller');

const buildFaculty = (overrides = {}) => new Faculty({
    name: 'Meera Iyer',
    phone: '9876500000',
    password: 'hashed-password',
    ...overrides
});

test('a faculty account starts out having never seen the walkthrough', () => {
    assert.equal(buildFaculty().tourCompletedAt, null);
});

test('finishing the walkthrough is remembered on the account', () => {
    const finishedAt = new Date();

    assert.equal(buildFaculty({ tourCompletedAt: finishedAt }).tourCompletedAt, finishedAt);
});

test('the admin faculty list carries no walkthrough state', () => {
    assert.equal('requiresTour' in formatFacultyData(buildFaculty()), false);
});
