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

        if (decoded.role !== 'user' || !decoded.id || !decoded.sessionId) {
            return res.status(401).json({
                success: false,
                message: 'Invalid user token',
                data: {}
            });
        }

        const user = await User.findById(decoded.id).select('name phone tourCompletedAt +activeSessionId');

        if (
            !user
            || String(user.phone).trim() !== String(decoded.phone).trim()
            || user.activeSessionId !== decoded.sessionId
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid user token',
                data: {}
            });
        }

        req.user = {
            _id: user._id.toString(),
            name: user.name || '',
            phone: user.phone,
            requiresName: !User.hasFullName(user.name),
            // Accounts that never finished the walkthrough get it on this visit,
            // whether they registered today or years ago.
            requiresTour: !user.tourCompletedAt,
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
