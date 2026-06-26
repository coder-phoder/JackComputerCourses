import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { io } from 'socket.io-client'
import {
  AlertTriangle,
  Braces,
  Check,
  FileCode,
  Folder,
  HardDrive,
  Keyboard,
  Loader2,
  Play,
  Save,
  Settings,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import IDExplorer from '../../Components/IDE/IDExplorer'
import IDEImportExport from '../../Components/IDE/IDEImportExport'
import IDEerminal from '../../Components/IDE/IDEerminal'
import IDEquery from '../../Components/IDE/IDEquery'
import IDEWorkspace from '../../Components/IDE/IDEWorkspace'
import FacultyNavbar from '../../Components/Faculty/FacultyNavbar'
import UserNavbar from '../../Components/User/UserNavbar'
import { useAuth } from '../../Context/AuthContext'
import { useTheme } from '../../Context/ThemeContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000'
const EXPLORER_ACTIVITY_BAR_WIDTH = 56
const EXPLORER_MIN_WIDTH = 220
const EXPLORER_MAX_WIDTH = 420
const EXPLORER_DRAG_COLLAPSE_WIDTH = 150
const TERMINAL_MIN_HEIGHT = 120
const TERMINAL_DRAG_COLLAPSE_HEIGHT = 90
const MIN_EDITOR_WIDTH_WITH_EXPLORER = 560
const MIN_EDITOR_HEIGHT_WITH_TERMINAL = 360

const IDE_ACCESS_CONFIG = {
  user: {
    role: 'user',
    profilePath: '/user/profile',
    profileKey: 'user',
    workspacePath: '/user/workspace',
    Navbar: UserNavbar,
  },
  faculty: {
    role: 'faculty',
    profilePath: '/faculty/profile',
    profileKey: 'faculty',
    workspacePath: '/faculty/workspace',
    Navbar: FacultyNavbar,
  },
}

const BOILERPLATE_SNIPPETS = {
  c: `#include <stdio.h>

int main() {
    printf("\${1:hello world}\\n");
    return 0;
}
`,
  cpp: `#include <iostream>

int main() {
    std::cout << "\${1:hello world}" << std::endl;
    return 0;
}
`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("\${1:hello world}");
    }
}
`,
  python: `print("\${1:hello world}")
`,
  javascript: `console.log("\${1:hello world}");
`,
}

const LANGUAGES = [
  { value: 'c', label: 'C', monacoLang: 'c' },
  { value: 'cpp', label: 'C++', monacoLang: 'cpp' },
  { value: 'java', label: 'Java', monacoLang: 'java' },
  { value: 'python', label: 'Python', monacoLang: 'python' },
  { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
]

const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl', 'S'], label: 'Save active file' },
  { keys: ['Ctrl', "'"], label: 'Run active file' },
  { keys: ['Ctrl', '.'], label: 'Stop running code' },
  { keys: ['Ctrl', 'Shift', 'F'], label: 'Format active file' },
  { keys: ['Ctrl', '`'], label: 'Show or hide terminal' },
  { keys: ['Ctrl', ','], label: 'Open editor settings' },
]

const LANGUAGE_BY_EXTENSION = {
  '.c': 'c',
  '.cpp': 'cpp',
  '.java': 'java',
  '.py': 'python',
  '.js': 'javascript',
}

const getStorageKeys = (role) => ({
  lastWorkspaceId: `jack_ide_${role}_last_workspace_id`,
  fontSize: 'jack_ide_font_size',
  terminalHeight: 'jack_ide_terminal_height',
  explorerWidth: `jack_ide_${role}_explorer_width`,
  explorerCollapsed: `jack_ide_${role}_explorer_collapsed`,
})

const getLastOpenedFileKey = (role, workspaceId) => `jack_ide_${role}_${workspaceId}_last_file_id`

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

const isEditableShortcutTarget = (target) => {
  if (!target) {
    return false
  }

  const tagName = target.tagName?.toLowerCase()
  const isMonacoTarget = Boolean(target.closest?.('.monaco-editor'))

  if (isMonacoTarget) {
    return false
  }

  return target.isContentEditable || ['input', 'select', 'textarea'].includes(tagName)
}

const getFileExtension = (name) => {
  const normalizedName = String(name || '').trim().toLowerCase()
  const dotIndex = normalizedName.lastIndexOf('.')

  if (dotIndex <= 0) {
    return ''
  }

  return normalizedName.slice(dotIndex)
}

const getLanguageFromFileName = (name) => LANGUAGE_BY_EXTENSION[getFileExtension(name)] || ''

const getLanguageMeta = (language) => (
  LANGUAGES.find((currentLanguage) => currentLanguage.value === language) || LANGUAGES[3]
)

const sortWorkspaceNodes = (nodes) => [...nodes].sort((first, second) => {
  if (first.type !== second.type) {
    return first.type === 'folder' ? -1 : 1
  }

  return first.name.localeCompare(second.name)
})

const getAncestorFolderIds = (node, nodes) => {
  const folderIds = []
  let currentParentId = node?.parentId || null

  while (currentParentId) {
    folderIds.push(currentParentId)
    const parentNode = nodes.find((currentNode) => currentNode._id === currentParentId)
    currentParentId = parentNode?.parentId || null
  }

  return folderIds
}

const getDescendantNodeIds = (nodeId, nodes) => {
  const descendantIds = []
  const queue = [nodeId]

  while (queue.length) {
    const currentId = queue.shift()
    const children = nodes.filter((node) => node.parentId === currentId)

    children.forEach((childNode) => {
      descendantIds.push(childNode._id)
      if (childNode.type === 'folder') {
        queue.push(childNode._id)
      }
    })
  }

  return descendantIds
}

const hasSelectedAncestor = (node, selectedIds, nodes) => {
  let currentParentId = node?.parentId || null

  while (currentParentId) {
    if (selectedIds.has(currentParentId)) {
      return true
    }

    const parentNode = nodes.find((currentNode) => currentNode._id === currentParentId)
    currentParentId = parentNode?.parentId || null
  }

  return false
}

const getRootNodeIdsFromSelection = (nodeIds, nodes) => {
  const selectedIds = new Set(nodeIds)

  return nodeIds.filter((nodeId) => {
    const node = nodes.find((currentNode) => currentNode._id === nodeId)
    return node && !hasSelectedAncestor(node, selectedIds, nodes)
  })
}

const getDeleteSummary = (targetNodes) => {
  const files = targetNodes.filter((node) => node.type === 'file').length
  const folders = targetNodes.filter((node) => node.type === 'folder').length

  return {
    files,
    folders,
    total: targetNodes.length,
  }
}

