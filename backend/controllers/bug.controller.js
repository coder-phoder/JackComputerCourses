const mongoose = require('mongoose');
const Bug = require('../models/bug.model');

const MAX_BUG_IMAGES = 4;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 2000;
const IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/;

const isValidObjectId = (id) => (
    mongoose.Types.ObjectId.isValid(id)
    && new mongoose.Types.ObjectId(id).toString() === String(id)
);

const sendError = (res, statusCode, message) => res.status(statusCode).json({
    success: false,
    message,
    data: {}
});

const estimateBase64Bytes = (base64) => {
    const padding = base64.endsWith('==') ? 2 : (base64.endsWith('=') ? 1 : 0);

    return Math.floor((base64.length * 3) / 4) - padding;
};

// Images arrive as base64 data URLs because the platform has no file storage.
// Returns { images } on success or { error } with the reason the upload was rejected.
const normalizeBugImages = (rawImages) => {
    if (rawImages === undefined || rawImages === null || rawImages === '') {
        return { images: [] };
    }

    if (!Array.isArray(rawImages)) {
        return { error: 'Images must be sent as a list' };
    }

    if (rawImages.length > MAX_BUG_IMAGES) {
        return { error: `A bug report can hold at most ${MAX_BUG_IMAGES} images` };
    }

    const images = [];

    for (const rawImage of rawImages) {
        const dataUrl = String((typeof rawImage === 'string' ? rawImage : rawImage?.dataUrl) || '').trim();

        if (!dataUrl) {
            return { error: 'Every image must include its data' };
        }

        const match = dataUrl.match(IMAGE_DATA_URL_PATTERN);

        if (!match) {
            return { error: 'Only PNG, JPG, WEBP and GIF images are supported' };
        }

        if (estimateBase64Bytes(match[2]) > MAX_IMAGE_BYTES) {
            return { error: 'Each image must be 2MB or smaller' };
        }

        images.push({
            name: String((typeof rawImage === 'string' ? '' : rawImage?.name) || '').trim().slice(0, 120),
            dataUrl
        });
    }

    return { images };
};

const formatBugData = (bug) => ({
    _id: bug._id.toString(),
    reporterRole: bug.reporterRole,
    reporterName: bug.reporterName,
    reporterPhone: bug.reporterPhone,
    title: bug.title,
    description: bug.description,
    imageCount: bug.imageCount,
    status: bug.status,
    resolvedAt: bug.resolvedAt,
    declinedAt: bug.declinedAt,
    createdAt: bug.createdAt,
    updatedAt: bug.updatedAt
});

// Resolve and decline differ only in the field they stamp, so both admin
// decisions share one handler.
const ADMIN_DECISIONS = {
    resolved: {
        timestampField: 'resolvedAt',
        successMessage: 'Bug report resolved successfully',
        conflictMessage: 'Bug report is already resolved',
        errorMessage: 'Something went wrong while resolving the bug report'
    },
    declined: {
        timestampField: 'declinedAt',
        successMessage: 'Bug report declined successfully',
        conflictMessage: 'Bug report is already declined',
        errorMessage: 'Something went wrong while declining the bug report'
    }
};

// The same handlers serve users and faculties, so the reporter is read from
// whichever role middleware authenticated the request.
const getReporter = (req) => {
    const reporter = req.user || req.faculty;

    if (!reporter?._id) {
        return null;
    }

    return {
        id: reporter._id,
        role: reporter.role,
        name: reporter.name || '',
        phone: reporter.phone || ''
    };
};

// Reporters may only ever touch their own bugs; the admin is scoped to everything.
const getOwnershipFilter = (req) => {
    if (req.admin) {
        return {};
    }

    const reporter = getReporter(req);

    if (!reporter) {
        return null;
    }

    return { reporterId: reporter.id, reporterRole: reporter.role };
};

// Reporter Controllers

