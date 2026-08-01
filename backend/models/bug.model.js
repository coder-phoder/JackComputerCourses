const mongoose = require('mongoose');

const bugImageSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        default: ''
    },
    dataUrl: {
        type: String,
        required: true
    }
}, { _id: false });

const bugSchema = new mongoose.Schema({
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    reporterRole: {
        type: String,
        enum: ['user', 'faculty'],
        required: true
    },
    reporterName: {
        type: String,
        trim: true,
        default: ''
    },
    reporterPhone: {
        type: String,
        trim: true,
        default: ''
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150
    },
    description: {
        type: String,
        trim: true,
        default: '',
        maxlength: 2000
    },
    // Base64 data URLs are heavy, so they are excluded from every query by default
    // and loaded only through the dedicated images endpoint.
    images: {
        type: [bugImageSchema],
        default: [],
        select: false
    },
    imageCount: {
        type: Number,
        default: 0,
        min: 0
    },
    // Decided bugs stay stored so every reporter keeps their own history.
    // Only an explicit admin delete takes a report out of the system.
    status: {
        type: String,
        enum: ['open', 'resolved', 'declined'],
        default: 'open'
    },
    resolvedAt: {
        type: Date,
        default: null
    },
    declinedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

bugSchema.index({ reporterRole: 1, reporterId: 1, createdAt: -1 });
bugSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Bug', bugSchema);
