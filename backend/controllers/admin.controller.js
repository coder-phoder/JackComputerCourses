const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Course = require('../models/course.model');
const LoginHistory = require('../models/loginHistory.model');

let cachedAdminPassword = null;
let cachedAdminPasswordHash = null;
let activeAdminSessionId = null;

const adminCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
};

const adminLoginCookieOptions = {
    ...adminCookieOptions,
    maxAge: 24 * 60 * 60 * 1000
};

const getAdminConfig = () => {
    const adminPhone = process.env.ADMIN_PHONE;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminPhone || !adminPassword || !jwtSecret) {
        return null;
    }

    return { adminPhone, adminPassword, jwtSecret };
};

const getAdminPasswordHash = async (adminPassword) => {
    if (cachedAdminPassword !== adminPassword || !cachedAdminPasswordHash) {
        cachedAdminPassword = adminPassword;
        cachedAdminPasswordHash = await bcrypt.hash(adminPassword, 10);
    }

    return cachedAdminPasswordHash;
};

const createSessionId = () => (
    typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : crypto.randomBytes(32).toString('hex')
);

const clearCurrentAdminSession = (token, jwtSecret) => {
    if (!token || !jwtSecret) {
        return;
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);

        if (
            decoded.role === 'admin'
            && decoded.sessionId
            && decoded.sessionId === activeAdminSessionId
        ) {
            activeAdminSessionId = null;
        }
    } catch {
        // Invalid or stale logout tokens should only clear the browser cookie.
    }
};

const formatUserData = (user) => ({
    _id: user._id.toString(),
    name: user.name || '',
    phone: user.phone,
    role: 'user'
});

const hasBodyField = (body, field) => Object.prototype.hasOwnProperty.call(body || {}, field);

const isValidUserId = (id) => (
    mongoose.Types.ObjectId.isValid(id)
    && new mongoose.Types.ObjectId(id).toString() === String(id)
);

const loginAdmin = async (req, res) => {
    try {
        const { phone, password } = req.body || {};

        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Phone and password are required',
                data: {}
            });
        }

        const adminConfig = getAdminConfig();

        if (!adminConfig) {
            return res.status(500).json({
                success: false,
                message: 'Admin authentication is not configured',
                data: {}
            });
        }

        const phoneMatches = String(phone).trim() === String(adminConfig.adminPhone).trim();
        const adminPasswordHash = await getAdminPasswordHash(adminConfig.adminPassword);
        const passwordMatches = await bcrypt.compare(String(password), adminPasswordHash);

        if (!phoneMatches || !passwordMatches) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone or password',
                data: {}
            });
        }

        activeAdminSessionId = createSessionId();

        const admin = {
            phone: adminConfig.adminPhone,
            role: 'admin'
        };

        const token = jwt.sign(
            {
                ...admin,
                sessionId: activeAdminSessionId
            },
            adminConfig.jwtSecret,
            { expiresIn: '1d' }
        );

        return res
            .status(200)
            .cookie('adminToken', token, adminLoginCookieOptions)
            .json({
                success: true,
                message: 'Admin logged in successfully',
                data: { admin }
            });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while logging in admin',
            data: {}
        });
    }
};

const logoutAdmin = async (req, res) => {
    try {
        clearCurrentAdminSession(req.cookies?.adminToken, process.env.JWT_SECRET);

        return res
            .status(200)
            .clearCookie('adminToken', adminCookieOptions)
            .json({
                success: true,
                message: 'Admin logged out successfully',
                data: {}
            });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while logging out admin',
            data: {}
        });
    }
};

const getAdminProfile = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: 'Admin profile fetched successfully',
            data: { admin: req.admin }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while fetching admin profile',
            data: {}
        });
    }
};

const getAllUsersByAdmin = async (req, res) => {
    try {
        const users = await User.find({}).select('name phone').sort({ phone: 1 });

        return res.status(200).json({
            success: true,
            message: 'Users fetched successfully',
            data: { users: users.map(formatUserData) }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while fetching users',
            data: {}
        });
    }
};

const createUserByAdmin = async (req, res) => {
    try {
        const { name, phone, password } = req.body || {};

        if (!name || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone and password are required',
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
            password: hashedPassword
        });

        return res.status(201).json({
            success: true,
            message: 'User created successfully',
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
            message: 'Something went wrong while creating user',
            data: {}
        });
    }
};

const updateUserByAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUserId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
                data: {}
            });
        }

        const hasName = hasBodyField(req.body, 'name');
        const hasPhone = hasBodyField(req.body, 'phone');
        const hasPassword = hasBodyField(req.body, 'password');

        if (!hasName && !hasPhone && !hasPassword) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone or password is required',
                data: {}
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                data: {}
            });
        }

        const oldPhone = user.phone;

        if (hasName) {
            const trimmedName = String(req.body.name || '').trim();

            if (!trimmedName) {
                return res.status(400).json({
                    success: false,
                    message: 'Name is required',
                    data: {}
                });
            }

            user.name = trimmedName;
        }

        if (hasPhone) {
            const trimmedPhone = String(req.body.phone || '').trim();

            if (!trimmedPhone) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone is required',
                    data: {}
                });
            }

            const duplicateUser = await User.findOne({
                phone: trimmedPhone,
                _id: { $ne: id }
            });

            if (duplicateUser) {
                return res.status(409).json({
                    success: false,
                    message: 'User with this phone already exists',
                    data: {}
                });
            }

            user.phone = trimmedPhone;
        }

        if (hasPassword) {
            const userPassword = String(req.body.password || '');

            if (!userPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Password is required',
                    data: {}
                });
            }

            user.password = await bcrypt.hash(userPassword, 10);
        }

        await user.save();

        if (hasPhone && oldPhone !== user.phone) {
            await Course.updateMany(
                { allowedUserPhones: oldPhone },
                { $addToSet: { allowedUserPhones: user.phone } }
            );
            await Course.updateMany(
                { allowedUserPhones: oldPhone },
                { $pull: { allowedUserPhones: oldPhone } }
            );
            await Course.updateMany(
                { 'accessGrants.phone': oldPhone },
                { $set: { 'accessGrants.$[grant].phone': user.phone } },
                { arrayFilters: [{ 'grant.phone': oldPhone }] }
            );
        }

        return res.status(200).json({
            success: true,
            message: 'User updated successfully',
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
            message: 'Something went wrong while updating user',
            data: {}
        });
    }
};

const deleteUserByAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUserId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
                data: {}
            });
        }

        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                data: {}
            });
        }

        await Course.updateMany(
            { allowedUserPhones: user.phone },
            { $pull: { allowedUserPhones: user.phone } }
        );
        await Course.updateMany(
            { 'accessGrants.phone': user.phone },
            { $pull: { accessGrants: { phone: user.phone } } }
        );
        await LoginHistory.clearAccountHistory('user', user._id);

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully',
            data: {}
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting user',
            data: {}
        });
    }
};

const getUserLoginHistoryByAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUserId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id',
                data: {}
            });
        }

        const user = await User.findById(id).select('name phone');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                data: {}
            });
        }

        const history = await LoginHistory.getAccountHistory('user', user._id);

        return res.status(200).json({
            success: true,
            message: 'User login history fetched successfully',
            data: {
                user: formatUserData(user),
                history
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while fetching user login history',
            data: {}
        });
    }
};

module.exports = {
    loginAdmin,
    logoutAdmin,
    getAdminProfile,
    getAllUsersByAdmin,
    createUserByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin,
    getUserLoginHistoryByAdmin,
    formatUserData,
    getActiveAdminSessionId: () => activeAdminSessionId
};
