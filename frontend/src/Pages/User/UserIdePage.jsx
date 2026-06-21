import axios from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { io } from 'socket.io-client'
import {
  AlertTriangle,
  Braces,
  Check,
  FileCode,
  Play,
  Save,
  Settings,
  Square,
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

  return normalizedLines.map((line) => {
    const shouldDedent = line.startsWith('}')
    indentLevel = shouldDedent ? Math.max(0, indentLevel - 1) : indentLevel

    const formattedLine = `${'    '.repeat(indentLevel)}${line}`

    if (line.endsWith('{')) {
      indentLevel += 1
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

  const deleteActiveWorkspace = async () => {
    if (!activeWorkspace) {
      return
    }

    setShowWorkspaceActions(false)
    const confirmed = window.confirm(`Delete workspace ${activeWorkspace.name} and all files inside it?`)

    if (!confirmed) {
      return
    }

    setWorkspacesLoading(true)
    setWorkspaceError('')

    try {
      const response = await axios.delete(`${workspaceBaseUrl}/workspaces/${activeWorkspace._id}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete workspace')
      }

      const remainingWorkspaces = workspaces.filter((workspace) => workspace._id !== activeWorkspace._id)

      setWorkspaces(remainingWorkspaces)
      setActiveWorkspaceId(remainingWorkspaces[0]?._id || '')
    } catch (deleteError) {
      setWorkspaceError(getErrorMessage(deleteError, 'Unable to delete workspace.'))
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

  const deleteWorkspaceNode = async (node) => {
    setOpenNodeActionMenuId('')
    const confirmed = window.confirm(`Delete ${node.name}${node.type === 'folder' ? ' and everything inside it' : ''}?`)

    if (!confirmed) {
      return
    }

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

      if (activeNodeId && deletedIds.includes(activeNodeId)) {
        const nextActiveFile = sortWorkspaceNodes(remainingNodes).find((currentNode) => currentNode.type === 'file') || null
        activateFile(nextActiveFile, remainingNodes)
      }
    } catch (deleteError) {
      setWorkspaceError(getErrorMessage(deleteError, 'Unable to delete workspace item.'))
    } finally {
      setNodeActionId('')
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

  const handleRunCode = () => {
    if (!socket || isRunning || !activeNode) return

    setIsTerminalCollapsed(false)
    setTerminalOutput(`--- Running ${activeNode.name} ---\n`)
    setIsRunning(true)
    setInputVal('')

    socket.emit('run-code', {
      language: activeNode.language,
      code,
    })
  }

  const handleStopCode = () => {
    if (!socket || !isRunning) return
    socket.emit('stop-code')
  }

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
            creatingParentId={creatingParentId}
            deleteActiveWorkspace={deleteActiveWorkspace}
            deleteWorkspaceNode={deleteWorkspaceNode}
            expandedFolders={expandedFolders}
            explorerWidth={explorerWidth}
            handleNodeDraftBlur={handleNodeDraftBlur}
            handleWorkspaceDraftBlur={handleWorkspaceDraftBlur}
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
            openFile={openFile}
            openNodeActionMenuId={openNodeActionMenuId}
            rootNodes={rootNodes}
            saveError={saveError}
            saving={saving}
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
                      <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        <h3 className="mb-3 select-none text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Editor Settings
                        </h3>
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
