const express = require('express');
const {
    getWorkspaceNodes,
    createWorkspaceNode,
    updateWorkspaceNode,
    deleteWorkspaceNode
} = require('../controllers/workspace.controller');

const router = express.Router();

router.get('/nodes', getWorkspaceNodes);
router.post('/nodes', createWorkspaceNode);
router.patch('/nodes/:nodeId', updateWorkspaceNode);
router.delete('/nodes/:nodeId', deleteWorkspaceNode);

module.exports = router;
