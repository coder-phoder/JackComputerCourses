const mongoose = require('mongoose');
const Review = require('../models/review.model');
const User = require('../models/user.model');

// The name is what every reader of a review sees, the number only ever the admin.
const REVIEWER_FIELDS = 'name phone';

const isValidObjectId = (id) => (
    mongoose.Types.ObjectId.isValid(id)
    && new mongoose.Types.ObjectId(id).toString() === String(id)
);

const sendError = (res, statusCode, message) => res.status(statusCode).json({
    success: false,
    message,
    data: {}
});

// A rating that is not a rating, or a review longer than the box allows, is the
// sender's to correct, so the field's own rule is quoted back instead of a server
// fault. The schema stays the single authority on what a review may hold.
const sendWriteError = (res, error, fallback) => {
    if (['ValidationError', 'CastError'].includes(error.name)) {
        return sendError(
            res,
            400,
            Object.values(error.errors || {})[0]?.message || 'Enter a valid rating and review'
        );
    }

    return sendError(res, 500, error.message || fallback);
};

// Writing a review and editing one take the same two values, and neither may reach
// past them: who wrote it and whether it is showcased are never the sender's to say.
const readReviewInput = (body = {}) => ({
    rating: body?.rating,
    comment: String(body?.comment ?? '').trim()
});

// The reviewer rides along as a populated document. An account that has since been
// deleted leaves the review readable rather than nameless.
const formatReviewData = (review, { includePhone = false } = {}) => {
    const reviewer = review.userId?.name ? review.userId : null;

    return {
        _id: review._id.toString(),
        reviewerName: reviewer?.name || 'Former student',
        ...(includePhone ? { reviewerPhone: reviewer?.phone || '' } : {}),
        rating: review.rating,
        comment: review.comment,
        // Showcasing is held as the moment it was picked, so both sides of it are
        // read off that one date.
        featured: Boolean(review.featuredAt),
        featuredAt: review.featuredAt,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt
    };
};

// Public Controllers

// What the landing page says about the institute: the admin's picks, newest choice
// first, and as many of them as were picked.
const getFeaturedReviews = async (req, res) => {
    try {
        const reviews = await Review
            .find({ featuredAt: { $ne: null } })
            .sort({ featuredAt: -1 })
            .populate('userId', REVIEWER_FIELDS);

        return res.status(200).json({
            success: true,
            message: 'Reviews retrieved successfully',
            data: { reviews: reviews.map((review) => formatReviewData(review)) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while retrieving reviews');
    }
};

// User Controllers

const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review
            .find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .populate('userId', REVIEWER_FIELDS);

        return res.status(200).json({
            success: true,
            message: 'Reviews retrieved successfully',
            data: { reviews: reviews.map((review) => formatReviewData(review)) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while retrieving your reviews');
    }
};

const createReview = async (req, res) => {
    try {
        const reviewCount = await Review.countDocuments({ userId: req.user._id });

        if (reviewCount >= Review.MAX_REVIEWS_PER_USER) {
            return sendError(
                res,
                409,
                `You can keep up to ${Review.MAX_REVIEWS_PER_USER} reviews. Edit or delete one to write another.`
            );
        }

        const review = await Review.create({
            userId: req.user._id,
            ...readReviewInput(req.body)
        });

        // Having said something is the answer to the ask, so the account is never
        // prompted for a review again — whatever becomes of this one.
        await User.updateOne(
            { _id: req.user._id },
            { $set: User.answerPrompt('review') }
        );

        await review.populate('userId', REVIEWER_FIELDS);

        return res.status(201).json({
            success: true,
            message: 'Thank you for your review',
            data: { review: formatReviewData(review) }
        });
    } catch (error) {
        return sendWriteError(res, error, 'Something went wrong while saving your review');
    }
};

const updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;

        if (!isValidObjectId(reviewId)) {
            return sendError(res, 400, 'Invalid review id');
        }

        const review = await Review.findOne({ _id: reviewId, userId: req.user._id });

        if (!review) {
            return sendError(res, 404, 'Review not found');
        }

        review.set(readReviewInput(req.body));
        await review.save();
        await review.populate('userId', REVIEWER_FIELDS);

        return res.status(200).json({
            success: true,
            message: 'Review updated successfully',
            data: { review: formatReviewData(review) }
        });
    } catch (error) {
        return sendWriteError(res, error, 'Something went wrong while updating your review');
    }
};

// A review is the writer's to take back, showcased or not: the landing page reads the
// same collection, so it stops carrying words nobody stands behind any more.
const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;

        if (!isValidObjectId(reviewId)) {
            return sendError(res, 400, 'Invalid review id');
        }

        const review = await Review.findOneAndDelete({ _id: reviewId, userId: req.user._id });

        if (!review) {
            return sendError(res, 404, 'Review not found');
        }

        return res.status(200).json({
            success: true,
            message: 'Review deleted successfully',
            data: { reviewId: review._id.toString() }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while deleting your review');
    }
};

// Admin Controllers

const getAllReviewsByAdmin = async (req, res) => {
    try {
        const reviews = await Review
            .find()
            .sort({ createdAt: -1 })
            .populate('userId', REVIEWER_FIELDS);

        return res.status(200).json({
            success: true,
            message: 'Reviews retrieved successfully',
            data: { reviews: reviews.map((review) => formatReviewData(review, { includePhone: true })) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while retrieving reviews');
    }
};

// Picking and dropping are one decision with two answers, so both are this one write.
// Picking an already showcased review moves it back to the front of the landing page,
// which is the only thing the admin can have meant by picking it again.
const setReviewShowcaseByAdmin = async (req, res) => {
    try {
        const { reviewId } = req.params;

        if (!isValidObjectId(reviewId)) {
            return sendError(res, 400, 'Invalid review id');
        }

        const { featured } = req.body || {};

        if (typeof featured !== 'boolean') {
            return sendError(res, 400, 'Say whether the review should be showcased');
        }

        const review = await Review
            .findByIdAndUpdate(
                reviewId,
                { $set: { featuredAt: featured ? new Date() : null } },
                { new: true }
            )
            .populate('userId', REVIEWER_FIELDS);

        if (!review) {
            return sendError(res, 404, 'Review not found');
        }

        return res.status(200).json({
            success: true,
            message: featured
                ? 'Review added to the landing page'
                : 'Review removed from the landing page',
            data: { review: formatReviewData(review, { includePhone: true }) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while updating the showcase');
    }
};

module.exports = {
    getFeaturedReviews,
    getMyReviews,
    createReview,
    updateReview,
    deleteReview,
    getAllReviewsByAdmin,
    setReviewShowcaseByAdmin,
    formatReviewData,
    readReviewInput
};
