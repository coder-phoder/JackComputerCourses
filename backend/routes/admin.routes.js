const express = require('express');
const {
    loginAdmin,
    logoutAdmin,
    getAdminProfile
} = require('../controllers/admin.controller');
const authAdmin = require('../middlewares/admin.middleware');

const router = express.Router();

router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);
router.get('/profile', authAdmin, getAdminProfile);

module.exports = router;
