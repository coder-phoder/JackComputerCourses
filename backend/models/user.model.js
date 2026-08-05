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

// Every profile detail is volunteered, so they are handled as one set: the form sends
// them together, the account may leave all of them empty, and nothing gates on them.
const PROFILE_TEXT_FIELDS = ['email', 'alternatePhone', 'occupation', 'address', 'city', 'state', 'pincode'];

// "Remind me later" is answered by the calendar rather than by the next login, so the
// prompt stays out of the way for three days however often the account signs in.
const PROFILE_REMINDER_DAYS = 3;

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
    },
    // Optional details the account may volunteer. A rule only has something to say
    // once a value is actually typed, so an empty field is always accepted.
    profile: {
        email: {
            type: String,
            default: '',
            trim: true,
            lowercase: true,
            maxlength: [120, 'Email is too long'],
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Enter a valid email address']
        },
        alternatePhone: {
            type: String,
            default: '',
            trim: true,
            match: [/^\d{10,15}$/, 'Alternate phone must be 10 to 15 digits']
        },
        occupation: {
            type: String,
            default: '',
            trim: true,
            maxlength: [80, 'Occupation is too long']
        },
        address: {
            type: String,
            default: '',
            trim: true,
            maxlength: [200, 'Address is too long']
        },
        city: {
            type: String,
            default: '',
            trim: true,
            maxlength: [60, 'City is too long']
        },
        state: {
            type: String,
            default: '',
            trim: true,
            maxlength: [60, 'State is too long']
        },
        pincode: {
            type: String,
            default: '',
            trim: true,
            match: [/^\d{4,10}$/, 'Pincode must be 4 to 10 digits']
        },
        dateOfBirth: {
            type: Date,
            default: null,
            validate: {
                validator: (value) => !value || (value.getTime() <= Date.now() && value.getFullYear() >= 1900),
                message: 'Date of birth must be a real date in the past'
            }
        }
    },
    // Going through the form once answers the prompt for good; asking for later only
    // moves it down the calendar, which is why the two are kept apart.
    profileUpdatedAt: {
        type: Date,
        default: null
    },
    profileRemindAfter: {
        type: Date,
        default: null
    }
});

// The form works in strings and gets back exactly what it can put in an input: an
// unset field reads as empty, and a date reads as the YYYY-MM-DD its picker expects.
const formatProfile = (profile) => ({
    ...Object.fromEntries(PROFILE_TEXT_FIELDS.map((field) => [field, profile?.[field] || ''])),
    dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : ''
});

// Only the fields that were sent are touched, so a form that carries part of the
// profile leaves the rest alone — and a box that was emptied clears its value rather
// than reading as "nothing to change". Anything unusable is left for validation.
const applyProfileInput = (user, input = {}) => {
    PROFILE_TEXT_FIELDS.forEach((field) => {
        if (field in input) {
            user.profile[field] = String(input[field] ?? '').trim();
        }
    });

    if ('dateOfBirth' in input) {
        const dateOfBirth = String(input.dateOfBirth ?? '').trim();

        user.profile.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }

    return user;
};

// An account that has been through the form is never asked again. Until then it is
// asked on login, or once the days it asked to be left alone have passed.
const needsProfilePrompt = (user, now = new Date()) => (
    !user.profileUpdatedAt && (!user.profileRemindAfter || user.profileRemindAfter <= now)
);

const getProfileRemindAfter = (now = new Date()) => (
    new Date(now.getTime() + PROFILE_REMINDER_DAYS * 24 * 60 * 60 * 1000)
);

const User = mongoose.model('User', userSchema);

User.formatName = formatName;
User.hasFullName = hasFullName;
User.PROFILE_REMINDER_DAYS = PROFILE_REMINDER_DAYS;
User.formatProfile = formatProfile;
User.applyProfileInput = applyProfileInput;
User.needsProfilePrompt = needsProfilePrompt;
User.getProfileRemindAfter = getProfileRemindAfter;

module.exports = User;
