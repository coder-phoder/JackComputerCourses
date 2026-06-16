const express = require('express');
const {
    loginFaculty,
    logoutFaculty,
    getFacultyProfile
} = require('../controllers/faculty.controller');
const authFaculty = require('../middlewares/faculty.middleware');

const router = express.Router();

router.post('/login', loginFaculty);
router.post('/logout', logoutFaculty);
router.get('/profile', authFaculty, getFacultyProfile);

module.exports = router;
