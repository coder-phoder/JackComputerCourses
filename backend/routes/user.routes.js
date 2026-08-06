const express = require('express');
const {
    registerUser,
    loginUser,
    logoutUser,
    updateUserName,
    completeUserTour,
    updateUserProfile,
    remindUserPromptLater,
    getUserProfile
} = require('../controllers/user.controller');
const {
    getCoursesByUser,
    getCourseByUser,
    saveCourseProgressByUser,
    getCourseVideoEmbedByUser
} = require('../controllers/course.controller');
const authUser = require('../middlewares/user.middleware');
const { userAttendanceRoutes } = require('./attendance.routes');
const workspaceRoutes = require('./workspace.routes');
const ideShareRoutes = require('./ideShare.routes');
const { userQueryRoutes } = require('./query.routes');
const { reporterBugRoutes } = require('./bug.routes');
const { userReviewRoutes } = require('./review.routes');
const { publicPasswordRequestRoutes } = require('./passwordRequest.routes');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
// Locked out visitors raise this from the login page, so it stays ahead of every
// route that requires a signed in user.
router.use('/password-requests', publicPasswordRequestRoutes);
router.get('/profile', authUser, getUserProfile);
// Every optional ask is put off the same way, so one route answers all of them.
router.patch('/prompts/:prompt/remind-later', authUser, remindUserPromptLater);
router.patch('/profile', authUser, updateUserProfile);
router.patch('/name', authUser, updateUserName);
router.patch('/tour', authUser, completeUserTour);
router.use('/attendance', authUser, userAttendanceRoutes);
router.use('/workspace', authUser, workspaceRoutes);
router.use('/ide-share', authUser, ideShareRoutes);
router.use('/bugs', authUser, reporterBugRoutes);
router.use('/reviews', authUser, userReviewRoutes);
router.use('/', authUser, userQueryRoutes);
router.get('/courses', authUser, getCoursesByUser);
router.get(
    '/courses/:courseId/chapters/:chapterId/videos/:videoPosition/embed',
    authUser,
    getCourseVideoEmbedByUser
);
router.put('/courses/:courseId/progress', authUser, saveCourseProgressByUser);
router.get('/courses/:courseId', authUser, getCourseByUser);

module.exports = router;
