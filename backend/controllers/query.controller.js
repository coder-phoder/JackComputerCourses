const mongoose = require('mongoose');
const Faculty = require('../models/faculty.model');
const Query = require('../models/query.model');
const Workspace = require('../models/workspace.model');
const WorkspaceNode = require('../models/workspaceNode.model');
const { MAX_FILE_SIZE_BYTES } = require('../models/workspaceNode.model');

const sendError = (res, statusCode, message) => res.status(statusCode).json({
    success: false,
    message,
    data: {}
});

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''));

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getContentSize = (content) => Buffer.byteLength(String(content || ''), 'utf8');

const formatQuery = (query) => ({
    _id: query._id.toString(),
    userId: query.userId.toString(),
    userName: query.userName,
    userPhone: query.userPhone,
    facultyId: query.facultyId.toString(),
    facultyName: query.facultyName,
    facultyPhone: query.facultyPhone,
    workspaceId: query.workspaceId.toString(),
    workspaceName: query.workspaceName,
    fileId: query.fileId.toString(),
    fileName: query.fileName,
    fileLanguage: query.fileLanguage,
    originalContent: query.originalContent || '',
    reviewedContent: query.reviewedContent || '',
    message: query.message,
    status: query.status,
    facultyResponse: query.facultyResponse || '',
    acceptedAt: query.acceptedAt,
    declinedAt: query.declinedAt,
    reviewedAt: query.reviewedAt,
    userDecisionAt: query.userDecisionAt,
    createdAt: query.createdAt,
    updatedAt: query.updatedAt
});

const formatFaculty = (faculty) => ({
    _id: faculty._id.toString(),
    name: faculty.name,
    phone: faculty.phone
});

