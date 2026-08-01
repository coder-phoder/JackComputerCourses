const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const CourseProgress = require('../models/courseProgress.model');
const { parseVideoKey } = require('../controllers/course.controller');

const objectId = () => new mongoose.Types.ObjectId().toString();

test('parseVideoKey splits a chapter id and video position', () => {
    const chapterId = objectId();

    assert.deepEqual(parseVideoKey(`${chapterId}:0`), { chapterId, videoPosition: 0 });
    assert.deepEqual(parseVideoKey(`${chapterId}:12`), { chapterId, videoPosition: 12 });
});

test('parseVideoKey rejects malformed keys', () => {
    const chapterId = objectId();

    assert.equal(parseVideoKey(''), null);
    assert.equal(parseVideoKey(null), null);
    assert.equal(parseVideoKey(chapterId), null);
    assert.equal(parseVideoKey(`${chapterId}:`), null);
    assert.equal(parseVideoKey(`${chapterId}: `), null);
    assert.equal(parseVideoKey(`${chapterId}:-1`), null);
    assert.equal(parseVideoKey(`${chapterId}:1.5`), null);
    assert.equal(parseVideoKey(`${chapterId}:two`), null);
    assert.equal(parseVideoKey('not-an-object-id:1'), null);
});

test('course progress requires a viewer, course and lesson pointer', () => {
    const error = new CourseProgress({}).validateSync();

    assert.ok(error.errors.viewerRole);
    assert.ok(error.errors.viewerId);
    assert.ok(error.errors.courseId);
    assert.ok(error.errors.chapterId);
    assert.ok(error.errors.videoPosition);
});

test('course progress only accepts known viewer roles', () => {
    const buildProgress = (viewerRole) => new CourseProgress({
        viewerRole,
        viewerId: objectId(),
        courseId: objectId(),
        chapterId: objectId(),
        videoPosition: 0
    });

    assert.equal(buildProgress('user').validateSync(), undefined);
    assert.equal(buildProgress('faculty').validateSync(), undefined);
    assert.ok(buildProgress('admin').validateSync().errors.viewerRole);
});

test('course progress rejects fractional and negative video positions', () => {
    const buildProgress = (videoPosition) => new CourseProgress({
        viewerRole: 'user',
        viewerId: objectId(),
        courseId: objectId(),
        chapterId: objectId(),
        videoPosition
    });

    assert.equal(buildProgress(0).validateSync(), undefined);
    assert.ok(buildProgress(-1).validateSync().errors.videoPosition);
    assert.ok(buildProgress(2.5).validateSync().errors.videoPosition);
});

test('course progress keeps one resume point per viewer per course', () => {
    const [fields, options] = CourseProgress.schema.indexes()
        .find(([indexFields]) => indexFields.courseId === 1);

    assert.deepEqual(fields, { viewerRole: 1, viewerId: 1, courseId: 1 });
    assert.equal(options.unique, true);
});

test('course progress stamps when the lesson was last watched', () => {
    const progress = new CourseProgress({
        viewerRole: 'faculty',
        viewerId: objectId(),
        courseId: objectId(),
        chapterId: objectId(),
        videoPosition: 3
    });

    assert.equal(progress.validateSync(), undefined);
    assert.ok(progress.lastWatchedAt instanceof Date);
});
