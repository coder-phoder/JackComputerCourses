const mongoose = require('mongoose');
const Workspace = require('../models/workspace.model');
const WorkspaceNode = require('../models/workspaceNode.model');
const {
    MAX_FILE_SIZE_BYTES,
    getLanguageFromFileName
} = require('../models/workspaceNode.model');

const MAX_WORKSPACE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_NODE_NAME_LENGTH = 120;
const DEFAULT_WORKSPACE_NAME = 'demo';
const MAX_IMPORT_ENTRIES = 1500;
const ZIP_UNIX_DIRECTORY_MODE = 0o40755 * 0x10000;
const ZIP_UNIX_FILE_MODE = 0o100644 * 0x10000;

const sendError = (res, statusCode, message) => res.status(statusCode).json({
    success: false,
    message,
    data: {}
});

const formatWorkspaceNode = (node) => ({
    _id: node._id.toString(),
    workspaceId: node.workspaceId.toString(),
    type: node.type,
    name: node.name,
    parentId: node.parentId ? node.parentId.toString() : null,
    language: node.language || null,
    content: node.type === 'file' ? node.content : '',
    size: node.size || 0,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt
});

const formatWorkspace = (workspace) => ({
    _id: workspace._id.toString(),
    name: workspace.name,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt
});

const makeCrcTable = () => {
    const table = [];

    for (let index = 0; index < 256; index += 1) {
        let crc = index;

        for (let bit = 0; bit < 8; bit += 1) {
            crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
        }

        table[index] = crc >>> 0;
    }

    return table;
};

const CRC_TABLE = makeCrcTable();

