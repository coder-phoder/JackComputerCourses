const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { formatPasswordRequestData } = require('../controllers/passwordRequest.controller');
const PasswordRequest = require('../models/passwordRequest.model');

const buildRequest = (overrides = {}) => new PasswordRequest({
    name: 'Asha',
    phone: '9876543210',
    password: 'hashed-password',
    ...overrides
});

test('a password request needs a name, a phone and a password', () => {
    const error = new PasswordRequest({}).validateSync();

    assert.ok(error.errors.name);
    assert.ok(error.errors.phone);
    assert.ok(error.errors.password);
});

test('a new password request starts pending and undecided', () => {
    const request = buildRequest();

    assert.equal(request.validateSync(), undefined);
    assert.equal(request.status, 'pending');
    assert.equal(request.createdAccount, false);
    assert.equal(request.approvedAt, null);
    assert.equal(request.declinedAt, null);
});

test('a password request is only ever pending, approved or declined', () => {
    assert.ok(buildRequest({ status: 'cancelled' }).validateSync().errors.status);

    ['pending', 'approved', 'declined'].forEach((status) => {
        assert.equal(buildRequest({ status }).validateSync(), undefined);
    });
});

test('the stored password never leaves the database with the request', () => {
    const request = buildRequest();

    assert.equal(PasswordRequest.schema.path('password').options.select, false);
    assert.equal('password' in formatPasswordRequestData(request), false);
});

test('only one request per phone may wait for a decision', () => {
    const pendingPhoneIndex = PasswordRequest.schema.indexes().find(
        ([fields]) => fields.phone === 1
    );

    assert.ok(pendingPhoneIndex);

    const [, options] = pendingPhoneIndex;

    assert.equal(options.unique, true);
    assert.deepEqual(options.partialFilterExpression, { status: 'pending' });
});

test('formatting a request reports whether the phone already has an account', () => {
    const approvedAt = new Date();
    const request = buildRequest({
        _id: new mongoose.Types.ObjectId(),
        status: 'approved',
        createdAccount: true,
        approvedAt
    });

    assert.deepEqual(formatPasswordRequestData(request, false), {
        _id: request._id.toString(),
        name: 'Asha',
        phone: '9876543210',
        status: 'approved',
        createdAccount: true,
        hasAccount: false,
        approvedAt,
        declinedAt: null,
        createdAt: undefined,
        updatedAt: undefined
    });

    assert.equal(formatPasswordRequestData(buildRequest()).hasAccount, null);
});
