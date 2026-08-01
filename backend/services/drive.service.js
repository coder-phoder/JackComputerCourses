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
 * Orders note files the way chapters are numbered. Plain text ordering (Drive's own `orderBy`
 * included) would place "10.Pointers" before "2.Loops", so names are compared with numeric collation.
 * @param {Array} files - The files to order.
 * @returns {Array} A new, ordered array.
 */
const sortFilesByName = (files = []) => [...files].sort((first, second) => (
    String(first?.name || '').localeCompare(String(second?.name || ''), 'en', {
        numeric: true,
        sensitivity: 'base'
    })
));

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
                q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
                key: apiKey,
                fields: 'files(id, name, mimeType, webViewLink, iconLink)',
                pageSize: 1000,
                supportsAllDrives: true,
                includeItemsFromAllDrives: true
            }
        });

        const files = response.data?.files || [];

        return sortFilesByName(files.map((file) => ({
            fileId: file.id || '',
            name: file.name || 'Untitled File',
            mimeType: file.mimeType || 'application/octet-stream',
            webViewLink: file.webViewLink || '',
            iconLink: file.iconLink || ''
        })));
    } catch (error) {
        const apiMessage = error.response?.data?.error?.message || '';
        let errorMessage = apiMessage || error.message || 'Failed to fetch files from Google Drive';

        if (errorMessage.includes('google.apps.drive.v3.DriveFiles.List') || errorMessage.toLowerCase().includes('blocked')) {
            errorMessage = 'Google Drive API is not enabled or is restricted on your API key. Please go to Google Cloud Console, enable the "Google Drive API" for your project, and check "API restrictions" under your Credentials to ensure the Google Drive API is allowed.';
        }

        throw new Error(errorMessage);
    }
};

/**
 * Streams the binary content of a public Google Drive file.
 * Google native documents (Docs/Slides/Sheets) hold no downloadable bytes, so they are exported as PDF.
 * @param {string} fileId - The ID of the Google Drive file.
 * @param {string} mimeType - The synced mime type of the file.
 * @returns {Promise<{ contentType: string, stream: import('stream').Readable }>}
 */
const fetchFileContent = async (fileId, mimeType) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('Google API key is not configured (YOUTUBE_API_KEY is missing)');
    }

    const isGoogleDoc = String(mimeType || '').startsWith('application/vnd.google-apps.');

    try {
        const response = await axios.get(
            `https://www.googleapis.com/drive/v3/files/${fileId}${isGoogleDoc ? '/export' : ''}`,
            {
                params: isGoogleDoc
                    ? { key: apiKey, mimeType: 'application/pdf' }
                    : { key: apiKey, alt: 'media', supportsAllDrives: true },
                responseType: 'stream'
            }
        );

        return {
            contentType: isGoogleDoc
                ? 'application/pdf'
                : response.headers['content-type'] || mimeType || 'application/octet-stream',
            stream: response.data
        };
    } catch (error) {
        throw new Error(
            error.response?.status === 404
                ? 'File not found on Google Drive'
                : 'Failed to download the file from Google Drive. Make sure the folder is shared publicly.'
        );
    }
};

module.exports = {
    parseFolderId,
    sortFilesByName,
    fetchFolderFiles,
    fetchFileContent
};
