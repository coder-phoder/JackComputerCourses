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

const topicNoteSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
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

// Case-insensitive uniqueness, so "C Language" and "c language" cannot both exist
topicNoteSchema.index({ topic: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('TopicNote', topicNoteSchema);
