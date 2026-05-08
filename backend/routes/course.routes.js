const express = require('express');
const {
    getAllCoursesByAdmin,
    createCourseByAdmin,
    getCourseByAdmin,
    updateCourseByAdmin,
    getCourseAccessByAdmin,
    replaceCourseAccessByAdmin,
    addCourseAccessByAdmin,
    removeCourseAccessByAdmin,
    deleteCourseByAdmin,
    getChaptersByAdmin,
    createChapterByAdmin,
    updateChapterByAdmin,
    deleteChapterByAdmin,
    syncChapterVideosByAdmin
} = require('../controllers/course.controller');

const router = express.Router();

router.get('/', getAllCoursesByAdmin);
router.post('/', createCourseByAdmin);
router.get('/:courseId/access', getCourseAccessByAdmin);
router.put('/:courseId/access', replaceCourseAccessByAdmin);
router.post('/:courseId/access', addCourseAccessByAdmin);
router.delete('/:courseId/access', removeCourseAccessByAdmin);
router.get('/:courseId', getCourseByAdmin);
router.patch('/:courseId', updateCourseByAdmin);
router.delete('/:courseId', deleteCourseByAdmin);

router.get('/:courseId/chapters', getChaptersByAdmin);
router.post('/:courseId/chapters', createChapterByAdmin);
router.patch('/:courseId/chapters/:chapterId', updateChapterByAdmin);
router.delete('/:courseId/chapters/:chapterId', deleteChapterByAdmin);
router.post('/:courseId/chapters/:chapterId/sync-videos', syncChapterVideosByAdmin);

module.exports = router;
