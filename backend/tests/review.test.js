const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { formatReviewData, readReviewInput } = require('../controllers/review.controller');
const { formatUserData } = require('../controllers/user.controller');
const Review = require('../models/review.model');
const User = require('../models/user.model');

const DAY_MS = 24 * 60 * 60 * 1000;

const buildUser = (overrides = {}) => new User({
    name: 'Asha Rao',
    phone: '9876543210',
    password: 'hashed-password',
    ...overrides
});

const buildReview = (overrides = {}) => new Review({
    userId: new mongoose.Types.ObjectId(),
    rating: 5,
    ...overrides
});

// A review is read back with its writer joined on, so the tests that describe the
// shape of that read start from what the query hands over rather than from a document.
const buildReadReview = (overrides = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    userId: { name: 'Asha Rao', phone: '9876543210' },
    rating: 4,
    comment: 'The faculty made time for every question.',
    featuredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
});

// The ask

test('an account that has never reviewed is asked for one', () => {
    assert.equal(formatUserData(buildUser()).requiresReview, true);
});

test('having reviewed once is what stops the account being asked', () => {
    assert.equal(formatUserData(buildUser({ reviewSubmittedAt: new Date() })).requiresReview, false);
});

test('asking for later holds the review prompt off until the days are up', () => {
    const waiting = buildUser({ reviewRemindAfter: User.getPromptRemindAfter('review') });
    const elapsed = buildUser({ reviewRemindAfter: new Date(Date.now() - 1000) });

    assert.equal(formatUserData(waiting).requiresReview, false);
    assert.equal(formatUserData(elapsed).requiresReview, true);
});

test('an ignored review prompt comes back a week later, not on the next login', () => {
    const asked = new Date('2026-01-01T10:00:00.000Z');
    const { reviewRemindAfter } = User.remindPromptLater('review', asked);

    assert.equal(reviewRemindAfter.getTime() - asked.getTime(), 7 * DAY_MS);
});

test('answering a prompt clears the reminder with it, so a stale date cannot reopen it', () => {
    const answered = User.answerPrompt('review');
    const user = buildUser({
        reviewSubmittedAt: answered.reviewSubmittedAt,
        reviewRemindAfter: new Date(Date.now() - DAY_MS)
    });

    assert.equal(answered.reviewRemindAfter, null);
    assert.equal(formatUserData(user).requiresReview, false);
});

test('the two asks are kept apart: answering one leaves the other owed', () => {
    const user = buildUser(User.answerPrompt('profile'));

    assert.equal(formatUserData(user).requiresProfile, false);
    assert.equal(formatUserData(user).requiresReview, true);
});

// What a review may hold

test('a review is a whole number of stars between one and five', () => {
    assert.equal(buildReview({ rating: 3 }).validateSync(), undefined);
    assert.ok(buildReview({ rating: 0 }).validateSync().errors.rating);
    assert.ok(buildReview({ rating: 6 }).validateSync().errors.rating);
    assert.ok(buildReview({ rating: 4.5 }).validateSync().errors.rating);
    assert.ok(buildReview({ rating: undefined }).validateSync().errors.rating);
});

test('the stars are the review; the words beside them are optional', () => {
    assert.equal(buildReview({ comment: '' }).validateSync(), undefined);
});

test('a review longer than the box allows says so rather than being cut short', () => {
    const tooLong = buildReview({ comment: 'a'.repeat(Review.MAX_COMMENT_LENGTH + 1) });

    assert.match(tooLong.validateSync().errors.comment.message, /600 characters or fewer/);
});

test('nothing but the rating and the words is taken from the sender', () => {
    assert.deepEqual(
        readReviewInput({
            rating: 5,
            comment: '  Worth every hour.  ',
            userId: new mongoose.Types.ObjectId().toString(),
            featuredAt: new Date()
        }),
        { rating: 5, comment: 'Worth every hour.' }
    );
});

// How a review reads back

test('showcasing is read off the date it was picked', () => {
    assert.equal(formatReviewData(buildReadReview()).featured, false);
    assert.equal(formatReviewData(buildReadReview({ featuredAt: new Date() })).featured, true);
});

test('the reviewer is named to everyone, but numbered only to the admin', () => {
    const review = buildReadReview();

    assert.equal(formatReviewData(review).reviewerName, 'Asha Rao');
    assert.equal(formatReviewData(review).reviewerPhone, undefined);
    assert.equal(formatReviewData(review, { includePhone: true }).reviewerPhone, '9876543210');
});

test('a review whose account is gone stays readable rather than nameless', () => {
    assert.equal(formatReviewData(buildReadReview({ userId: null })).reviewerName, 'Former student');
});
