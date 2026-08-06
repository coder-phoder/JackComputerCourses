const test = require('node:test');
const assert = require('node:assert/strict');

const { getGeneratedPassword, prepareNewUserInput } = require('../controllers/admin.controller');

const sheetRow = (overrides = {}) => ({
    firstName: 'Priya',
    lastName: 'Shah',
    phone: '9825012345',
    password: '',
    ...overrides
});

test('a sheet row without a password is given the first name with 123 after it', () => {
    const row = prepareNewUserInput(sheetRow(), { generatePassword: true });

    assert.equal(row.message, '');
    assert.equal(row.password, 'priya123');
    assert.equal(row.isPasswordGenerated, true);
});

test('the generated password ignores the casing and the spacing of the first name', () => {
    assert.equal(getGeneratedPassword('  Mary Jane '), 'maryjane123');
});

test('a password typed into the sheet is the one the account gets', () => {
    const row = prepareNewUserInput(sheetRow({ password: 'rahul@2026' }), { generatePassword: true });

    assert.equal(row.password, 'rahul@2026');
    assert.equal(row.isPasswordGenerated, false);
});

test('the create form is never given a password it did not type', () => {
    const formInput = prepareNewUserInput(sheetRow());

    assert.equal(formInput.password, '');
    assert.equal(formInput.message, 'First name, last name, phone and password are required');
});

test('a sheet row is only refused for the three columns it must fill in', () => {
    const withoutLastName = prepareNewUserInput(sheetRow({ lastName: '   ' }), { generatePassword: true });
    const withoutPhone = prepareNewUserInput(sheetRow({ phone: '' }), { generatePassword: true });

    assert.equal(withoutLastName.message, 'First name, last name and phone are required');
    assert.equal(withoutPhone.message, 'First name, last name and phone are required');
});

test('a refused row still carries what it did say, so it can name itself on screen', () => {
    const row = prepareNewUserInput(sheetRow({ lastName: '' }), { generatePassword: true });

    assert.equal(row.name, 'Priya');
    assert.equal(row.phone, '9825012345');
});

test('the halves of the name are trimmed and stored as one name', () => {
    const row = prepareNewUserInput(sheetRow({ firstName: ' Priya ', lastName: ' Shah ', phone: ' 9825012345 ' }), {
        generatePassword: true
    });

    assert.equal(row.name, 'Priya Shah');
    assert.equal(row.phone, '9825012345');
});
