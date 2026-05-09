const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const userCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
};

const userLoginCookieOptions = {
    ...userCookieOptions,
    maxAge: 24 * 60 * 60 * 1000
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

        const user = await User.findOne({ phone: String(phone).trim() }).select('+password');

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

        const userData = {
            name: user.name || '',
            phone: user.phone,
            role: 'user'
        };

        const token = jwt.sign(
            {
                id: user._id.toString(),
                phone: user.phone,
                role: 'user'
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        return res
            .status(200)
            .cookie('userToken', token, userLoginCookieOptions)
            .json({
                success: true,
                message: 'User logged in successfully',
                data: { user: userData }
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
    loginUser,
    logoutUser,
    getUserProfile
};
