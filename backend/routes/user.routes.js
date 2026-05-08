const express = require('express');
const {
    loginUser,
    logoutUser,
    getUserProfile
} = require('../controllers/user.controller');
const {
    getCoursesByUser,
    getCourseByUser
} = require('../controllers/course.controller');
const authUser = require('../middlewares/user.middleware');

const router = express.Router();

router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/profile', authUser, getUserProfile);
router.get('/courses', authUser, getCoursesByUser);
router.get('/courses/:courseId', authUser, getCourseByUser);

module.exports = router;
