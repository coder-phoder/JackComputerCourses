const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    userName: {
        type: String,
        trim: true,
        default: ''
    },
    userPhone: {
        type: String,
        trim: true,
        default: ''
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        required: true,
        index: true
    },
    facultyName: {
        type: String,
        trim: true,
        default: ''
    },
    facultyPhone: {
        type: String,
        trim: true,
        default: ''
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true
    },
    workspaceName: {
        type: String,
        trim: true,
        default: ''
    },
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkspaceNode',
        required: true,
        index: true
    },
    fileName: {
        type: String,
        trim: true,
        required: true
    },
    fileLanguage: {
        type: String,
        enum: ['c', 'cpp', 'java', 'python', 'javascript'],
        required: true
    },
    originalContent: {
        type: String,
        default: ''
    },
    reviewedContent: {
        type: String,
        default: ''
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: [
            'pending',
            'accepted',
            'declined',
            'changes_submitted',
            'changes_accepted',
            'changes_declined'
        ],
        default: 'pending',
        index: true
    },
    facultyResponse: {
        type: String,
        trim: true,
        default: '',
        maxlength: 1000
    },
    acceptedAt: {
        type: Date,
        default: null
    },
    declinedAt: {
        type: Date,
        default: null
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    userDecisionAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

querySchema.index({ userId: 1, status: 1, updatedAt: -1 });
querySchema.index({ facultyId: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model('Query', querySchema);
