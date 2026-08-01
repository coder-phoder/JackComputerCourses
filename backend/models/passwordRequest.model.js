const mongoose = require('mongoose');

const passwordRequestSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    // Already hashed when the request is raised, so approving only copies the hash
    // onto the account and no readable password is ever stored or sent to the admin.
    password: {
        type: String,
        required: true,
        select: false
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'declined'],
        default: 'pending'
    },
    // Stamped on approval so the admin history shows whether the request reset an
    // existing password or opened a brand new account.
    createdAccount: {
        type: Boolean,
        default: false
    },
    approvedAt: {
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

passwordRequestSchema.index({ status: 1, createdAt: -1 });
// One open request per phone: raising another one replaces the pending request
// instead of queueing a second decision for the same person.
passwordRequestSchema.index(
    { phone: 1 },
    { unique: true, partialFilterExpression: { status: 'pending' } }
);

module.exports = mongoose.model('PasswordRequest', passwordRequestSchema);
