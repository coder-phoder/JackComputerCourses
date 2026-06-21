const crypto = require('crypto');
const mongoose = require('mongoose');
const Faculty = require('../models/faculty.model');
const IdeShare = require('../models/ideShare.model');
const User = require('../models/user.model');
const Workspace = require('../models/workspace.model');
const WorkspaceNode = require('../models/workspaceNode.model');

const sendError = (res, statusCode, message) => res.status(statusCode).json({
    success: false,
    message,
    data: {}
});

const getShareOwner = (req) => {
    if (req.user?._id) {
        return {
            ownerRole: 'user',
            ownerId: req.user._id,
            name: req.user.name || '',
            phone: req.user.phone || ''
        };
    }

    if (req.faculty?._id) {
        return {
            ownerRole: 'faculty',
            ownerId: req.faculty._id,
            name: req.faculty.name || '',
            phone: req.faculty.phone || ''
        };
    }

    return null;
};

const isValidObjectId = (id) => (
    mongoose.Types.ObjectId.isValid(String(id || ''))
    && new mongoose.Types.ObjectId(id).toString() === String(id)
);

const formatContact = (contact, role) => ({
    _id: contact._id.toString(),
    name: contact.name || '',
    phone: contact.phone || '',
    role
});

const formatSharedNode = (node) => ({
    originalNodeId: node._id,
    type: node.type,
    name: node.name,
    parentId: node.parentId || null,
    language: node.language || null,
    content: node.type === 'file' ? node.content || '' : '',
    size: node.size || 0
});

const formatShareSummary = (share) => ({
    _id: share._id.toString(),
    token: share.token,
    linkPath: `/shared-ide/${share.token}`,
    createdByRole: share.createdByRole,
    createdByName: share.createdByName || '',
    createdByPhone: share.createdByPhone || '',
    recipients: (share.recipients || []).map((recipient) => ({
        role: recipient.role,
        _id: recipient.recipientId.toString(),
        name: recipient.name || '',
        phone: recipient.phone || ''
    })),
    counts: {
        workspaces: share.payload?.workspaces?.length || 0,
        folders: share.payload?.folders?.length || 0,
        files: share.payload?.files?.length || 0
    },
    createdAt: share.createdAt
});

const formatShareDetail = (share) => ({
    ...formatShareSummary(share),
    payload: {
        workspaces: (share.payload?.workspaces || []).map((workspace) => ({
            originalWorkspaceId: workspace.originalWorkspaceId.toString(),
            name: workspace.name,
            nodes: (workspace.nodes || []).map((node) => ({
                originalNodeId: node.originalNodeId.toString(),
                type: node.type,
                name: node.name,
                parentId: node.parentId ? node.parentId.toString() : null,
                language: node.language || null,
                content: node.type === 'file' ? node.content || '' : '',
                size: node.size || 0
            }))
        })),
        folders: (share.payload?.folders || []).map((folder) => ({
            originalNodeId: folder.originalNodeId.toString(),
            workspaceId: folder.workspaceId.toString(),
            workspaceName: folder.workspaceName,
            name: folder.name,
            nodes: (folder.nodes || []).map((node) => ({
                originalNodeId: node.originalNodeId.toString(),
                type: node.type,
                name: node.name,
                parentId: node.parentId ? node.parentId.toString() : null,
                language: node.language || null,
                content: node.type === 'file' ? node.content || '' : '',
                size: node.size || 0
            }))
        })),
        files: (share.payload?.files || []).map((file) => ({
            originalNodeId: file.originalNodeId.toString(),
            workspaceId: file.workspaceId.toString(),
            workspaceName: file.workspaceName,
            name: file.name,
            language: file.language || null,
            content: file.content || '',
            size: file.size || 0
        }))
    }
});

const createToken = () => crypto.randomBytes(24).toString('base64url');

const getOwnerQuery = (owner) => ({
    ownerRole: owner.ownerRole,
    ownerId: owner.ownerId
});

