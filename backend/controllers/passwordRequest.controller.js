const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const PasswordRequest = require('../models/passwordRequest.model');
const User = require('../models/user.model');
const LoginHistory = require('../models/loginHistory.model');
const { formatUserData } = require('./admin.controller');

const MIN_PASSWORD_LENGTH = 6;

const isValidObjectId = (id) => (
    mongoose.Types.ObjectId.isValid(id)
    && new mongoose.Types.ObjectId(id).toString() === String(id)
);

const sendError = (res, statusCode, message) => res.status(statusCode).json({
    success: false,
    message,
    data: {}
});

// hasAccount tells the admin whether approving resets a password or registers a
// new learner; it stays null wherever the answer is not looked up.
const formatPasswordRequestData = (request, hasAccount = null) => ({
    _id: request._id.toString(),
    name: request.name,
    phone: request.phone,
    status: request.status,
    createdAccount: Boolean(request.createdAccount),
    hasAccount,
    approvedAt: request.approvedAt,
    declinedAt: request.declinedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt
});

// Public Controllers

const createPasswordRequest = async (req, res) => {
    try {
        const name = String(req.body?.name || '').trim();
        const phone = String(req.body?.phone || '').trim();
        const password = String(req.body?.password || '');

        if (!name || !phone || !password) {
            return sendError(res, 400, 'Name, phone and password are required');
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            return sendError(res, 400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        // A new request overwrites the pending one for that phone, so a mistyped
        // request is fixed by sending it again rather than by asking the admin.
        const request = await PasswordRequest.findOneAndUpdate(
            { phone, status: 'pending' },
            { $set: { name, password: hashedPassword } },
            { returnDocument: 'after', upsert: true }
        );

        return res.status(201).json({
            success: true,
            message: 'Password request sent to the admin for approval',
            data: { request: formatPasswordRequestData(request) }
        });
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 409, 'A request for this phone is already awaiting approval');
        }

        return sendError(res, 500, 'Something went wrong while sending the password request');
    }
};

// Admin Controllers

const getPasswordRequestsByAdmin = async (req, res) => {
    try {
        // Newest first; pending requests and decided history are split on the page.
        const requests = await PasswordRequest.find().sort({ createdAt: -1 }).lean();
        const phones = [...new Set(requests.map((request) => request.phone))];
        const accounts = phones.length
            ? await User.find({ phone: { $in: phones } }).select('phone').lean()
            : [];
        const accountPhones = new Set(accounts.map((account) => account.phone));

        return res.status(200).json({
            success: true,
            message: 'Password requests fetched successfully',
            data: {
                requests: requests.map((request) => (
                    formatPasswordRequestData(request, accountPhones.has(request.phone))
                ))
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching password requests');
    }
};

// Approving is both the password reset and the registration path: a known phone
// gets the new password, an unknown one becomes a new account.
const approvePasswordRequestByAdmin = async (req, res) => {
    try {
        const { requestId } = req.params;

        if (!isValidObjectId(requestId)) {
            return sendError(res, 400, 'Invalid password request id');
        }

        const request = await PasswordRequest.findById(requestId).select('+password');

        if (!request) {
            return sendError(res, 404, 'Password request not found');
        }

        if (request.status !== 'pending') {
            return sendError(res, 409, 'This password request has already been decided');
        }

        const user = await User.findOne({ phone: request.phone }).select('+password +activeSessionId');
        let account = user;

        if (user) {
            const previousSessionId = user.activeSessionId;

            user.password = request.password;
            // The new password has to be the only way back in, so a session that is
            // still open on the old password is closed here.
            user.activeSessionId = null;
            await user.save();

            if (previousSessionId) {
                await LoginHistory.endSession('user', user._id, previousSessionId);
            }
        } else {
            account = await User.create({
                name: request.name,
                phone: request.phone,
                password: request.password
            });
        }

        request.status = 'approved';
        request.createdAccount = !user;
        request.approvedAt = new Date();
        await request.save();

        return res.status(200).json({
            success: true,
            message: user
                ? 'Password request approved and password updated'
                : 'Password request approved and account created',
            data: {
                request: formatPasswordRequestData(request, true),
                user: formatUserData(account)
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 409, 'User with this phone already exists');
        }

        return sendError(res, 500, 'Something went wrong while approving the password request');
    }
};

const declinePasswordRequestByAdmin = async (req, res) => {
    try {
        const { requestId } = req.params;

        if (!isValidObjectId(requestId)) {
            return sendError(res, 400, 'Invalid password request id');
        }

        const request = await PasswordRequest.findById(requestId);

        if (!request) {
            return sendError(res, 404, 'Password request not found');
        }

        if (request.status !== 'pending') {
            return sendError(res, 409, 'This password request has already been decided');
        }

        request.status = 'declined';
        request.declinedAt = new Date();
        await request.save();

        return res.status(200).json({
            success: true,
            message: 'Password request declined successfully',
            data: { request: formatPasswordRequestData(request) }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while declining the password request');
    }
};

// Decided requests stay as history until the admin clears them on purpose.
const deletePasswordRequestByAdmin = async (req, res) => {
    try {
        const { requestId } = req.params;

        if (!isValidObjectId(requestId)) {
            return sendError(res, 400, 'Invalid password request id');
        }

        const request = await PasswordRequest.findOneAndDelete({
            _id: requestId,
            status: { $ne: 'pending' }
        });

        if (!request) {
            return sendError(res, 404, 'Decided password request not found');
        }

        return res.status(200).json({
            success: true,
            message: 'Password request removed successfully',
            data: { requestId: request._id.toString() }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while removing the password request');
    }
};

module.exports = {
    createPasswordRequest,
    getPasswordRequestsByAdmin,
    approvePasswordRequestByAdmin,
    declinePasswordRequestByAdmin,
    deletePasswordRequestByAdmin,
    formatPasswordRequestData,
    MIN_PASSWORD_LENGTH
};
