const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const LoginHistory = require('../models/loginHistory.model');

const userCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
};

const userLoginCookieOptions = {
    ...userCookieOptions,
    maxAge: 24 * 60 * 60 * 1000
};

const formatUserData = (user) => ({
    name: user.name || '',
    phone: user.phone,
    role: 'user'
});

const createSessionId = () => (
    typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : crypto.randomBytes(32).toString('hex')
);

const createUserToken = (user) => jwt.sign(
    {
        id: user._id.toString(),
        phone: user.phone,
        role: 'user',
        sessionId: user.activeSessionId
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
);

const clearCurrentUserSession = async (token) => {
    if (!token || !process.env.JWT_SECRET) {
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'user' || !decoded.id || !decoded.sessionId) {
            return;
        }

        await User.updateOne(
            {
                _id: decoded.id,
                activeSessionId: decoded.sessionId
            },
            { $set: { activeSessionId: null } }
        );
        await LoginHistory.endSession('user', decoded.id, decoded.sessionId);
    } catch {
        // Invalid or stale logout tokens should only clear the browser cookie.
    }
};

const registerUser = async (req, res) => {
    try {
        const { name, phone, password } = req.body || {};

        if (!name || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone and password are required',
                data: {}
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: 'User authentication is not configured',
                data: {}
            });
        }

        const trimmedName = String(name).trim();
        const trimmedPhone = String(phone).trim();
        const userPassword = String(password);

        if (!trimmedName || !trimmedPhone || !userPassword) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone and password are required',
                data: {}
            });
        }

        if (userPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters',
                data: {}
            });
        }

        const existingUser = await User.findOne({ phone: trimmedPhone });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this phone already exists',
                data: {}
            });
        }

        const hashedPassword = await bcrypt.hash(userPassword, 10);
        const user = await User.create({
            name: trimmedName,
            phone: trimmedPhone,
            password: hashedPassword,
            activeSessionId: createSessionId()
        });

        await LoginHistory.startSession('user', user._id, user.activeSessionId);

        const token = createUserToken(user);

        return res
            .status(201)
            .cookie('userToken', token, userLoginCookieOptions)
            .json({
                success: true,
                message: 'User registered successfully',
                data: { user: formatUserData(user) }
            });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'User with this phone already exists',
                data: {}
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Something went wrong while registering user',
            data: {}
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { phone, password } = req.body || {};

        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Phone and password are required',
                data: {}
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: 'User authentication is not configured',
                data: {}
            });
        }

        const user = await User.findOne({ phone: String(phone).trim() }).select('+password +activeSessionId');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone or password',
                data: {}
            });
        }

        const passwordMatches = await bcrypt.compare(String(password), user.password);

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone or password',
                data: {}
            });
        }

        user.activeSessionId = createSessionId();
        await user.save();

        await LoginHistory.startSession('user', user._id, user.activeSessionId);

        const token = createUserToken(user);

        return res
            .status(200)
            .cookie('userToken', token, userLoginCookieOptions)
            .json({
                success: true,
                message: 'User logged in successfully',
                data: { user: formatUserData(user) }
            });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while logging in user',
            data: {}
        });
    }
};

const logoutUser = async (req, res) => {
    try {
        await clearCurrentUserSession(req.cookies?.userToken);

        return res
            .status(200)
            .clearCookie('userToken', userCookieOptions)
            .json({
                success: true,
                message: 'User logged out successfully',
                data: {}
            });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while logging out user',
            data: {}
        });
    }
};

const getUserProfile = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: 'User profile fetched successfully',
            data: { user: req.user }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while fetching user profile',
            data: {}
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile
};
