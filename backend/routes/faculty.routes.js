const express = require('express');
const {
    loginFaculty,
    logoutFaculty,
    getFacultyProfile
} = require('../controllers/faculty.controller');
const {
    getCoursesByFaculty,
    getCourseByFaculty,
    getCourseVideoEmbedByFaculty
} = require('../controllers/course.controller');
const { getNoteByFaculty } = require('../controllers/note.controller');
const authFaculty = require('../middlewares/faculty.middleware');
const workspaceRoutes = require('./workspace.routes');
const { facultyQueryRoutes } = require('./query.routes');

const router = express.Router();

router.post('/login', loginFaculty);
router.post('/logout', logoutFaculty);
router.get('/profile', authFaculty, getFacultyProfile);
router.use('/workspace', authFaculty, workspaceRoutes);
router.use('/', authFaculty, facultyQueryRoutes);
router.get('/courses', authFaculty, getCoursesByFaculty);
router.get(
    '/courses/:courseId/chapters/:chapterId/videos/:videoPosition/embed',
    authFaculty,
    getCourseVideoEmbedByFaculty
);
router.get('/courses/:courseId/notes', authFaculty, getNoteByFaculty);
router.get('/courses/:courseId', authFaculty, getCourseByFaculty);

module.exports = router;
