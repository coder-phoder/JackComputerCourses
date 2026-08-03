const mongoose = require('mongoose');

const ATTENDANCE_STATUSES = ['present', 'absent'];

// Days are stored as YYYY-MM-DD strings so a record always means the calendar day
// it was marked on, whatever timezone the browser or the server happens to run in.
// It also makes a month a plain string range instead of a date window.
const DATE_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const attendanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: String,
        required: true,
        match: [DATE_KEY_PATTERN, 'Date must be a valid YYYY-MM-DD day']
    },
    status: {
        type: String,
        enum: ATTENDANCE_STATUSES,
        required: true
    },
    // Stamped on every write so the admin can see whether he or a faculty marked
    // the day; the name is copied because a deleted faculty must not blank it out.
    markedByRole: {
        type: String,
        enum: ['admin', 'faculty'],
        required: true
    },
    markedByName: {
        type: String,
        required: true,
        trim: true
    },
    markedByFaculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        default: null
    }
}, {
    timestamps: true
});

// One record per student per day: marking again edits that day instead of stacking rows.
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
// Month reads pull a date range across every student.
attendanceSchema.index({ date: 1 });

// Exposed on the model so the controller validates against the same list the
// schema enforces instead of keeping a second copy of it.
attendanceSchema.statics.STATUSES = ATTENDANCE_STATUSES;
attendanceSchema.statics.DATE_KEY_PATTERN = DATE_KEY_PATTERN;

module.exports = mongoose.model('Attendance', attendanceSchema);
