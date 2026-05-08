const express = require('express');
const {
    loginAdmin,
    logoutAdmin,
    getAdminProfile,
    getAllUsersByAdmin,
    createUserByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin
} = require('../controllers/admin.controller');
const authAdmin = require('../middlewares/admin.middleware');
const courseRoutes = require('./course.routes');

const router = express.Router();

router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);
router.get('/profile', authAdmin, getAdminProfile);
router.get('/users', authAdmin, getAllUsersByAdmin);
router.post('/users', authAdmin, createUserByAdmin);
router.patch('/users/:id', authAdmin, updateUserByAdmin);
router.delete('/users/:id', authAdmin, deleteUserByAdmin);
router.use('/courses', authAdmin, courseRoutes);

module.exports = router;
