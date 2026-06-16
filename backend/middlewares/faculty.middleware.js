const jwt = require('jsonwebtoken');
const Faculty = require('../models/faculty.model');

const authFaculty = async (req, res, next) => {
    try {
        const token = req.cookies?.facultyToken;

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: 'Faculty authentication is not configured',
                data: {}
            });
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Faculty token is required',
                data: {}
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'faculty' || !decoded.id) {
            return res.status(401).json({
                success: false,
                message: 'Invalid faculty token',
                data: {}
            });
        }

        const faculty = await Faculty.findById(decoded.id).select('name phone');

        if (!faculty || String(faculty.phone).trim() !== String(decoded.phone).trim()) {
            return res.status(401).json({
                success: false,
                message: 'Invalid faculty token',
                data: {}
            });
        }

        req.faculty = {
            _id: faculty._id.toString(),
            name: faculty.name || '',
            phone: faculty.phone,
            role: 'faculty'
        };

        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired faculty token',
            data: {}
        });
    }
};

module.exports = authFaculty;
