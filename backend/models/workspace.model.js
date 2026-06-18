const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
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
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
        validate: {
            validator(value) {
                const normalizedValue = String(value || '').trim();
                return Boolean(normalizedValue)
                    && normalizedValue !== '.'
                    && normalizedValue !== '..'
                    && !/[\\/]/.test(normalizedValue);
            },
            message: 'Workspace name cannot contain path separators'
        }
    }
}, {
    timestamps: true
});

workspaceSchema.index({ ownerRole: 1, ownerId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Workspace', workspaceSchema);