const getCrc32 = (buffer) => {
    let crc = 0xffffffff;

    for (const byte of buffer) {
        crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
};

const getDosDateTime = (dateValue = new Date()) => {
    const date = new Date(dateValue);
    const year = Math.max(1980, date.getFullYear());
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = Math.floor(date.getSeconds() / 2);

    return {
        dosTime: (hours << 11) | (minutes << 5) | seconds,
        dosDate: ((year - 1980) << 9) | (month << 5) | day
    };
};

const sanitizeZipPathPart = (value, fallback) => {
    const normalizedValue = String(value || '').trim()
        .replace(/[\\/]+/g, '-')
        .replace(/\0/g, '')
        .replace(/^\.+$/g, '')
        .trim();

    return normalizedValue || fallback;
};

const sanitizeDownloadFileName = (value) => {
    const normalizedValue = sanitizeZipPathPart(value, DEFAULT_WORKSPACE_NAME)
        .replace(/[^\w.-]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalizedValue || DEFAULT_WORKSPACE_NAME;
};

const sanitizeWorkspaceImportName = (value) => {
    const normalizedValue = sanitizeZipPathPart(value, DEFAULT_WORKSPACE_NAME)
        .replace(/\s+/g, ' ')
        .slice(0, 80)
        .trim();

    return normalizedValue || DEFAULT_WORKSPACE_NAME;
};

const getUniqueWorkspaceName = async (owner, requestedName) => {
    const baseName = sanitizeWorkspaceImportName(requestedName);
    const existingWorkspaces = await Workspace.find(getOwnerQuery(owner)).select('name').lean();
    const existingNames = new Set(existingWorkspaces.map((workspace) => String(workspace.name).toLowerCase()));

    if (!existingNames.has(baseName.toLowerCase())) {
        return baseName;
    }

    for (let index = 2; index <= 999; index += 1) {
        const suffix = ` (${index})`;
        const candidate = `${baseName.slice(0, 80 - suffix.length).trim()}${suffix}`;

        if (!existingNames.has(candidate.toLowerCase())) {
            return candidate;
        }
    }

    return `${baseName.slice(0, 64).trim()} ${Date.now()}`;
};

const normalizeImportPath = (value) => {
    const rawPath = String(value || '').replace(/\\/g, '/').replace(/\0/g, '').trim();
    const parts = rawPath
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean);

    if (!parts.length) {
        return { error: 'Imported paths cannot be empty' };
    }

    if (parts.some((part) => part === '.' || part === '..' || /[\\/]/.test(part))) {
        return { error: 'Imported paths cannot contain unsafe path segments' };
    }

    if (parts.some((part) => part.length > 120)) {
        return { error: 'Imported file or folder names must be 120 characters or fewer' };
    }

    return {
        path: parts.join('/'),
        parts
    };
};

const buildImportPlan = (entries) => {
    if (!Array.isArray(entries) || !entries.length) {
        return { error: 'Select a folder or ZIP file with supported IDE files' };
    }

    if (entries.length > MAX_IMPORT_ENTRIES) {
        return { error: `A workspace import can contain up to ${MAX_IMPORT_ENTRIES} items` };
    }

    const folderPaths = new Set();
    const filesByPath = new Map();
    let totalFileSize = 0;

    for (const entry of entries) {
        const type = String(entry?.type || '').trim();

        if (!['file', 'folder'].includes(type)) {
            return { error: 'Imported entries must be files or folders' };
        }

        const normalizedPath = normalizeImportPath(entry?.path);

        if (normalizedPath.error) {
            return { error: normalizedPath.error };
        }

        if (type === 'folder') {
            if (filesByPath.has(normalizedPath.path)) {
                return { error: 'A file and folder cannot share the same path' };
            }

            folderPaths.add(normalizedPath.path);
            continue;
        }

        if (folderPaths.has(normalizedPath.path) || filesByPath.has(normalizedPath.path)) {
            return { error: 'Imported workspace contains duplicate paths' };
        }

        const fileName = normalizedPath.parts[normalizedPath.parts.length - 1];
        const language = getLanguageFromFileName(fileName);

        if (!language) {
            return { error: 'Only .c, .cpp, .java, .py and .js files are supported' };
        }

        const content = String(entry?.content || '');
        const contentSize = getContentSize(content);

        if (contentSize > MAX_FILE_SIZE_BYTES) {
            return { error: `${fileName} is larger than the per-file limit` };
        }

        totalFileSize += contentSize;

        if (totalFileSize > MAX_WORKSPACE_SIZE_BYTES) {
            return { error: 'Workspace storage limit reached' };
        }

        for (let index = 1; index < normalizedPath.parts.length; index += 1) {
            folderPaths.add(normalizedPath.parts.slice(0, index).join('/'));
        }

        filesByPath.set(normalizedPath.path, {
            path: normalizedPath.path,
            parts: normalizedPath.parts,
            name: fileName,
            content,
            language
        });
    }

    const folderItems = [...folderPaths]
        .sort((first, second) => {
            const depthDifference = first.split('/').length - second.split('/').length;

            return depthDifference || first.localeCompare(second);
        })
        .map((folderPath) => {
            const parts = folderPath.split('/');

            return {
                path: folderPath,
                parts,
                name: parts[parts.length - 1]
            };
        });
    const fileItems = [...filesByPath.values()]
        .sort((first, second) => first.path.localeCompare(second.path));

    if (!fileItems.length) {
        return { error: 'Select a folder or ZIP file with at least one supported IDE file' };
    }

    return {
        folderItems,
        fileItems,
        totalFileSize
    };
};

const buildZipArchive = (entries) => {
    const localFileParts = [];
    const centralDirectoryParts = [];
    let offset = 0;

    entries.forEach((entry) => {
        const nameBuffer = Buffer.from(entry.path, 'utf8');
        const contentBuffer = entry.isDirectory ? Buffer.alloc(0) : Buffer.from(entry.content || '', 'utf8');
        const crc32 = getCrc32(contentBuffer);
        const { dosTime, dosDate } = getDosDateTime(entry.updatedAt);
        const localHeader = Buffer.alloc(30);

        localHeader.writeUInt32LE(0x04034b50, 0);
        localHeader.writeUInt16LE(20, 4);
        localHeader.writeUInt16LE(0, 6);
        localHeader.writeUInt16LE(0, 8);
        localHeader.writeUInt16LE(dosTime, 10);
        localHeader.writeUInt16LE(dosDate, 12);
        localHeader.writeUInt32LE(crc32, 14);
        localHeader.writeUInt32LE(contentBuffer.length, 18);
        localHeader.writeUInt32LE(contentBuffer.length, 22);
        localHeader.writeUInt16LE(nameBuffer.length, 26);
        localHeader.writeUInt16LE(0, 28);

        localFileParts.push(localHeader, nameBuffer, contentBuffer);

        const centralDirectoryHeader = Buffer.alloc(46);
        centralDirectoryHeader.writeUInt32LE(0x02014b50, 0);
        centralDirectoryHeader.writeUInt16LE(0x031e, 4);
        centralDirectoryHeader.writeUInt16LE(20, 6);
        centralDirectoryHeader.writeUInt16LE(0, 8);
        centralDirectoryHeader.writeUInt16LE(0, 10);
        centralDirectoryHeader.writeUInt16LE(dosTime, 12);
        centralDirectoryHeader.writeUInt16LE(dosDate, 14);
        centralDirectoryHeader.writeUInt32LE(crc32, 16);
        centralDirectoryHeader.writeUInt32LE(contentBuffer.length, 20);
        centralDirectoryHeader.writeUInt32LE(contentBuffer.length, 24);
        centralDirectoryHeader.writeUInt16LE(nameBuffer.length, 28);
        centralDirectoryHeader.writeUInt16LE(0, 30);
        centralDirectoryHeader.writeUInt16LE(0, 32);
        centralDirectoryHeader.writeUInt16LE(0, 34);
        centralDirectoryHeader.writeUInt16LE(0, 36);
        centralDirectoryHeader.writeUInt32LE(entry.isDirectory ? ZIP_UNIX_DIRECTORY_MODE : ZIP_UNIX_FILE_MODE, 38);
        centralDirectoryHeader.writeUInt32LE(offset, 42);

        centralDirectoryParts.push(centralDirectoryHeader, nameBuffer);
        offset += localHeader.length + nameBuffer.length + contentBuffer.length;
    });

    const centralDirectorySize = centralDirectoryParts.reduce((total, part) => total + part.length, 0);
    const endOfCentralDirectory = Buffer.alloc(22);

    endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
    endOfCentralDirectory.writeUInt16LE(0, 4);
    endOfCentralDirectory.writeUInt16LE(0, 6);
    endOfCentralDirectory.writeUInt16LE(entries.length, 8);
    endOfCentralDirectory.writeUInt16LE(entries.length, 10);
    endOfCentralDirectory.writeUInt32LE(centralDirectorySize, 12);
    endOfCentralDirectory.writeUInt32LE(offset, 16);
    endOfCentralDirectory.writeUInt16LE(0, 20);

    return Buffer.concat([...localFileParts, ...centralDirectoryParts, endOfCentralDirectory]);
};

const buildWorkspaceZipEntries = (workspace, nodes) => {
    const rootName = sanitizeZipPathPart(workspace.name, DEFAULT_WORKSPACE_NAME);
    const nodesById = new Map(nodes.map((node) => [String(node._id), node]));
    const pathById = new Map();

    const resolveNodePath = (node) => {
        const nodeId = String(node._id);

        if (pathById.has(nodeId)) {
            return pathById.get(nodeId);
        }

        const name = sanitizeZipPathPart(node.name, node.type === 'folder' ? 'folder' : 'file');
        const parent = node.parentId ? nodesById.get(String(node.parentId)) : null;
        const parentPath = parent ? resolveNodePath(parent) : rootName;
        const nodePath = `${parentPath}/${name}`;

        pathById.set(nodeId, nodePath);
        return nodePath;
    };

    const entries = [{
        path: `${rootName}/`,
        content: '',
        isDirectory: true,
        updatedAt: workspace.updatedAt
    }];

    nodes
        .slice()
        .sort((first, second) => {
            if (first.type !== second.type) {
                return first.type === 'folder' ? -1 : 1;
            }

            return String(first.name).localeCompare(String(second.name));
        })
        .forEach((node) => {
            const nodePath = resolveNodePath(node);

            entries.push({
                path: node.type === 'folder' ? `${nodePath}/` : nodePath,
                content: node.type === 'file' ? node.content || '' : '',
                isDirectory: node.type === 'folder',
                updatedAt: node.updatedAt
            });
        });

    return entries;
};

const getWorkspaceOwner = (req) => {
    if (req.user?._id) {
        return {
            ownerRole: 'user',
            ownerId: req.user._id
        };
    }

    if (req.faculty?._id) {
        return {
            ownerRole: 'faculty',
            ownerId: req.faculty._id
        };
    }

    return null;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''));