const getWorkspaceNodeQuery = (owner, workspaceId) => ({
    ...getOwnerQuery(owner),
    workspaceId
});

const sortNodes = (nodes) => nodes.slice().sort((first, second) => {
    if (first.type !== second.type) {
        return first.type === 'folder' ? -1 : 1;
    }

    return String(first.name).localeCompare(String(second.name));
});

const getDescendantNodeIds = (rootNodeId, nodes) => {
    const descendants = [];
    const queue = [String(rootNodeId)];

    while (queue.length) {
        const parentId = queue.shift();

        nodes.forEach((node) => {
            if (node.parentId && String(node.parentId) === parentId) {
                const nodeId = String(node._id);
                descendants.push(nodeId);
                queue.push(nodeId);
            }
        });
    }

    return descendants;
};

const isNodeCoveredByFolder = (node, selectedFolderIds, nodesById) => {
    let parentId = node.parentId ? String(node.parentId) : '';

    while (parentId) {
        if (selectedFolderIds.has(parentId)) {
            return true;
        }

        const parentNode = nodesById.get(parentId);
        parentId = parentNode?.parentId ? String(parentNode.parentId) : '';
    }

    return false;
};

const normalizeSelections = (rawSelections) => {
    if (!Array.isArray(rawSelections)) {
        return [];
    }

    const seen = new Set();
    const normalizedSelections = [];

    rawSelections.forEach((selection) => {
        const type = String(selection?.type || '').trim();
        const workspaceId = String(selection?.workspaceId || '').trim();
        const nodeId = String(selection?.nodeId || '').trim();

        if (!['workspace', 'folder', 'file'].includes(type) || !isValidObjectId(workspaceId)) {
            return;
        }

        if (type !== 'workspace' && !isValidObjectId(nodeId)) {
            return;
        }

        const key = type === 'workspace'
            ? `${type}:${workspaceId}`
            : `${type}:${workspaceId}:${nodeId}`;

        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        normalizedSelections.push({
            type,
            workspaceId,
            nodeId: type === 'workspace' ? null : nodeId
        });
    });

    return normalizedSelections;
};

