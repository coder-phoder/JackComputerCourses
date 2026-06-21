import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  Folder,
  FolderOpen,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useTheme } from '../../Context/ThemeContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000'

const LANGUAGE_LABELS = {
  c: 'C',
  cpp: 'C++',
  java: 'Java',
  python: 'Python',
  javascript: 'JavaScript',
}

const MONACO_LANGUAGES = {
  c: 'c',
  cpp: 'cpp',
  java: 'java',
  python: 'python',
  javascript: 'javascript',
}

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

const sortNodes = (nodes) => [...nodes].sort((first, second) => {
  if (first.type !== second.type) {
    return first.type === 'folder' ? -1 : 1
  }

  return String(first.name || '').localeCompare(String(second.name || ''))
})

const buildChildrenByParentId = (nodes) => {
  const childrenByParentId = new Map()

  sortNodes(nodes).forEach((node) => {
    const parentKey = node.parentId || 'root'
    const children = childrenByParentId.get(parentKey) || []
    children.push(node)
    childrenByParentId.set(parentKey, children)
  })

  return childrenByParentId
}

const normalizeNodeFile = (node, contextName = '') => ({
  id: node.originalNodeId,
  name: node.name,
  language: node.language || 'javascript',
  content: node.content || '',
  contextName,
})

const SharedIDE = () => {
  const { token } = useParams()
  const { isDark } = useTheme()
  const [share, setShare] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFile, setActiveFile] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedIds, setExpandedIds] = useState(() => new Set())

  const payload = share?.payload || { workspaces: [], folders: [], files: [] }
  const mode = payload.workspaces?.length
    ? 'workspaces'
    : payload.folders?.length
      ? 'folders'
      : 'files'
  const workspaceTrees = useMemo(() => (
    (payload.workspaces || []).map((workspace) => ({
      ...workspace,
      childrenByParentId: buildChildrenByParentId(workspace.nodes || []),
    }))
  ), [payload.workspaces])
  const folderTrees = useMemo(() => (
    (payload.folders || []).map((folder) => ({
      ...folder,
      childrenByParentId: buildChildrenByParentId(folder.nodes || []),
    }))
  ), [payload.folders])

  const loadShare = useCallback(async () => {
    setLoading(true)
    setError('')
    setActiveFile(null)

    try {
      const response = await axios.get(`${API_BASE_URL}/ide-share/shared/${token}`)

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to load shared IDE')
      }

      setShare(response.data?.data?.share || null)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load shared IDE.'))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      loadShare()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)
    }
  }, [loadShare])

  const toggleExpanded = (id) => {
    setExpandedIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (nextIds.has(id)) {
        nextIds.delete(id)
      } else {
        nextIds.add(id)
      }

      return nextIds
    })
  }

  const renderNode = (node, childrenByParentId, contextName, depth = 0) => {
    const isFolder = node.type === 'folder'
    const children = childrenByParentId.get(node.originalNodeId) || []
    const isExpanded = expandedIds.has(node.originalNodeId)
    const isActive = activeFile?.id === node.originalNodeId

    return (
      <div key={node.originalNodeId}>
        <button
          type="button"
          onClick={() => {
            if (isFolder) {
              toggleExpanded(node.originalNodeId)
            } else {
              setActiveFile(normalizeNodeFile(node, contextName))
            }
          }}
          className={`flex h-9 w-full items-center gap-2 pr-3 text-left text-sm transition ${
            isActive
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-400">
            {isFolder ? (
              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : null}
          </span>
          {isFolder ? (
            isExpanded ? <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" /> : <Folder className="h-4 w-4 shrink-0 text-amber-500" />
          ) : (
            <FileCode className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
          )}
          <span className="min-w-0 flex-1 truncate font-semibold">{node.name}</span>
        </button>
        {isFolder && isExpanded ? (
          children.length ? children.map((childNode) => renderNode(childNode, childrenByParentId, contextName, depth + 1)) : (
            <p
              className="h-8 text-xs font-semibold text-slate-400 dark:text-slate-500"
              style={{ paddingLeft: `${50 + depth * 16}px` }}
            >
              Empty folder
            </p>
          )
        ) : null}
      </div>
    )
  }

  const renderSidebarContent = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 px-3 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading shared IDE...
        </div>
      )
    }

    if (error) {
      return <p className="px-3 py-4 text-sm font-semibold text-red-600 dark:text-red-300">{error}</p>
    }

    if (mode === 'workspaces') {
      return workspaceTrees.map((workspace) => {
        const isExpanded = expandedIds.has(workspace.originalWorkspaceId)
        const rootNodes = workspace.childrenByParentId.get('root') || []

        return (
          <div key={workspace.originalWorkspaceId} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
            <button
              type="button"
              onClick={() => toggleExpanded(workspace.originalWorkspaceId)}
              className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
              <FolderOpen className="h-4 w-4 shrink-0 text-blue-500" />
              <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
            </button>
            {isExpanded ? (
              rootNodes.length ? rootNodes.map((node) => renderNode(node, workspace.childrenByParentId, workspace.name)) : (
                <p className="px-9 pb-3 text-sm font-semibold text-slate-400 dark:text-slate-500">No files shared</p>
              )
            ) : null}
          </div>
        )
      })
    }

    if (mode === 'folders') {
      return folderTrees.map((folder) => {
        const rootNode = (folder.nodes || []).find((node) => node.originalNodeId === folder.originalNodeId)

        return rootNode ? renderNode(rootNode, folder.childrenByParentId, folder.workspaceName) : null
      })
    }

    return (payload.files || []).length ? (
      <div className="py-2">
        {(payload.files || []).map((file) => {
          const normalizedFile = normalizeNodeFile(file, file.workspaceName)
          const isActive = activeFile?.id === normalizedFile.id

          return (
            <button
              type="button"
              key={file.originalNodeId}
              onClick={() => setActiveFile(normalizedFile)}
              className={`flex h-9 w-full items-center gap-2 px-3 text-left text-sm transition ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <FileCode className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              <span className="min-w-0 flex-1 truncate font-semibold">{file.name}</span>
            </button>
          )
        })}
      </div>
    ) : (
      <p className="px-3 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">No shared files available.</p>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans dark:bg-slate-900">
      {sidebarCollapsed ? (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          title="Open shared files"
          aria-label="Open shared files"
          className="flex h-full w-12 shrink-0 items-start justify-center border-r border-slate-200 bg-white pt-3 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      ) : (
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">Shared IDE</p>
              <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                {share?.createdByName || share?.createdByPhone || 'Read-only share'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              title="Collapse shared files"
              aria-label="Collapse shared files"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            {renderSidebarContent()}
          </div>
        </aside>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
              {activeFile?.name || 'No file selected'}
            </h1>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
              {activeFile
                ? `${LANGUAGE_LABELS[activeFile.language] || 'Code'} - ${activeFile.contextName || 'Shared content'} - read only`
                : 'Select a shared file from the sidebar to view it'}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-slate-100 dark:bg-slate-950">
          {activeFile ? (
            <Editor
              key={activeFile.id}
              value={activeFile.content}
              language={MONACO_LANGUAGES[activeFile.language] || 'javascript'}
              theme={isDark ? 'vs-dark' : 'light'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 16,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                renderLineHighlight: 'none',
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div>
                <FileCode className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No file selected</p>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Shared files are view-only and cannot be edited here.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default SharedIDE