const formatCodeFile = (node, workspace) => ({
    _id: node._id.toString(),
    workspaceId: node.workspaceId.toString(),
    workspaceName: workspace?.name || '',
    name: node.name,
    language: node.language,
    updatedAt: node.updatedAt
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

const getUserCodeFile = async (userId, fileId) => {
    if (!isValidObjectId(fileId)) {
        return null;
    }

    const node = await WorkspaceNode.findOne({
        _id: fileId,
        ownerRole: 'user',
        ownerId: userId,
        type: 'file'
    });

    if (!node) {
        return null;
    }

    const workspace = await Workspace.findOne({
        _id: node.workspaceId,
        ownerRole: 'user',
        ownerId: userId
    });

    if (!workspace) {
        return null;
    }

    return { node, workspace };
};

const getFacultyById = async (facultyId) => {
    if (!isValidObjectId(facultyId)) {
        return null;
    }

    return Faculty.findById(facultyId).select('name phone');
};

const getUserQueries = async (req, res) => {
    try {
        const queries = await Query.find({ userId: req.user._id }).sort({ updatedAt: -1, createdAt: -1 });
        const actionRequiredCount = queries.filter((query) => query.status === 'changes_submitted').length;

        return res.status(200).json({
            success: true,
            message: 'Queries fetched successfully',
            data: {
                queries: queries.map(formatQuery),
                actionRequiredCount
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching queries');
    }
};

const searchUserCodeFiles = async (req, res) => {
    try {
        const search = String(req.query?.search || '').trim();
        const query = {
            ownerRole: 'user',
            ownerId: req.user._id,
            type: 'file'
        };

        if (search) {
            query.name = { $regex: escapeRegex(search), $options: 'i' };
        }

        const files = await WorkspaceNode.find(query)
            .sort({ updatedAt: -1, name: 1 })
            .limit(25);
        const workspaceIds = [...new Set(files.map((file) => file.workspaceId.toString()))];
        const workspaces = await Workspace.find({
            ownerRole: 'user',
            ownerId: req.user._id,
            _id: { $in: workspaceIds }
        });
        const workspaceById = new Map(workspaces.map((workspace) => [workspace._id.toString(), workspace]));

        return res.status(200).json({
            success: true,
            message: 'Code files fetched successfully',
            data: {
                files: files.map((file) => formatCodeFile(file, workspaceById.get(file.workspaceId.toString())))
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while searching code files');
    }
};

const searchFacultiesForQuery = async (req, res) => {
    try {
        const search = String(req.query?.search || '').trim();
        const query = {};

        if (search) {
            const regex = { $regex: escapeRegex(search), $options: 'i' };
            query.$or = [{ name: regex }, { phone: regex }];
        }

        const faculties = await Faculty.find(query).select('name phone').sort({ name: 1 }).limit(25);

        return res.status(200).json({
            success: true,
            message: 'Faculties fetched successfully',
            data: { faculties: faculties.map(formatFaculty) }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while searching faculties');
    }
};

const createQuery = async (req, res) => {
    try {
        const message = String(req.body?.message || '').trim();
        const faculty = await getFacultyById(req.body?.facultyId);
        const codeFile = await getUserCodeFile(req.user._id, req.body?.fileId);

        if (!message) {
            return sendError(res, 400, 'Query message is required');
        }

        if (!faculty) {
            return sendError(res, 404, 'Faculty not found');
        }

        if (!codeFile) {
            return sendError(res, 404, 'Code file not found');
        }

        const query = await Query.create({
            userId: req.user._id,
            userName: req.user.name,
            userPhone: req.user.phone,
            facultyId: faculty._id,
            facultyName: faculty.name,
            facultyPhone: faculty.phone,
            workspaceId: codeFile.workspace._id,
            workspaceName: codeFile.workspace.name,
            fileId: codeFile.node._id,
            fileName: codeFile.node.name,
            fileLanguage: codeFile.node.language,
            originalContent: codeFile.node.content || '',
            reviewedContent: codeFile.node.content || '',
            message
        });

        return res.status(201).json({
            success: true,
            message: 'Query created successfully',
            data: { query: formatQuery(query) }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return sendError(res, 400, error.message);
        }

        return sendError(res, 500, 'Something went wrong while creating query');
    }
};

const updateQuery = async (req, res) => {
    try {
        const { queryId } = req.params;

        if (!isValidObjectId(queryId)) {
            return sendError(res, 400, 'Invalid query id');
        }

        const query = await Query.findOne({ _id: queryId, userId: req.user._id });

        if (!query) {
            return sendError(res, 404, 'Query not found');
        }

        if (query.status !== 'pending') {
            return sendError(res, 400, 'Only pending queries can be updated');
        }

        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'message')) {
            const message = String(req.body.message || '').trim();

            if (!message) {
                return sendError(res, 400, 'Query message is required');
            }

            query.message = message;
        }

        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'facultyId')) {
            const faculty = await getFacultyById(req.body.facultyId);

            if (!faculty) {
                return sendError(res, 404, 'Faculty not found');
            }

            query.facultyId = faculty._id;
            query.facultyName = faculty.name;
            query.facultyPhone = faculty.phone;
        }

        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'fileId')) {
            const codeFile = await getUserCodeFile(req.user._id, req.body.fileId);

            if (!codeFile) {
                return sendError(res, 404, 'Code file not found');
            }

            query.workspaceId = codeFile.workspace._id;
            query.workspaceName = codeFile.workspace.name;
            query.fileId = codeFile.node._id;
            query.fileName = codeFile.node.name;
            query.fileLanguage = codeFile.node.language;
            query.originalContent = codeFile.node.content || '';
            query.reviewedContent = codeFile.node.content || '';
        }

        await query.save();

        return res.status(200).json({
            success: true,
            message: 'Query updated successfully',
            data: { query: formatQuery(query) }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return sendError(res, 400, error.message);
        }

        return sendError(res, 500, 'Something went wrong while updating query');
    }
};

const deleteQuery = async (req, res) => {
    try {
        const { queryId } = req.params;

        if (!isValidObjectId(queryId)) {
            return sendError(res, 400, 'Invalid query id');
        }

        const query = await Query.findOne({ _id: queryId, userId: req.user._id });

        if (!query) {
            return sendError(res, 404, 'Query not found');
        }

        if (!['pending', 'declined', 'changes_declined', 'changes_accepted'].includes(query.status)) {
            return sendError(res, 400, 'This query cannot be deleted right now');
        }

        await Query.deleteOne({ _id: query._id });

        return res.status(200).json({
            success: true,
            message: 'Query deleted successfully',
            data: { deletedQueryId: query._id.toString() }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while deleting query');
    }
};

const decideReviewedQuery = async (req, res) => {
    try {
        const { queryId } = req.params;
        const decision = String(req.body?.decision || '').trim();

        if (!isValidObjectId(queryId)) {
            return sendError(res, 400, 'Invalid query id');
        }

        if (!['accept', 'decline'].includes(decision)) {
            return sendError(res, 400, 'Decision must be accept or decline');
        }

        const query = await Query.findOne({ _id: queryId, userId: req.user._id });

        if (!query) {
            return sendError(res, 404, 'Query not found');
        }

        if (query.status !== 'changes_submitted') {
            return sendError(res, 400, 'Only faculty-submitted changes can be accepted or declined');
        }

        if (decision === 'decline') {
            query.status = 'changes_declined';
            query.userDecisionAt = new Date();
            await query.save();

            return res.status(200).json({
                success: true,
                message: 'Faculty changes declined successfully',
                data: { query: formatQuery(query) }
            });
        }

        const codeFile = await getUserCodeFile(req.user._id, query.fileId);

        if (!codeFile) {
            return sendError(res, 404, 'Original code file not found');
        }

        const nextContent = String(query.reviewedContent || '');

        if (getContentSize(nextContent) > MAX_FILE_SIZE_BYTES) {
            return sendError(res, 400, 'Reviewed file is too large');
        }

        codeFile.node.content = nextContent;
        await codeFile.node.save();

        query.status = 'changes_accepted';
        query.userDecisionAt = new Date();
        await query.save();

        return res.status(200).json({
            success: true,
            message: 'Faculty changes applied successfully',
            data: {
                query: formatQuery(query),
                node: formatWorkspaceNode(codeFile.node)
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return sendError(res, 400, error.message);
        }

        return sendError(res, 500, 'Something went wrong while saving the query decision');
    }
};

const getFacultyQueries = async (req, res) => {
    try {
        const queries = await Query.find({ facultyId: req.faculty._id }).sort({ updatedAt: -1, createdAt: -1 });
        const pendingCount = queries.filter((query) => query.status === 'pending').length;

        return res.status(200).json({
            success: true,
            message: 'Faculty queries fetched successfully',
            data: {
                queries: queries.map(formatQuery),
                pendingCount
            }
        });
    } catch (error) {
        return sendError(res, 500, 'Something went wrong while fetching faculty queries');
    }
};

const respondToFacultyQuery = async (req, res) => {
    try {
        const { queryId } = req.params;
        const action = String(req.body?.action || '').trim();
        const facultyResponse = String(req.body?.facultyResponse || '').trim();

        if (!isValidObjectId(queryId)) {
            return sendError(res, 400, 'Invalid query id');
        }

        if (!['accept', 'decline'].includes(action)) {
            return sendError(res, 400, 'Action must be accept or decline');
        }

        const query = await Query.findOne({ _id: queryId, facultyId: req.faculty._id });

        if (!query) {
            return sendError(res, 404, 'Query not found');
        }

        if (query.status !== 'pending') {
            return sendError(res, 400, 'Only pending queries can be accepted or declined');
        }

        query.facultyResponse = facultyResponse;

        if (action === 'accept') {
            query.status = 'accepted';
            query.acceptedAt = new Date();
        } else {
            query.status = 'declined';
            query.declinedAt = new Date();
        }

        await query.save();

        return res.status(200).json({
            success: true,
            message: action === 'accept' ? 'Query accepted successfully' : 'Query declined successfully',
            data: { query: formatQuery(query) }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return sendError(res, 400, error.message);
        }

        return sendError(res, 500, 'Something went wrong while responding to query');
    }
};

const closeFacultyQuery = async (req, res) => {
    try {
        const { queryId } = req.params;
        const reviewedContent = String(req.body?.reviewedContent || '');
        const facultyResponse = String(req.body?.facultyResponse || '').trim();

        if (!isValidObjectId(queryId)) {
            return sendError(res, 400, 'Invalid query id');
        }

        if (getContentSize(reviewedContent) > MAX_FILE_SIZE_BYTES) {
            return sendError(res, 400, 'Reviewed file is too large');
        }

        const query = await Query.findOne({ _id: queryId, facultyId: req.faculty._id });

        if (!query) {
            return sendError(res, 404, 'Query not found');
        }

        if (query.status !== 'accepted') {
            return sendError(res, 400, 'Only accepted queries can be closed');
        }

        query.reviewedContent = reviewedContent;
        query.facultyResponse = facultyResponse || query.facultyResponse;
        query.status = 'changes_submitted';
        query.reviewedAt = new Date();
        await query.save();

        return res.status(200).json({
            success: true,
            message: 'Query closed and sent to user successfully',
            data: { query: formatQuery(query) }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return sendError(res, 400, error.message);
        }

        return sendError(res, 500, 'Something went wrong while closing query');
    }
};

module.exports = {
    getUserQueries,
    searchUserCodeFiles,
    searchFacultiesForQuery,
    createQuery,
    updateQuery,
    deleteQuery,
    decideReviewedQuery,
    getFacultyQueries,
    respondToFacultyQuery,
    closeFacultyQuery
};
