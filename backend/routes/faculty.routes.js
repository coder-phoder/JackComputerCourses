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
const { getAllNotesByFaculty, getNoteByFaculty } = require('../controllers/note.controller');
const authFaculty = require('../middlewares/faculty.middleware');
const workspaceRoutes = require('./workspace.routes');
const ideShareRoutes = require('./ideShare.routes');
const { facultyQueryRoutes } = require('./query.routes');
const { facultyTopicNoteRoutes } = require('./topicNote.routes');

const router = express.Router();

router.post('/login', loginFaculty);
router.post('/logout', logoutFaculty);
router.get('/profile', authFaculty, getFacultyProfile);
router.use('/workspace', authFaculty, workspaceRoutes);
router.use('/ide-share', authFaculty, ideShareRoutes);
router.use('/', authFaculty, facultyQueryRoutes);
router.use('/topic-notes', authFaculty, facultyTopicNoteRoutes);
router.get('/notes', authFaculty, getAllNotesByFaculty);
router.get('/courses', authFaculty, getCoursesByFaculty);
router.get(
    '/courses/:courseId/chapters/:chapterId/videos/:videoPosition/embed',
    authFaculty,
    getCourseVideoEmbedByFaculty
);
router.get('/courses/:courseId/notes', authFaculty, getNoteByFaculty);
router.get('/courses/:courseId', authFaculty, getCourseByFaculty);

module.exports = router;
