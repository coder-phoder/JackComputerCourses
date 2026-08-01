const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
    accountType: {
        type: String,
        enum: ['user', 'faculty'],
        required: true
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    sessionId: {
        type: String,
        required: true
    },
    loginAt: {
        type: Date,
        default: Date.now
    },
    logoutAt: {
        type: Date,
        default: null
    },
    logoutReason: {
        type: String,
        enum: ['manual', 'replaced'],
        default: null
    }
});

// Newest-first history lookups for a single account.
loginHistorySchema.index({ accountType: 1, accountId: 1, loginAt: -1 });

const formatLoginHistoryEntry = (entry) => ({
    _id: entry._id.toString(),
    loginAt: entry.loginAt ? entry.loginAt.toISOString() : null,
    logoutAt: entry.logoutAt ? entry.logoutAt.toISOString() : null,
    logoutReason: entry.logoutReason || null,
    isActive: !entry.logoutAt
});

// A login always ends whatever session was open, because only one session may stay active.
loginHistorySchema.statics.startSession = async function startSession(accountType, accountId, sessionId) {
    await this.updateMany(
        { accountType, accountId, logoutAt: null },
        { $set: { logoutAt: new Date(), logoutReason: 'replaced' } }
    );

    return this.create({ accountType, accountId, sessionId });
};

loginHistorySchema.statics.endSession = function endSession(accountType, accountId, sessionId) {
    return this.updateOne(
        { accountType, accountId, sessionId, logoutAt: null },
        { $set: { logoutAt: new Date(), logoutReason: 'manual' } }
    );
};

loginHistorySchema.statics.getAccountHistory = async function getAccountHistory(accountType, accountId, limit = 200) {
    const entries = await this
        .find({ accountType, accountId })
        .sort({ loginAt: -1 })
        .limit(limit)
        .lean();

    return entries.map(formatLoginHistoryEntry);
};

loginHistorySchema.statics.clearAccountHistory = function clearAccountHistory(accountType, accountId) {
    return this.deleteMany({ accountType, accountId });
};

loginHistorySchema.statics.formatEntry = formatLoginHistoryEntry;

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