const normalizeParentId = (parentId) => {
    if (parentId === undefined || parentId === null || parentId === '') {
        return null;
    }

    return String(parentId);
};

const getOwnerQuery = (owner) => ({
    ownerRole: owner.ownerRole,
    ownerId: owner.ownerId
});

const getNodeQuery = (owner, workspaceId) => ({
    ...getOwnerQuery(owner),
    workspaceId
});

const getContentSize = (content) => Buffer.byteLength(String(content || ''), 'utf8');

const getWorkspaceTotalSize = async (owner, workspaceId) => {
    const [result] = await WorkspaceNode.aggregate([
        {
            $match: {
                ownerRole: owner.ownerRole,
                ownerId: new mongoose.Types.ObjectId(owner.ownerId),
                workspaceId: new mongoose.Types.ObjectId(workspaceId),
                type: 'file'
            }
        },
        {
            $group: {
                _id: null,
                totalSize: { $sum: '$size' }
            }
        }
    ]);

    return result?.totalSize || 0;
};

const getWorkspaceById = async (owner, workspaceId) => {
    if (!isValidObjectId(workspaceId)) {
        return null;
    }

    return Workspace.findOne({
        ...getOwnerQuery(owner),
        _id: workspaceId
    });
};

const ensureDefaultWorkspace = async (owner) => {
    const existingWorkspace = await Workspace.findOne(getOwnerQuery(owner)).sort({ createdAt: 1 });

    if (existingWorkspace) {
        await WorkspaceNode.updateMany(
            {
                ...getOwnerQuery(owner),
                $or: [
                    { workspaceId: { $exists: false } },
                    { workspaceId: null }
                ]
            },
            { $set: { workspaceId: existingWorkspace._id } }
        );
        return existingWorkspace;
    }

    const workspace = await Workspace.create({
        ...owner,
        name: DEFAULT_WORKSPACE_NAME
    });

    await WorkspaceNode.updateMany(
        {
            ...getOwnerQuery(owner),
            $or: [
                { workspaceId: { $exists: false } },
                { workspaceId: null }
            ]
        },
        { $set: { workspaceId: workspace._id } }
    );

    return workspace;
};

const validateParentNode = async (owner, workspaceId, parentId) => {
    const normalizedParentId = normalizeParentId(parentId);

    if (!normalizedParentId) {
        return { parentId: null, parentNode: null };
    }

    if (!isValidObjectId(normalizedParentId)) {
        return { error: 'Invalid parent folder id' };
    }

    const parentNode = await WorkspaceNode.findOne({
        ...getNodeQuery(owner, workspaceId),
        _id: normalizedParentId
    });

    if (!parentNode || parentNode.type !== 'folder') {
        return { error: 'Parent folder not found' };
    }

    return {
        parentId: parentNode._id,
        parentNode
    };
};

