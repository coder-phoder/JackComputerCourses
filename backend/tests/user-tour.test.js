const test = require('node:test');
const assert = require('node:assert/strict');

const { formatUserData } = require('../controllers/user.controller');
const User = require('../models/user.model');

const buildUser = (overrides = {}) => new User({
    name: 'Asha Rao',
    phone: '9876543210',
    password: 'hashed-password',
    ...overrides
});

test('an account starts out having never seen the walkthrough', () => {
    assert.equal(buildUser().tourCompletedAt, null);
});

test('the walkthrough is owed to every account that has not finished it', () => {
    assert.equal(formatUserData(buildUser()).requiresTour, true);
});

test('finishing the walkthrough is what stops it being owed', () => {
    assert.equal(formatUserData(buildUser({ tourCompletedAt: new Date() })).requiresTour, false);
});

test('the walkthrough and the missing name are answered separately', () => {
    const named = formatUserData(buildUser({ tourCompletedAt: new Date() }));
    const unnamed = formatUserData(buildUser({ name: 'Asha' }));

    assert.equal(named.requiresName, false);
    assert.equal(unnamed.requiresName, true);
    assert.equal(unnamed.requiresTour, true);
});
