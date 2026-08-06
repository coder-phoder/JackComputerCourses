const mongoose = require('mongoose');

const MIN_RATING = 1;
const MAX_RATING = 5;
const MAX_COMMENT_LENGTH = 600;

// An account may write more than one review over the years it studies here, so the
// count is capped rather than closed: the point is that the list stays something a
// person keeps, not somewhere rows pile up.
const MAX_REVIEWS_PER_USER = 10;

const reviewSchema = new mongoose.Schema({
    // The reviewer is referenced rather than copied, so a name the admin corrects is
    // corrected everywhere the review is read — the landing page included.
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    rating: {
        type: Number,
        required: [true, 'Pick a rating between 1 and 5 stars'],
        min: [MIN_RATING, `Rating must be between ${MIN_RATING} and ${MAX_RATING} stars`],
        max: [MAX_RATING, `Rating must be between ${MIN_RATING} and ${MAX_RATING} stars`],
        validate: {
            validator: Number.isInteger,
            message: 'Rating must be a whole number of stars'
        }
    },
    comment: {
        type: String,
        trim: true,
        default: '',
        maxlength: [MAX_COMMENT_LENGTH, `Review must be ${MAX_COMMENT_LENGTH} characters or fewer`]
    },
    // Showcasing is the admin's pick of what the landing page says about the institute.
    // The moment it was picked is the whole of the state — a review is showcased when
    // it carries a date — and it also orders the landing page, newest pick first.
    featuredAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ featuredAt: -1 });

const Review = mongoose.model('Review', reviewSchema);

Review.MIN_RATING = MIN_RATING;
Review.MAX_RATING = MAX_RATING;
Review.MAX_COMMENT_LENGTH = MAX_COMMENT_LENGTH;
Review.MAX_REVIEWS_PER_USER = MAX_REVIEWS_PER_USER;

module.exports = Review;
