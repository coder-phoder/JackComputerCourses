const mongoose = require('mongoose');
const Attendance = require('../models/attendance.model');
const User = require('../models/user.model');

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const isValidObjectId = (id) => (
    mongoose.Types.ObjectId.isValid(id)
    && new mongoose.Types.ObjectId(id).toString() === String(id)
);

const sendError = (res, statusCode, message) => res.status(statusCode).json({
    success: false,
    message,
    data: {}
});

// The same handlers serve the admin and the faculty attendance pages, so who is
// marking is read from the request instead of from the body.
const getMarker = (req) => {
    if (req.admin) {
        return { role: 'admin', name: 'Admin', facultyId: null };
    }

    if (req.faculty?._id) {
        return {
            role: 'faculty',
            name: req.faculty.name || 'Faculty',
            facultyId: req.faculty._id
        };
    }

    return null;
};

// Only the admin is allowed to read who marked a day back, so the fields are left
// off the faculty payload rather than hidden in the browser.
const formatAttendanceData = (record, includeMarkedBy) => ({
    _id: record._id.toString(),
    user: record.user.toString(),
    date: record.date,
    status: record.status,
    ...(includeMarkedBy
        ? { markedByRole: record.markedByRole, markedByName: record.markedByName }
        : {}),
    updatedAt: record.updatedAt
});

const getStudentsForAttendance = async (req, res) => {
    try {
        const students = await User.find({}).select('name phone').sort({ name: 1 }).lean();

        return res.status(200).json({
            success: true,
            message: 'Students fetched successfully',
            data: {
                students: students.map((student) => ({
                    _id: student._id.toString(),
                    name: student.name || '',
                    phone: student.phone
                }))
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching students');
    }
};

// One read per visible month. Passing a userId narrows it to a single student,
// which is what the attendance view on the admin users list asks for.
const getMonthAttendance = async (req, res) => {
    try {
        const month = String(req.query?.month || '').trim();
        const userId = String(req.query?.userId || '').trim();

        if (!MONTH_KEY_PATTERN.test(month)) {
            return sendError(res, 400, 'Month must be sent as YYYY-MM');
        }

        if (userId && !isValidObjectId(userId)) {
            return sendError(res, 400, 'Invalid student id');
        }

        const query = { date: { $gte: `${month}-01`, $lte: `${month}-31` } };

        if (userId) {
            query.user = userId;
        }

        const records = await Attendance.find(query).sort({ date: 1 }).lean();

        return res.status(200).json({
            success: true,
            message: 'Attendance fetched successfully',
            data: {
                month,
                attendance: records.map((record) => formatAttendanceData(record, Boolean(req.admin)))
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching attendance');
    }
};

// Create and update are the same action here: a student has one record per day, so
// marking a day that is already marked rewrites it and restamps who marked it.
const markAttendance = async (req, res) => {
    try {
        const marker = getMarker(req);

        if (!marker) {
            return sendError(res, 401, 'Attendance can only be marked by an admin or a faculty');
        }

        const userId = String(req.body?.userId || '').trim();
        const date = String(req.body?.date || '').trim();
        const status = String(req.body?.status || '').trim();

        if (!isValidObjectId(userId)) {
            return sendError(res, 400, 'Invalid student id');
        }

        if (!Attendance.DATE_KEY_PATTERN.test(date)) {
            return sendError(res, 400, 'Date must be sent as YYYY-MM-DD');
        }

        if (!Attendance.STATUSES.includes(status)) {
            return sendError(res, 400, `Status must be one of: ${Attendance.STATUSES.join(', ')}`);
        }

        const student = await User.findById(userId).select('_id');

        if (!student) {
            return sendError(res, 404, 'Student not found');
        }

        const record = await Attendance.findOneAndUpdate(
            { user: userId, date },
            {
                $set: {
                    status,
                    markedByRole: marker.role,
                    markedByName: marker.name,
                    markedByFaculty: marker.facultyId
                }
            },
            { returnDocument: 'after', upsert: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Attendance marked successfully',
            data: { attendance: formatAttendanceData(record, Boolean(req.admin)) }
        });
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 409, 'Attendance for this student and day already exists');
        }

        return sendError(res, 500, 'Something went wrong while marking attendance');
    }
};

const deleteAttendance = async (req, res) => {
    try {
        const { attendanceId } = req.params;

        if (!isValidObjectId(attendanceId)) {
            return sendError(res, 400, 'Invalid attendance id');
        }

        const record = await Attendance.findByIdAndDelete(attendanceId);

        if (!record) {
            return sendError(res, 404, 'Attendance record not found');
        }

        return res.status(200).json({
            success: true,
            message: 'Attendance removed successfully',
            data: { attendanceId: record._id.toString() }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while removing attendance');
    }
};

module.exports = {
    getStudentsForAttendance,
    getMonthAttendance,
    markAttendance,
    deleteAttendance,
    formatAttendanceData
};