const createBug = async (req, res) => {
    try {
        const reporter = getReporter(req);

        if (!reporter) {
            return sendError(res, 401, 'Authentication is required to report a bug');
        }

        const title = String(req.body?.title || '').trim();

        if (!title) {
            return sendError(res, 400, 'Bug name is required');
        }

        if (title.length > MAX_TITLE_LENGTH) {
            return sendError(res, 400, `Bug name must be ${MAX_TITLE_LENGTH} characters or fewer`);
        }

        const description = String(req.body?.description || '').trim();

        if (description.length > MAX_DESCRIPTION_LENGTH) {
            return sendError(res, 400, `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`);
        }

        const { images, error: imagesError } = normalizeBugImages(req.body?.images);

        if (imagesError) {
            return sendError(res, 400, imagesError);
        }

        const bug = await Bug.create({
            reporterId: reporter.id,
            reporterRole: reporter.role,
            reporterName: reporter.name,
            reporterPhone: reporter.phone,
            title,
            description,
            images,
            imageCount: images.length
        });

        return res.status(201).json({
            success: true,
            message: 'Bug reported successfully',
            data: { bug: formatBugData(bug) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while reporting the bug');
    }
};

const getMyBugs = async (req, res) => {
    try {
        const reporter = getReporter(req);

        if (!reporter) {
            return sendError(res, 401, 'Authentication is required to view bug reports');
        }

        const bugs = await Bug
            .find({ reporterId: reporter.id, reporterRole: reporter.role })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Bug reports retrieved successfully',
            data: { bugs: bugs.map(formatBugData) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while retrieving bug reports');
    }
};

// Shared Controllers

const getBugImages = async (req, res) => {
    try {
        const { bugId } = req.params;

        if (!isValidObjectId(bugId)) {
            return sendError(res, 400, 'Invalid bug id');
        }

        const ownershipFilter = getOwnershipFilter(req);

        if (!ownershipFilter) {
            return sendError(res, 401, 'Authentication is required to view bug images');
        }

        const bug = await Bug.findOne({ _id: bugId, ...ownershipFilter }).select('+images');

        if (!bug) {
            return sendError(res, 404, 'Bug report not found');
        }

        return res.status(200).json({
            success: true,
            message: 'Bug images retrieved successfully',
            data: { images: bug.images || [] }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while retrieving bug images');
    }
};

// Admin Controllers

const getAllBugsByAdmin = async (req, res) => {
    try {
        // Newest first; open reports and history are split by status on the page.
        const bugs = await Bug.find().sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Bug reports retrieved successfully',
            data: { bugs: bugs.map(formatBugData) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while retrieving bug reports');
    }
};

// A decided bug leaves the open queue but stays readable as history for the
// admin and for the person who reported it.
const decideBugByAdmin = (status) => async (req, res) => {
    const decision = ADMIN_DECISIONS[status];

    try {
        const { bugId } = req.params;

        if (!isValidObjectId(bugId)) {
            return sendError(res, 400, 'Invalid bug id');
        }

        const bug = await Bug.findById(bugId);

        if (!bug) {
            return sendError(res, 404, 'Bug report not found');
        }

        if (bug.status === status) {
            return sendError(res, 409, decision.conflictMessage);
        }

        bug.status = status;
        bug[decision.timestampField] = new Date();
        await bug.save();

        return res.status(200).json({
            success: true,
            message: decision.successMessage,
            data: { bug: formatBugData(bug) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || decision.errorMessage);
    }
};

const resolveBugByAdmin = decideBugByAdmin('resolved');
const declineBugByAdmin = decideBugByAdmin('declined');

// Permanent removal, images included. Kept separate from resolving so history
// is only ever cleared on purpose.
const deleteBugByAdmin = async (req, res) => {
    try {
        const { bugId } = req.params;

        if (!isValidObjectId(bugId)) {
            return sendError(res, 400, 'Invalid bug id');
        }

        const bug = await Bug.findByIdAndDelete(bugId);

        if (!bug) {
            return sendError(res, 404, 'Bug report not found');
        }

        return res.status(200).json({
            success: true,
            message: 'Bug report removed successfully',
            data: { bugId: bug._id.toString() }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while removing the bug report');
    }
};

module.exports = {
    createBug,
    getMyBugs,
    getBugImages,
    getAllBugsByAdmin,
    resolveBugByAdmin,
    declineBugByAdmin,
    deleteBugByAdmin,
    normalizeBugImages,
    estimateBase64Bytes,
    formatBugData,
    ADMIN_DECISIONS,
    MAX_BUG_IMAGES,
    MAX_IMAGE_BYTES
};
