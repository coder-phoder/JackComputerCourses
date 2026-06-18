const mongoose = require('mongoose');
const Workspace = require('../models/workspace.model');
const WorkspaceNode = require('../models/workspaceNode.model');
const {
    MAX_FILE_SIZE_BYTES,
    getLanguageFromFileName
} = require('../models/workspaceNode.model');

const MAX_WORKSPACE_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_WORKSPACE_NAME = 'demo';

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
    createWorkspaceNode,
    updateWorkspaceNode,
    deleteWorkspaceNode,
    formatWorkspaceNode,
    formatWorkspace,
    getWorkspaceOwner,
    MAX_WORKSPACE_SIZE_BYTES,
    DEFAULT_WORKSPACE_NAME
};
