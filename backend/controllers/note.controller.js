const mongoose = require('mongoose');
const Note = require('../models/note.model');
const Course = require('../models/course.model');
const { parseFolderId, fetchFolderFiles, sortFilesByName } = require('../services/drive.service');

const isValidObjectId = (id) => (
    mongoose.Types.ObjectId.isValid(id)
    && new mongoose.Types.ObjectId(id).toString() === String(id)
);

const sendError = (res, statusCode, message) => res.status(statusCode).json({
    success: false,
    message,
    data: {}
});

const formatNoteData = (note) => ({
    _id: note._id.toString(),
    courseId: note.courseId.toString(),
    title: note.title,
    driveFolderUrl: note.driveFolderUrl,
    driveFolderId: note.driveFolderId,
    // Ordered on read so notes synced before numeric ordering existed still list correctly
    files: sortFilesByName(note.files),
    lastSyncedAt: note.lastSyncedAt,
    syncStatus: note.syncStatus,
    syncError: note.syncError,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt
});

// Course notes are listed alongside their course so the admin can manage every
// notes folder from one page. Notes left behind by a deleted course are skipped.
const formatCourseNoteData = (note) => ({
    ...formatNoteData({ ...note, courseId: note.courseId._id }),
    courseTitle: note.courseId.title,
    courseSlug: note.courseId.slug
});

// Admin Controllers

const getAllNotesByAdmin = async (req, res) => {
    try {
        const notes = await Note.find().populate('courseId', 'title slug').lean();

        const courseNotes = notes
            .filter((note) => note.courseId)
            .map(formatCourseNoteData)
            .sort((first, second) => first.courseTitle.localeCompare(second.courseTitle, undefined, {
                sensitivity: 'base'
            }));

        return res.status(200).json({
            success: true,
            message: 'Course notes retrieved successfully',
            data: { notes: courseNotes }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while retrieving notes');
    }
};

const createNoteByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, driveFolderUrl } = req.body;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const existingNote = await Note.findOne({ courseId });
        if (existingNote) {
            return sendError(res, 400, 'Notes already configured for this course');
        }

        const trimmedTitle = String(title || '').trim();
        if (!trimmedTitle) {
            return sendError(res, 400, 'Title is required');
        }

        const driveFolderId = parseFolderId(driveFolderUrl);
        if (!driveFolderId) {
            return sendError(res, 400, 'Invalid Google Drive folder link');
        }

        const note = new Note({
            courseId,
            title: trimmedTitle,
            driveFolderUrl: String(driveFolderUrl || '').trim(),
            driveFolderId,
            syncStatus: 'pending'
        });

        // Try to perform initial sync immediately
        try {
            const files = await fetchFolderFiles(driveFolderId);
            note.files = files;
            note.syncStatus = 'synced';
            note.lastSyncedAt = new Date();
            note.syncError = '';
        } catch (syncError) {
            note.syncStatus = 'failed';
            note.syncError = syncError.message || 'Failed to fetch files from Google Drive';
        }

        await note.save();

        return res.status(201).json({
            success: true,
            message: 'Notes configuration created successfully',
            data: { note: formatNoteData(note) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while creating notes');
    }
};

const getNoteByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const note = await Note.findOne({ courseId });
        if (!note) {
            return sendError(res, 404, 'Notes not configured for this course');
        }

        return res.status(200).json({
            success: true,
            message: 'Notes retrieved successfully',
            data: { note: formatNoteData(note) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while retrieving notes');
    }
};

const updateNoteByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, driveFolderUrl } = req.body;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const note = await Note.findOne({ courseId });
        if (!note) {
            return sendError(res, 404, 'Notes not configured for this course');
        }

        let shouldSync = false;

        if (driveFolderUrl !== undefined) {
            const trimmedUrl = String(driveFolderUrl || '').trim();
            if (!trimmedUrl) {
                return sendError(res, 400, 'Google Drive folder link is required');
            }

            if (trimmedUrl !== note.driveFolderUrl) {
                const driveFolderId = parseFolderId(trimmedUrl);
                if (!driveFolderId) {
                    return sendError(res, 400, 'Invalid Google Drive folder link');
                }
                note.driveFolderUrl = trimmedUrl;
                note.driveFolderId = driveFolderId;
                shouldSync = true;
            }
        }

        if (title !== undefined) {
            const trimmedTitle = String(title || '').trim();
            if (!trimmedTitle) {
                return sendError(res, 400, 'Title is required');
            }
            note.title = trimmedTitle;
        }

        if (shouldSync) {
            try {
                const files = await fetchFolderFiles(note.driveFolderId);
                note.files = files;
                note.syncStatus = 'synced';
                note.lastSyncedAt = new Date();
                note.syncError = '';
            } catch (syncError) {
                note.syncStatus = 'failed';
                note.syncError = syncError.message || 'Failed to fetch files from Google Drive';
            }
        }

        await note.save();

        return res.status(200).json({
            success: true,
            message: 'Notes configuration updated successfully',
            data: { note: formatNoteData(note) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while updating notes');
    }
};

const deleteNoteByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const note = await Note.findOneAndDelete({ courseId });
        if (!note) {
            return sendError(res, 404, 'Notes not configured for this course');
        }

        return res.status(200).json({
            success: true,
            message: 'Notes deleted successfully',
            data: {}
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while deleting notes');
    }
};

const syncNoteByAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const note = await Note.findOne({ courseId });
        if (!note) {
            return sendError(res, 404, 'Notes not configured for this course');
        }

        try {
            const files = await fetchFolderFiles(note.driveFolderId);
            note.files = files;
            note.syncStatus = 'synced';
            note.lastSyncedAt = new Date();
            note.syncError = '';
            await note.save();
        } catch (syncError) {
            note.syncStatus = 'failed';
            note.syncError = syncError.message || 'Failed to fetch files from Google Drive';
            await note.save();
            return sendError(res, 502, note.syncError);
        }

        return res.status(200).json({
            success: true,
            message: 'Notes synced successfully',
            data: { note: formatNoteData(note) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while syncing notes');
    }
};

// Faculty Controllers

const getNoteByFaculty = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!isValidObjectId(courseId)) {
            return sendError(res, 400, 'Invalid course id');
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return sendError(res, 404, 'Course not found');
        }

        const note = await Note.findOne({ courseId });
        if (!note) {
            return sendError(res, 404, 'Notes not found for this course');
        }

        return res.status(200).json({
            success: true,
            message: 'Notes retrieved successfully',
            data: { note: formatNoteData(note) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while retrieving notes');
    }
};

module.exports = {
    getAllNotesByAdmin,
    // Faculty already have read access to every course, so the same listing serves both roles
    getAllNotesByFaculty: getAllNotesByAdmin,
    createNoteByAdmin,
    getNoteByAdmin,
    updateNoteByAdmin,
    deleteNoteByAdmin,
    syncNoteByAdmin,
    getNoteByFaculty
};
