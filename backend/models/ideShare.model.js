const mongoose = require('mongoose');

const sharedFileSchema = new mongoose.Schema({
    originalNodeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    workspaceName: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    language: {
        type: String,
        enum: ['c', 'cpp', 'java', 'python', 'javascript', null],
        default: null
    },
    content: {
        type: String,
        default: ''
    },
    size: {
        type: Number,
        min: 0,
        default: 0
    }
}, { _id: false });

const sharedNodeSchema = new mongoose.Schema({
    originalNodeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    type: {
        type: String,
        enum: ['file', 'folder'],
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    language: {
        type: String,
        enum: ['c', 'cpp', 'java', 'python', 'javascript', null],
        default: null
    },
    content: {
        type: String,
        default: ''
    },
    size: {
        type: Number,
        min: 0,
        default: 0
    }
}, { _id: false });

const sharedWorkspaceSchema = new mongoose.Schema({
    originalWorkspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    nodes: {
        type: [sharedNodeSchema],
        default: []
    }
}, { _id: false });

const sharedFolderSchema = new mongoose.Schema({
    originalNodeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    workspaceName: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    nodes: {
        type: [sharedNodeSchema],
        default: []
    }
}, { _id: false });

const ideShareSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    createdByRole: {
        type: String,
        enum: ['user', 'faculty'],
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    createdByName: {
        type: String,
        default: '',
        trim: true
    },
    createdByPhone: {
        type: String,
        default: '',
        trim: true
    },
    recipients: {
        type: [{
            role: {
                type: String,
                enum: ['user', 'faculty'],
                required: true
            },
            recipientId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },
            name: {
                type: String,
                default: '',
                trim: true
            },
            phone: {
                type: String,
                default: '',
                trim: true
            }
        }],
        default: []
    },
    payload: {
        workspaces: {
            type: [sharedWorkspaceSchema],
            default: []
        },
        folders: {
            type: [sharedFolderSchema],
            default: []
        },
        files: {
            type: [sharedFileSchema],
            default: []
        }
    }
}, {
    timestamps: true
});

ideShareSchema.index({ createdByRole: 1, createdBy: 1, createdAt: -1 });
ideShareSchema.index({ 'recipients.role': 1, 'recipients.recipientId': 1, createdAt: -1 });

module.exports = mongoose.model('IdeShare', ideShareSchema);
