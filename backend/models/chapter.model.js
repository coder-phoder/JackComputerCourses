const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    youtubeVideoId: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    thumbnailUrl: {
        type: String,
        trim: true,
        default: ''
    },
    position: {
        type: Number,
        required: true,
        min: 0
    },
    duration: {
        type: String,
        trim: true,
        default: ''
    },
    publishedAt: {
        type: Date,
        default: null
    },
    watchUrl: {
        type: String,
        required: true,
        trim: true
    },
    embedUrl: {
        type: String,
        required: true,
        trim: true
    },
    fetchedAt: {
        type: Date,
        required: true
    }
}, {
    _id: false
});

const chapterSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    playlistUrl: {
        type: String,
        required: true,
        trim: true
    },
    playlistId: {
        type: String,
        required: true,
        trim: true
    },
    order: {
        type: Number,
        required: true,
        min: 0
    },
    videoCount: {
        type: Number,
        default: 0,
        min: 0
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
    },
    videos: {
        type: [videoSchema],
        default: []
    }
}, {
    timestamps: true
});

chapterSchema.index({ courseId: 1, order: 1 });

module.exports = mongoose.model('Chapter', chapterSchema);
