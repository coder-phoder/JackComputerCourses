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
    updateWorkspaceNode,
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
router.patch('/workspaces/:workspaceId/nodes/:nodeId', updateWorkspaceNode);
router.delete('/workspaces/:workspaceId/nodes/:nodeId', deleteWorkspaceNode);

module.exports = router;
