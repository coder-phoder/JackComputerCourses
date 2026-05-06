const express = require('express');
const {
    loginUser,
    logoutUser,
    getUserProfile
} = require('../controllers/user.controller');
const authUser = require('../middlewares/user.middleware');

const router = express.Router();

router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/profile', authUser, getUserProfile);

module.exports = router;
