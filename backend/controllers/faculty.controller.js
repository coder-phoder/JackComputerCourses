const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Faculty = require('../models/faculty.model');

const facultyCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
};

const facultyLoginCookieOptions = {
    ...facultyCookieOptions,
    maxAge: 24 * 60 * 60 * 1000
};

const formatFacultyData = (faculty) => ({
    _id: faculty._id.toString(),
    name: faculty.name || '',
    phone: faculty.phone,
    role: 'faculty'
});

const hasBodyField = (body, field) => Object.prototype.hasOwnProperty.call(body || {}, field);

const isValidFacultyId = (id) => (
    mongoose.Types.ObjectId.isValid(id)
    && new mongoose.Types.ObjectId(id).toString() === String(id)
);

const createFacultyToken = (faculty) => jwt.sign(
    {
        id: faculty._id.toString(),
        phone: faculty.phone,
        role: 'faculty'
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
);

const getAllFacultiesByAdmin = async (req, res) => {
    try {
        const faculties = await Faculty.find({}).select('name phone').sort({ phone: 1 });

        return res.status(200).json({
            success: true,
            message: 'Faculties fetched successfully',
            data: { faculties: faculties.map(formatFacultyData) }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while fetching faculties',
            data: {}
        });
    }
};

const createFacultyByAdmin = async (req, res) => {
    try {
        const { name, phone, password } = req.body || {};
        const trimmedName = String(name || '').trim();
        const trimmedPhone = String(phone || '').trim();
        const facultyPassword = password === undefined || password === null
            ? ''
            : String(password);

        if (!trimmedName || !trimmedPhone || !facultyPassword.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone and password are required',
                data: {}
            });
        }

        const existingFaculty = await Faculty.findOne({ phone: trimmedPhone });

        if (existingFaculty) {
            return res.status(409).json({
                success: false,
                message: 'Faculty with this phone already exists',
                data: {}
            });
        }

        const hashedPassword = await bcrypt.hash(facultyPassword, 10);
        const faculty = await Faculty.create({
            name: trimmedName,
            phone: trimmedPhone,
            password: hashedPassword
        });

        return res.status(201).json({
            success: true,
            message: 'Faculty created successfully',
            data: { faculty: formatFacultyData(faculty) }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Faculty with this phone already exists',
                data: {}
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Something went wrong while creating faculty',
            data: {}
        });
    }
};

const updateFacultyByAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidFacultyId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid faculty id',
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

        const faculty = await Faculty.findById(id);

        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: 'Faculty not found',
                data: {}
            });
        }

        if (hasName) {
            const trimmedName = String(req.body.name || '').trim();

            if (!trimmedName) {
                return res.status(400).json({
                    success: false,
                    message: 'Name is required',
                    data: {}
                });
            }

            faculty.name = trimmedName;
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

            const duplicateFaculty = await Faculty.findOne({
                phone: trimmedPhone,
                _id: { $ne: id }
            });

            if (duplicateFaculty) {
                return res.status(409).json({
                    success: false,
                    message: 'Faculty with this phone already exists',
                    data: {}
                });
            }

            faculty.phone = trimmedPhone;
        }

        if (hasPassword) {
            const facultyPassword = req.body.password === undefined || req.body.password === null
                ? ''
                : String(req.body.password);

            if (!facultyPassword.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Password is required',
                    data: {}
                });
            }

            faculty.password = await bcrypt.hash(facultyPassword, 10);
        }

        await faculty.save();

        return res.status(200).json({
            success: true,
            message: 'Faculty updated successfully',
            data: { faculty: formatFacultyData(faculty) }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Faculty with this phone already exists',
                data: {}
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Something went wrong while updating faculty',
            data: {}
        });
    }
};

const deleteFacultyByAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidFacultyId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid faculty id',
                data: {}
            });
        }

        const faculty = await Faculty.findByIdAndDelete(id);

        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: 'Faculty not found',
                data: {}
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Faculty deleted successfully',
            data: {}
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while deleting faculty',
            data: {}
        });
    }
};

const loginFaculty = async (req, res) => {
    try {
        const { phone, password } = req.body || {};
        const trimmedPhone = String(phone || '').trim();
        const facultyPassword = password === undefined || password === null
            ? ''
            : String(password);

        if (!trimmedPhone || !facultyPassword.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Phone and password are required',
                data: {}
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: 'Faculty authentication is not configured',
                data: {}
            });
        }

        const faculty = await Faculty.findOne({ phone: trimmedPhone }).select('+password');

        if (!faculty) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone or password',
                data: {}
            });
        }

        const passwordMatches = await bcrypt.compare(facultyPassword, faculty.password);

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone or password',
                data: {}
            });
        }

        const token = createFacultyToken(faculty);

        return res
            .status(200)
            .cookie('facultyToken', token, facultyLoginCookieOptions)
            .json({
                success: true,
                message: 'Faculty logged in successfully',
                data: { faculty: formatFacultyData(faculty) }
            });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while logging in faculty',
            data: {}
        });
    }
};

const logoutFaculty = async (req, res) => {
    try {
        return res
            .status(200)
            .clearCookie('facultyToken', facultyCookieOptions)
            .json({
                success: true,
                message: 'Faculty logged out successfully',
                data: {}
            });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while logging out faculty',
            data: {}
        });
    }
};

const getFacultyProfile = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: 'Faculty profile fetched successfully',
            data: { faculty: req.faculty }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while fetching faculty profile',
            data: {}
        });
    }
};

module.exports = {
    getAllFacultiesByAdmin,
    createFacultyByAdmin,
    updateFacultyByAdmin,
    deleteFacultyByAdmin,
    loginFaculty,
    logoutFaculty,
    getFacultyProfile,
    formatFacultyData
};
