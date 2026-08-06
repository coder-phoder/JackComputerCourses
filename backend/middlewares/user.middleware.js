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

        const user = await User.findById(decoded.id)
            .select('name phone tourCompletedAt profile profileUpdatedAt profileRemindAfter reviewSubmittedAt reviewRemindAfter +activeSessionId');

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
            // Optional details, sent with every profile read so the page it fills can
            // start from what is already stored.
            profile: User.formatProfile(user.profile),
            requiresProfile: User.needsPrompt(user, 'profile'),
            // The other optional ask, owed until the account has either reviewed the
            // institute or asked to be left alone about it.
            requiresReview: User.needsPrompt(user, 'review'),
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