const findSiblingByName = async (owner, workspaceId, name, parentId, excludedNodeId = null) => {
    const query = {
        ...getNodeQuery(owner, workspaceId),
        name: String(name || '').trim(),
        parentId: parentId || null
    };

    if (excludedNodeId) {
        query._id = { $ne: excludedNodeId };
    }

    return WorkspaceNode.findOne(query);
};

const getUniqueCopyName = (name, reservedNames = new Set()) => {
    const normalizedName = String(name || '').trim();
    const dotIndex = normalizedName.lastIndexOf('.');
    const hasExtension = dotIndex > 0;
    const baseName = hasExtension ? normalizedName.slice(0, dotIndex) : normalizedName;
    const extension = hasExtension ? normalizedName.slice(dotIndex) : '';
    const buildCandidate = (suffix) => {
        const maxBaseLength = Math.max(1, MAX_NODE_NAME_LENGTH - suffix.length - extension.length);
        const trimmedBaseName = baseName.slice(0, maxBaseLength).trim() || 'item';

        return `${trimmedBaseName}${suffix}${extension}`.slice(0, MAX_NODE_NAME_LENGTH);
    };

    for (let index = 1; index <= 999; index += 1) {
        const suffix = index === 1 ? ' copy' : ` copy ${index}`;
        const candidate = buildCandidate(suffix);
        const normalizedCandidate = candidate.toLowerCase();

        if (!reservedNames.has(normalizedCandidate)) {
            reservedNames.add(normalizedCandidate);
            return candidate;
        }
    }

    const fallback = buildCandidate(` copy ${Date.now()}`);
    reservedNames.add(fallback.toLowerCase());
    return fallback;
};

const getNodeIdSelection = (nodeIds) => {
    if (!Array.isArray(nodeIds)) {
        return { error: 'Select at least one file or folder' };
    }

    const uniqueNodeIds = [...new Set(nodeIds.map((nodeId) => String(nodeId || '').trim()).filter(Boolean))];

    if (!uniqueNodeIds.length) {
        return { error: 'Select at least one file or folder' };
    }

    if (uniqueNodeIds.length > 100) {
        return { error: 'You can move or copy up to 100 selected items at once' };
    }

    if (uniqueNodeIds.some((nodeId) => !isValidObjectId(nodeId))) {
        return { error: 'Invalid workspace node id' };
    }

    return { nodeIds: uniqueNodeIds };
};

const buildNodeTreeIndexes = (nodes) => {
    const nodeById = new Map();
    const childrenByParentId = new Map();

    nodes.forEach((node) => {
        const nodeId = String(node._id);
        const parentKey = node.parentId ? String(node.parentId) : 'root';
        const children = childrenByParentId.get(parentKey) || [];

        nodeById.set(nodeId, node);
        children.push(node);
        childrenByParentId.set(parentKey, children);
    });

    return {
        nodeById,
        childrenByParentId
    };
};

const hasSelectedAncestor = (node, selectedIds, nodeById) => {
    let currentParentId = node.parentId ? String(node.parentId) : null;

    while (currentParentId) {
        if (selectedIds.has(currentParentId)) {
            return true;
        }

        const parentNode = nodeById.get(currentParentId);
        currentParentId = parentNode?.parentId ? String(parentNode.parentId) : null;
    }

    return false;
};

const getRootSelectionNodes = (nodeIds, nodeById) => {
    const selectedIds = new Set(nodeIds);

    return nodeIds
        .map((nodeId) => nodeById.get(nodeId))
        .filter((node) => node && !hasSelectedAncestor(node, selectedIds, nodeById));
};

const getNodeCopyTraversal = (rootNodes, childrenByParentId) => {
    const traversal = [];

    const visitNode = (node) => {
        traversal.push(node);

        const children = (childrenByParentId.get(String(node._id)) || [])
            .slice()
            .sort((first, second) => {
                if (first.type !== second.type) {
                    return first.type === 'folder' ? -1 : 1;
                }

                return String(first.name).localeCompare(String(second.name));
            });

        children.forEach(visitNode);
    };

    rootNodes.forEach(visitNode);

    return traversal;
};

const getExistingSiblingNames = (nodes, parentId, excludedIds = new Set()) => {
    const parentKey = parentId ? String(parentId) : null;

    return new Set(
        nodes
            .filter((node) => {
                const nodeParentKey = node.parentId ? String(node.parentId) : null;
                return nodeParentKey === parentKey && !excludedIds.has(String(node._id));
            })
            .map((node) => String(node.name).toLowerCase())
    );
};

const ensureRootMoveConflicts = (allNodes, rootNodes, targetParentId) => {
    const rootIds = new Set(rootNodes.map((node) => String(node._id)));
    const siblingNames = getExistingSiblingNames(allNodes, targetParentId, rootIds);
    const selectedNames = new Set();

    for (const node of rootNodes) {
        const normalizedName = String(node.name).toLowerCase();

        if (selectedNames.has(normalizedName) || siblingNames.has(normalizedName)) {
            return 'A file or folder with this name already exists here';
        }

        selectedNames.add(normalizedName);
    }

    return '';
};

const ensureCreateQuota = async (type, contentSize) => {
    if (type === 'folder') {
        return '';
    }

    if (contentSize > MAX_FILE_SIZE_BYTES) {
        return 'File is too large';
    }

    return '';
};