const buildSharePayload = async (owner, selections) => {
    const workspaceIds = [...new Set(selections.map((selection) => selection.workspaceId))];
    const workspaces = await Workspace.find({
        ...getOwnerQuery(owner),
        _id: { $in: workspaceIds }
    });
    const workspaceById = new Map(workspaces.map((workspace) => [workspace._id.toString(), workspace]));

    if (workspaceById.size !== workspaceIds.length) {
        return { error: 'One or more selected workspaces were not found' };
    }

    const nodesByWorkspaceId = new Map();

    for (const workspaceId of workspaceIds) {
        const nodes = await WorkspaceNode.find(getWorkspaceNodeQuery(owner, workspaceId));
        nodesByWorkspaceId.set(workspaceId, nodes);
    }

    const selectedWorkspaceIds = new Set(
        selections
            .filter((selection) => selection.type === 'workspace')
            .map((selection) => selection.workspaceId)
    );
    const selectedFolderKeys = new Set();
    const selectedFileKeys = new Set();
    const payload = {
        workspaces: [],
        folders: [],
        files: []
    };

    for (const workspaceId of selectedWorkspaceIds) {
        const workspace = workspaceById.get(workspaceId);
        const nodes = nodesByWorkspaceId.get(workspaceId) || [];

        payload.workspaces.push({
            originalWorkspaceId: workspace._id,
            name: workspace.name,
            nodes: sortNodes(nodes).map(formatSharedNode)
        });
    }

    for (const selection of selections) {
        if (selection.type === 'folder') {
            selectedFolderKeys.add(`${selection.workspaceId}:${selection.nodeId}`);
        }

        if (selection.type === 'file') {
            selectedFileKeys.add(`${selection.workspaceId}:${selection.nodeId}`);
        }
    }

    for (const selection of selections) {
        if (selection.type !== 'folder' || selectedWorkspaceIds.has(selection.workspaceId)) {
            continue;
        }

        const workspace = workspaceById.get(selection.workspaceId);
        const nodes = nodesByWorkspaceId.get(selection.workspaceId) || [];
        const nodesById = new Map(nodes.map((node) => [String(node._id), node]));
        const folder = nodesById.get(selection.nodeId);

        if (!folder || folder.type !== 'folder') {
            return { error: 'One or more selected folders were not found' };
        }

        if (isNodeCoveredByFolder(folder, new Set([...selectedFolderKeys].map((key) => key.split(':')[1])), nodesById)) {
            continue;
        }

        const descendantIds = new Set(getDescendantNodeIds(folder._id, nodes));
        const folderNodes = sortNodes(nodes.filter((node) => (
            String(node._id) === String(folder._id) || descendantIds.has(String(node._id))
        ))).map((node) => {
            const nextNode = formatSharedNode(node);

            if (String(node._id) === String(folder._id)) {
                nextNode.parentId = null;
            }

            return nextNode;
        });

        payload.folders.push({
            originalNodeId: folder._id,
            workspaceId: workspace._id,
            workspaceName: workspace.name,
            name: folder.name,
            nodes: folderNodes
        });
    }

    for (const selection of selections) {
        if (selection.type !== 'file' || selectedWorkspaceIds.has(selection.workspaceId)) {
            continue;
        }

        const workspace = workspaceById.get(selection.workspaceId);
        const nodes = nodesByWorkspaceId.get(selection.workspaceId) || [];
        const nodesById = new Map(nodes.map((node) => [String(node._id), node]));
        const folderIds = new Set(
            [...selectedFolderKeys]
                .filter((key) => key.startsWith(`${selection.workspaceId}:`))
                .map((key) => key.split(':')[1])
        );
        const file = nodesById.get(selection.nodeId);

        if (!file || file.type !== 'file') {
            return { error: 'One or more selected files were not found' };
        }

        if (selectedFileKeys.has(`${selection.workspaceId}:${selection.nodeId}`) && isNodeCoveredByFolder(file, folderIds, nodesById)) {
            continue;
        }

        payload.files.push({
            originalNodeId: file._id,
            workspaceId: workspace._id,
            workspaceName: workspace.name,
            name: file.name,
            language: file.language || null,
            content: file.content || '',
            size: file.size || 0
        });
    }

    if (!payload.workspaces.length && !payload.folders.length && !payload.files.length) {
        return { error: 'Select at least one workspace, folder or file' };
    }

    return { payload };
};

const getValidatedRecipients = async (owner, body) => {
    const recipientIds = Array.isArray(body?.recipientIds)
        ? body.recipientIds.map((id) => String(id || '').trim()).filter(Boolean)
        : [];
    const recipientRole = String(body?.recipientRole || '').trim();

    if (!recipientIds.length && !recipientRole) {
        return { recipients: [] };
    }

    if (!recipientIds.length || !['user', 'faculty'].includes(recipientRole)) {
        return { error: 'Select recipients before direct sharing' };
    }

    if (recipientIds.some((id) => !isValidObjectId(id))) {
        return { error: 'One or more selected recipients are invalid' };
    }

    if (owner.ownerRole === 'user' && (recipientRole !== 'faculty' || recipientIds.length !== 1)) {
        return { error: 'Users can share directly with one faculty only' };
    }

    if (owner.ownerRole === 'faculty' && recipientRole !== 'user') {
        return { error: 'Faculty can share directly with users only' };
    }

    const uniqueRecipientIds = [...new Set(recipientIds)];
    const Model = recipientRole === 'faculty' ? Faculty : User;
    const contacts = await Model.find({ _id: { $in: uniqueRecipientIds } }).select('name phone');

    if (contacts.length !== uniqueRecipientIds.length) {
        return { error: 'One or more selected recipients were not found' };
    }

    return {
        recipients: contacts.map((contact) => ({
            role: recipientRole,
            recipientId: contact._id,
            name: contact.name || '',
            phone: contact.phone || ''
        }))
    };
};

