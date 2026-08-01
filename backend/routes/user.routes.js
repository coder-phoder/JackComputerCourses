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
    saveCourseProgressByUser,
    getCourseVideoEmbedByUser
} = require('../controllers/course.controller');
const authUser = require('../middlewares/user.middleware');
const workspaceRoutes = require('./workspace.routes');
const ideShareRoutes = require('./ideShare.routes');
const { userQueryRoutes } = require('./query.routes');
const { reporterBugRoutes } = require('./bug.routes');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/profile', authUser, getUserProfile);
router.use('/workspace', authUser, workspaceRoutes);
router.use('/ide-share', authUser, ideShareRoutes);
router.use('/bugs', authUser, reporterBugRoutes);
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
