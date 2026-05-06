const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authUser = async (req, res, next) => {
    try {
        const token = req.cookies?.userToken;

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: 'User authentication is not configured',
                data: {}
            });
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'User token is required',
                data: {}
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'user' || !decoded.id) {
            return res.status(401).json({
                success: false,
                message: 'Invalid user token',
                data: {}
            });
        }

        const user = await User.findById(decoded.id).select('phone');

        if (!user || String(user.phone).trim() !== String(decoded.phone).trim()) {
            return res.status(401).json({
                success: false,
                message: 'Invalid user token',
                data: {}
            });
        }

        req.user = {
            phone: user.phone,
            role: 'user'
        };

        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired user token',
            data: {}
        });
    }
};

module.exports = authUser;
