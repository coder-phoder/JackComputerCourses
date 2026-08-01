const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeBugImages,
    estimateBase64Bytes,
    formatBugData,
    ADMIN_DECISIONS,
    MAX_BUG_IMAGES,
    MAX_IMAGE_BYTES
} = require('../controllers/bug.controller');
const Bug = require('../models/bug.model');

const buildDataUrl = (mime, bytes) => {
    // 4 base64 characters encode 3 bytes, so this yields a payload of the requested size.
    const base64 = 'A'.repeat(Math.ceil(bytes / 3) * 4);

    return `data:image/${mime};base64,${base64}`;
};

test('normalizeBugImages treats missing images as an empty list', () => {
    assert.deepEqual(normalizeBugImages(undefined), { images: [] });
    assert.deepEqual(normalizeBugImages(null), { images: [] });
    assert.deepEqual(normalizeBugImages(''), { images: [] });
});

test('normalizeBugImages accepts data URLs as bare strings or named objects', () => {
    const dataUrl = buildDataUrl('png', 90);

    assert.deepEqual(normalizeBugImages([dataUrl]), {
        images: [{ name: '', dataUrl }]
    });

    assert.deepEqual(normalizeBugImages([{ name: ' crash.png ', dataUrl }]), {
        images: [{ name: 'crash.png', dataUrl }]
    });
});

test('normalizeBugImages rejects anything that is not a supported image data URL', () => {
    assert.equal(normalizeBugImages('not-a-list').error, 'Images must be sent as a list');
    assert.equal(normalizeBugImages(['']).error, 'Every image must include its data');
    assert.equal(
        normalizeBugImages(['data:application/pdf;base64,AAAA']).error,
        'Only PNG, JPG, WEBP and GIF images are supported'
    );
    assert.equal(
        normalizeBugImages(['https://example.com/screenshot.png']).error,
        'Only PNG, JPG, WEBP and GIF images are supported'
    );
});

test('normalizeBugImages caps the number of images per report', () => {
    const images = Array.from({ length: MAX_BUG_IMAGES + 1 }, () => buildDataUrl('jpeg', 30));

    assert.equal(
        normalizeBugImages(images).error,
        `A bug report can hold at most ${MAX_BUG_IMAGES} images`
    );
    assert.equal(normalizeBugImages(images.slice(0, MAX_BUG_IMAGES)).images.length, MAX_BUG_IMAGES);
});

test('normalizeBugImages caps the size of a single image', () => {
    assert.equal(
        normalizeBugImages([buildDataUrl('webp', MAX_IMAGE_BYTES + 3)]).error,
        'Each image must be 2MB or smaller'
    );
    assert.equal(normalizeBugImages([buildDataUrl('webp', MAX_IMAGE_BYTES - 3)]).images.length, 1);
});

test('estimateBase64Bytes accounts for base64 padding', () => {
    assert.equal(estimateBase64Bytes('AAAA'), 3);
    assert.equal(estimateBase64Bytes('AAA='), 2);
    assert.equal(estimateBase64Bytes('AA=='), 1);
});

test('formatBugData exposes the decision history without the stored image payloads', () => {
    const resolvedAt = new Date('2026-08-02T09:00:00.000Z');
    const formatted = formatBugData({
        _id: { toString: () => 'bug-1' },
        reporterRole: 'user',
        reporterName: 'Asha',
        reporterPhone: '9876543210',
        title: 'IDE freezes on save',
        description: 'Happens on large files',
        images: [{ name: 'shot.png', dataUrl: buildDataUrl('png', 30) }],
        imageCount: 1,
        status: 'resolved',
        resolvedAt,
        declinedAt: null,
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
        updatedAt: resolvedAt
    });

    assert.equal(formatted.imageCount, 1);
    assert.equal(formatted.status, 'resolved');
    assert.equal(formatted.resolvedAt, resolvedAt);
    assert.equal(formatted.declinedAt, null);
    assert.equal('images' in formatted, false);
});

test('admin decisions stamp their own timestamp field', () => {
    assert.deepEqual(Object.keys(ADMIN_DECISIONS).sort(), ['declined', 'resolved']);
    assert.equal(ADMIN_DECISIONS.resolved.timestampField, 'resolvedAt');
    assert.equal(ADMIN_DECISIONS.declined.timestampField, 'declinedAt');
});

test('bug status covers the open queue and both history outcomes', () => {
    const statusPath = Bug.schema.path('status');

    assert.deepEqual(statusPath.enumValues, ['open', 'resolved', 'declined']);
    assert.equal(statusPath.defaultValue, 'open');

    // Decided bugs are retained, so every decision field starts empty.
    const bug = new Bug({
        reporterId: new (require('mongoose').Types.ObjectId)(),
        reporterRole: 'faculty',
        title: 'Notes page fails to sync'
    });

    assert.equal(bug.status, 'open');
    assert.equal(bug.resolvedAt, null);
    assert.equal(bug.declinedAt, null);
});
