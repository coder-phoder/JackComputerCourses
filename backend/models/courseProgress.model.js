const mongoose = require('mongoose');

const courseProgressSchema = new mongoose.Schema({
    viewerRole: {
        type: String,
        enum: ['user', 'faculty'],
        required: true
    },
    viewerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chapter',
        required: true
    },
    videoPosition: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator: Number.isInteger,
            message: 'Video position must be an integer'
        }
    },
    lastWatchedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// One resume point per viewer per course.
courseProgressSchema.index({ viewerRole: 1, viewerId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('CourseProgress', courseProgressSchema);
