const Note = require('../models/note.model');
const TopicNote = require('../models/topicNote.model');
const { fetchFileContent } = require('../services/drive.service');

// Only files that belong to an already synced notes folder can be streamed, so this
// endpoint can never be used as a general purpose Google Drive proxy for our API key.
const findSyncedFile = async (fileId) => {
    const projection = { 'files.$': 1 };

    const owner = await Note.findOne({ 'files.fileId': fileId }, projection).lean()
        || await TopicNote.findOne({ 'files.fileId': fileId }, projection).lean();

    return owner?.files?.[0] || null;
};

// Serves Drive file bytes from our own origin so the browser can render and print them
// directly. The Drive preview page itself is cross-origin and cannot be printed.
const streamDriveFile = async (req, res) => {
    try {
        const file = await findSyncedFile(String(req.params.fileId || ''));
        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found',
                data: {}
            });
        }

        const { contentType, stream } = await fetchFileContent(file.fileId, file.mimeType);

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'inline');
        stream.on('error', () => res.destroy());

        return stream.pipe(res);
    } catch (error) {
        return res.status(502).json({
            success: false,
            message: error.message || 'Something went wrong while downloading the file',
            data: {}
        });
    }
};

module.exports = { streamDriveFile };
