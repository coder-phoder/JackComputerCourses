const axios = require('axios');

/**
 * Extracts Google Drive Folder ID from a URL or returns it directly if it's already a raw ID.
 * @param {string} urlOrId - The URL or raw ID of the Google Drive folder.
 * @returns {string|null} The folder ID, or null if invalid.
 */
const parseFolderId = (urlOrId) => {
    const value = String(urlOrId || '').trim();
    if (!value) {
        return null;
    }

    // 1. Match /folders/{folderId} pattern
    const foldersMatch = value.match(/\/folders\/([a-zA-Z0-9_-]{28,45})/);
    if (foldersMatch?.[1]) {
        return foldersMatch[1];
    }

    // 2. Match ?id={folderId} or &id={folderId} pattern (e.g. open?id=...)
    const idMatch = value.match(/[?&]id=([a-zA-Z0-9_-]{28,45})/);
    if (idMatch?.[1]) {
        return idMatch[1];
    }

    // 3. Match raw folder ID pattern
    const rawMatch = value.match(/^[a-zA-Z0-9_-]{28,45}$/);
    if (rawMatch) {
        return value;
    }

    return null;
};

/**
 * Fetches the list of files in a public Google Drive folder.
 * @param {string} folderId - The ID of the Google Drive folder.
 * @returns {Promise<Array>} List of files with id, name, mimeType, webViewLink, iconLink.
 */
const fetchFolderFiles = async (folderId) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('Google API key is not configured (YOUTUBE_API_KEY is missing)');
    }

    try {
        const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
            params: {
                q: `'${folderId}' in parents and trashed = false`,
                key: apiKey,
                fields: 'files(id, name, mimeType, webViewLink, iconLink)',
                orderBy: 'name',
                pageSize: 1000,
                supportsAllDrives: true,
                includeItemsFromAllDrives: true
            }
        });

        const files = response.data?.files || [];

        return files.map((file) => ({
            fileId: file.id || '',
            name: file.name || 'Untitled File',
            mimeType: file.mimeType || 'application/octet-stream',
            webViewLink: file.webViewLink || '',
            iconLink: file.iconLink || ''
        }));
    } catch (error) {
        const apiMessage = error.response?.data?.error?.message || '';
        let errorMessage = apiMessage || error.message || 'Failed to fetch files from Google Drive';

        if (errorMessage.includes('google.apps.drive.v3.DriveFiles.List') || errorMessage.toLowerCase().includes('blocked')) {
            errorMessage = 'Google Drive API is not enabled or is restricted on your API key. Please go to Google Cloud Console, enable the "Google Drive API" for your project, and check "API restrictions" under your Credentials to ensure the Google Drive API is allowed.';
        }

        throw new Error(errorMessage);
    }
};

module.exports = {
    parseFolderId,
    fetchFolderFiles
};
