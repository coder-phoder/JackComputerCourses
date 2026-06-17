const mongoose = require('mongoose');

const driveFileSchema = new mongoose.Schema({
    fileId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    mimeType: {
        type: String,
        required: true
    },
    webViewLink: {
        type: String,
        required: true
    },
    iconLink: {
        type: String,
        default: ''
    }
}, { _id: false });

const noteSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        unique: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    driveFolderUrl: {
        type: String,
        required: true,
        trim: true
    },
    driveFolderId: {
        type: String,
        required: true,
        trim: true
    },
    files: {
        type: [driveFileSchema],
        default: []
    },
    lastSyncedAt: {
        type: Date,
        default: null
    },
    syncStatus: {
        type: String,
        enum: ['pending', 'synced', 'failed'],
        default: 'pending'
    },
    syncError: {
        type: String,
        trim: true,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Note', noteSchema);
