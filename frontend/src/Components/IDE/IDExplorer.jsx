import { useEffect, useRef } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileCode,
  Files,
  Folder,
  FolderOpen,
  FolderPlus,
  ListCollapse,
  MessageSquareCode,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'

const IDExplorer = ({
  activeActivity = 'explorer',
  activeNodeId,
  activeWorkspace,
  activeWorkspaceId,
  cancelNodeDraft,
  cancelWorkspaceDraft,
  childrenByParentId,
  collapseWorkspaceFolders,
  creatingParentId,
  deleteActiveWorkspace,
  deleteWorkspaceNode,
  downloadError,
  downloadingWorkspaceId,
  downloadWorkspace,
  downloadWorkspaceId,
  expandedFolders,
  explorerWidth,
  handleNodeDraftBlur,
  handleWorkspaceDraftBlur,
  isCollapsed,
  isDirty,
  isDraggingExplorer,
  isQueryEnabled = false,
  nodeActionId,
  nodeDraft,
  onStartExplorerResize,
  openFile,
  openNodeActionMenuId,
  rootNodes,
  saveError,
  saving,
  setActiveWorkspaceId,
  setActiveActivity,
  setDownloadWorkspaceId,
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
  const selectedDownloadWorkspaceId = downloadWorkspaceId || activeWorkspaceId
  const selectedDownloadWorkspace = workspaces.find((workspace) => workspace._id === selectedDownloadWorkspaceId) || null
  const isDownloadingWorkspace = Boolean(downloadingWorkspaceId)

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
    const isBusy = nodeActionId === node._id || creatingParentId === node._id
    const isRenaming = nodeDraft?.mode === 'rename' && nodeDraft.nodeId === node._id
    const isCreatingChild = nodeDraft?.mode === 'create' && nodeDraft.parentId === node._id
    const isNodeMenuOpen = openNodeActionMenuId === node._id

    return (
      <div key={node._id}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (isRenaming) {
              return
            }

            if (isFolder) {
              toggleFolder(node._id)
            } else {
              openFile(node)
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

  return (
    <div className="flex min-h-0 shrink-0">
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
          onClick={() => {
            setActiveActivity?.('download')
            setIsCollapsed(activeActivity === 'download' ? !isCollapsed : false)
          }}
          title={isCollapsed || activeActivity !== 'download' ? 'Open Downloads' : 'Close Downloads'}
          aria-label={isCollapsed || activeActivity !== 'download' ? 'Open Downloads' : 'Close Downloads'}
          aria-pressed={activeActivity === 'download' && !isCollapsed}
          className={`mt-1 flex h-11 w-11 items-center justify-center border-l-2 transition ${
            activeActivity !== 'download' || isCollapsed
              ? 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200'
              : 'border-blue-500 bg-white text-slate-900 dark:bg-slate-900 dark:text-white'
          }`}
        >
          <Download className="h-6 w-6" />
        </button>
      </nav>

      {isCollapsed || activeActivity !== 'download' ? null : (
        <>
          <aside
            className="flex min-h-0 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
            style={{ width: `${explorerWidth}px` }}
          >
            <div className="flex h-11 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
              <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Download
              </p>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                title="Collapse Downloads"
                aria-label="Collapse Downloads"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 border-b border-slate-200 px-3 py-3 dark:border-slate-800">
              <label htmlFor="workspace-download-select" className="sr-only">Workspace</label>
              <select
                id="workspace-download-select"
                value={selectedDownloadWorkspaceId}
                onChange={(event) => setDownloadWorkspaceId?.(event.target.value)}
                disabled={workspacesLoading || !workspaces.length || isDownloadingWorkspace}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace._id} value={workspace._id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => downloadWorkspace?.(selectedDownloadWorkspaceId)}
                disabled={workspacesLoading || !selectedDownloadWorkspace || isDownloadingWorkspace || saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-700"
              >
                <Download className="h-4 w-4" />
                {downloadingWorkspaceId === selectedDownloadWorkspaceId ? 'Downloading...' : 'Download ZIP'}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              {workspacesLoading ? (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading workspaces...</p>
              ) : selectedDownloadWorkspace ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                    {selectedDownloadWorkspace.name}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    .zip archive
                  </p>
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No workspace available</p>
              )}
            </div>

            {downloadError ? (
              <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                {downloadError}
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

            <div className="min-h-0 flex-1 overflow-y-auto py-2">
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
