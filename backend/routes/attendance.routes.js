const express = require('express');
const {
    getStudentsForAttendance,
    getMonthAttendance,
    getMyAttendance,
    markAttendance,
    deleteAttendance
} = require('../controllers/attendance.controller');

// Admins and faculties get the exact same attendance actions, so one router is
// mounted behind both role middlewares and the controllers read the marker from
// the request. The admin-only extra is reading who marked a day, which the
// controller adds to its response.
const staffAttendanceRoutes = express.Router();
// A student only ever reads his own month, so his router carries the read and
// nothing else instead of guarding the marking routes behind another check.
const userAttendanceRoutes = express.Router();

staffAttendanceRoutes.get('/students', getStudentsForAttendance);
staffAttendanceRoutes.get('/', getMonthAttendance);
staffAttendanceRoutes.post('/', markAttendance);
staffAttendanceRoutes.delete('/:attendanceId', deleteAttendance);

userAttendanceRoutes.get('/', getMyAttendance);

module.exports = {
    staffAttendanceRoutes,
    userAttendanceRoutes
};
