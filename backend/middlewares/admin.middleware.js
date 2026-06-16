const jwt = require('jsonwebtoken');
const { getActiveAdminSessionId } = require('../controllers/admin.controller');

const authAdmin = async (req, res, next) => {
    try {
        const token = req.cookies?.adminToken;
        const adminPhone = process.env.ADMIN_PHONE;
        const jwtSecret = process.env.JWT_SECRET;

        if (!adminPhone || !jwtSecret) {
            return res.status(500).json({
                success: false,
                message: 'Admin authentication is not configured',
                data: {}
            });
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Admin token is required',
                data: {}
            });
        }

        const decoded = jwt.verify(token, jwtSecret);

        if (
            decoded.role !== 'admin'
            || String(decoded.phone).trim() !== String(adminPhone).trim()
            || !decoded.sessionId
            || decoded.sessionId !== getActiveAdminSessionId()
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin token',
                data: {}
            });
        }

        req.admin = {
            phone: adminPhone,
            role: 'admin'
        };

        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired admin token',
            data: {}
        });
    }
};

module.exports = authAdmin;
