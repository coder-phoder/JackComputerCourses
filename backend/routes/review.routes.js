const express = require('express');
const {
    getFeaturedReviews,
    getMyReviews,
    createReview,
    updateReview,
    deleteReview,
    getAllReviewsByAdmin,
    setReviewShowcaseByAdmin
} = require('../controllers/review.controller');

// Showcased reviews are read by visitors who have not signed in, so that router stays
// public. Writing one is the account's own, and picking what the landing page carries
// is the admin's, so each of those sits behind its role middleware.
const publicReviewRoutes = express.Router();
const userReviewRoutes = express.Router();
const adminReviewRoutes = express.Router();

publicReviewRoutes.get('/', getFeaturedReviews);

userReviewRoutes.get('/', getMyReviews);
userReviewRoutes.post('/', createReview);
userReviewRoutes.patch('/:reviewId', updateReview);
userReviewRoutes.delete('/:reviewId', deleteReview);

adminReviewRoutes.get('/', getAllReviewsByAdmin);
adminReviewRoutes.patch('/:reviewId/showcase', setReviewShowcaseByAdmin);

module.exports = {
    publicReviewRoutes,
    userReviewRoutes,
    adminReviewRoutes
};
