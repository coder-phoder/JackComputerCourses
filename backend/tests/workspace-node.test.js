const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Workspace = require('../models/workspace.model');
const WorkspaceNode = require('../models/workspaceNode.model');
const {
    MAX_FILE_SIZE_BYTES,
    getLanguageFromFileName
} = require('../models/workspaceNode.model');
const { formatWorkspaceNode } = require('../controllers/workspace.controller');

const ownerId = new mongoose.Types.ObjectId();
const workspaceId = new mongoose.Types.ObjectId();

test('workspace model requires owner and name', () => {
    const workspace = new Workspace({});
    const error = workspace.validateSync();

    assert.ok(error.errors.ownerRole);
    assert.ok(error.errors.ownerId);
    assert.ok(error.errors.name);
});

test('workspace model trims and validates names', () => {
    const workspace = new Workspace({
        ownerRole: 'user',
        ownerId,
        name: ' demo '
    });

    assert.equal(workspace.validateSync(), undefined);
    assert.equal(workspace.name, 'demo');

    const invalidWorkspace = new Workspace({
        ownerRole: 'faculty',
        ownerId,
        name: 'bad/name'
    });

    assert.ok(invalidWorkspace.validateSync().errors.name);
});

test('workspace node requires owner, workspace, type and name', () => {
    const node = new WorkspaceNode({});
    const error = node.validateSync();

    assert.ok(error.errors.ownerRole);
    assert.ok(error.errors.ownerId);
    assert.ok(error.errors.workspaceId);
    assert.ok(error.errors.type);
    assert.ok(error.errors.name);
});

test('workspace file infers supported language and tracks utf8 size', async () => {
    const node = new WorkspaceNode({
        ownerRole: 'user',
        ownerId,
        workspaceId,
        type: 'file',
        name: 'main.py',
        content: 'print("नमस्ते")\n'
    });

    await assert.doesNotReject(() => node.validate());
    assert.equal(node.language, 'python');
    assert.equal(node.size, Buffer.byteLength(node.content, 'utf8'));
});

test('workspace file rejects unsupported extensions', async () => {
    const node = new WorkspaceNode({
        ownerRole: 'faculty',
        ownerId,
        workspaceId,
        type: 'file',
        name: 'notes.txt',
        content: 'plain text'
    });
    await assert.rejects(() => node.validate(), /Unsupported or mismatched file language/);
    assert.equal(getLanguageFromFileName('notes.txt'), '');
});

test('workspace file rejects content above per-file quota', async () => {
    const node = new WorkspaceNode({
        ownerRole: 'user',
        ownerId,
        workspaceId,
        type: 'file',
        name: 'large.js',
        content: 'a'.repeat(MAX_FILE_SIZE_BYTES + 1)
    });
    await assert.rejects(() => node.validate(), /Path `size`/);
});

test('workspace folder clears file-only fields', async () => {
    const node = new WorkspaceNode({
        ownerRole: 'faculty',
        ownerId,
        workspaceId,
        type: 'folder',
        name: 'Assignments',
        language: 'python',
        content: 'print("ignored")',
        size: 15
    });

    await assert.doesNotReject(() => node.validate());
    assert.equal(node.language, null);
    assert.equal(node.content, '');
    assert.equal(node.size, 0);
});

test('formatWorkspaceNode returns safe flat workspace data', async () => {
    const parentId = new mongoose.Types.ObjectId();
    const node = new WorkspaceNode({
        ownerRole: 'user',
        ownerId,
        workspaceId,
        type: 'file',
        name: 'main.cpp',
        parentId,
        content: 'int main() { return 0; }\n'
    });

    await assert.doesNotReject(() => node.validate());

    const data = formatWorkspaceNode(node);

    assert.equal(data._id, node._id.toString());
    assert.equal(data.workspaceId, workspaceId.toString());
    assert.equal(data.parentId, parentId.toString());
    assert.equal(data.language, 'cpp');
    assert.equal(data.content, node.content);
    assert.equal(data.size, node.size);
});
