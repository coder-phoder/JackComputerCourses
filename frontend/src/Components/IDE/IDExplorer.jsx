import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  Copy,
  Download,
  FileCode,
  Files,
  Folder,
  FolderOpen,
  FolderPlus,
  Import,
  ListCollapse,
  MessageSquareCode,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Scissors,
  Trash2,
} from 'lucide-react'

const IDExplorer = ({
  activeActivity = 'explorer',
  activeNodeId,
  activeWorkspace,
  activeWorkspaceId,
  cancelNodeDraft,
  cancelWorkspaceDraft,
  canPasteToParent,
  childrenByParentId,
  clearNodeDragState,
  collapseWorkspaceFolders,
  clipboardMode = '',
  clipboardNodeCount = 0,
  copyWorkspaceNodesToClipboard,
  creatingParentId,
  cutWorkspaceNodes,
  deleteActiveWorkspace,
  deleteWorkspaceNode,
  dropTargetParentId = '',
  expandedFolders,
  explorerWidth,
  handleNodeDragOverParent,
  handleNodeDragStart,
  handleNodeDropOnParent,
  handleNodeDraftBlur,
  handleWorkspaceDraftBlur,
  isCollapsed,
  isDirty,
  isDraggingExplorer,
  isQueryEnabled = false,
  nodeActionId,
  nodeDraft,
  onNodeClick,
  onStartExplorerResize,
  openFile,
  openNodeActionMenuId,
  pasteWorkspaceNodesToParent,
  prepareNodeContextSelection,
  rootNodes,
  saveError,
  saving,
  selectedNodeIds = new Set(),
  setActiveWorkspaceId,
  setActiveActivity,
  setIsCollapsed,
  setNodeDraft,
  setOpenNodeActionMenuId,
  setShowWorkspaceActions,
  setWorkspaceDraft,
  showWorkspaceActions,
  startCreateWorkspace,
  startCreateWorkspaceNode,
  startRenameWorkspace,
  startRenameWorkspaceNode,
  submitNodeDraft,
  submitWorkspaceDraft,
  toggleFolder,
  workspaceDraft,
  workspaceError,
  workspaceLoading,
  queryNotificationCount = 0,
  workspaces,
  workspacesLoading,
}) => {
  const workspaceDraftInputRef = useRef(null)
  const nodeDraftInputRef = useRef(null)
  const [contextMenu, setContextMenu] = useState(null)

  useEffect(() => {
    if (!workspaceDraftInputRef.current) {
      return
    }

    workspaceDraftInputRef.current.focus()
    workspaceDraftInputRef.current.select()
  }, [workspaceDraft?.id])

  useEffect(() => {
    if (!nodeDraftInputRef.current) {
      return
    }

    nodeDraftInputRef.current.focus()
    nodeDraftInputRef.current.select()
  }, [nodeDraft?.id])

  useEffect(() => {
    if (!contextMenu) {
      return undefined
    }

    const closeCurrentContextMenu = () => setContextMenu(null)
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeCurrentContextMenu()
      }
    }

    window.addEventListener('resize', closeCurrentContextMenu)
    window.addEventListener('scroll', closeCurrentContextMenu, true)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', closeCurrentContextMenu)
      window.removeEventListener('scroll', closeCurrentContextMenu, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  const closeContextMenu = () => setContextMenu(null)

  const openNodeContextMenu = (node, event) => {
    if (nodeDraft) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    setOpenNodeActionMenuId('')

    const nodeIds = prepareNodeContextSelection?.(node) || [node._id]

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node,
      nodeIds,
      parentId: node.type === 'folder' ? node._id : null,
      kind: 'node',
    })
  }

  const openRootContextMenu = (event) => {
    if (nodeDraft) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    setOpenNodeActionMenuId('')

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node: null,
      nodeIds: [],
      parentId: null,
      kind: 'root',
    })
  }

  const handleContextAction = async (action) => {
    if (!contextMenu) {
      return
    }

    if (action === 'cut') {
      cutWorkspaceNodes?.(contextMenu.nodeIds)
      closeContextMenu()
      return
    }

    if (action === 'copy') {
      copyWorkspaceNodesToClipboard?.(contextMenu.nodeIds)
      closeContextMenu()
      return
    }

    if (action === 'paste') {
      await pasteWorkspaceNodesToParent?.(contextMenu.parentId)
      closeContextMenu()
      return
    }

    if (action === 'rename' && contextMenu.node) {
      startRenameWorkspaceNode(contextMenu.node)
      closeContextMenu()
      return
    }

    if (action === 'delete' && contextMenu.node) {
      deleteWorkspaceNode(contextMenu.node)
      closeContextMenu()
    }
  }

  const renderNodeDraft = (depth = 0) => {
    if (!nodeDraft || nodeDraft.mode !== 'create') {
      return null
    }

    const isFileDraft = nodeDraft.type === 'file'

    return (
      <div
        key={nodeDraft.id}
        className="flex h-8 items-center gap-1 bg-blue-50 pr-1 text-sm text-blue-700 dark:bg-blue-950/40 dark:text-blue-100"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center" />
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          {isFileDraft ? (
            <FileCode className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500" />
          )}
        </span>
        <input
          ref={nodeDraftInputRef}
          value={nodeDraft.value}
          onChange={(event) => {
            setNodeDraft((currentDraft) => (
              currentDraft ? { ...currentDraft, value: event.target.value } : currentDraft
            ))
          }}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onBlur={handleNodeDraftBlur}
          onKeyDown={(event) => {
            event.stopPropagation()

            if (event.key === 'Enter') {
              event.preventDefault()
              submitNodeDraft()
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              cancelNodeDraft()
            }
          }}
          disabled={Boolean(creatingParentId)}
          placeholder={isFileDraft ? 'File name' : 'Folder name'}
          className="h-6 min-w-0 flex-1 rounded border border-blue-500 bg-white px-1.5 text-sm font-medium text-slate-900 outline-none dark:bg-slate-900 dark:text-slate-100"
          autoComplete="off"
          spellCheck="false"
        />
      </div>
    )
  }

  const renderWorkspaceNode = (node, depth = 0) => {
    const isFolder = node.type === 'folder'
    const isExpanded = expandedFolders.has(node._id)
    const children = childrenByParentId.get(node._id) || []
    const isActive = activeNodeId === node._id
    const isSelected = selectedNodeIds.has(node._id)
    const isBusy = nodeActionId === node._id || creatingParentId === node._id
    const isRenaming = nodeDraft?.mode === 'rename' && nodeDraft.nodeId === node._id
    const isCreatingChild = nodeDraft?.mode === 'create' && nodeDraft.parentId === node._id
    const isNodeMenuOpen = openNodeActionMenuId === node._id
    const isDropTarget = isFolder && dropTargetParentId === node._id

    return (
      <div key={node._id}>
        <div
          role="button"
          tabIndex={0}
          draggable={!isRenaming && !nodeDraft && !saving && !workspaceLoading}
          onClick={(event) => {
            if (isRenaming) {
              return
            }

            closeContextMenu()
            onNodeClick?.(node, event)
          }}
          onContextMenu={(event) => openNodeContextMenu(node, event)}
          onDragStart={(event) => handleNodeDragStart?.(node, event)}
          onDragEnd={clearNodeDragState}
          onDragOver={(event) => {
            if (isFolder) {
              handleNodeDragOverParent?.(node._id, event)
            } else {
              event.stopPropagation()
            }
          }}
          onDrop={(event) => {
            if (isFolder) {
              handleNodeDropOnParent?.(node._id, event)
            } else {
              event.stopPropagation()
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              if (isRenaming) {
                return
              }
              if (isFolder) {
                toggleFolder(node._id)
              } else {
                openFile(node)
              }
            }
          }}
          className={`group flex h-8 items-center gap-1 pr-1 text-sm transition ${
            isActive
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
              : isDropTarget
                ? 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-600'
                : isSelected
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-400">
            {isFolder ? (
              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : null}
          </span>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            {isFolder ? (
              isExpanded ? <FolderOpen className="h-4 w-4 text-amber-500" /> : <Folder className="h-4 w-4 text-amber-500" />
            ) : (
              <FileCode className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            )}
          </span>
          {isRenaming ? (
            <input
              ref={nodeDraftInputRef}
              value={nodeDraft.value}
              onChange={(event) => {
                setNodeDraft((currentDraft) => (
                  currentDraft ? { ...currentDraft, value: event.target.value } : currentDraft
                ))
              }}
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onBlur={handleNodeDraftBlur}
              onKeyDown={(event) => {
                event.stopPropagation()

                if (event.key === 'Enter') {
                  event.preventDefault()
                  submitNodeDraft()
                }

                if (event.key === 'Escape') {
                  event.preventDefault()
                  cancelNodeDraft()
                }
              }}
              disabled={nodeActionId === node._id}
              className="h-6 min-w-0 flex-1 rounded border border-blue-500 bg-white px-1.5 text-sm font-medium text-slate-900 outline-none dark:bg-slate-900 dark:text-slate-100"
              autoComplete="off"
              spellCheck="false"
            />
          ) : (
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
          )}
          {isActive && isDirty ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved changes" />
          ) : null}
          {!isRenaming ? (
            <div className={`${isNodeMenuOpen ? 'flex' : 'hidden group-hover:flex'} relative shrink-0 items-center gap-0.5`}>
              {isFolder ? (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setOpenNodeActionMenuId('')
                      startCreateWorkspaceNode('file', node._id)
                    }}
                    disabled={isBusy || saving || Boolean(nodeDraft)}
                    title="New file"
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-40 dark:hover:bg-slate-700 dark:hover:text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setOpenNodeActionMenuId('')
                      startCreateWorkspaceNode('folder', node._id)
                    }}
                    disabled={isBusy || saving || Boolean(nodeDraft)}
                    title="New folder"
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-40 dark:hover:bg-slate-700 dark:hover:text-white"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setOpenNodeActionMenuId((currentId) => (currentId === node._id ? '' : node._id))
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    disabled={isBusy || saving || Boolean(nodeDraft)}
                    title="Folder actions"
                    aria-label="Folder actions"
                    aria-expanded={isNodeMenuOpen}
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-40 dark:hover:bg-slate-700 dark:hover:text-white"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                  {isNodeMenuOpen ? (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenNodeActionMenuId('')
                        }}
                      />
                      <div
                        className="absolute right-0 top-7 z-20 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                        onClick={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => startRenameWorkspaceNode(node)}
                          disabled={isBusy || saving || Boolean(nodeDraft)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-4 w-4" />
                          Rename folder
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteWorkspaceNode(node)}
                          disabled={isBusy || saving || Boolean(nodeDraft)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-40 dark:text-rose-300 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete folder
                        </button>
                      </div>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      startRenameWorkspaceNode(node)
                    }}
                    disabled={isBusy || saving || Boolean(nodeDraft)}
                    title="Rename"
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-40 dark:hover:bg-slate-700 dark:hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      deleteWorkspaceNode(node)
                    }}
                    disabled={isBusy || saving || Boolean(nodeDraft)}
                    title="Delete"
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-40 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
        {isFolder && isExpanded ? (
          <div>
            {isCreatingChild ? renderNodeDraft(depth + 1) : null}
            {children.length ? children.map((childNode) => renderWorkspaceNode(childNode, depth + 1)) : !isCreatingChild ? (
              <div
                className="flex h-8 items-center text-xs font-medium text-slate-400 dark:text-slate-500"
                style={{ paddingLeft: `${44 + depth * 14}px` }}
              >
                Empty folder
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  const renderContextMenu = () => {
    if (!contextMenu) {
      return null
    }

    const hasNodeSelection = contextMenu.kind === 'node' && contextMenu.nodeIds.length > 0
    const canPaste = Boolean(clipboardNodeCount) && canPasteToParent?.(contextMenu.parentId)
    const pasteLabel = contextMenu.parentId ? 'Paste into folder' : 'Paste in workspace'
    const clipboardLabel = clipboardNodeCount
      ? `${clipboardMode === 'cut' ? 'Move' : 'Copy'} ${clipboardNodeCount} item${clipboardNodeCount === 1 ? '' : 's'}`
      : ''

    return (
      <>
        <div
          className="fixed inset-0 z-30"
          onClick={closeContextMenu}
          onContextMenu={(event) => {
            event.preventDefault()
            closeContextMenu()
          }}
        />
        <div
          className="fixed z-40 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {hasNodeSelection ? (
            <>
              <button
                type="button"
                onClick={() => handleContextAction('cut')}
                disabled={saving || workspaceLoading}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Scissors className="h-4 w-4" />
                Cut
              </button>
              <button
                type="button"
                onClick={() => handleContextAction('copy')}
                disabled={saving || workspaceLoading}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => handleContextAction('paste')}
            disabled={!canPaste || saving || workspaceLoading}
            title={clipboardLabel || 'Nothing to paste'}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ClipboardPaste className="h-4 w-4" />
            {pasteLabel}
          </button>
          {contextMenu.node ? (
            <>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                type="button"
                onClick={() => handleContextAction('rename')}
                disabled={saving || workspaceLoading || Boolean(nodeDraft)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Pencil className="h-4 w-4" />
                Rename
              </button>
              <button
                type="button"
                onClick={() => handleContextAction('delete')}
                disabled={saving || workspaceLoading || Boolean(nodeDraft)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-40 dark:text-rose-300 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          ) : null}
        </div>
      </>
    )
  }

  return (
    <div className="flex min-h-0 shrink-0">
      {renderContextMenu()}
      <nav className="flex w-14 shrink-0 flex-col items-center border-r border-slate-200 bg-slate-100 py-2 dark:border-slate-800 dark:bg-slate-950">
        <button
          type="button"
          onClick={() => {
            setActiveActivity?.('explorer')
            setIsCollapsed(activeActivity === 'explorer' ? !isCollapsed : false)
          }}
          title={isCollapsed ? 'Open Explorer' : 'Close Explorer'}
          aria-label={isCollapsed ? 'Open Explorer' : 'Close Explorer'}
          aria-pressed={activeActivity === 'explorer' && !isCollapsed}
          className={`flex h-11 w-11 items-center justify-center border-l-2 transition ${
            activeActivity !== 'explorer' || isCollapsed
              ? 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200'
              : 'border-blue-500 bg-white text-slate-900 dark:bg-slate-900 dark:text-white'
          }`}
        >
          <Files className="h-6 w-6" />
        </button>
        {isQueryEnabled ? (
          <button
            type="button"
            onClick={() => setActiveActivity?.('query')}
            title="Queries"
            aria-label="Queries"
            aria-pressed={activeActivity === 'query'}
            className={`relative mt-1 flex h-11 w-11 items-center justify-center border-l-2 transition ${
              activeActivity === 'query'
                ? 'border-blue-500 bg-white text-slate-900 dark:bg-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquareCode className="h-6 w-6" />
            {queryNotificationCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">
                {queryNotificationCount > 9 ? '9+' : queryNotificationCount}
              </span>
            ) : null}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setActiveActivity?.('download')}
          title="Download workspace"
          aria-label="Download workspace"
          aria-pressed={activeActivity === 'download'}
          className={`mt-1 flex h-11 w-11 items-center justify-center border-l-2 transition ${
            activeActivity === 'download'
              ? 'border-blue-500 bg-white text-slate-900 dark:bg-slate-900 dark:text-white'
              : 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Download className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => setActiveActivity?.('importExport')}
          title="Import and export"
          aria-label="Import and export"
          aria-pressed={activeActivity === 'importExport'}
          className={`mt-1 flex h-11 w-11 items-center justify-center border-l-2 transition ${
            activeActivity === 'importExport'
              ? 'border-blue-500 bg-white text-slate-900 dark:bg-slate-900 dark:text-white'
              : 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Import className="h-6 w-6" />
        </button>
      </nav>

      {isCollapsed || activeActivity !== 'explorer' ? null : (
        <>
          <aside
            className="flex min-h-0 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
            style={{ width: `${explorerWidth}px` }}
          >
            <div className="flex h-11 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
              <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Explorer
              </p>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                title="Collapse Explorer"
                aria-label="Collapse Explorer"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-800">
              <label htmlFor="workspace-select" className="sr-only">Workspace</label>
              <div className="flex items-center gap-1.5">
                {workspaceDraft ? (
                  <form
                    className="min-w-0 flex-1"
                    onSubmit={(event) => {
                      event.preventDefault()
                      submitWorkspaceDraft()
                    }}
                  >
                    <input
                      ref={workspaceDraftInputRef}
                      value={workspaceDraft.value}
                      onChange={(event) => {
                        setWorkspaceDraft((currentDraft) => (
                          currentDraft ? { ...currentDraft, value: event.target.value } : currentDraft
                        ))
                      }}
                      onBlur={handleWorkspaceDraftBlur}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          cancelWorkspaceDraft()
                        }
                      }}
                      disabled={workspacesLoading}
                      placeholder={workspaceDraft.mode === 'create' ? 'Workspace name' : 'Rename workspace'}
                      className="w-full rounded-lg border border-blue-500 bg-white px-2 py-1.5 text-sm font-semibold text-slate-900 outline-none dark:bg-slate-900 dark:text-slate-100"
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </form>
                ) : (
                  <select
                    id="workspace-select"
                    value={activeWorkspaceId}
                    onChange={(event) => {
                      if (isDirty && !window.confirm('Switch workspace and discard unsaved changes?')) {
                        return
                      }
                      setActiveWorkspaceId(event.target.value)
                    }}
                    disabled={workspacesLoading || !workspaces.length || saving}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {workspaces.map((workspace) => (
                      <option key={workspace._id} value={workspace._id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={startCreateWorkspace}
                  disabled={workspacesLoading || saving || Boolean(workspaceDraft)}
                  title="New workspace"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={collapseWorkspaceFolders}
                  disabled={!expandedFolders.size || workspacesLoading || saving || Boolean(workspaceDraft)}
                  title="Collapse folders in Explorer"
                  aria-label="Collapse folders in Explorer"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <ListCollapse className="h-4 w-4" />
                </button>
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowWorkspaceActions((currentValue) => !currentValue)}
                    disabled={workspacesLoading || !activeWorkspace || saving || Boolean(workspaceDraft)}
                    title="Workspace actions"
                    aria-label="Workspace actions"
                    aria-expanded={showWorkspaceActions}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {showWorkspaceActions ? (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowWorkspaceActions(false)} />
                      <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={startRenameWorkspace}
                          disabled={workspacesLoading || !activeWorkspace || saving || Boolean(workspaceDraft)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-4 w-4" />
                          Rename workspace
                        </button>
                        <button
                          type="button"
                          onClick={deleteActiveWorkspace}
                          disabled={workspacesLoading || workspaces.length <= 1 || !activeWorkspace || saving || Boolean(workspaceDraft)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-40 dark:text-rose-300 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete workspace
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex h-11 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
              <p className="min-w-0 truncate text-sm font-bold text-slate-700 dark:text-slate-200">
                {activeWorkspace?.name || 'Workspace'}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startCreateWorkspaceNode('file')}
                  disabled={workspaceLoading || saving || Boolean(creatingParentId) || Boolean(nodeDraft)}
                  title="New file"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => startCreateWorkspaceNode('folder')}
                  disabled={workspaceLoading || saving || Boolean(creatingParentId) || Boolean(nodeDraft)}
                  title="New folder"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              className={`min-h-0 flex-1 overflow-y-auto py-2 ${
                dropTargetParentId === 'root' ? 'bg-emerald-50/70 dark:bg-emerald-950/20' : ''
              }`}
              onContextMenu={openRootContextMenu}
              onDragOver={(event) => handleNodeDragOverParent?.(null, event)}
              onDrop={(event) => handleNodeDropOnParent?.(null, event)}
              onDragLeave={(event) => {
                if (event.currentTarget === event.target) {
                  clearNodeDragState?.()
                }
              }}
            >
              {workspacesLoading || workspaceLoading ? (
                <div className="px-3 py-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Loading workspace...
                </div>
              ) : rootNodes.length || nodeDraft?.mode === 'create' ? (
                <>
                  {nodeDraft?.mode === 'create' && !nodeDraft.parentId ? renderNodeDraft(0) : null}
                  {rootNodes.map((node) => renderWorkspaceNode(node))}
                </>
              ) : (
                <div className="px-3 py-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No files yet</p>
                  <button
                    type="button"
                    onClick={() => startCreateWorkspaceNode('file')}
                    disabled={Boolean(creatingParentId) || Boolean(nodeDraft)}
                    className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:bg-slate-400"
                  >
                    New file
                  </button>
                </div>
              )}
            </div>

            {(workspaceError || saveError) ? (
              <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                {workspaceError || saveError}
              </div>
            ) : null}
          </aside>

          <div
            onMouseDown={onStartExplorerResize}
            className={`w-1 shrink-0 cursor-col-resize transition ${
              isDraggingExplorer ? 'bg-blue-600' : 'bg-slate-200 hover:bg-blue-500 dark:bg-slate-800'
            }`}
          />
        </>
      )}

      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          title="Open Explorer"
          aria-label="Open Explorer"
          className="sr-only"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

export default IDExplorer
