const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const IdeShare = require('../models/ideShare.model');
const { deriveSelectionsFromPayload } = require('../controllers/ideShare.controller');

test('IDE share stores source selections for live links', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const workspaceId = new mongoose.Types.ObjectId();
    const nodeId = new mongoose.Types.ObjectId();
    const share = new IdeShare({
        token: 'live-token',
        createdByRole: 'user',
        createdBy: ownerId,
        sourceSelections: [
            {
                type: 'file',
                workspaceId,
                nodeId
            }
        ],
        payload: {
            files: [{
                originalNodeId: nodeId,
                workspaceId,
                workspaceName: 'demo',
                name: 'main.py',
                language: 'python',
                content: 'print("hello")\n',
                size: 15
            }]
        }
    });

    await assert.doesNotReject(() => share.validate());
    assert.equal(share.sourceSelections[0].type, 'file');
    assert.equal(share.sourceSelections[0].workspaceId.toString(), workspaceId.toString());
    assert.equal(share.sourceSelections[0].nodeId.toString(), nodeId.toString());
});

test('deriveSelectionsFromPayload rebuilds live source selections for old shares', () => {
    const workspaceId = new mongoose.Types.ObjectId();
    const folderId = new mongoose.Types.ObjectId();
    const fileId = new mongoose.Types.ObjectId();
    const selections = deriveSelectionsFromPayload({
        workspaces: [{
            originalWorkspaceId: workspaceId,
            name: 'demo',
            nodes: []
        }],
        folders: [{
            originalNodeId: folderId,
            workspaceId,
            workspaceName: 'demo',
            name: 'src',
            nodes: []
        }],
        files: [{
            originalNodeId: fileId,
            workspaceId,
            workspaceName: 'demo',
            name: 'main.py',
            language: 'python',
            content: '',
            size: 0
        }]
    });

    assert.deepEqual(selections, [
        {
            type: 'workspace',
            workspaceId: workspaceId.toString(),
            nodeId: null
        },
        {
            type: 'folder',
            workspaceId: workspaceId.toString(),
            nodeId: folderId.toString()
        },
        {
            type: 'file',
            workspaceId: workspaceId.toString(),
            nodeId: fileId.toString()
        }
    ]);
});
