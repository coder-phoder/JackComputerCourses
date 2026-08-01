const mongoose = require('mongoose');
const TopicNote = require('../models/topicNote.model');
const { parseFolderId, fetchFolderFiles, sortFilesByName } = require('../services/drive.service');

// Matches the case-insensitive unique index on TopicNote.topic
const TOPIC_COLLATION = { locale: 'en', strength: 2 };

const isValidObjectId = (id) => (
    mongoose.Types.ObjectId.isValid(id)
    && new mongoose.Types.ObjectId(id).toString() === String(id)
);

const sendError = (res, statusCode, message) => res.status(statusCode).json({
    success: false,
    message,
    data: {}
});

const formatTopicNoteData = (topicNote) => ({
    _id: topicNote._id.toString(),
    topic: topicNote.topic,
    description: topicNote.description,
    driveFolderUrl: topicNote.driveFolderUrl,
    driveFolderId: topicNote.driveFolderId,
    // Ordered on read so notes synced before numeric ordering existed still list correctly
    files: sortFilesByName(topicNote.files),
    lastSyncedAt: topicNote.lastSyncedAt,
    syncStatus: topicNote.syncStatus,
    syncError: topicNote.syncError,
    createdAt: topicNote.createdAt,
    updatedAt: topicNote.updatedAt
});

// Refreshes the cached file list from Google Drive. Never throws: a failed sync is
// stored on the document so the topic notes stay usable while the reason is visible.
const applyDriveSync = async (topicNote) => {
    try {
        topicNote.files = await fetchFolderFiles(topicNote.driveFolderId);
        topicNote.syncStatus = 'synced';
        topicNote.lastSyncedAt = new Date();
        topicNote.syncError = '';
    } catch (syncError) {
        topicNote.syncStatus = 'failed';
        topicNote.syncError = syncError.message || 'Failed to fetch files from Google Drive';
    }
};

const isDuplicateTopicError = (error) => error?.code === 11000;

// Shared Controllers

const getAllTopicNotes = async (req, res) => {
    try {
        const topicNotes = await TopicNote.find().sort({ topic: 1 }).collation(TOPIC_COLLATION);

        return res.status(200).json({
            success: true,
            message: 'Topic notes retrieved successfully',
            data: { topicNotes: topicNotes.map(formatTopicNoteData) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while retrieving topic notes');
    }
};

// Admin Controllers

const createTopicNoteByAdmin = async (req, res) => {
    try {
        const { topic, description, driveFolderUrl } = req.body;

        const trimmedTopic = String(topic || '').trim();
        if (!trimmedTopic) {
            return sendError(res, 400, 'Topic is required');
        }

        const driveFolderId = parseFolderId(driveFolderUrl);
        if (!driveFolderId) {
            return sendError(res, 400, 'Invalid Google Drive folder link');
        }

        const existingTopicNote = await TopicNote.findOne({ topic: trimmedTopic }).collation(TOPIC_COLLATION);
        if (existingTopicNote) {
            return sendError(res, 409, 'Notes for this topic already exist');
        }

        const topicNote = new TopicNote({
            topic: trimmedTopic,
            description: String(description || '').trim(),
            driveFolderUrl: String(driveFolderUrl || '').trim(),
            driveFolderId
        });

        await applyDriveSync(topicNote);
        await topicNote.save();

        return res.status(201).json({
            success: true,
            message: 'Topic notes created successfully',
            data: { topicNote: formatTopicNoteData(topicNote) }
        });
    } catch (error) {
        if (isDuplicateTopicError(error)) {
            return sendError(res, 409, 'Notes for this topic already exist');
        }

        return sendError(res, 500, error.message || 'Something went wrong while creating topic notes');
    }
};

const updateTopicNoteByAdmin = async (req, res) => {
    try {
        const { topicNoteId } = req.params;
        const { topic, description, driveFolderUrl } = req.body;

        if (!isValidObjectId(topicNoteId)) {
            return sendError(res, 400, 'Invalid topic note id');
        }

        const topicNote = await TopicNote.findById(topicNoteId);
        if (!topicNote) {
            return sendError(res, 404, 'Topic notes not found');
        }

        if (topic !== undefined) {
            const trimmedTopic = String(topic || '').trim();
            if (!trimmedTopic) {
                return sendError(res, 400, 'Topic is required');
            }

            const duplicateTopicNote = await TopicNote.findOne({
                topic: trimmedTopic,
                _id: { $ne: topicNote._id }
            }).collation(TOPIC_COLLATION);

            if (duplicateTopicNote) {
                return sendError(res, 409, 'Notes for this topic already exist');
            }

            topicNote.topic = trimmedTopic;
        }

        if (description !== undefined) {
            topicNote.description = String(description || '').trim();
        }

        let shouldSync = false;

        if (driveFolderUrl !== undefined) {
            const trimmedUrl = String(driveFolderUrl || '').trim();
            if (!trimmedUrl) {
                return sendError(res, 400, 'Google Drive folder link is required');
            }

            if (trimmedUrl !== topicNote.driveFolderUrl) {
                const driveFolderId = parseFolderId(trimmedUrl);
                if (!driveFolderId) {
                    return sendError(res, 400, 'Invalid Google Drive folder link');
                }

                topicNote.driveFolderUrl = trimmedUrl;
                topicNote.driveFolderId = driveFolderId;
                shouldSync = true;
            }
        }

        if (shouldSync) {
            await applyDriveSync(topicNote);
        }

        await topicNote.save();

        return res.status(200).json({
            success: true,
            message: 'Topic notes updated successfully',
            data: { topicNote: formatTopicNoteData(topicNote) }
        });
    } catch (error) {
        if (isDuplicateTopicError(error)) {
            return sendError(res, 409, 'Notes for this topic already exist');
        }

        return sendError(res, 500, error.message || 'Something went wrong while updating topic notes');
    }
};

const deleteTopicNoteByAdmin = async (req, res) => {
    try {
        const { topicNoteId } = req.params;

        if (!isValidObjectId(topicNoteId)) {
            return sendError(res, 400, 'Invalid topic note id');
        }

        const topicNote = await TopicNote.findByIdAndDelete(topicNoteId);
        if (!topicNote) {
            return sendError(res, 404, 'Topic notes not found');
        }

        return res.status(200).json({
            success: true,
            message: 'Topic notes deleted successfully',
            data: {}
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while deleting topic notes');
    }
};

const syncTopicNoteByAdmin = async (req, res) => {
    try {
        const { topicNoteId } = req.params;

        if (!isValidObjectId(topicNoteId)) {
            return sendError(res, 400, 'Invalid topic note id');
        }

        const topicNote = await TopicNote.findById(topicNoteId);
        if (!topicNote) {
            return sendError(res, 404, 'Topic notes not found');
        }

        await applyDriveSync(topicNote);
        await topicNote.save();

        if (topicNote.syncStatus === 'failed') {
            return sendError(res, 502, topicNote.syncError);
        }

        return res.status(200).json({
            success: true,
            message: 'Topic notes synced successfully',
            data: { topicNote: formatTopicNoteData(topicNote) }
        });
    } catch (error) {
        return sendError(res, 500, error.message || 'Something went wrong while syncing topic notes');
    }
};

module.exports = {
    getAllTopicNotesByAdmin: getAllTopicNotes,
    createTopicNoteByAdmin,
    updateTopicNoteByAdmin,
    deleteTopicNoteByAdmin,
    syncTopicNoteByAdmin,
    getAllTopicNotesByFaculty: getAllTopicNotes
};
