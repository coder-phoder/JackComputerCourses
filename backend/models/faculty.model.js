const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    activeSessionId: {
        type: String,
        default: null,
        select: false
    },
    // The guided walkthrough runs once per account, so the moment it was finished
    // is the only thing that has to outlive the session it ran in.
    tourCompletedAt: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model('Faculty', facultySchema);