const ensureCreateSizeQuota = async (owner, workspaceId, type, contentSize) => {
    const quotaError = await ensureCreateQuota(type, contentSize);

    if (quotaError || type === 'folder') {
        return quotaError;
    }

    const currentTotalSize = await getWorkspaceTotalSize(owner, workspaceId);

    if (currentTotalSize + contentSize > MAX_WORKSPACE_SIZE_BYTES) {
        return 'Workspace storage limit reached';
    }

    return '';
};

const ensureAdditionalWorkspaceSizeQuota = async (owner, workspaceId, additionalSize) => {
    const currentTotalSize = await getWorkspaceTotalSize(owner, workspaceId);

    if (currentTotalSize + additionalSize > MAX_WORKSPACE_SIZE_BYTES) {
        return 'Workspace storage limit reached';
    }

    return '';
};

const ensureUpdateSizeQuota = async (owner, currentNode, nextSize) => {
    if (nextSize > MAX_FILE_SIZE_BYTES) {
        return 'File is too large';
    }

    const currentTotalSize = await getWorkspaceTotalSize(owner, currentNode.workspaceId);
    const projectedTotalSize = currentTotalSize - (currentNode.size || 0) + nextSize;

    if (projectedTotalSize > MAX_WORKSPACE_SIZE_BYTES) {
        return 'Workspace storage limit reached';
    }

    return '';
};

const getDescendantIds = async (owner, workspaceId, folderId) => {
    const nodes = await WorkspaceNode.find(getNodeQuery(owner, workspaceId)).select('_id parentId').lean();
    const descendants = [];
    const queue = [String(folderId)];

    while (queue.length) {
        const currentParentId = queue.shift();

        nodes.forEach((node) => {
            if (node.parentId && String(node.parentId) === currentParentId) {
                const nodeId = String(node._id);
                descendants.push(nodeId);
                queue.push(nodeId);
            }
        });
    }

    return descendants;
};

const getWorkspaces = async (req, res) => {
    try {
        const owner = getWorkspaceOwner(req);

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        await ensureDefaultWorkspace(owner);

        const workspaces = await Workspace.find(getOwnerQuery(owner)).sort({ createdAt: 1, name: 1 });

        return res.status(200).json({
            success: true,
            message: 'Workspaces fetched successfully',
            data: { workspaces: workspaces.map(formatWorkspace) }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching workspaces');
    }
};

const createWorkspace = async (req, res) => {
    try {
        const owner = getWorkspaceOwner(req);

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        const name = String(req.body?.name || '').trim();

        if (!name) {
            return sendError(res, 400, 'Workspace name is required');
        }

        const workspace = await Workspace.create({
            ...owner,
            name
        });

        return res.status(201).json({
            success: true,
            message: 'Workspace created successfully',
            data: { workspace: formatWorkspace(workspace) }
        });
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 409, 'Workspace with this name already exists');
        }

        if (error.name === 'ValidationError') {
            return sendError(res, 400, error.message);
        }

        return sendError(res, 500, 'Something went wrong while creating workspace');
    }
};

const updateWorkspace = async (req, res) => {
    try {
        const owner = getWorkspaceOwner(req);
        const { workspaceId } = req.params;

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        const workspace = await getWorkspaceById(owner, workspaceId);

        if (!workspace) {
            return sendError(res, 404, 'Workspace not found');
        }

        const name = String(req.body?.name || '').trim();

        if (!name) {
            return sendError(res, 400, 'Workspace name is required');
        }

        workspace.name = name;
        await workspace.save();

        return res.status(200).json({
            success: true,
            message: 'Workspace updated successfully',
            data: { workspace: formatWorkspace(workspace) }
        });
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 409, 'Workspace with this name already exists');
        }

        if (error.name === 'ValidationError') {
            return sendError(res, 400, error.message);
        }

        return sendError(res, 500, 'Something went wrong while updating workspace');
    }
};

