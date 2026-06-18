const mongoose = require('mongoose');
const WorkspaceNode = require('../models/workspaceNode.model');
const {
    MAX_FILE_SIZE_BYTES,
    getLanguageFromFileName
} = require('../models/workspaceNode.model');

const MAX_FILES_PER_WORKSPACE = 100;
const MAX_FOLDERS_PER_WORKSPACE = 20;
const MAX_WORKSPACE_SIZE_BYTES = 5 * 1024 * 1024;

const BOILERPLATES = {
    c: '#include <stdio.h>\n\nint main() {\n    printf("hello world\\n");\n    return 0;\n}\n',
    cpp: '#include <iostream>\n\nint main() {\n    std::cout << "hello world" << std::endl;\n    return 0;\n}\n',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("hello world");\n    }\n}\n',
    python: 'print("hello world")\n',
    javascript: 'console.log("hello world");\n'
};

const sendError = (res, statusCode, message) => res.status(statusCode).json({
    success: false,
    message,
    data: {}
});

const formatWorkspaceNode = (node) => ({
    _id: node._id.toString(),
    type: node.type,
    name: node.name,
    parentId: node.parentId ? node.parentId.toString() : null,
    language: node.language || null,
    content: node.type === 'file' ? node.content : '',
    size: node.size || 0,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt
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

const getContentSize = (content) => Buffer.byteLength(String(content || ''), 'utf8');

const getWorkspaceTotalSize = async (owner) => {
    const [result] = await WorkspaceNode.aggregate([
        {
            $match: {
                ownerRole: owner.ownerRole,
                ownerId: new mongoose.Types.ObjectId(owner.ownerId),
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

const validateParentNode = async (owner, parentId) => {
    const normalizedParentId = normalizeParentId(parentId);

    if (!normalizedParentId) {
        return { parentId: null, parentNode: null };
    }

    if (!isValidObjectId(normalizedParentId)) {
        return { error: 'Invalid parent folder id' };
    }

    const parentNode = await WorkspaceNode.findOne({
        ...getOwnerQuery(owner),
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

const findSiblingByName = async (owner, name, parentId, excludedNodeId = null) => {
    const query = {
        ...getOwnerQuery(owner),
        name: String(name || '').trim(),
        parentId: parentId || null
    };

    if (excludedNodeId) {
        query._id = { $ne: excludedNodeId };
    }

    return WorkspaceNode.findOne(query);
};

const ensureCreateQuota = async (owner, type, contentSize) => {
    if (type === 'folder') {
        const folderCount = await WorkspaceNode.countDocuments({
            ...getOwnerQuery(owner),
            type: 'folder'
        });

        if (folderCount >= MAX_FOLDERS_PER_WORKSPACE) {
            return 'Folder limit reached for this workspace';
        }

        return '';
    }

    const fileCount = await WorkspaceNode.countDocuments({
        ...getOwnerQuery(owner),
        type: 'file'
    });

    if (fileCount >= MAX_FILES_PER_WORKSPACE) {
        return 'File limit reached for this workspace';
    }

    if (contentSize > MAX_FILE_SIZE_BYTES) {
        return 'File is too large';
    }

    const currentTotalSize = await getWorkspaceTotalSize(owner);

    if (currentTotalSize + contentSize > MAX_WORKSPACE_SIZE_BYTES) {
        return 'Workspace storage limit reached';
    }

    return '';
};

const ensureUpdateSizeQuota = async (owner, currentNode, nextSize) => {
    if (nextSize > MAX_FILE_SIZE_BYTES) {
        return 'File is too large';
    }

    const currentTotalSize = await getWorkspaceTotalSize(owner);
    const projectedTotalSize = currentTotalSize - (currentNode.size || 0) + nextSize;

    if (projectedTotalSize > MAX_WORKSPACE_SIZE_BYTES) {
        return 'Workspace storage limit reached';
    }

    return '';
};

const getDescendantIds = async (owner, folderId) => {
    const nodes = await WorkspaceNode.find(getOwnerQuery(owner)).select('_id parentId').lean();
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

const getWorkspaceNodes = async (req, res) => {
    try {
        const owner = getWorkspaceOwner(req);

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        const nodes = await WorkspaceNode.find(getOwnerQuery(owner))
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

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        const type = String(req.body?.type || '').trim();
        const name = String(req.body?.name || '').trim();
        const content = req.body?.content === undefined ? undefined : String(req.body.content);

        if (!['file', 'folder'].includes(type)) {
            return sendError(res, 400, 'Node type must be file or folder');
        }

        if (!name) {
            return sendError(res, 400, 'Name is required');
        }

        const parentValidation = await validateParentNode(owner, req.body?.parentId);

        if (parentValidation.error) {
            return sendError(res, 400, parentValidation.error);
        }

        const sibling = await findSiblingByName(owner, name, parentValidation.parentId);

        if (sibling) {
            return sendError(res, 409, 'A file or folder with this name already exists here');
        }

        const language = type === 'file' ? getLanguageFromFileName(name) : null;

        if (type === 'file' && !language) {
            return sendError(res, 400, 'Only .c, .cpp, .java, .py and .js files are supported');
        }

        const initialContent = type === 'file'
            ? (content === undefined ? BOILERPLATES[language] : content)
            : '';
        const quotaError = await ensureCreateQuota(owner, type, getContentSize(initialContent));

        if (quotaError) {
            return sendError(res, 400, quotaError);
        }

        const node = await WorkspaceNode.create({
            ...owner,
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
        const { nodeId } = req.params;

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        if (!isValidObjectId(nodeId)) {
            return sendError(res, 400, 'Invalid workspace node id');
        }

        const node = await WorkspaceNode.findOne({
            ...getOwnerQuery(owner),
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
            const parentValidation = await validateParentNode(owner, req.body.parentId);

            if (parentValidation.error) {
                return sendError(res, 400, parentValidation.error);
            }

            if (node.type === 'folder' && parentValidation.parentId) {
                if (String(parentValidation.parentId) === String(node._id)) {
                    return sendError(res, 400, 'Folder cannot be moved into itself');
                }

                const descendantIds = await getDescendantIds(owner, node._id);

                if (descendantIds.includes(String(parentValidation.parentId))) {
                    return sendError(res, 400, 'Folder cannot be moved into its own descendant');
                }
            }

            node.parentId = parentValidation.parentId;
        }

        const sibling = await findSiblingByName(owner, node.name, node.parentId, node._id);

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
        const { nodeId } = req.params;

        if (!owner) {
            return sendError(res, 401, 'Workspace authentication is required');
        }

        if (!isValidObjectId(nodeId)) {
            return sendError(res, 400, 'Invalid workspace node id');
        }

        const node = await WorkspaceNode.findOne({
            ...getOwnerQuery(owner),
            _id: nodeId
        });

        if (!node) {
            return sendError(res, 404, 'Workspace node not found');
        }

        const idsToDelete = [String(node._id)];

        if (node.type === 'folder') {
            const descendantIds = await getDescendantIds(owner, node._id);
            idsToDelete.push(...descendantIds);
        }

        await WorkspaceNode.deleteMany({
            ...getOwnerQuery(owner),
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
    getWorkspaceNodes,
    createWorkspaceNode,
    updateWorkspaceNode,
    deleteWorkspaceNode,
    formatWorkspaceNode,
    getWorkspaceOwner,
    MAX_FILES_PER_WORKSPACE,
    MAX_FOLDERS_PER_WORKSPACE,
    MAX_WORKSPACE_SIZE_BYTES,
    BOILERPLATES
};
