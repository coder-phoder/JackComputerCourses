const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required() {
            return this.isNew;
        },
        trim: true
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
    }
});

module.exports = mongoose.model('User', userSchema);