const DeleteConfirmationModal = ({
  confirmation,
  error,
  loading,
  onCancel,
  onConfirm,
}) => {
  useEffect(() => {
    if (!confirmation) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [confirmation, loading, onCancel])

  if (!confirmation) {
    return null
  }

  const isWorkspace = confirmation.kind === 'workspace'
  const isFolder = confirmation.kind === 'folder'
  const Icon = isWorkspace ? HardDrive : isFolder ? Folder : FileCode
  const entityLabel = isWorkspace ? 'workspace' : isFolder ? 'folder' : 'file'
  const summaryItems = [
    isWorkspace || isFolder ? `${confirmation.summary.folders} folder${confirmation.summary.folders === 1 ? '' : 's'}` : '',
    isWorkspace || isFolder ? `${confirmation.summary.files} file${confirmation.summary.files === 1 ? '' : 's'}` : '',
    confirmation.summary.hasUnsavedChanges ? 'Unsaved edits affected' : '',
  ].filter(Boolean)

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirmation-title"
          className="w-full max-w-md overflow-hidden rounded-lg border border-rose-100 bg-white shadow-2xl shadow-slate-950/20 dark:border-rose-500/20 dark:bg-slate-950 dark:shadow-black/40"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className="relative border-b border-slate-200 bg-slate-50 px-5 py-5 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              aria-label="Close delete confirmation"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4 pr-10">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-rose-600 dark:text-rose-300">
                  Delete {entityLabel}
                </p>
                <h2 id="delete-confirmation-title" className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                  This cannot be undone
                </h2>
              </div>
            </div>
          </div>

          <div className="px-5 py-5">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950 dark:text-white" title={confirmation.name}>
                  {confirmation.name}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isWorkspace ? 'Workspace and all saved content' : isFolder ? 'Folder and everything inside it' : 'Single saved file'}
                </p>
              </div>
            </div>

            {summaryItems.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {summaryItems.map((item) => (
                  <span
                    key={item}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      item.includes('Unsaved')
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
              Deleting this {entityLabel} permanently removes it from your IDE. Make sure this is the item you meant to delete.
            </div>

            {error ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-400 disabled:shadow-none"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {loading ? 'Deleting...' : `Delete ${entityLabel}`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const trimCodeWhitespace = (source) => String(source || '')
  .replace(/\t/g, '    ')
  .split('\n')
  .map((line) => line.replace(/\s+$/u, ''))
  .join('\n')
  .trim()

const formatBraceLanguageCode = (source) => {
  const normalizedSource = trimCodeWhitespace(source)
  let tokenizedSource = ''
  let quote = ''
  let escaped = false
  let parenDepth = 0
  let inLineComment = false
  let inBlockComment = false

  for (let index = 0; index < normalizedSource.length; index += 1) {
    const char = normalizedSource[index]
    const nextChar = normalizedSource[index + 1] || ''

    if (inLineComment) {
      tokenizedSource += char
      if (char === '\n') {
        inLineComment = false
      }
      continue
    }

    if (inBlockComment) {
      tokenizedSource += char
      if (char === '*' && nextChar === '/') {
        tokenizedSource += nextChar
        index += 1
        inBlockComment = false
      }
      continue
    }

    if (quote) {
      tokenizedSource += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = ''
      }
      continue
    }

    if ((char === '"' || char === "'") && !quote) {
      quote = char
      tokenizedSource += char
      continue
    }

    if (char === '/' && nextChar === '/') {
      tokenizedSource += char + nextChar
      index += 1
      inLineComment = true
      continue
    }

    if (char === '/' && nextChar === '*') {
      tokenizedSource += char + nextChar
      index += 1
      inBlockComment = true
      continue
    }

    if (char === '(' || char === '[') {
      parenDepth += 1
      tokenizedSource += char
      continue
    }

    if (char === ')' || char === ']') {
      parenDepth = Math.max(0, parenDepth - 1)
      tokenizedSource += char
      continue
    }

    if (char === '{' || char === '}') {
      tokenizedSource += `\n${char}\n`
      continue
    }

    if (char === ';' && parenDepth === 0) {
      tokenizedSource += ';\n'
      continue
    }

    tokenizedSource += char
  }

  const normalizedLines = tokenizedSource
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  let indentLevel = 0
  let temporaryIndentLevel = 0

  const isUnbracedControlStatement = (line) => (
    /^(?:else\s+if|if|else|for|while|do)\b/u.test(line)
    && !line.endsWith(';')
    && !line.endsWith('{')
  )

  const completesTemporaryIndent = (line) => (
    temporaryIndentLevel > 0
    && !isUnbracedControlStatement(line)
    && (line.endsWith(';') || line === '}' || line.endsWith('}'))
  )

  return normalizedLines.map((line) => {
    const shouldDedent = line.startsWith('}')
    indentLevel = shouldDedent ? Math.max(0, indentLevel - 1) : indentLevel
    const effectiveTemporaryIndentLevel = line === '{'
      ? Math.max(0, temporaryIndentLevel - 1)
      : temporaryIndentLevel

    const formattedLine = `${'    '.repeat(indentLevel + effectiveTemporaryIndentLevel)}${line}`

    if (line.endsWith('{')) {
      indentLevel += 1
      temporaryIndentLevel = effectiveTemporaryIndentLevel
    } else if (isUnbracedControlStatement(line)) {
      temporaryIndentLevel += 1
    } else if (completesTemporaryIndent(line)) {
      temporaryIndentLevel = 0
    }

    return formattedLine
  }).join('\n')
}

const formatPythonCode = (source) => {
  const lines = trimCodeWhitespace(source)
    .split('\n')
    .map((line) => line.replace(/^ +/u, (spaces) => ' '.repeat(Math.floor(spaces.length / 4) * 4)))
  let blankLineSeen = false

  return lines.reduce((formattedLines, line) => {
    if (!line.trim()) {
      if (!blankLineSeen && formattedLines.length) {
        formattedLines.push('')
      }
      blankLineSeen = true
      return formattedLines
    }

    blankLineSeen = false
    formattedLines.push(line)
    return formattedLines
  }, []).join('\n')
}

const formatCodeByLanguage = (source, language) => {
  if (['c', 'cpp', 'java', 'javascript'].includes(language)) {
    return formatBraceLanguageCode(source)
  }

  if (language === 'python') {
    return formatPythonCode(source)
  }

  return trimCodeWhitespace(source)
}

const UserIdePage = ({ accessRole = 'user' }) => {
  const accessConfig = IDE_ACCESS_CONFIG[accessRole] || IDE_ACCESS_CONFIG.user
  const storageKeys = useMemo(() => getStorageKeys(accessConfig.role), [accessConfig.role])
  const { clearAuth, setAuth } = useAuth()
  const { isDark } = useTheme()

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [workspaces, setWorkspaces] = useState([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('')
  const [workspacesLoading, setWorkspacesLoading] = useState(true)
  const [nodes, setNodes] = useState([])
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [workspaceError, setWorkspaceError] = useState('')
  const [activeNodeId, setActiveNodeId] = useState('')
  const [expandedFolders, setExpandedFolders] = useState(() => new Set())
  const [code, setCode] = useState('')
  const [savedCode, setSavedCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [saveError, setSaveError] = useState('')
  const [nodeActionId, setNodeActionId] = useState('')
  const [creatingParentId, setCreatingParentId] = useState('')
  const [workspaceDraft, setWorkspaceDraft] = useState(null)
  const [nodeDraft, setNodeDraft] = useState(null)
  const [showWorkspaceActions, setShowWorkspaceActions] = useState(false)
  const [openNodeActionMenuId, setOpenNodeActionMenuId] = useState('')
  const [activeActivity, setActiveActivity] = useState('explorer')
  const [queryNotificationCount, setQueryNotificationCount] = useState(0)
  const [deleteConfirmation, setDeleteConfirmation] = useState(null)
  const [deleteConfirmationError, setDeleteConfirmationError] = useState('')
  const [deleteConfirmationLoading, setDeleteConfirmationLoading] = useState(false)
  const [selectedNodeIds, setSelectedNodeIds] = useState(() => new Set())
  const [nodeClipboard, setNodeClipboard] = useState(null)
  const [draggingNodeIds, setDraggingNodeIds] = useState(() => new Set())
  const [dropTargetParentId, setDropTargetParentId] = useState('')

  const [terminalOutput, setTerminalOutput] = useState('')
  const [inputVal, setInputVal] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [socket, setSocket] = useState(null)

  const editorRef = useRef(null)
  const formatCodeRef = useRef(null)
  const formatActionDisposableRef = useRef(null)
  const snippetProviderDisposablesRef = useRef([])
  const workspaceDraftSubmittingRef = useRef(false)
  const nodeDraftSubmittingRef = useRef(false)
  const workspaceDraftCancelingRef = useRef(false)
  const nodeDraftCancelingRef = useRef(false)
  const workspaceContainerRef = useRef(null)

  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem(storageKeys.fontSize)
    return saved ? parseInt(saved, 10) : 18
  })
  const [showSettings, setShowSettings] = useState(false)

  const [terminalHeight, setTerminalHeight] = useState(() => {
    const saved = localStorage.getItem(storageKeys.terminalHeight)
    return saved ? parseInt(saved, 10) : 240
  })
  const [isDraggingHeight, setIsDraggingHeight] = useState(false)
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(true)

  const [explorerWidth, setExplorerWidth] = useState(() => {
    const saved = localStorage.getItem(storageKeys.explorerWidth)
    return saved ? parseInt(saved, 10) : 280
  })
  const [isDraggingExplorer, setIsDraggingExplorer] = useState(false)
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(() => (
    localStorage.getItem(storageKeys.explorerCollapsed) === 'true'
  ))
  const [workspaceSize, setWorkspaceSize] = useState({ width: 0, height: 0 })

  const workspaceBaseUrl = `${API_BASE_URL}${accessConfig.workspacePath}`
  const shareBaseUrl = `${API_BASE_URL}/${accessConfig.role}/ide-share`
  const workspaceNodesUrl = activeWorkspaceId
    ? `${workspaceBaseUrl}/workspaces/${activeWorkspaceId}/nodes`
    : ''
  const lastOpenedFileKey = activeWorkspaceId
    ? getLastOpenedFileKey(accessConfig.role, activeWorkspaceId)
    : ''
  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace._id === activeWorkspaceId) || null,
    [activeWorkspaceId, workspaces],
  )
  const activeNode = useMemo(
    () => nodes.find((node) => node._id === activeNodeId && node.type === 'file') || null,
    [activeNodeId, nodes],
  )
  const nodeById = useMemo(() => (
    new Map(nodes.map((node) => [node._id, node]))
  ), [nodes])
  const selectedLanguage = getLanguageMeta(activeNode?.language)
  const isDirty = Boolean(activeNode) && code !== savedCode
  const shouldAutoCollapseExplorer = !isExplorerCollapsed
    && workspaceSize.width > 0
    && workspaceSize.width - EXPLORER_ACTIVITY_BAR_WIDTH - explorerWidth < MIN_EDITOR_WIDTH_WITH_EXPLORER
  const shouldAutoCollapseTerminal = !isTerminalCollapsed
    && workspaceSize.height > 0
    && workspaceSize.height - terminalHeight < MIN_EDITOR_HEIGHT_WITH_TERMINAL
  const isExplorerLayoutCollapsed = isExplorerCollapsed || shouldAutoCollapseExplorer
  const isTerminalLayoutCollapsed = isTerminalCollapsed || shouldAutoCollapseTerminal
  const isQueryActivity = accessConfig.role === 'user' && activeActivity === 'query'
  const isWorkspaceActivity = activeActivity === 'download'
  const isImportExportActivity = activeActivity === 'importExport'

  const registerBoilerplateSnippets = useCallback((monaco) => {
    snippetProviderDisposablesRef.current.forEach((disposable) => disposable.dispose())
    snippetProviderDisposablesRef.current = Object.entries(BOILERPLATE_SNIPPETS).map(([language, insertText]) => (
      monaco.languages.registerCompletionItemProvider(language, {
        triggerCharacters: ['b'],
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position)
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          }

          return {
            suggestions: [{
              label: 'boilerplate',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: `${getLanguageMeta(language).label} boilerplate`,
              range,
              sortText: '0000',
            }],
          }
        },
      })
    ))
  }, [])

  const childrenByParentId = useMemo(() => {
    const groupedChildren = new Map()

    sortWorkspaceNodes(nodes).forEach((node) => {
      const parentKey = node.parentId || 'root'
      const children = groupedChildren.get(parentKey) || []
      children.push(node)
      groupedChildren.set(parentKey, children)
    })

    return groupedChildren
  }, [nodes])

  const activateFile = useCallback((node, nodeList = [], expandAncestors = true) => {
    if (!node || node.type !== 'file') {
      setActiveNodeId('')
      setCode('')
      setSavedCode('')
      if (lastOpenedFileKey) {
        localStorage.removeItem(lastOpenedFileKey)
      }
      return
    }

    setActiveNodeId(node._id)
    setCode(node.content || '')
    setSavedCode(node.content || '')
    setSaveStatus('saved')
    setSaveError('')
    if (lastOpenedFileKey) {
      localStorage.setItem(lastOpenedFileKey, node._id)
    }

    if (!expandAncestors) {
      return
    }

    const ancestorIds = getAncestorFolderIds(node, nodeList)

    if (ancestorIds.length) {
      setExpandedFolders((currentFolders) => {
        const nextFolders = new Set(currentFolders)
        ancestorIds.forEach((folderId) => nextFolders.add(folderId))
        return nextFolders
      })
    }
  }, [lastOpenedFileKey])

  const fetchWorkspaces = useCallback(async () => {
    setWorkspacesLoading(true)
    setWorkspaceError('')

    try {
      const response = await axios.get(`${workspaceBaseUrl}/workspaces`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to load workspaces')
      }

      const nextWorkspaces = response.data?.data?.workspaces || []
      const lastWorkspaceId = localStorage.getItem(storageKeys.lastWorkspaceId)
      const nextActiveWorkspace = nextWorkspaces.find((workspace) => workspace._id === lastWorkspaceId)
        || nextWorkspaces[0]
        || null

      setWorkspaces(nextWorkspaces)
      setActiveWorkspaceId(nextActiveWorkspace?._id || '')
    } catch (workspaceLoadError) {
      setWorkspaceError(getErrorMessage(workspaceLoadError, 'Unable to load workspaces.'))
      setWorkspaces([])
      setActiveWorkspaceId('')
    } finally {
      setWorkspacesLoading(false)
    }
  }, [storageKeys.lastWorkspaceId, workspaceBaseUrl])

  const fetchWorkspaceNodes = useCallback(async () => {
    if (!workspaceNodesUrl || !lastOpenedFileKey) {
      setWorkspaceLoading(false)
      return
    }

    setWorkspaceLoading(true)
    setWorkspaceError('')

    try {
      const response = await axios.get(workspaceNodesUrl, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to load workspace')
      }

      const nextNodes = response.data?.data?.nodes || []
      const nextFileNodes = sortWorkspaceNodes(nextNodes).filter((node) => node.type === 'file')
      const lastOpenedFileId = localStorage.getItem(lastOpenedFileKey)
      const nextActiveFile = nextFileNodes.find((node) => node._id === lastOpenedFileId) || nextFileNodes[0] || null

      setNodes(nextNodes)
      setExpandedFolders(new Set())
      activateFile(nextActiveFile, nextNodes, false)
    } catch (workspaceLoadError) {
      setWorkspaceError(getErrorMessage(workspaceLoadError, 'Unable to load workspace.'))
      setNodes([])
      activateFile(null, [])
    } finally {
      setWorkspaceLoading(false)
    }
  }, [activateFile, lastOpenedFileKey, workspaceNodesUrl])

  const handleWorkspaceNodeApplied = useCallback((updatedNode) => {
    if (!updatedNode?._id || updatedNode.workspaceId !== activeWorkspaceId) {
      return
    }

    setNodes((currentNodes) => currentNodes.map((node) => (
      node._id === updatedNode._id ? updatedNode : node
    )))

    if (updatedNode._id === activeNodeId) {
      const nextContent = updatedNode.content || ''

      setCode(nextContent)
      setSavedCode(nextContent)
      setSaveStatus('saved')
      setSaveError('')
    }
  }, [activeNodeId, activeWorkspaceId])

  useEffect(() => {
    let isActive = true

    const verifyAccess = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}${accessConfig.profilePath}`, {
          withCredentials: true,
        })

        const profile = response.data?.data?.[accessConfig.profileKey]

        if (!response.data?.success || profile?.role !== accessConfig.role) {
          throw new Error(`Unauthorized ${accessConfig.role}`)
        }

        if (!isActive) {
          return
        }

        setAuth({
          role: accessConfig.role,
          phone: profile.phone,
          token: null,
        })
        setIsAuthorized(true)
      } catch {
        if (!isActive) {
          return
        }
        clearAuth()
        setIsAuthorized(false)
      } finally {
        if (isActive) {
          setCheckingAuth(false)
        }
      }
    }

    verifyAccess()

    return () => {
      isActive = false
    }
  }, [accessConfig.profileKey, accessConfig.profilePath, accessConfig.role, clearAuth, setAuth])

  useEffect(() => {
    if (!isAuthorized) {
      return undefined
    }

    const workspacesLoadTimer = window.setTimeout(() => {
      fetchWorkspaces()
    }, 0)

    return () => {
      window.clearTimeout(workspacesLoadTimer)
    }
  }, [fetchWorkspaces, isAuthorized])

  useEffect(() => {
    if (!isAuthorized || !activeWorkspaceId) {
      return undefined
    }

    localStorage.setItem(storageKeys.lastWorkspaceId, activeWorkspaceId)

    const workspaceNodesLoadTimer = window.setTimeout(() => {
      setNodes([])
      setSelectedNodeIds(new Set())
      setDraggingNodeIds(new Set())
      setDropTargetParentId('')
      setNodeClipboard(null)
      activateFile(null, [])
      fetchWorkspaceNodes()
    }, 0)

    return () => {
      window.clearTimeout(workspaceNodesLoadTimer)
    }
  }, [activateFile, activeWorkspaceId, fetchWorkspaceNodes, isAuthorized, storageKeys.lastWorkspaceId])

  useEffect(() => {
    if (!isAuthorized) {
      return undefined
    }

    const socketInstance = io(API_BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    socketInstance.on('terminal-output', (data) => {
      setTerminalOutput((prev) => prev + data)
    })

    socketInstance.on('process-exit', (exitCode) => {
      setTerminalOutput((prev) => prev + `\n--- Process exited with code ${exitCode} ---\n`)
      setIsRunning(false)
    })

    socketInstance.on('connect_error', () => {
      setTerminalOutput((prev) => prev + '\nSystem: Server connection error. Make sure backend is running.\n')
      setIsRunning(false)
    })

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
      setSocket(null)
    }
  }, [isAuthorized])

  useEffect(() => {
    if (!isAuthorized || accessConfig.role !== 'user') {
      return undefined
    }

    let isActive = true

    const fetchQueryNotifications = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user/queries`, {
          withCredentials: true,
        })

        if (!isActive || !response.data?.success) {
          return
        }

        setQueryNotificationCount(response.data?.data?.actionRequiredCount || 0)
      } catch {
        if (isActive) {
          setQueryNotificationCount(0)
        }
      }
    }

    fetchQueryNotifications()
    const notificationTimer = window.setInterval(fetchQueryNotifications, 30000)

    return () => {
      isActive = false
      window.clearInterval(notificationTimer)
    }
  }, [accessConfig.role, isAuthorized])

  useEffect(() => () => {
    formatActionDisposableRef.current?.dispose()
    formatActionDisposableRef.current = null
    editorRef.current = null
    snippetProviderDisposablesRef.current.forEach((disposable) => disposable.dispose())
    snippetProviderDisposablesRef.current = []
  }, [])

  useEffect(() => {
    const containerElement = workspaceContainerRef.current

    if (!containerElement) {
      return undefined
    }

    const updateWorkspaceSize = () => {
      const rect = containerElement.getBoundingClientRect()
      const nextWidth = Math.round(rect.width)
      const nextHeight = Math.round(rect.height)

      setWorkspaceSize((currentSize) => {
        if (currentSize.width === nextWidth && currentSize.height === nextHeight) {
          return currentSize
        }

        return {
          width: nextWidth,
          height: nextHeight,
        }
      })
    }

    updateWorkspaceSize()
    window.addEventListener('resize', updateWorkspaceSize)

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', updateWorkspaceSize)
      }
    }

    const resizeObserver = new ResizeObserver(updateWorkspaceSize)
    resizeObserver.observe(containerElement)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateWorkspaceSize)
    }
  }, [])

  const saveActiveFile = useCallback(async () => {
    if (!activeNode || !workspaceNodesUrl || saving) {
      return false
    }

    if (code === savedCode) {
      return true
    }

    setSaving(true)
    setSaveStatus('saving')
    setSaveError('')

    try {
      const response = await axios.patch(`${workspaceNodesUrl}/${activeNode._id}`, {
        content: code,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to save file')
      }

      const updatedNode = response.data?.data?.node

      setNodes((currentNodes) => currentNodes.map((node) => (
        node._id === updatedNode._id ? updatedNode : node
      )))
      setSavedCode(updatedNode.content || '')
      setSaveStatus('saved')
      return true
    } catch (saveFileError) {
      setSaveError(getErrorMessage(saveFileError, 'Unable to save file.'))
      setSaveStatus('error')
      return false
    } finally {
      setSaving(false)
    }
  }, [activeNode, code, savedCode, saving, workspaceNodesUrl])

  const formatActiveCode = useCallback(async () => {
    const editor = editorRef.current
    const model = editor?.getModel()

    if (!activeNode || !editor || !model) {
      return
    }

    setSaveError('')
    const originalCode = model.getValue()
    let formattedCode = originalCode
    let nativeFormatted = false

    try {
      const formatAction = editor.getAction('editor.action.formatDocument')
      if (formatAction) {
        await formatAction.run()
        formattedCode = model.getValue()
        nativeFormatted = formattedCode !== originalCode
      }
    } catch {
      formattedCode = originalCode
    }

    if (!nativeFormatted) {
      formattedCode = formatCodeByLanguage(originalCode, activeNode.language)
    }

    if (!nativeFormatted && formattedCode !== originalCode) {
      editor.pushUndoStop()
      editor.executeEdits('format-code', [{
        range: model.getFullModelRange(),
        text: formattedCode,
      }])
      editor.pushUndoStop()
    }

    if (formattedCode !== originalCode) {
      setCode(formattedCode)
      setSaveStatus('idle')
    }

    editor.focus()
  }, [activeNode])

  useEffect(() => {
    formatCodeRef.current = formatActiveCode
  }, [formatActiveCode])

  useEffect(() => {
    if (!isAuthorized || !activeNode || !isDirty || saving) {
      return undefined
    }

    const autosaveTimer = window.setTimeout(() => {
      saveActiveFile()
    }, 2500)

    return () => {
      window.clearTimeout(autosaveTimer)
    }
  }, [activeNode, isAuthorized, isDirty, saveActiveFile, saving])

  useEffect(() => {
    if (!isDraggingHeight) return undefined

    const handleMouseMove = (event) => {
      const containerElement = document.getElementById('ide-workspace-container')
      if (containerElement) {
        const rect = containerElement.getBoundingClientRect()
        const newHeight = rect.bottom - event.clientY

        if (newHeight <= TERMINAL_DRAG_COLLAPSE_HEIGHT) {
          setIsTerminalCollapsed(true)
          setIsDraggingHeight(false)
          return
        }

        if (newHeight >= TERMINAL_MIN_HEIGHT && rect.height - newHeight >= MIN_EDITOR_HEIGHT_WITH_TERMINAL) {
          setTerminalHeight(newHeight)
        }
      }
    }

    const handleMouseUp = () => {
      setIsDraggingHeight(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingHeight])

  useEffect(() => {
    if (!isDraggingExplorer) return undefined

    const handleMouseMove = (event) => {
      const containerElement = document.getElementById('ide-workspace-container')
      if (!containerElement) {
        return
      }

      const rect = containerElement.getBoundingClientRect()
      const nextWidth = event.clientX - rect.left - EXPLORER_ACTIVITY_BAR_WIDTH

      if (nextWidth <= EXPLORER_DRAG_COLLAPSE_WIDTH) {
        setIsExplorerCollapsed(true)
        setIsDraggingExplorer(false)
        return
      }

      if (nextWidth >= EXPLORER_MIN_WIDTH && nextWidth <= EXPLORER_MAX_WIDTH) {
        setExplorerWidth(nextWidth)
      }
    }

    const handleMouseUp = () => {
      setIsDraggingExplorer(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingExplorer])

  useEffect(() => {
    const hasActiveDrag = isDraggingHeight || isDraggingExplorer

    document.body.style.cursor = hasActiveDrag
      ? (isDraggingExplorer ? 'col-resize' : 'row-resize')
      : ''
    document.body.style.userSelect = hasActiveDrag ? 'none' : ''

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDraggingExplorer, isDraggingHeight])

  useEffect(() => {
    localStorage.setItem(storageKeys.terminalHeight, String(terminalHeight))
  }, [storageKeys.terminalHeight, terminalHeight])

  useEffect(() => {
    localStorage.setItem(storageKeys.explorerWidth, String(explorerWidth))
  }, [explorerWidth, storageKeys.explorerWidth])

  useEffect(() => {
    localStorage.setItem(storageKeys.explorerCollapsed, String(isExplorerCollapsed))
  }, [isExplorerCollapsed, storageKeys.explorerCollapsed])

  const handleIncreaseFont = () => {
    setFontSize((prev) => {
      const next = Math.min(24, prev + 1)
      localStorage.setItem(storageKeys.fontSize, String(next))
      return next
    })
  }

  const handleDecreaseFont = () => {
    setFontSize((prev) => {
      const next = Math.max(10, prev - 1)
      localStorage.setItem(storageKeys.fontSize, String(next))
      return next
    })
  }

  const openFile = (node) => {
    if (!node || node.type !== 'file') {
      return
    }

    if (node._id === activeNodeId) {
      return
    }

    if (isDirty && !window.confirm('Open another file and discard unsaved changes?')) {
      return
    }

    activateFile(node, nodes)
  }

  const handleExplorerNodeClick = (node, event) => {
    if (!node?._id) {
      return
    }

    const isMultiSelect = event?.ctrlKey || event?.metaKey

    if (isMultiSelect) {
      setSelectedNodeIds((currentIds) => {
        const nextIds = new Set(currentIds)

        if (nextIds.has(node._id)) {
          nextIds.delete(node._id)
        } else {
          nextIds.add(node._id)
        }

        return nextIds
      })
      return
    }

    setSelectedNodeIds(new Set([node._id]))

    if (node.type === 'folder') {
      toggleFolder(node._id)
    } else {
      openFile(node)
    }
  }

  const prepareNodeContextSelection = (node) => {
    if (!node?._id) {
      return []
    }

    if (selectedNodeIds.has(node._id)) {
      return [...selectedNodeIds]
    }

    setSelectedNodeIds(new Set([node._id]))
    return [node._id]
  }

  const canMoveNodesToParent = (nodeIds, parentId = null) => {
    const targetParentId = parentId || null
    const rootNodeIds = getRootNodeIdsFromSelection(nodeIds, nodes)

    if (!rootNodeIds.length) {
      return false
    }

    return rootNodeIds.every((nodeId) => {
      const node = nodeById.get(nodeId)

      if (!node) {
        return false
      }

      if (targetParentId && node.type === 'folder') {
        if (targetParentId === node._id) {
          return false
        }

        if (getDescendantNodeIds(node._id, nodes).includes(targetParentId)) {
          return false
        }
      }

      return true
    })
  }

  const canPasteToParent = (parentId = null) => {
    if (!nodeClipboard?.nodeIds?.length) {
      return false
    }

    if (nodeClipboard.mode === 'copy') {
      return true
    }

    return canMoveNodesToParent(nodeClipboard.nodeIds, parentId)
  }

  const cutWorkspaceNodes = (nodeIds) => {
    const nextNodeIds = getRootNodeIdsFromSelection(nodeIds, nodes)

    if (!nextNodeIds.length) {
      return
    }

    setWorkspaceError('')
    setNodeClipboard({ mode: 'cut', nodeIds: nextNodeIds })
    setSelectedNodeIds(new Set(nextNodeIds))
  }

  const copyWorkspaceNodesToClipboard = (nodeIds) => {
    const nextNodeIds = getRootNodeIdsFromSelection(nodeIds, nodes)

    if (!nextNodeIds.length) {
      return
    }

    setWorkspaceError('')
    setNodeClipboard({ mode: 'copy', nodeIds: nextNodeIds })
    setSelectedNodeIds(new Set(nextNodeIds))
  }

  const moveWorkspaceNodesToParent = async (nodeIds, parentId = null) => {
    const rootNodeIds = getRootNodeIdsFromSelection(nodeIds, nodes)
    const targetParentId = parentId || null

    if (!workspaceNodesUrl) {
      setWorkspaceError('Select a workspace before moving files.')
      return false
    }

    if (!canMoveNodesToParent(rootNodeIds, targetParentId)) {
      setWorkspaceError('Selected folder cannot be moved there.')
      return false
    }

    setNodeActionId(rootNodeIds[0] || 'bulk')
    setWorkspaceError('')

    try {
      const response = await axios.post(`${workspaceNodesUrl}/move`, {
        nodeIds: rootNodeIds,
        parentId: targetParentId,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to move workspace items')
      }

      const movedNodes = response.data?.data?.nodes || []
      const movedNodeById = new Map(movedNodes.map((node) => [node._id, node]))

      setNodes((currentNodes) => currentNodes.map((node) => (
        movedNodeById.get(node._id) || node
      )))

      if (targetParentId) {
        setExpandedFolders((currentFolders) => {
          const nextFolders = new Set(currentFolders)
          nextFolders.add(targetParentId)
          return nextFolders
        })
      }

      setSelectedNodeIds(new Set(rootNodeIds))
      return true
    } catch (moveError) {
      setWorkspaceError(getErrorMessage(moveError, 'Unable to move workspace items.'))
      return false
    } finally {
      setNodeActionId('')
      setDropTargetParentId('')
      setDraggingNodeIds(new Set())
    }
  }

  const copyWorkspaceNodesToParent = async (nodeIds, parentId = null) => {
    const rootNodeIds = getRootNodeIdsFromSelection(nodeIds, nodes)
    const targetParentId = parentId || null

    if (!workspaceNodesUrl) {
      setWorkspaceError('Select a workspace before copying files.')
      return false
    }

    if (!rootNodeIds.length) {
      return false
    }

    setNodeActionId(rootNodeIds[0] || 'bulk')
    setWorkspaceError('')

    try {
      const response = await axios.post(`${workspaceNodesUrl}/copy`, {
        nodeIds: rootNodeIds,
        parentId: targetParentId,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to copy workspace items')
      }

      const copiedNodes = response.data?.data?.nodes || []

      setNodes((currentNodes) => [...currentNodes, ...copiedNodes])

      setSelectedNodeIds(new Set(copiedNodes.map((node) => node._id)))

      if (targetParentId || copiedNodes.some((node) => node.type === 'folder')) {
        setExpandedFolders((currentFolders) => {
          const nextFolders = new Set(currentFolders)

          if (targetParentId) {
            nextFolders.add(targetParentId)
          }

          copiedNodes
            .filter((node) => node.type === 'folder')
            .forEach((node) => nextFolders.add(node._id))

          return nextFolders
        })
      }

      return true
    } catch (copyError) {
      setWorkspaceError(getErrorMessage(copyError, 'Unable to copy workspace items.'))
      return false
    } finally {
      setNodeActionId('')
    }
  }

  const pasteWorkspaceNodesToParent = async (parentId = null) => {
    if (!nodeClipboard?.nodeIds?.length) {
      return false
    }

    if (!canPasteToParent(parentId)) {
      setWorkspaceError('Selected folder cannot be pasted there.')
      return false
    }

    const didPaste = nodeClipboard.mode === 'cut'
      ? await moveWorkspaceNodesToParent(nodeClipboard.nodeIds, parentId)
      : await copyWorkspaceNodesToParent(nodeClipboard.nodeIds, parentId)

    if (didPaste && nodeClipboard.mode === 'cut') {
      setNodeClipboard(null)
    }

    return didPaste
  }

  const handleNodeDragStart = (node, event) => {
    if (!node?._id || nodeDraft || saving || workspaceLoading) {
      event.preventDefault()
      return
    }

    const nextNodeIds = selectedNodeIds.has(node._id)
      ? getRootNodeIdsFromSelection([...selectedNodeIds], nodes)
      : [node._id]

    setSelectedNodeIds(new Set(nextNodeIds))
    setDraggingNodeIds(new Set(nextNodeIds))
    setWorkspaceError('')

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-jack-node-ids', JSON.stringify(nextNodeIds))
    event.dataTransfer.setData('text/plain', nextNodeIds.join(','))
  }

  const getDraggedNodeIds = (event) => {
    try {
      const rawIds = event.dataTransfer.getData('application/x-jack-node-ids')
      const parsedIds = JSON.parse(rawIds || '[]')
      return Array.isArray(parsedIds) ? parsedIds : []
    } catch {
      return []
    }
  }

  const handleNodeDragOverParent = (parentId, event) => {
    const nodeIds = draggingNodeIds.size ? [...draggingNodeIds] : getDraggedNodeIds(event)

    if (!canMoveNodesToParent(nodeIds, parentId)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    setDropTargetParentId(parentId || 'root')
  }

  const handleNodeDropOnParent = async (parentId, event) => {
    const nodeIds = draggingNodeIds.size ? [...draggingNodeIds] : getDraggedNodeIds(event)

    if (!nodeIds.length) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    await moveWorkspaceNodesToParent(nodeIds, parentId)
  }

  const clearNodeDragState = () => {
    setDraggingNodeIds(new Set())
    setDropTargetParentId('')
  }

  const startCreateWorkspace = () => {
    if (workspacesLoading || saving) {
      return
    }

    setWorkspaceError('')
    setWorkspaceDraft({
      id: `workspace-create-${Date.now()}`,
      mode: 'create',
      value: '',
    })
  }

  const startRenameWorkspace = () => {
    if (!activeWorkspace || workspacesLoading || saving) {
      return
    }

    setShowWorkspaceActions(false)
    setWorkspaceError('')
    setWorkspaceDraft({
      id: `workspace-rename-${activeWorkspace._id}`,
      mode: 'rename',
      workspaceId: activeWorkspace._id,
      originalName: activeWorkspace.name,
      value: activeWorkspace.name,
    })
  }

  const cancelWorkspaceDraft = () => {
    if (!workspaceDraftSubmittingRef.current) {
      workspaceDraftCancelingRef.current = true
      setWorkspaceDraft(null)
      window.setTimeout(() => {
        workspaceDraftCancelingRef.current = false
      }, 0)
    }
  }

  const submitWorkspaceDraft = async () => {
    if (workspaceDraftCancelingRef.current) {
      workspaceDraftCancelingRef.current = false
      return
    }

    if (!workspaceDraft || workspaceDraftSubmittingRef.current) {
      return
    }

    const name = String(workspaceDraft.value || '').trim()

    if (!name || (workspaceDraft.mode === 'rename' && name === workspaceDraft.originalName)) {
      setWorkspaceDraft(null)
      return
    }

    workspaceDraftSubmittingRef.current = true
    setWorkspacesLoading(true)
    setWorkspaceError('')

    try {
      if (workspaceDraft.mode === 'create') {
        const response = await axios.post(`${workspaceBaseUrl}/workspaces`, {
          name,
        }, {
          withCredentials: true,
        })

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to create workspace')
        }

        const createdWorkspace = response.data?.data?.workspace

        if (!createdWorkspace?._id) {
          throw new Error('Workspace was created without a valid response')
        }

        setWorkspaces((currentWorkspaces) => [...currentWorkspaces, createdWorkspace])
        setActiveWorkspaceId(createdWorkspace._id)
      } else {
        const response = await axios.patch(`${workspaceBaseUrl}/workspaces/${workspaceDraft.workspaceId}`, {
          name,
        }, {
          withCredentials: true,
        })

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to rename workspace')
        }

        const updatedWorkspace = response.data?.data?.workspace

        if (!updatedWorkspace?._id) {
          throw new Error('Workspace was renamed without a valid response')
        }

        setWorkspaces((currentWorkspaces) => currentWorkspaces.map((workspace) => (
          workspace._id === updatedWorkspace._id ? updatedWorkspace : workspace
        )))
      }

      setWorkspaceDraft(null)
    } catch (draftError) {
      setWorkspaceError(getErrorMessage(draftError, `Unable to ${workspaceDraft.mode} workspace.`))
    } finally {
      workspaceDraftSubmittingRef.current = false
      setWorkspacesLoading(false)
    }
  }

  const handleWorkspaceDraftBlur = () => {
    if (workspaceDraft?.mode === 'create') {
      cancelWorkspaceDraft()
      return
    }

    submitWorkspaceDraft()
  }

  const deleteActiveWorkspace = () => {
    if (!activeWorkspace) {
      return
    }

    setShowWorkspaceActions(false)
    setWorkspaceError('')
    setDeleteConfirmationError('')
    setDeleteConfirmation({
      id: activeWorkspace._id,
      kind: 'workspace',
      name: activeWorkspace.name,
      summary: {
        ...getDeleteSummary(nodes),
        hasUnsavedChanges: isDirty,
      },
      target: activeWorkspace,
    })
  }

  const confirmWorkspaceDeletion = async (workspaceToDelete) => {
    setWorkspacesLoading(true)
    setWorkspaceError('')

    try {
      const response = await axios.delete(`${workspaceBaseUrl}/workspaces/${workspaceToDelete._id}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete workspace')
      }

      const remainingWorkspaces = workspaces.filter((workspace) => workspace._id !== workspaceToDelete._id)

      setWorkspaces(remainingWorkspaces)
      setActiveWorkspaceId(remainingWorkspaces[0]?._id || '')
      setDeleteConfirmation(null)
    } catch (deleteError) {
      const message = getErrorMessage(deleteError, 'Unable to delete workspace.')
      setWorkspaceError(message)
      setDeleteConfirmationError(message)
    } finally {
      setWorkspacesLoading(false)
    }
  }

  const collapseWorkspaceFolders = () => {
    setShowWorkspaceActions(false)
    setExpandedFolders(new Set())
  }

  const startCreateWorkspaceNode = (type, parentId = null) => {
    if (!workspaceNodesUrl) {
      setWorkspaceError('Select a workspace before creating files.')
      return
    }

    const normalizedParentId = parentId || null

    if (normalizedParentId) {
      setExpandedFolders((currentFolders) => {
        const nextFolders = new Set(currentFolders)
        nextFolders.add(normalizedParentId)
        return nextFolders
      })
    }

    setWorkspaceError('')
    setNodeDraft({
      id: `node-create-${type}-${normalizedParentId || 'root'}-${Date.now()}`,
      mode: 'create',
      type,
      parentId: normalizedParentId,
      value: '',
    })
  }

  const cancelNodeDraft = () => {
    if (!nodeDraftSubmittingRef.current) {
      nodeDraftCancelingRef.current = true
      setNodeDraft(null)
      window.setTimeout(() => {
        nodeDraftCancelingRef.current = false
      }, 0)
    }
  }

  const persistWorkspaceNodeCreation = async (type, parentId = null, name) => {
    const isFile = type === 'file'
    const normalizedParentId = parentId || null

    if (!name) {
      return false
    }

    if (isFile && !getLanguageFromFileName(name)) {
      setWorkspaceError('Only .c, .cpp, .java, .py and .js files are supported.')
      return false
    }

    if (!workspaceNodesUrl) {
      setWorkspaceError('Select a workspace before creating files.')
      return false
    }

    setCreatingParentId(normalizedParentId || 'root')
    setWorkspaceError('')

    try {
      const response = await axios.post(workspaceNodesUrl, {
        type,
        name,
        parentId: normalizedParentId,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to create workspace item')
      }

      const createdNode = response.data?.data?.node

      if (!createdNode?._id) {
        throw new Error('Workspace item was created without a valid response')
      }

      setNodes((currentNodes) => [...currentNodes, createdNode])

      if (normalizedParentId) {
        setExpandedFolders((currentFolders) => {
          const nextFolders = new Set(currentFolders)
          nextFolders.add(normalizedParentId)
          return nextFolders
        })
      }

      if (createdNode.type === 'file') {
        activateFile(createdNode, [...nodes, createdNode])
      } else {
        setExpandedFolders((currentFolders) => {
          const nextFolders = new Set(currentFolders)
          nextFolders.add(createdNode._id)
          return nextFolders
        })
      }

      return true
    } catch (createError) {
      setWorkspaceError(getErrorMessage(createError, 'Unable to create workspace item.'))
      return false
    } finally {
      setCreatingParentId('')
    }
  }

  const startRenameWorkspaceNode = (node) => {
    if (!node || nodeActionId || saving) {
      return
    }

    setOpenNodeActionMenuId('')
    setWorkspaceError('')
    setNodeDraft({
      id: `node-rename-${node._id}`,
      mode: 'rename',
      nodeId: node._id,
      type: node.type,
      parentId: node.parentId || null,
      originalName: node.name,
      value: node.name,
    })
  }

  const persistWorkspaceNodeRename = async (draft) => {
    const nextName = String(draft.value || '').trim()

    if (!nextName || nextName === draft.originalName) {
      setNodeDraft(null)
      return true
    }

    if (draft.type === 'file' && !getLanguageFromFileName(nextName)) {
      setWorkspaceError('Only .c, .cpp, .java, .py and .js files are supported.')
      return false
    }

    if (!workspaceNodesUrl) {
      setWorkspaceError('Select a workspace before renaming files.')
      return false
    }

    setNodeActionId(draft.nodeId)
    setWorkspaceError('')

    try {
      const response = await axios.patch(`${workspaceNodesUrl}/${draft.nodeId}`, {
        name: nextName,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to rename workspace item')
      }

      const updatedNode = response.data?.data?.node

      if (!updatedNode?._id) {
        throw new Error('Workspace item was renamed without a valid response')
      }

      setNodes((currentNodes) => currentNodes.map((currentNode) => (
        currentNode._id === updatedNode._id ? updatedNode : currentNode
      )))
      setNodeDraft(null)
      return true
    } catch (renameError) {
      setWorkspaceError(getErrorMessage(renameError, 'Unable to rename workspace item.'))
      return false
    } finally {
      setNodeActionId('')
    }
  }

  const submitNodeDraft = async () => {
    if (nodeDraftCancelingRef.current) {
      nodeDraftCancelingRef.current = false
      return
    }

    if (!nodeDraft || nodeDraftSubmittingRef.current) {
      return
    }

    const name = String(nodeDraft.value || '').trim()

    if (!name) {
      setNodeDraft(null)
      return
    }

    if (nodeDraft.type === 'file' && !getLanguageFromFileName(name)) {
      setWorkspaceError('Only .c, .cpp, .java, .py and .js files are supported.')
      return
    }

    nodeDraftSubmittingRef.current = true

    try {
      if (nodeDraft.mode === 'create') {
        const didCreate = await persistWorkspaceNodeCreation(nodeDraft.type, nodeDraft.parentId, name)

        if (didCreate) {
          setNodeDraft(null)
        }
      } else {
        await persistWorkspaceNodeRename(nodeDraft)
      }
    } finally {
      nodeDraftSubmittingRef.current = false
    }
  }

  const handleNodeDraftBlur = () => {
    if (nodeDraft?.mode === 'create') {
      cancelNodeDraft()
      return
    }

    submitNodeDraft()
  }

  const deleteWorkspaceNode = (node) => {
    setOpenNodeActionMenuId('')

    if (!workspaceNodesUrl) {
      setWorkspaceError('Select a workspace before deleting files.')
      return
    }

    if (!node?._id) {
      return
    }

    const deletedIds = node.type === 'folder'
      ? [node._id, ...getDescendantNodeIds(node._id, nodes)]
      : [node._id]
    const targetNodes = nodes.filter((currentNode) => deletedIds.includes(currentNode._id))

    setWorkspaceError('')
    setDeleteConfirmationError('')
    setDeleteConfirmation({
      id: node._id,
      kind: node.type,
      name: node.name,
      summary: {
        ...getDeleteSummary(targetNodes),
        hasUnsavedChanges: isDirty && deletedIds.includes(activeNodeId),
      },
      target: node,
    })
  }

  const confirmWorkspaceNodeDeletion = async (node) => {
    if (!workspaceNodesUrl) {
      setWorkspaceError('Select a workspace before deleting files.')
      return
    }

    setNodeActionId(node._id)
    setWorkspaceError('')

    try {
      const response = await axios.delete(`${workspaceNodesUrl}/${node._id}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete workspace item')
      }

      const deletedIds = response.data?.data?.deletedIds || [node._id]
      const remainingNodes = nodes.filter((currentNode) => !deletedIds.includes(currentNode._id))

      setNodes(remainingNodes)
      setSelectedNodeIds((currentIds) => (
        new Set([...currentIds].filter((nodeId) => !deletedIds.includes(nodeId)))
      ))
      setNodeClipboard((currentClipboard) => {
        if (!currentClipboard) {
          return currentClipboard
        }

        const nextNodeIds = currentClipboard.nodeIds.filter((nodeId) => !deletedIds.includes(nodeId))
        return nextNodeIds.length ? { ...currentClipboard, nodeIds: nextNodeIds } : null
      })

      if (activeNodeId && deletedIds.includes(activeNodeId)) {
        const nextActiveFile = sortWorkspaceNodes(remainingNodes).find((currentNode) => currentNode.type === 'file') || null
        activateFile(nextActiveFile, remainingNodes)
      }
      setDeleteConfirmation(null)
    } catch (deleteError) {
      const message = getErrorMessage(deleteError, 'Unable to delete workspace item.')
      setWorkspaceError(message)
      setDeleteConfirmationError(message)
    } finally {
      setNodeActionId('')
    }
  }

  const closeDeleteConfirmation = useCallback(() => {
    if (deleteConfirmationLoading) {
      return
    }

    setDeleteConfirmation(null)
    setDeleteConfirmationError('')
  }, [deleteConfirmationLoading])

  const confirmDeleteSelection = async () => {
    if (!deleteConfirmation || deleteConfirmationLoading) {
      return
    }

    setDeleteConfirmationLoading(true)
    setDeleteConfirmationError('')

    try {
      if (deleteConfirmation.kind === 'workspace') {
        await confirmWorkspaceDeletion(deleteConfirmation.target)
      } else {
        await confirmWorkspaceNodeDeletion(deleteConfirmation.target)
      }
    } finally {
      setDeleteConfirmationLoading(false)
    }
  }

  const toggleFolder = (folderId) => {
    setExpandedFolders((currentFolders) => {
      const nextFolders = new Set(currentFolders)

      if (nextFolders.has(folderId)) {
        nextFolders.delete(folderId)
      } else {
        nextFolders.add(folderId)
      }

      return nextFolders
    })
  }

  const handleRunCode = useCallback(() => {
    if (!socket || isRunning || !activeNode) return

    setIsTerminalCollapsed(false)
    setTerminalOutput(`--- Running ${activeNode.name} ---\n`)
    setIsRunning(true)
    setInputVal('')

    socket.emit('run-code', {
      language: activeNode.language,
      code,
    })
  }, [activeNode, code, isRunning, socket])

  const handleStopCode = useCallback(() => {
    if (!socket || !isRunning) return
    socket.emit('stop-code')
  }, [isRunning, socket])

  const handleInputKeyDown = (event) => {
    if (event.key !== 'Enter') {
      return
    }

    if (!socket || !isRunning) {
      return
    }

    const toSend = `${inputVal}\n`

    setTerminalOutput((prev) => prev + inputVal + '\n')
    socket.emit('terminal-input', toSend)
    setInputVal('')
  }

  const handleClearTerminal = () => {
    setTerminalOutput('')
  }

  useEffect(() => {
    if (!isAuthorized) {
      return undefined
    }

    const handleKeyDown = (event) => {
      const hasShortcutModifier = event.ctrlKey || event.metaKey

      if (!hasShortcutModifier || event.altKey || isEditableShortcutTarget(event.target)) {
        return
      }

      const key = event.key.toLowerCase()
      const code = event.code

      if (key === ',' && !event.shiftKey) {
        event.preventDefault()
        setShowSettings((currentValue) => !currentValue)
        return
      }

      if (key === '.' && !event.shiftKey) {
        event.preventDefault()
        handleStopCode()
        return
      }

      if ((key === '`' || code === 'Backquote') && !event.shiftKey) {
        event.preventDefault()
        setIsTerminalCollapsed((currentValue) => !currentValue)
        return
      }

      if (!activeNode) {
        return
      }

      if (key === 's' && !event.shiftKey) {
        event.preventDefault()
        saveActiveFile()
        return
      }

      if ((key === "'" || code === 'Quote') && !event.shiftKey) {
        event.preventDefault()
        handleRunCode()
        return
      }

      if (key === 'f' && event.shiftKey) {
        event.preventDefault()
        formatActiveCode()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeNode, formatActiveCode, handleRunCode, handleStopCode, isAuthorized, saveActiveFile])

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans dark:bg-slate-950">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace />
  }

  const Navbar = accessConfig.Navbar
  const rootNodes = childrenByParentId.get('root') || []
  const statusText = saving
    ? 'Saving...'
    : saveStatus === 'error'
      ? 'Save failed'
      : isDirty
        ? 'Unsaved'
        : activeNode
          ? 'Saved'
          : 'No file'

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans dark:bg-slate-900">
      <Navbar />
      <DeleteConfirmationModal
        confirmation={deleteConfirmation}
        error={deleteConfirmationError}
        loading={deleteConfirmationLoading}
        onCancel={closeDeleteConfirmation}
        onConfirm={confirmDeleteSelection}
      />

      <div
        id="ide-workspace-container"
        ref={workspaceContainerRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <IDExplorer
            activeActivity={activeActivity}
            activeNodeId={activeNodeId}
            activeWorkspace={activeWorkspace}
            activeWorkspaceId={activeWorkspaceId}
            cancelNodeDraft={cancelNodeDraft}
            cancelWorkspaceDraft={cancelWorkspaceDraft}
            childrenByParentId={childrenByParentId}
            collapseWorkspaceFolders={collapseWorkspaceFolders}
            clipboardMode={nodeClipboard?.mode || ''}
            clipboardNodeCount={nodeClipboard?.nodeIds?.length || 0}
            creatingParentId={creatingParentId}
            deleteActiveWorkspace={deleteActiveWorkspace}
            deleteWorkspaceNode={deleteWorkspaceNode}
            dropTargetParentId={dropTargetParentId}
            expandedFolders={expandedFolders}
            explorerWidth={explorerWidth}
            handleNodeDraftBlur={handleNodeDraftBlur}
            handleWorkspaceDraftBlur={handleWorkspaceDraftBlur}
            canPasteToParent={canPasteToParent}
            copyWorkspaceNodesToClipboard={copyWorkspaceNodesToClipboard}
            cutWorkspaceNodes={cutWorkspaceNodes}
            handleNodeDragOverParent={handleNodeDragOverParent}
            handleNodeDragStart={handleNodeDragStart}
            handleNodeDropOnParent={handleNodeDropOnParent}
            clearNodeDragState={clearNodeDragState}
            isCollapsed={isExplorerLayoutCollapsed}
            isDirty={isDirty}
            isDraggingExplorer={isDraggingExplorer}
            isQueryEnabled={accessConfig.role === 'user'}
            nodeActionId={nodeActionId}
            nodeDraft={nodeDraft}
            onStartExplorerResize={(event) => {
              event.preventDefault()
              setIsDraggingExplorer(true)
            }}
            onNodeClick={handleExplorerNodeClick}
            pasteWorkspaceNodesToParent={pasteWorkspaceNodesToParent}
            openFile={openFile}
            openNodeActionMenuId={openNodeActionMenuId}
            prepareNodeContextSelection={prepareNodeContextSelection}
            rootNodes={rootNodes}
            saveError={saveError}
            saving={saving}
            selectedNodeIds={selectedNodeIds}
            setActiveWorkspaceId={setActiveWorkspaceId}
            setActiveActivity={setActiveActivity}
            setIsCollapsed={setIsExplorerCollapsed}
            setNodeDraft={setNodeDraft}
            setOpenNodeActionMenuId={setOpenNodeActionMenuId}
            setShowWorkspaceActions={setShowWorkspaceActions}
            setWorkspaceDraft={setWorkspaceDraft}
            showWorkspaceActions={showWorkspaceActions}
            startCreateWorkspace={startCreateWorkspace}
            startCreateWorkspaceNode={startCreateWorkspaceNode}
            startRenameWorkspace={startRenameWorkspace}
            startRenameWorkspaceNode={startRenameWorkspaceNode}
            submitNodeDraft={submitNodeDraft}
            submitWorkspaceDraft={submitWorkspaceDraft}
            toggleFolder={toggleFolder}
            workspaceDraft={workspaceDraft}
            workspaceError={workspaceError}
            workspaceLoading={workspaceLoading}
            queryNotificationCount={queryNotificationCount}
            workspaces={workspaces}
            workspacesLoading={workspacesLoading}
          />

          {isQueryActivity ? (
            <IDEquery
              isDark={isDark}
              onNotificationCountChange={setQueryNotificationCount}
              onWorkspaceNodeApplied={handleWorkspaceNodeApplied}
            />
          ) : isWorkspaceActivity ? (
            <IDEWorkspace
              activeWorkspaceId={activeWorkspaceId}
              isActiveWorkspaceDirty={isDirty}
              onSaveActiveWorkspaceFile={saveActiveFile}
              saving={saving}
              workspaceBaseUrl={workspaceBaseUrl}
              workspaces={workspaces}
              workspacesLoading={workspacesLoading}
            />
          ) : isImportExportActivity ? (
            <IDEImportExport
              accessRole={accessConfig.role}
              isActiveWorkspaceDirty={isDirty}
              onSaveActiveWorkspaceFile={saveActiveFile}
              onWorkspaceImported={(workspace) => {
                setWorkspaces((currentWorkspaces) => {
                  if (currentWorkspaces.some((currentWorkspace) => currentWorkspace._id === workspace._id)) {
                    return currentWorkspaces
                  }

                  return [...currentWorkspaces, workspace]
                })
                setActiveWorkspaceId(workspace._id)
              }}
              saving={saving}
              shareBaseUrl={shareBaseUrl}
              workspaceBaseUrl={workspaceBaseUrl}
            />
          ) : (
            <main className="flex min-w-0 flex-1 flex-col">
              <div className="z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    {saveStatus === 'error' ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                    ) : isDirty ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    ) : (
                      <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    )}
                    <h1 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                      {activeNode?.name || 'No file selected'}
                    </h1>
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {activeNode ? `${selectedLanguage.label} · ${statusText}` : 'Create or open a file to start coding'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={formatActiveCode}
                    disabled={!activeNode}
                    title="Format code"
                    aria-label="Format code"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Braces className="h-4 w-4" />
                  </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    title="IDE Settings"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  {showSettings ? (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)} />
                      <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <h3 className="select-none text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Editor Settings
                          </h3>
                          <Keyboard className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="select-none text-sm font-semibold text-slate-700 dark:text-slate-300">Font Size</span>
                          <div className="flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 dark:border-slate-700 dark:bg-slate-950">
                            <button
                              type="button"
                              onClick={handleDecreaseFont}
                              className="flex h-5 w-5 select-none items-center justify-center rounded text-xs font-bold text-slate-600 transition hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                              -
                            </button>
                            <span className="w-8 select-none text-center font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                              {fontSize}px
                            </span>
                            <button
                              type="button"
                              onClick={handleIncreaseFont}
                              className="flex h-5 w-5 select-none items-center justify-center rounded text-xs font-bold text-slate-600 transition hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                          <p className="select-none text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Keyboard Shortcuts
                          </p>
                          <div className="mt-3 space-y-2">
                            {KEYBOARD_SHORTCUTS.map((shortcut) => (
                              <div key={shortcut.label} className="flex items-center justify-between gap-3">
                                <span className="select-none text-xs font-semibold text-slate-600 dark:text-slate-300">
                                  {shortcut.label}
                                </span>
                                <span className="flex shrink-0 items-center gap-1">
                                  {shortcut.keys.map((keyLabel) => (
                                    <kbd
                                      key={`${shortcut.label}-${keyLabel}`}
                                      className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1 font-mono text-[10px] font-black leading-none text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                                    >
                                      {keyLabel}
                                    </kbd>
                                  ))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={saveActiveFile}
                  disabled={!activeNode || !isDirty || saving}
                  title="Save file"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>

                {isRunning ? (
                  <button
                    type="button"
                    onClick={handleStopCode}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm shadow-rose-900/10 transition hover:bg-rose-500 hover:shadow-rose-950/20 active:scale-95"
                  >
                    <Square className="h-4 w-4 fill-white" />
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRunCode}
                    disabled={!socket || !activeNode}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-500 hover:shadow-emerald-950/20 active:scale-95 disabled:bg-slate-400 dark:disabled:bg-slate-700"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    Run
                  </button>
                )}
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              {activeNode ? (
                <Editor
                  height="100%"
                  language={selectedLanguage.monacoLang}
                  theme={isDark ? 'vs-dark' : 'light'}
                  value={code}
                  onMount={(editor, monaco) => {
                    editorRef.current = editor
                    registerBoilerplateSnippets(monaco)
                    formatActionDisposableRef.current?.dispose()
                    formatActionDisposableRef.current = editor.addAction({
                      id: 'jack-format-code',
                      label: 'Format Code',
                      keybindings: [
                        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
                      ],
                      contextMenuGroupId: 'navigation',
                      contextMenuOrder: 1.5,
                      run: () => formatCodeRef.current?.(),
                    })
                  }}
                  onChange={(value) => {
                    setCode(value || '')
                    setSaveStatus('idle')
                  }}
                  options={{
                    fontSize,
                    fontFamily: "'Fira Code', 'Courier New', Courier, monospace",
                    tabSize: 4,
                    insertSpaces: true,
                    detectIndentation: false,
                    minimap: { enabled: false },
                    automaticLayout: true,
                    padding: { top: 12, bottom: 12 },
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    smoothScrolling: true,
                    scrollbar: {
                      verticalScrollbarSize: 10,
                      horizontalScrollbarSize: 10,
                    },
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-white dark:bg-slate-950">
                  <div className="text-center">
                    <FileCode className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                    <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No file selected</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create or open a supported code file.</p>
                  </div>
                </div>
              )}
            </div>
          </main>
          )}
        </div>

        {isQueryActivity || isWorkspaceActivity ? null : (
          <IDEerminal
            handleClearTerminal={handleClearTerminal}
            handleInputKeyDown={handleInputKeyDown}
            inputVal={inputVal}
            isCollapsed={isTerminalLayoutCollapsed}
            isDraggingHeight={isDraggingHeight}
            isRunning={isRunning}
            onStartResize={(event) => {
              event.preventDefault()
              setIsDraggingHeight(true)
            }}
            setInputVal={setInputVal}
            setIsCollapsed={setIsTerminalCollapsed}
            terminalHeight={terminalHeight}
            terminalOutput={terminalOutput}
          />
        )}
      </div>
    </div>
  )
}

export default UserIdePage
