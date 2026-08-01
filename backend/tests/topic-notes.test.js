const test = require('node:test');
const assert = require('node:assert/strict');

const TopicNote = require('../models/topicNote.model');

test('TopicNote model requires topic, driveFolderUrl and driveFolderId', () => {
    const topicNote = new TopicNote({
        topic: '   ',
        driveFolderUrl: '   ',
        driveFolderId: '   '
    });
    const error = topicNote.validateSync();

    assert.ok(error.errors.topic);
    assert.ok(error.errors.driveFolderUrl);
    assert.ok(error.errors.driveFolderId);
});

test('TopicNote model trims topic, description and drive fields', () => {
    const topicNote = new TopicNote({
        topic: '  C Language  ',
        description: '  Complete C notes  ',
        driveFolderUrl: ' https://drive.google.com/drive/folders/1A_B-C_D-E ',
        driveFolderId: ' 1A_B-C_D-E '
    });

    assert.equal(topicNote.validateSync(), undefined);
    assert.equal(topicNote.topic, 'C Language');
    assert.equal(topicNote.description, 'Complete C notes');
    assert.equal(topicNote.driveFolderUrl, 'https://drive.google.com/drive/folders/1A_B-C_D-E');
    assert.equal(topicNote.driveFolderId, '1A_B-C_D-E');
});

test('TopicNote model defaults to a pending, empty sync state', () => {
    const topicNote = new TopicNote({
        topic: 'Python',
        driveFolderUrl: 'https://drive.google.com/drive/folders/1A_B-C_D-E',
        driveFolderId: '1A_B-C_D-E'
    });

    assert.equal(topicNote.validateSync(), undefined);
    assert.equal(topicNote.description, '');
    assert.equal(topicNote.syncStatus, 'pending');
    assert.equal(topicNote.syncError, '');
    assert.equal(topicNote.lastSyncedAt, null);
    assert.deepEqual(topicNote.files.toObject(), []);
});