const getShareContacts = async (req, res) => {
    try {
        const owner = getShareOwner(req);

        if (!owner) {
            return sendError(res, 401, 'IDE share authentication is required');
        }

        if (owner.ownerRole === 'user') {
            const faculties = await Faculty.find({}).select('name phone').sort({ name: 1, phone: 1 });

            return res.status(200).json({
                success: true,
                message: 'Faculty contacts fetched successfully',
                data: { contacts: faculties.map((faculty) => formatContact(faculty, 'faculty')) }
            });
        }

        const users = await User.find({}).select('name phone').sort({ name: 1, phone: 1 });

        return res.status(200).json({
            success: true,
            message: 'User contacts fetched successfully',
            data: { contacts: users.map((user) => formatContact(user, 'user')) }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching share contacts');
    }
};

const createIDEShare = async (req, res) => {
    try {
        const owner = getShareOwner(req);

        if (!owner) {
            return sendError(res, 401, 'IDE share authentication is required');
        }

        const selections = normalizeSelections(req.body?.selections);

        if (!selections.length) {
            return sendError(res, 400, 'Select at least one workspace, folder or file');
        }

        const payloadResult = await buildSharePayload(owner, selections);

        if (payloadResult.error) {
            return sendError(res, 400, payloadResult.error);
        }

        const recipientResult = await getValidatedRecipients(owner, req.body);

        if (recipientResult.error) {
            return sendError(res, 400, recipientResult.error);
        }

        const share = await IdeShare.create({
            token: createToken(),
            createdByRole: owner.ownerRole,
            createdBy: owner.ownerId,
            createdByName: owner.name,
            createdByPhone: owner.phone,
            recipients: recipientResult.recipients,
            payload: payloadResult.payload
        });

        return res.status(201).json({
            success: true,
            message: recipientResult.recipients.length
                ? 'IDE share link created and sent successfully'
                : 'IDE share link created successfully',
            data: { share: formatShareSummary(share) }
        });
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 409, 'Share token collision. Please try again');
        }

        return sendError(res, 500, 'Something went wrong while creating IDE share');
    }
};

const getCreatedIDEShares = async (req, res) => {
    try {
        const owner = getShareOwner(req);

        if (!owner) {
            return sendError(res, 401, 'IDE share authentication is required');
        }

        const shares = await IdeShare.find({
            createdByRole: owner.ownerRole,
            createdBy: owner.ownerId
        }).sort({ createdAt: -1 }).limit(30);

        return res.status(200).json({
            success: true,
            message: 'Created IDE shares fetched successfully',
            data: { shares: shares.map(formatShareSummary) }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching created IDE shares');
    }
};

const getReceivedIDEShares = async (req, res) => {
    try {
        const owner = getShareOwner(req);

        if (!owner) {
            return sendError(res, 401, 'IDE share authentication is required');
        }

        const shares = await IdeShare.find({
            recipients: {
                $elemMatch: {
                    role: owner.ownerRole,
                    recipientId: owner.ownerId
                }
            }
        }).sort({ createdAt: -1 }).limit(50);

        return res.status(200).json({
            success: true,
            message: 'Received IDE shares fetched successfully',
            data: { shares: shares.map(formatShareSummary) }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching received IDE shares');
    }
};

const getIDEShareByToken = async (req, res) => {
    try {
        const token = String(req.params?.token || '').trim();

        if (!token) {
            return sendError(res, 400, 'Share token is required');
        }

        const share = await IdeShare.findOne({ token });

        if (!share) {
            return sendError(res, 404, 'IDE share link not found');
        }

        return res.status(200).json({
            success: true,
            message: 'IDE share fetched successfully',
            data: { share: formatShareDetail(share) }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching IDE share');
    }
};

module.exports = {
    getShareContacts,
    createIDEShare,
    getCreatedIDEShares,
    getReceivedIDEShares,
    getIDEShareByToken
};
