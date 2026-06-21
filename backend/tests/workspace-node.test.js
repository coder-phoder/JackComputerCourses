const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Workspace = require('../models/workspace.model');
const WorkspaceNode = require('../models/workspaceNode.model');
const {
    MAX_FILE_SIZE_BYTES,
    getLanguageFromFileName
} = require('../models/workspaceNode.model');
const {
    buildWorkspaceZipEntries,
    buildZipArchive,
    formatWorkspaceNode,
    buildImportPlan,
    getUniqueCopyName,
    buildNodeTreeIndexes,
    getRootSelectionNodes,
    getNodeCopyTraversal
} = require('../controllers/workspace.controller');

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

test('buildZipArchive creates a zip buffer for workspace files and folders', () => {
    const folderId = new mongoose.Types.ObjectId();
    const fileId = new mongoose.Types.ObjectId();
    const now = new Date('2026-06-19T10:00:00.000Z');
    const workspace = {
        _id: workspaceId,
        name: 'python',
        updatedAt: now
    };
    const nodes = [
        {
            _id: folderId,
            type: 'folder',
            name: 'src',
            parentId: null,
            updatedAt: now
        },
        {
            _id: fileId,
            type: 'file',
            name: 'abc.py',
            parentId: folderId,
            content: 'print("hello world")\n',
            updatedAt: now
        }
    ];

    const entries = buildWorkspaceZipEntries(workspace, nodes);
    const zipBuffer = buildZipArchive(entries);

    assert.equal(Buffer.isBuffer(zipBuffer), true);
    assert.equal(zipBuffer.readUInt32LE(0), 0x04034b50);
    assert.equal(zipBuffer.includes(Buffer.from('python/src/abc.py')), true);
});

test('buildImportPlan creates parent folders and counts supported files', () => {
    const plan = buildImportPlan([
        {
            type: 'file',
            path: 'src/main.py',
            content: 'print("hello")\n'
        },
        {
            type: 'folder',
            path: 'src/lib'
        },
        {
            type: 'file',
            path: 'src/lib/app.js',
            content: 'console.log("hello")\n'
        }
    ]);

    assert.equal(plan.error, undefined);
    assert.deepEqual(plan.folderItems.map((folder) => folder.path), ['src', 'src/lib']);
    assert.deepEqual(plan.fileItems.map((file) => file.path), ['src/lib/app.js', 'src/main.py']);
    assert.equal(plan.totalFileSize, Buffer.byteLength('print("hello")\nconsole.log("hello")\n', 'utf8'));
});

test('buildImportPlan rejects unsafe paths and unsupported files', () => {
    assert.match(
        buildImportPlan([{ type: 'file', path: '../main.py', content: '' }]).error,
        /unsafe path/u
    );
    assert.match(
        buildImportPlan([{ type: 'file', path: 'notes.txt', content: 'plain text' }]).error,
        /Only \.c/u
    );
});

test('workspace copy helpers skip selected descendants and preserve traversal order', () => {
    const folderId = new mongoose.Types.ObjectId();
    const childFolderId = new mongoose.Types.ObjectId();
    const fileId = new mongoose.Types.ObjectId();
    const nestedFileId = new mongoose.Types.ObjectId();
    const nodes = [
        {
            _id: folderId,
            type: 'folder',
            name: 'src',
            parentId: null
        },
        {
            _id: childFolderId,
            type: 'folder',
            name: 'lib',
            parentId: folderId
        },
        {
            _id: fileId,
            type: 'file',
            name: 'main.py',
            parentId: folderId
        },
        {
            _id: nestedFileId,
            type: 'file',
            name: 'util.js',
            parentId: childFolderId
        }
    ];
    const { nodeById, childrenByParentId } = buildNodeTreeIndexes(nodes);
    const rootNodes = getRootSelectionNodes(
        [String(folderId), String(fileId), String(nestedFileId)],
        nodeById
    );
    const traversal = getNodeCopyTraversal(rootNodes, childrenByParentId);

    assert.deepEqual(rootNodes.map((node) => String(node._id)), [String(folderId)]);
    assert.deepEqual(
        traversal.map((node) => node.name),
        ['src', 'lib', 'util.js', 'main.py']
    );
});

test('getUniqueCopyName preserves file extensions and reserved names', () => {
    const reservedNames = new Set(['main.py', 'main copy.py', 'src']);

    assert.equal(getUniqueCopyName('main.py', reservedNames), 'main copy 2.py');
    assert.equal(getUniqueCopyName('src', reservedNames), 'src copy');
    assert.equal(getUniqueCopyName('Main.py', reservedNames), 'Main copy 3.py');
    assert.equal(getUniqueCopyName(`${'a'.repeat(118)}.js`).length, 120);
});
