const express = require('express');
const {
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile
} = require('../controllers/user.controller');
const {
    getCoursesByUser,
    getCourseByUser,
    getCourseVideoEmbedByUser
} = require('../controllers/course.controller');
const codeRoutes = require('./code.routes');
const authUser = require('../middlewares/user.middleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/profile', authUser, getUserProfile);
router.get('/courses', authUser, getCoursesByUser);
router.use('/code', authUser, codeRoutes);
router.get(
    '/courses/:courseId/chapters/:chapterId/videos/:videoPosition/embed',
    authUser,
    getCourseVideoEmbedByUser
);
router.get('/courses/:courseId', authUser, getCourseByUser);

module.exports = router;
