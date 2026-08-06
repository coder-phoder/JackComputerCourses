const express = require('express');
const {
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
    updateWorkspaceNodeTestCases,
    deleteWorkspaceNode
} = require('../controllers/workspace.controller');

const router = express.Router();

router.get('/workspaces', getWorkspaces);
router.post('/workspaces', createWorkspace);
router.patch('/workspaces/:workspaceId', updateWorkspace);
router.delete('/workspaces/:workspaceId', deleteWorkspace);
router.post('/workspaces/import', importWorkspace);
router.get('/workspaces/:workspaceId/download', downloadWorkspace);

router.get('/workspaces/:workspaceId/nodes', getWorkspaceNodes);
router.post('/workspaces/:workspaceId/nodes', createWorkspaceNode);
router.post('/workspaces/:workspaceId/nodes/copy', copyWorkspaceNodes);
router.post('/workspaces/:workspaceId/nodes/move', moveWorkspaceNodes);
router.patch('/workspaces/:workspaceId/nodes/:nodeId', updateWorkspaceNode);
router.patch('/workspaces/:workspaceId/nodes/:nodeId/testcases', updateWorkspaceNodeTestCases);
router.delete('/workspaces/:workspaceId/nodes/:nodeId', deleteWorkspaceNode);

module.exports = router;
