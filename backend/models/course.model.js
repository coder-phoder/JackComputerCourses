const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    duration: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    shortDescription: {
        type: String,
        trim: true,
        default: ''
    },
    thumbnailUrl: {
        type: String,
        trim: true,
        default: ''
    },
    category: {
        type: String,
        trim: true,
        default: ''
    },
    level: {
        type: String,
        trim: true,
        default: ''
    },
    language: {
        type: String,
        trim: true,
        default: ''
    },
    tags: {
        type: [String],
        default: []
    },
    highlights: {
        type: [String],
        default: []
    },
    prerequisites: {
        type: [String],
        default: []
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    isOpenToAll: {
        type: Boolean,
        default: false
    },
    allowedUserPhones: {
        type: [String],
        default: [],
        set: (phones) => [...new Set((phones || [])
            .map((phone) => String(phone || '').trim())
            .filter(Boolean))]
    }
}, {
    timestamps: true
});

courseSchema.index({ isPublished: 1, isOpenToAll: 1, allowedUserPhones: 1, createdAt: -1 });

module.exports = mongoose.model('Course', courseSchema);
