import axios from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'
import {
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileCode,
  Folder,
  FolderOpen,
  Loader2,
  Search,
  Share2,
  Upload,
  Users,
} from 'lucide-react'

const MAX_IMPORT_FILE_SIZE_BYTES = 200 * 1024
const SUPPORTED_IMPORT_EXTENSIONS = new Set(['.c', '.cpp', '.java', '.py', '.js'])
const IGNORED_IMPORT_NAMES = new Set(['.ds_store', 'thumbs.db'])

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

const sortNodes = (nodes) => [...nodes].sort((first, second) => {
  if (first.type !== second.type) {
    return first.type === 'folder' ? -1 : 1
  }

  return String(first.name || '').localeCompare(String(second.name || ''))
})

const getSelectionKey = (selection) => (
  selection.type === 'workspace'
    ? `workspace:${selection.workspaceId}`
    : `node:${selection.workspaceId}:${selection.nodeId}`
)

const getShareUrl = (share) => {
  const linkPath = share?.linkPath || `/shared-ide/${share?.token || ''}`
  return `${window.location.origin}${linkPath}`
}

const getTokenFromLink = (value) => {
  const trimmedValue = String(value || '').trim()

  if (!trimmedValue) {
    return ''
  }

  try {
    const url = new URL(trimmedValue, window.location.origin)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const sharedIdeIndex = pathParts.indexOf('shared-ide')

    if (sharedIdeIndex >= 0 && pathParts[sharedIdeIndex + 1]) {
      return pathParts[sharedIdeIndex + 1]
    }
  } catch {
    // Plain tokens are accepted below.
  }

  return trimmedValue.replace(/^\/?shared-ide\//u, '').split(/[/?#]/u)[0]
}

const formatShareCounts = (share) => {
  const counts = share?.counts || {}
  const parts = [
    counts.workspaces ? `${counts.workspaces} workspace${counts.workspaces === 1 ? '' : 's'}` : '',
    counts.folders ? `${counts.folders} folder${counts.folders === 1 ? '' : 's'}` : '',
    counts.files ? `${counts.files} file${counts.files === 1 ? '' : 's'}` : '',
  ].filter(Boolean)

  return parts.length ? parts.join(', ') : 'Shared IDE content'
}

const getFileExtension = (name) => {
  const normalizedName = String(name || '').trim().toLowerCase()
  const dotIndex = normalizedName.lastIndexOf('.')

  if (dotIndex <= 0) {
    return ''
  }

  return normalizedName.slice(dotIndex)
}

const isSupportedImportFile = (name) => SUPPORTED_IMPORT_EXTENSIONS.has(getFileExtension(name))

const getCleanPathParts = (path) => String(path || '')
  .replace(/\\/g, '/')
  .split('/')
  .map((part) => part.trim())
  .filter(Boolean)

const getWorkspaceNameFromFileName = (fileName) => String(fileName || 'workspace')
  .replace(/\.zip$/iu, '')
  .replace(/[\\/]+/g, '-')
  .trim() || 'workspace'

const shouldIgnoreImportPath = (parts) => (
  !parts.length
  || parts.includes('__MACOSX')
  || IGNORED_IMPORT_NAMES.has(String(parts[parts.length - 1] || '').toLowerCase())
)

const getCommonRoot = (pathPartsList) => {
  const firstSegments = pathPartsList
    .map((parts) => parts[0])
    .filter(Boolean)
  const uniqueFirstSegments = new Set(firstSegments)

  if (uniqueFirstSegments.size !== 1) {
    return ''
  }

  return firstSegments[0] || ''
}

const stripCommonRoot = (parts, commonRoot) => (
  commonRoot && parts[0] === commonRoot ? parts.slice(1) : parts
)

const formatSkippedMessage = (skippedFiles) => {
  if (!skippedFiles.length) {
    return ''
  }

  const preview = skippedFiles.slice(0, 3).join(', ')
  const remainingCount = skippedFiles.length - 3

  return remainingCount > 0
    ? `${skippedFiles.length} unsupported file${skippedFiles.length === 1 ? '' : 's'} skipped: ${preview}, +${remainingCount} more`
    : `${skippedFiles.length} unsupported file${skippedFiles.length === 1 ? '' : 's'} skipped: ${preview}`
}

const IDEImportExport = ({
  accessRole = 'user',
  isActiveWorkspaceDirty = false,
  onWorkspaceImported,
  onSaveActiveWorkspaceFile,
  saving = false,
  shareBaseUrl,
  workspaceBaseUrl,
}) => {
  const [workspaces, setWorkspaces] = useState([])
  const [nodesByWorkspaceId, setNodesByWorkspaceId] = useState({})
  const [contacts, setContacts] = useState([])
  const [receivedShares, setReceivedShares] = useState([])
  const [selectedItemsByKey, setSelectedItemsByKey] = useState({})
  const [expandedWorkspaceIds, setExpandedWorkspaceIds] = useState(() => new Set())
  const [expandedFolderIds, setExpandedFolderIds] = useState(() => new Set())
  const [exportStep, setExportStep] = useState(1)
  const [sharedWithYouOpen, setSharedWithYouOpen] = useState(true)
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([])
  const [generatedLink, setGeneratedLink] = useState('')
  const [pastedLink, setPastedLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [shareLoadingMode, setShareLoadingMode] = useState('')
  const [workspaceImportLoading, setWorkspaceImportLoading] = useState(false)
  const [workspaceImportMessage, setWorkspaceImportMessage] = useState('')
  const [workspaceImportSummary, setWorkspaceImportSummary] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [error, setError] = useState('')
  const [importError, setImportError] = useState('')
  const zipInputRef = useRef(null)
  const folderInputRef = useRef(null)

  const recipientRole = accessRole === 'faculty' ? 'user' : 'faculty'
  const recipientLabel = accessRole === 'faculty' ? 'users' : 'faculty'
  const selectedItems = useMemo(() => Object.values(selectedItemsByKey), [selectedItemsByKey])
  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase()

    if (!query) {
      return contacts
    }

    return contacts.filter((contact) => (
      `${contact.name || ''} ${contact.phone || ''}`.toLowerCase().includes(query)
    ))
  }, [contactSearch, contacts])
  const selectedContacts = useMemo(() => {
    const selectedIds = new Set(selectedRecipientIds)

    return contacts.filter((contact) => selectedIds.has(contact._id))
  }, [contacts, selectedRecipientIds])
  const treeState = useMemo(() => {
    const nextState = {}

    workspaces.forEach((workspace) => {
      const nodes = sortNodes(nodesByWorkspaceId[workspace._id] || [])
      const childrenByParentId = new Map()

      nodes.forEach((node) => {
        const parentKey = node.parentId || 'root'
        const children = childrenByParentId.get(parentKey) || []
        children.push(node)
        childrenByParentId.set(parentKey, children)
      })

      nextState[workspace._id] = {
        nodes,
        childrenByParentId,
      }
    })

    return nextState
  }, [nodesByWorkspaceId, workspaces])

  const loadImportExportData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [workspacesResponse, contactsResponse, receivedResponse] = await Promise.all([
        axios.get(`${workspaceBaseUrl}/workspaces`, { withCredentials: true }),
        axios.get(`${shareBaseUrl}/contacts`, { withCredentials: true }),
        axios.get(`${shareBaseUrl}/imports`, { withCredentials: true }),
      ])

      if (!workspacesResponse.data?.success) {
        throw new Error(workspacesResponse.data?.message || 'Unable to load workspaces')
      }

      if (!contactsResponse.data?.success) {
        throw new Error(contactsResponse.data?.message || 'Unable to load contacts')
      }

      const nextWorkspaces = workspacesResponse.data?.data?.workspaces || []
      const nodeResponses = await Promise.all(nextWorkspaces.map((workspace) => (
        axios.get(`${workspaceBaseUrl}/workspaces/${workspace._id}/nodes`, { withCredentials: true })
      )))
      const nextNodesByWorkspaceId = {}

      nodeResponses.forEach((response, index) => {
        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to load workspace files')
        }

        nextNodesByWorkspaceId[nextWorkspaces[index]._id] = response.data?.data?.nodes || []
      })

      setWorkspaces(nextWorkspaces)
      setNodesByWorkspaceId(nextNodesByWorkspaceId)
      setContacts(contactsResponse.data?.data?.contacts || [])
      setReceivedShares(receivedResponse.data?.data?.shares || [])
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load IDE import/export data.'))
    } finally {
      setLoading(false)
    }
  }, [shareBaseUrl, workspaceBaseUrl])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      loadImportExportData()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)
    }
  }, [loadImportExportData])

  useEffect(() => {
    if (!folderInputRef.current) {
      return
    }

    folderInputRef.current.setAttribute('webkitdirectory', '')
    folderInputRef.current.setAttribute('directory', '')
  }, [])

  const toggleSelection = (selection) => {
    const key = getSelectionKey(selection)

    setSelectedItemsByKey((currentItems) => {
      const nextItems = { ...currentItems }

      if (nextItems[key]) {
        delete nextItems[key]
      } else {
        nextItems[key] = selection
      }

      return nextItems
    })
  }

  const toggleWorkspaceExpanded = (workspaceId) => {
    setExpandedWorkspaceIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (nextIds.has(workspaceId)) {
        nextIds.delete(workspaceId)
      } else {
        nextIds.add(workspaceId)
      }

      return nextIds
    })
  }

  const toggleFolderExpanded = (nodeId) => {
    setExpandedFolderIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (nextIds.has(nodeId)) {
        nextIds.delete(nodeId)
      } else {
        nextIds.add(nodeId)
      }

      return nextIds
    })
  }

  const copyLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopyStatus('Link copied')
    } catch {
      setCopyStatus('Link created')
    }
  }

  const createShare = async (mode) => {
    setError('')
    setCopyStatus('')

    if (!selectedItems.length) {
      setError('Select at least one workspace, folder or file before creating a share link.')
      return
    }

    if (mode === 'direct' && !selectedRecipientIds.length) {
      setError(`Select ${accessRole === 'faculty' ? 'at least one user' : 'one faculty'} before direct sharing.`)
      return
    }

    setShareLoadingMode(mode)

    try {
      const response = await axios.post(`${shareBaseUrl}/exports`, {
        selections: selectedItems,
        recipientRole: mode === 'direct' ? recipientRole : '',
        recipientIds: mode === 'direct' ? selectedRecipientIds : [],
      }, { withCredentials: true })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to create IDE share')
      }

      const share = response.data?.data?.share
      const link = getShareUrl(share)

      setGeneratedLink(link)
      await copyLink(link)
    } catch (shareError) {
      setError(getErrorMessage(shareError, 'Unable to create IDE share.'))
    } finally {
      setShareLoadingMode('')
    }
  }

  const toggleRecipient = (contact) => {
    setSelectedRecipientIds((currentIds) => {
      if (accessRole !== 'faculty') {
        return [contact._id]
      }

      if (currentIds.includes(contact._id)) {
        return currentIds.filter((id) => id !== contact._id)
      }

      return [...currentIds, contact._id]
    })

    if (accessRole !== 'faculty') {
      setContactDropdownOpen(false)
    }
  }

  const openShareToken = (token) => {
    if (!token) {
      return
    }

    window.open(`/shared-ide/${token}`, '_blank', 'noopener,noreferrer')
  }

  const openPastedShare = (event) => {
    event.preventDefault()
    setImportError('')

    const token = getTokenFromLink(pastedLink)

    if (!token) {
      setImportError('Paste a valid shared IDE link or token.')
      return
    }

    openShareToken(token)
  }

  const importWorkspacePayload = async (payload, skippedFiles = []) => {
    setImportError('')
    setWorkspaceImportMessage('')
    setWorkspaceImportSummary('')
    setWorkspaceImportLoading(true)

    try {
      if (!payload.entries.length) {
        throw new Error('Select a folder or ZIP file with supported .c, .cpp, .java, .py or .js files.')
      }

      if (isActiveWorkspaceDirty) {
        const didSave = await onSaveActiveWorkspaceFile?.()

        if (!didSave) {
          throw new Error('Save the current file before importing a workspace.')
        }
      }

      const response = await axios.post(`${workspaceBaseUrl}/workspaces/import`, payload, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to import workspace')
      }

      const importedWorkspace = response.data?.data?.workspace
      const counts = response.data?.data?.counts || {}

      if (!importedWorkspace?._id) {
        throw new Error('Workspace was imported without a valid response')
      }

      setWorkspaceImportMessage(`${importedWorkspace.name} imported as a new workspace.`)
      setWorkspaceImportSummary([
        `${counts.files || 0} file${counts.files === 1 ? '' : 's'}`,
        `${counts.folders || 0} folder${counts.folders === 1 ? '' : 's'}`,
        formatSkippedMessage(skippedFiles),
      ].filter(Boolean).join(' | '))
      onWorkspaceImported?.(importedWorkspace)
      await loadImportExportData()
    } catch (workspaceImportError) {
      setImportError(getErrorMessage(workspaceImportError, 'Unable to import workspace.'))
    } finally {
      setWorkspaceImportLoading(false)
      if (zipInputRef.current) {
        zipInputRef.current.value = ''
      }
      if (folderInputRef.current) {
        folderInputRef.current.value = ''
      }
    }
  }

  const buildPayloadFromFolderFiles = async (fileList) => {
    const files = Array.from(fileList || [])

    if (!files.length) {
      throw new Error('Select a folder before importing.')
    }

    const rawPathPartsList = files.map((file) => getCleanPathParts(file.webkitRelativePath || file.name))
    const commonRoot = getCommonRoot(rawPathPartsList.filter((parts) => parts.length > 1))
    const entries = []
    const skippedFiles = []

    for (const file of files) {
      const rawParts = getCleanPathParts(file.webkitRelativePath || file.name)
      const pathParts = stripCommonRoot(rawParts, commonRoot)

      if (shouldIgnoreImportPath(pathParts)) {
        continue
      }

      const fileName = pathParts[pathParts.length - 1]

      if (!isSupportedImportFile(fileName)) {
        skippedFiles.push(pathParts.join('/'))
        continue
      }

      if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
        skippedFiles.push(`${pathParts.join('/')} (too large)`)
        continue
      }

      entries.push({
        type: 'file',
        path: pathParts.join('/'),
        content: await file.text(),
      })
    }

    return {
      payload: {
        name: commonRoot || getWorkspaceNameFromFileName(files[0]?.name),
        entries,
      },
      skippedFiles,
    }
  }

  const buildPayloadFromZipFile = async (file) => {
    if (!file) {
      throw new Error('Select a ZIP file before importing.')
    }

    const zip = await JSZip.loadAsync(file)
    const zipEntries = Object.values(zip.files)
    const pathPartsList = zipEntries
      .map((entry) => getCleanPathParts(entry.name))
      .filter((parts) => !shouldIgnoreImportPath(parts))
    const commonRoot = getCommonRoot(pathPartsList.filter((parts) => parts.length > 1))
    const entries = []
    const skippedFiles = []

    for (const zipEntry of zipEntries) {
      const rawParts = getCleanPathParts(zipEntry.name)
      const pathParts = stripCommonRoot(rawParts, commonRoot)

      if (shouldIgnoreImportPath(pathParts)) {
        continue
      }

      if (zipEntry.dir) {
        if (pathParts.length) {
          entries.push({
            type: 'folder',
            path: pathParts.join('/'),
          })
        }
        continue
      }

      const fileName = pathParts[pathParts.length - 1]

      if (!isSupportedImportFile(fileName)) {
        skippedFiles.push(pathParts.join('/'))
        continue
      }

      const content = await zipEntry.async('string')
      const contentSize = new Blob([content]).size

      if (contentSize > MAX_IMPORT_FILE_SIZE_BYTES) {
        skippedFiles.push(`${pathParts.join('/')} (too large)`)
        continue
      }

      entries.push({
        type: 'file',
        path: pathParts.join('/'),
        content,
      })
    }

    return {
      payload: {
        name: commonRoot || getWorkspaceNameFromFileName(file.name),
        entries,
      },
      skippedFiles,
    }
  }

  const handleFolderImport = async (event) => {
    try {
      const { payload, skippedFiles } = await buildPayloadFromFolderFiles(event.target.files)
      await importWorkspacePayload(payload, skippedFiles)
    } catch (folderImportError) {
      setImportError(getErrorMessage(folderImportError, 'Unable to read selected folder.'))
      setWorkspaceImportMessage('')
      setWorkspaceImportSummary('')
      if (folderInputRef.current) {
        folderInputRef.current.value = ''
      }
    }
  }

  const handleZipImport = async (event) => {
    try {
      const selectedFile = event.target.files?.[0]
      const { payload, skippedFiles } = await buildPayloadFromZipFile(selectedFile)
      await importWorkspacePayload(payload, skippedFiles)
    } catch (zipImportError) {
      setImportError(getErrorMessage(zipImportError, 'Unable to read selected ZIP file.'))
      setWorkspaceImportMessage('')
      setWorkspaceImportSummary('')
      if (zipInputRef.current) {
        zipInputRef.current.value = ''
      }
    }
  }

  const renderWorkspaceNode = (workspace, node, depth = 0) => {
    const isFolder = node.type === 'folder'
    const children = treeState[workspace._id]?.childrenByParentId.get(node._id) || []
    const isExpanded = expandedFolderIds.has(node._id)
    const selection = {
      type: isFolder ? 'folder' : 'file',
      workspaceId: workspace._id,
      nodeId: node._id,
    }
    const isSelected = Boolean(selectedItemsByKey[getSelectionKey(selection)])

    return (
      <div key={node._id}>
        <div
          className="flex h-9 items-center gap-2 pr-3 text-sm text-slate-700 dark:text-slate-200"
          style={{ paddingLeft: `${24 + depth * 18}px` }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelection(selection)}
            aria-label={`Select ${node.name}`}
            className="h-4 w-4 shrink-0 rounded-full border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => (isFolder ? toggleFolderExpanded(node._id) : undefined)}
            className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-md text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
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
            <span className="truncate font-medium">{node.name}</span>
          </button>
        </div>
        {isFolder && isExpanded ? (
          children.length ? children.map((childNode) => renderWorkspaceNode(workspace, childNode, depth + 1)) : (
            <p
              className="h-8 text-xs font-medium text-slate-400 dark:text-slate-500"
              style={{ paddingLeft: `${74 + depth * 18}px` }}
            >
              Empty folder
            </p>
          )
        ) : null}
      </div>
    )
  }

  return (
    <main className="min-w-0 flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 px-3 py-3 sm:px-5 sm:py-4">
        <section className="shrink-0 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-slate-950 dark:text-slate-50">IDE Import / Export</h1>
              <p className="mt-1 truncate text-sm font-medium text-slate-500 dark:text-slate-400">
                Export selected IDE content or open content shared with you.
              </p>
            </div>
            <button
              type="button"
              onClick={loadImportExportData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </section>

        {error ? (
          <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <section className="grid min-h-0 flex-1 grid-rows-2 gap-4 lg:grid-cols-2 lg:grid-rows-1">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="shrink-0 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">Exports</h2>
                  <p className="mt-1 truncate text-sm font-medium text-slate-500 dark:text-slate-400">
                    Step {exportStep} of 2
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExportStep(1)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${
                      exportStep === 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                    aria-label="Go to export step 1"
                  >
                    1
                  </button>
                  <span className="h-0.5 w-6 bg-slate-200 dark:bg-slate-800" />
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedItems.length) {
                        setExportStep(2)
                      }
                    }}
                    disabled={!selectedItems.length}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${
                      exportStep === 2
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                    aria-label="Go to export step 2"
                  >
                    2
                  </button>
                </div>
              </div>
            </div>

            {exportStep === 1 ? (
              <>
                <div className="shrink-0 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">Choose content</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {selectedItems.length} selected item{selectedItems.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedItemsByKey({})}
                      disabled={!selectedItems.length}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto border-y border-slate-100 py-2 dark:border-slate-800">
                  {loading ? (
                    <div className="flex items-center gap-2 px-4 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading workspaces...
                    </div>
                  ) : workspaces.length ? (
                    workspaces.map((workspace) => {
                      const workspaceSelection = { type: 'workspace', workspaceId: workspace._id }
                      const isWorkspaceSelected = Boolean(selectedItemsByKey[getSelectionKey(workspaceSelection)])
                      const isExpanded = expandedWorkspaceIds.has(workspace._id)
                      const rootNodes = treeState[workspace._id]?.childrenByParentId.get('root') || []

                      return (
                        <div key={workspace._id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800/70">
                          <div className="flex h-11 items-center gap-2 px-4 text-sm text-slate-800 dark:text-slate-100">
                            <input
                              type="checkbox"
                              checked={isWorkspaceSelected}
                              onChange={() => toggleSelection(workspaceSelection)}
                              aria-label={`Select ${workspace.name}`}
                              className="h-4 w-4 shrink-0 rounded-full border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => toggleWorkspaceExpanded(workspace._id)}
                              className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
                              <FolderOpen className="h-4 w-4 shrink-0 text-blue-500" />
                              <span className="truncate font-bold">{workspace.name}</span>
                              <span className="shrink-0 text-xs font-semibold text-slate-400">
                                {treeState[workspace._id]?.nodes.length || 0} items
                              </span>
                            </button>
                          </div>
                          {isExpanded ? (
                            rootNodes.length ? rootNodes.map((node) => renderWorkspaceNode(workspace, node)) : (
                              <p className="px-16 pb-4 text-sm font-medium text-slate-400 dark:text-slate-500">
                                No files in this workspace
                              </p>
                            )
                          ) : null}
                        </div>
                      )
                    })
                  ) : (
                    <p className="px-4 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      No workspaces available to export.
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2 p-4">
                  <button
                    type="button"
                    onClick={() => setExportStep(2)}
                    disabled={!selectedItems.length}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500 disabled:bg-slate-400"
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Create and share link</p>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {selectedItems.length} selected item{selectedItems.length === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Generate copyable link</p>
                      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                        Anyone with this link can view the exported content.
                      </p>
                      <button
                        type="button"
                        onClick={() => createShare('link')}
                        disabled={Boolean(shareLoadingMode) || !selectedItems.length}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-500 disabled:bg-slate-400"
                      >
                        {shareLoadingMode === 'link' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                        Generate and copy
                      </button>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Share directly</p>
                      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                        {accessRole === 'faculty'
                          ? 'Select one or more users.'
                          : 'Select one faculty.'}
                      </p>

                      <div className="relative mt-3">
                        <button
                          type="button"
                          onClick={() => setContactDropdownOpen((currentValue) => !currentValue)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <span className="min-w-0 truncate">
                            {selectedContacts.length
                              ? selectedContacts.map((contact) => contact.name || contact.phone).join(', ')
                              : `Select ${recipientLabel}`}
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                        </button>

                        {contactDropdownOpen ? (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setContactDropdownOpen(false)} />
                            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950">
                              <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                                <Search className="h-4 w-4 text-slate-400" />
                                <input
                                  value={contactSearch}
                                  onChange={(event) => setContactSearch(event.target.value)}
                                  placeholder={`Search ${recipientLabel}`}
                                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
                                />
                              </div>
                              <div className="max-h-56 overflow-y-auto py-1">
                                {filteredContacts.length ? filteredContacts.map((contact) => {
                                  const isSelected = selectedRecipientIds.includes(contact._id)

                                  return (
                                    <button
                                      type="button"
                                      key={contact._id}
                                      onClick={() => toggleRecipient(contact)}
                                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                        isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                                      }`}
                                      >
                                        {isSelected ? <Check className="h-3 w-3" /> : null}
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate font-bold text-slate-800 dark:text-slate-100">{contact.name || 'Unnamed'}</span>
                                        <span className="block truncate text-xs font-medium text-slate-500 dark:text-slate-400">{contact.phone}</span>
                                      </span>
                                    </button>
                                  )
                                }) : (
                                  <p className="px-3 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400">No contacts found</p>
                                )}
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => createShare('direct')}
                        disabled={Boolean(shareLoadingMode) || !selectedItems.length || !selectedRecipientIds.length}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:bg-slate-400"
                      >
                        {shareLoadingMode === 'direct' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                        Share directly
                      </button>
                    </div>

                    {generatedLink ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{copyStatus || 'Link ready'}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={generatedLink}
                            readOnly
                            className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none dark:border-emerald-900 dark:bg-slate-950 dark:text-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => copyLink(generatedLink)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white transition hover:bg-emerald-600"
                            title="Copy link"
                            aria-label="Copy link"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setExportStep(1)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Back
                  </button>
                  <span className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'} selected
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="shrink-0 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
              <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">Imports</h2>
              <p className="mt-1 truncate text-sm font-medium text-slate-500 dark:text-slate-400">
                Open a shared IDE link or a direct share.
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
              <form onSubmit={openPastedShare} className="shrink-0 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Option 1: Paste shared link</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={pastedLink}
                    onChange={(event) => setPastedLink(event.target.value)}
                    placeholder="Paste /shared-ide/... link"
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </button>
                </div>
              </form>

              <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSharedWithYouOpen((currentValue) => !currentValue)}
                  className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-3 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                  aria-expanded={sharedWithYouOpen}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">Option 2: Shared with you</span>
                    <span className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {receivedShares.length} direct share{receivedShares.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  {sharedWithYouOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
                </button>

                {sharedWithYouOpen ? (
                  <div className="h-56 overflow-y-auto p-3 sm:h-64 lg:h-auto lg:min-h-0 lg:flex-1">
                    {receivedShares.length ? (
                      <div className="space-y-2">
                        {receivedShares.map((share) => (
                          <button
                            type="button"
                            key={share._id}
                            onClick={() => openShareToken(share.token)}
                            className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                                {share.createdByName || share.createdByPhone || 'Shared IDE'}
                              </span>
                              <span className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {formatShareCounts(share)}
                              </span>
                            </span>
                            <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No direct IDE shares yet.</p>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Option 3: Import workspace</p>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                      Upload a ZIP workspace or a folder with IDE files.
                    </p>
                  </div>
                  {workspaceImportLoading ? (
                    <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing
                    </span>
                  ) : null}
                </div>

                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={handleZipImport}
                  disabled={workspaceImportLoading || saving}
                  className="hidden"
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  onChange={handleFolderImport}
                  disabled={workspaceImportLoading || saving}
                  className="hidden"
                />

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => zipInputRef.current?.click()}
                    disabled={workspaceImportLoading || saving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-500 disabled:bg-slate-400"
                  >
                    <Archive className="h-4 w-4" />
                    Upload ZIP
                  </button>
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={workspaceImportLoading || saving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Folder
                  </button>
                </div>

                {workspaceImportMessage ? (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{workspaceImportMessage}</p>
                    {workspaceImportSummary ? (
                      <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{workspaceImportSummary}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {importError ? (
                <p className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
                  {importError}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default IDEImportExport
