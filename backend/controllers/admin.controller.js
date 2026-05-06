const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

module.exports = {
    loginAdmin,
    logoutAdmin,
    getAdminProfile
};
