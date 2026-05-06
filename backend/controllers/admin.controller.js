const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user.model');

let cachedAdminPassword = null;
let cachedAdminPasswordHash = null;

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

const formatUserData = (user) => ({
    _id: user._id.toString(),
    phone: user.phone,
    role: 'user'
});

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

        const admin = {
            phone: adminConfig.adminPhone,
            role: 'admin'
        };

        const token = jwt.sign(admin, adminConfig.jwtSecret, {
            expiresIn: '1d'
        });

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
        const users = await User.find({}).select('phone').sort({ phone: 1 });

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
        const { phone, password } = req.body || {};

        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Phone and password are required',
                data: {}
            });
        }

        const trimmedPhone = String(phone).trim();
        const userPassword = String(password);

        if (!trimmedPhone || !userPassword) {
            return res.status(400).json({
                success: false,
                message: 'Phone and password are required',
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

        const hasPhone = Object.prototype.hasOwnProperty.call(req.body || {}, 'phone');
        const hasPassword = Object.prototype.hasOwnProperty.call(req.body || {}, 'password');

        if (!hasPhone && !hasPassword) {
            return res.status(400).json({
                success: false,
                message: 'Phone or password is required',
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

module.exports = {
    loginAdmin,
    logoutAdmin,
    getAdminProfile,
    getAllUsersByAdmin,
    createUserByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin
};
