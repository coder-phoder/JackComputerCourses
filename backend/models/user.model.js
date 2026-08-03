const mongoose = require('mongoose');

// Names are stored as one "First Last" string, so every writer hands over the
// combined value and this setter decides the casing for all of them.
const formatName = (value) => String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

// Accounts made before names were split still hold a single word, so they are
// asked for a first and a last name once before they can use the app.
const hasFullName = (value) => formatName(value).split(' ').filter(Boolean).length >= 2;

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required() {
            return this.isNew;
        },
        set: formatName
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    activeSessionId: {
        type: String,
        default: null,
        select: false
    },
    // The guided walkthrough runs once per account, so the moment it was finished
    // is the only thing that has to outlive the session it ran in.
    tourCompletedAt: {
        type: Date,
        default: null
    }
});

const User = mongoose.model('User', userSchema);

User.formatName = formatName;
User.hasFullName = hasFullName;

module.exports = User;
