const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Note = require('../models/note.model');
const { parseFolderId } = require('../services/drive.service');

// 1. Test parseFolderId helper
test('parseFolderId correctly extracts Google Drive Folder ID', () => {
    // Standard URL format
    const url1 = 'https://drive.google.com/drive/folders/1A_B-C_D-E1234567890abcdefghijklm';
    assert.equal(parseFolderId(url1), '1A_B-C_D-E1234567890abcdefghijklm');

    // URL with user index path
    const url2 = 'https://drive.google.com/drive/u/1/folders/1A_B-C_D-E1234567890abcdefghijklm';
    assert.equal(parseFolderId(url2), '1A_B-C_D-E1234567890abcdefghijklm');

    // Query parameter format (open?id=...)
    const url3 = 'https://drive.google.com/open?id=1A_B-C_D-E1234567890abcdefghijklm';
    assert.equal(parseFolderId(url3), '1A_B-C_D-E1234567890abcdefghijklm');

    // Raw folder ID
    const rawId = '1A_B-C_D-E1234567890abcdefghijklm';
    assert.equal(parseFolderId(rawId), '1A_B-C_D-E1234567890abcdefghijklm');

    // Invalid format
    const invalidUrl = 'https://google.com';
    assert.equal(parseFolderId(invalidUrl), null);
    assert.equal(parseFolderId(''), null);
    assert.equal(parseFolderId(null), null);
});

// 2. Test Note model validation
test('Note model requires courseId, title, driveFolderUrl and driveFolderId', () => {
    const note = new Note({
        title: '   ',
        driveFolderUrl: '   ',
        driveFolderId: '   '
    });
    const error = note.validateSync();

    assert.ok(error.errors.courseId);
    assert.ok(error.errors.title);
    assert.ok(error.errors.driveFolderUrl);
    assert.ok(error.errors.driveFolderId);
});

test('Note model trims public fields', () => {
    const note = new Note({
        courseId: new mongoose.Types.ObjectId(),
        title: ' Course Notes 101 ',
        driveFolderUrl: ' https://drive.google.com/drive/folders/1A_B-C_D-E ',
        driveFolderId: ' 1A_B-C_D-E '
    });

    assert.equal(note.validateSync(), undefined);
    assert.equal(note.title, 'Course Notes 101');
    assert.equal(note.driveFolderUrl, 'https://drive.google.com/drive/folders/1A_B-C_D-E');
    assert.equal(note.driveFolderId, '1A_B-C_D-E');
});