const deleteWorkspace = async (req, res) => {
    try {
        const owner = getWorkspaceOwner(req);
        const { workspaceId } = req.params;

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        const workspace = await getWorkspaceById(owner, workspaceId);

        if (!workspace) {
            return sendError(res, 404, 'Workspace not found');
        }

        const workspaceCount = await Workspace.countDocuments(getOwnerQuery(owner));

        if (workspaceCount <= 1) {
            return sendError(res, 400, 'At least one workspace is required');
        }

        await WorkspaceNode.deleteMany(getNodeQuery(owner, workspace._id));
        await Workspace.deleteOne({
            ...getOwnerQuery(owner),
            _id: workspace._id
        });

        return res.status(200).json({
            success: true,
            message: 'Workspace deleted successfully',
            data: { deletedWorkspaceId: workspace._id.toString() }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while deleting workspace');
    }
};

const getWorkspaceNodes = async (req, res) => {
    try {
        const owner = getWorkspaceOwner(req);
        const { workspaceId } = req.params;

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        const workspace = await getWorkspaceById(owner, workspaceId);

        if (!workspace) {
            return sendError(res, 404, 'Workspace not found');
        }

        const nodes = await WorkspaceNode.find(getNodeQuery(owner, workspace._id))
            .sort({ type: 1, name: 1, createdAt: 1 });

        return res.status(200).json({
            success: true,
            message: 'Workspace nodes fetched successfully',
            data: { nodes: nodes.map(formatWorkspaceNode) }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching workspace nodes');
    }
};

const downloadWorkspace = async (req, res) => {
    try {
        const owner = getWorkspaceOwner(req);
        const { workspaceId } = req.params;

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        const workspace = await getWorkspaceById(owner, workspaceId);

        if (!workspace) {
            return sendError(res, 404, 'Workspace not found');
        }

        const nodes = await WorkspaceNode.find(getNodeQuery(owner, workspace._id))
            .sort({ type: 1, name: 1, createdAt: 1 });
        const zipEntries = buildWorkspaceZipEntries(workspace, nodes);
        const zipBuffer = buildZipArchive(zipEntries);
        const downloadFileName = `${sanitizeDownloadFileName(workspace.name)}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Length', zipBuffer.length);
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${downloadFileName}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`
        );

        return res.status(200).send(zipBuffer);
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while downloading workspace');
    }
};

const importWorkspace = async (req, res) => {
    let createdWorkspace = null;

    try {
        const owner = getWorkspaceOwner(req);

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        const importPlan = buildImportPlan(req.body?.entries);

        if (importPlan.error) {
            return sendError(res, 400, importPlan.error);
        }

        const workspaceName = await getUniqueWorkspaceName(owner, req.body?.name);

        createdWorkspace = await Workspace.create({
            ...owner,
            name: workspaceName
        });

        const folderIdByPath = new Map();

        for (const folder of importPlan.folderItems) {
            const parentPath = folder.parts.slice(0, -1).join('/');
            const parentId = parentPath ? folderIdByPath.get(parentPath) : null;
            const node = await WorkspaceNode.create({
                ...owner,
                workspaceId: createdWorkspace._id,
                type: 'folder',
                name: folder.name,
                parentId: parentId || null
            });

            folderIdByPath.set(folder.path, node._id);
        }

        const createdFiles = [];

        for (const file of importPlan.fileItems) {
            const parentPath = file.parts.slice(0, -1).join('/');
            const parentId = parentPath ? folderIdByPath.get(parentPath) : null;
            const node = await WorkspaceNode.create({
                ...owner,
                workspaceId: createdWorkspace._id,
                type: 'file',
                name: file.name,
                parentId: parentId || null,
                language: file.language,
                content: file.content
            });

            createdFiles.push(node);
        }

        return res.status(201).json({
            success: true,
            message: 'Workspace imported successfully',
            data: {
                workspace: formatWorkspace(createdWorkspace),
                counts: {
                    folders: importPlan.folderItems.length,
                    files: createdFiles.length,
                    bytes: importPlan.totalFileSize
                }
            }
        });
    } catch (error) {
        if (createdWorkspace?._id) {
            await WorkspaceNode.deleteMany({ workspaceId: createdWorkspace._id });
            await Workspace.deleteOne({ _id: createdWorkspace._id });
        }

        if (error.code === 11000) {
            return sendError(res, 409, 'Workspace with this name already exists');
        }

        if (error.name === 'ValidationError') {
            return sendError(res, 400, error.message);
        }

        return sendError(res, 500, 'Something went wrong while importing workspace');
    }
};

const createWorkspaceNode = async (req, res) => {
    try {
        const owner = getWorkspaceOwner(req);
        const { workspaceId } = req.params;

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        const workspace = await getWorkspaceById(owner, workspaceId);

        if (!workspace) {
            return sendError(res, 404, 'Workspace not found');
        }

        const type = String(req.body?.type || '').trim();
        const name = String(req.body?.name || '').trim();

        if (!['file', 'folder'].includes(type)) {
            return sendError(res, 400, 'Node type must be file or folder');
        }

        if (!name) {
            return sendError(res, 400, 'Name is required');
        }

        const parentValidation = await validateParentNode(owner, workspace._id, req.body?.parentId);

        if (parentValidation.error) {
            return sendError(res, 400, parentValidation.error);
        }

        const sibling = await findSiblingByName(owner, workspace._id, name, parentValidation.parentId);

        if (sibling) {
            return sendError(res, 409, 'A file or folder with this name already exists here');
        }

        const language = type === 'file' ? getLanguageFromFileName(name) : null;

        if (type === 'file' && !language) {
            return sendError(res, 400, 'Only .c, .cpp, .java, .py and .js files are supported');
        }

        const initialContent = '';
        const quotaError = await ensureCreateSizeQuota(owner, workspace._id, type, getContentSize(initialContent));

        if (quotaError) {
            return sendError(res, 400, quotaError);
        }

        const node = await WorkspaceNode.create({
            ...owner,
            workspaceId: workspace._id,
            type,
            name,
            parentId: parentValidation.parentId,
            language,
            content: initialContent
        });

        return res.status(201).json({
            success: true,
            message: 'Workspace node created successfully',
            data: { node: formatWorkspaceNode(node) }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return sendError(res, 400, error.message);
        }

        return sendError(res, 500, 'Something went wrong while creating workspace node');
    }
};

const moveWorkspaceNodes = async (req, res) => {
    try {
        const owner = getWorkspaceOwner(req);
        const { workspaceId } = req.params;

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        const workspace = await getWorkspaceById(owner, workspaceId);

        if (!workspace) {
            return sendError(res, 404, 'Workspace not found');
        }

        const selection = getNodeIdSelection(req.body?.nodeIds);

        if (selection.error) {
            return sendError(res, 400, selection.error);
        }

        const parentValidation = await validateParentNode(owner, workspace._id, req.body?.parentId);

        if (parentValidation.error) {
            return sendError(res, 400, parentValidation.error);
        }

        const allNodes = await WorkspaceNode.find(getNodeQuery(owner, workspace._id));
        const { nodeById } = buildNodeTreeIndexes(allNodes);
        const selectedNodes = selection.nodeIds.map((nodeId) => nodeById.get(nodeId));

        if (selectedNodes.some((node) => !node)) {
            return sendError(res, 404, 'Workspace node not found');
        }

        const rootNodes = getRootSelectionNodes(selection.nodeIds, nodeById);

        for (const node of rootNodes) {
            if (node.type === 'folder' && parentValidation.parentId) {
                if (String(parentValidation.parentId) === String(node._id)) {
                    return sendError(res, 400, 'Folder cannot be moved into itself');
                }

                const descendantIds = await getDescendantIds(owner, workspace._id, node._id);

                if (descendantIds.includes(String(parentValidation.parentId))) {
                    return sendError(res, 400, 'Folder cannot be moved into its own descendant');
                }
            }
        }

        const conflictError = ensureRootMoveConflicts(allNodes, rootNodes, parentValidation.parentId);

        if (conflictError) {
            return sendError(res, 409, conflictError);
        }

        const rootIds = rootNodes.map((node) => node._id);

        await WorkspaceNode.updateMany(
            {
                ...getNodeQuery(owner, workspace._id),
                _id: { $in: rootIds }
            },
            { $set: { parentId: parentValidation.parentId } }
        );

        const movedNodes = await WorkspaceNode.find({
            ...getNodeQuery(owner, workspace._id),
            _id: { $in: rootIds }
        });

        return res.status(200).json({
            success: true,
            message: 'Workspace nodes moved successfully',
            data: { nodes: movedNodes.map(formatWorkspaceNode) }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while moving workspace nodes');
    }
};

const copyWorkspaceNodes = async (req, res) => {
    const createdNodeIds = [];

    try {
        const owner = getWorkspaceOwner(req);
        const { workspaceId } = req.params;

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        const workspace = await getWorkspaceById(owner, workspaceId);

        if (!workspace) {
            return sendError(res, 404, 'Workspace not found');
        }

        const selection = getNodeIdSelection(req.body?.nodeIds);

        if (selection.error) {
            return sendError(res, 400, selection.error);
        }

        const parentValidation = await validateParentNode(owner, workspace._id, req.body?.parentId);

        if (parentValidation.error) {
            return sendError(res, 400, parentValidation.error);
        }

        const allNodes = await WorkspaceNode.find(getNodeQuery(owner, workspace._id));
        const { nodeById, childrenByParentId } = buildNodeTreeIndexes(allNodes);
        const selectedNodes = selection.nodeIds.map((nodeId) => nodeById.get(nodeId));

        if (selectedNodes.some((node) => !node)) {
            return sendError(res, 404, 'Workspace node not found');
        }

        const rootNodes = getRootSelectionNodes(selection.nodeIds, nodeById);
        const traversal = getNodeCopyTraversal(rootNodes, childrenByParentId);

        if (traversal.length > MAX_IMPORT_ENTRIES) {
            return sendError(res, 400, `You can copy up to ${MAX_IMPORT_ENTRIES} files and folders at once`);
        }

        const copySize = traversal.reduce((totalSize, node) => (
            node.type === 'file' ? totalSize + (node.size || 0) : totalSize
        ), 0);
        const quotaError = await ensureAdditionalWorkspaceSizeQuota(owner, workspace._id, copySize);

        if (quotaError) {
            return sendError(res, 400, quotaError);
        }

        const rootIds = new Set(rootNodes.map((node) => String(node._id)));
        const copiedIdByOriginalId = new Map();
        const siblingNames = getExistingSiblingNames(allNodes, parentValidation.parentId);
        const createdNodes = [];

        for (const sourceNode of traversal) {
            const sourceNodeId = String(sourceNode._id);
            const isRootCopy = rootIds.has(sourceNodeId);
            const copiedParentId = isRootCopy
                ? parentValidation.parentId
                : copiedIdByOriginalId.get(String(sourceNode.parentId));

            if (!isRootCopy && !copiedParentId) {
                return sendError(res, 400, 'Selected folder tree is invalid');
            }

            const nextName = isRootCopy
                ? getUniqueCopyName(sourceNode.name, siblingNames)
                : sourceNode.name;

            const copiedNode = await WorkspaceNode.create({
                ...owner,
                workspaceId: workspace._id,
                type: sourceNode.type,
                name: nextName,
                parentId: copiedParentId || null,
                language: sourceNode.type === 'file' ? sourceNode.language : null,
                content: sourceNode.type === 'file' ? sourceNode.content || '' : ''
            });

            createdNodeIds.push(copiedNode._id);
            copiedIdByOriginalId.set(sourceNodeId, copiedNode._id);
            createdNodes.push(copiedNode);
        }

        return res.status(201).json({
            success: true,
            message: 'Workspace nodes copied successfully',
            data: { nodes: createdNodes.map(formatWorkspaceNode) }
        });
    } catch (error) {
        if (createdNodeIds.length) {
            await WorkspaceNode.deleteMany({ _id: { $in: createdNodeIds } });
        }

        if (error.name === 'ValidationError') {
            return sendError(res, 400, error.message);
        }

        return sendError(res, 500, 'Something went wrong while copying workspace nodes');
    }
};

const updateWorkspaceNode = async (req, res) => {
    try {
        const owner = getWorkspaceOwner(req);
        const { workspaceId, nodeId } = req.params;

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        const workspace = await getWorkspaceById(owner, workspaceId);

        if (!workspace) {
            return sendError(res, 404, 'Workspace not found');
        }

        if (!isValidObjectId(nodeId)) {
            return sendError(res, 400, 'Invalid workspace node id');
        }

        const node = await WorkspaceNode.findOne({
            ...getNodeQuery(owner, workspace._id),
            _id: nodeId
        });

        if (!node) {
            return sendError(res, 404, 'Workspace node not found');
        }

        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'name')) {
            const nextName = String(req.body.name || '').trim();

            if (!nextName) {
                return sendError(res, 400, 'Name is required');
            }

            if (node.type === 'file' && !getLanguageFromFileName(nextName)) {
                return sendError(res, 400, 'Only .c, .cpp, .java, .py and .js files are supported');
            }

            node.name = nextName;
        }

        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'parentId')) {
            const parentValidation = await validateParentNode(owner, workspace._id, req.body.parentId);

            if (parentValidation.error) {
                return sendError(res, 400, parentValidation.error);
            }

            if (node.type === 'folder' && parentValidation.parentId) {
                if (String(parentValidation.parentId) === String(node._id)) {
                    return sendError(res, 400, 'Folder cannot be moved into itself');
                }

                const descendantIds = await getDescendantIds(owner, workspace._id, node._id);

                if (descendantIds.includes(String(parentValidation.parentId))) {
                    return sendError(res, 400, 'Folder cannot be moved into its own descendant');
                }
            }

            node.parentId = parentValidation.parentId;
        }

        const sibling = await findSiblingByName(owner, workspace._id, node.name, node.parentId, node._id);

        if (sibling) {
            return sendError(res, 409, 'A file or folder with this name already exists here');
        }

        if (node.type === 'file' && Object.prototype.hasOwnProperty.call(req.body || {}, 'content')) {
            const nextContent = String(req.body.content || '');
            const quotaError = await ensureUpdateSizeQuota(owner, node, getContentSize(nextContent));

            if (quotaError) {
                return sendError(res, 400, quotaError);
            }

            node.content = nextContent;
        }

        await node.save();

        return res.status(200).json({
            success: true,
            message: 'Workspace node updated successfully',
            data: { node: formatWorkspaceNode(node) }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return sendError(res, 400, error.message);
        }

        return sendError(res, 500, 'Something went wrong while updating workspace node');
    }
};

const deleteWorkspaceNode = async (req, res) => {
    try {
        const owner = getWorkspaceOwner(req);
        const { workspaceId, nodeId } = req.params;

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        const workspace = await getWorkspaceById(owner, workspaceId);

        if (!workspace) {
            return sendError(res, 404, 'Workspace not found');
        }

        if (!isValidObjectId(nodeId)) {
            return sendError(res, 400, 'Invalid workspace node id');
        }

        const node = await WorkspaceNode.findOne({
            ...getNodeQuery(owner, workspace._id),
            _id: nodeId
        });

        if (!node) {
            return sendError(res, 404, 'Workspace node not found');
        }

        const idsToDelete = [String(node._id)];

        if (node.type === 'folder') {
            const descendantIds = await getDescendantIds(owner, workspace._id, node._id);
            idsToDelete.push(...descendantIds);
        }

        await WorkspaceNode.deleteMany({
            ...getNodeQuery(owner, workspace._id),
            _id: { $in: idsToDelete }
        });

        return res.status(200).json({
            success: true,
            message: 'Workspace node deleted successfully',
            data: { deletedIds: idsToDelete }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while deleting workspace node');
    }
};

module.exports = {
    getWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceNodes,
    downloadWorkspace,
    importWorkspace,
    createWorkspaceNode,
    copyWorkspaceNodes,
    moveWorkspaceNodes,
    updateWorkspaceNode,
    deleteWorkspaceNode,
    formatWorkspaceNode,
    formatWorkspace,
    getWorkspaceOwner,
    buildZipArchive,
    buildWorkspaceZipEntries,
    buildImportPlan,
    getUniqueCopyName,
    buildNodeTreeIndexes,
    getRootSelectionNodes,
    getNodeCopyTraversal,
    MAX_WORKSPACE_SIZE_BYTES,
    DEFAULT_WORKSPACE_NAME
};
