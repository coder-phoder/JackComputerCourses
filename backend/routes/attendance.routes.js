const express = require('express');
const {
    getStudentsForAttendance,
    getMonthAttendance,
    markAttendance,
    deleteAttendance
} = require('../controllers/attendance.controller');

// Admins and faculties get the exact same attendance actions, so one router is
// mounted behind both role middlewares and the controllers read the marker from
// the request. The admin-only extra is reading who marked a day, which the
// controller adds to its response.
const attendanceRoutes = express.Router();

attendanceRoutes.get('/students', getStudentsForAttendance);
attendanceRoutes.get('/', getMonthAttendance);
attendanceRoutes.post('/', markAttendance);
attendanceRoutes.delete('/:attendanceId', deleteAttendance);

module.exports = attendanceRoutes;
