const mongoose = require('mongoose');

const MAX_FILE_SIZE_BYTES = 200 * 1024;

const LANGUAGE_BY_EXTENSION = {
    '.c': 'c',
    '.cpp': 'cpp',
    '.java': 'java',
    '.py': 'python',
    '.js': 'javascript'
};

const getFileExtension = (name) => {
    const normalizedName = String(name || '').trim().toLowerCase();
    const dotIndex = normalizedName.lastIndexOf('.');

    if (dotIndex <= 0) {
        return '';
    }

    return normalizedName.slice(dotIndex);
};

const getLanguageFromFileName = (name) => LANGUAGE_BY_EXTENSION[getFileExtension(name)] || '';

const workspaceNodeSchema = new mongoose.Schema({
    ownerRole: {
        type: String,
        enum: ['user', 'faculty'],
        required: true,
        index: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['file', 'folder'],
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
        validate: {
            validator(value) {
                const normalizedValue = String(value || '').trim();
                return Boolean(normalizedValue)
                    && normalizedValue !== '.'
                    && normalizedValue !== '..'
                    && !/[\\/]/.test(normalizedValue);
            },
            message: 'Name cannot contain path separators'
        }
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkspaceNode',
        default: null,
        index: true
    },
    language: {
        type: String,
        enum: ['c', 'cpp', 'java', 'python', 'javascript', null],
        default: null,
        validate: {
            validator(value) {
                if (this.type !== 'file') {
                    return value === null || value === undefined;
                }

                const expectedLanguage = getLanguageFromFileName(this.name);
                return Boolean(expectedLanguage) && value === expectedLanguage;
            },
            message: 'Unsupported or mismatched file language'
        }
    },
    content: {
        type: String,
        default: ''
    },
    size: {
        type: Number,
        min: 0,
        max: MAX_FILE_SIZE_BYTES,
        default: 0
    }
}, {
    timestamps: true
});

workspaceNodeSchema.pre('validate', function setWorkspaceNodeDerivedFields() {
    if (this.type === 'folder') {
        this.language = null;
        this.content = '';
        this.size = 0;
        return;
    }

    const content = typeof this.content === 'string' ? this.content : '';

    this.content = content;
    this.language = getLanguageFromFileName(this.name) || null;
    this.size = Buffer.byteLength(content, 'utf8');
});

workspaceNodeSchema.index({ ownerRole: 1, ownerId: 1, workspaceId: 1, parentId: 1, name: 1 });

module.exports = mongoose.model('WorkspaceNode', workspaceNodeSchema);
module.exports.LANGUAGE_BY_EXTENSION = LANGUAGE_BY_EXTENSION;
module.exports.MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_BYTES;
module.exports.getLanguageFromFileName = getLanguageFromFileName;
