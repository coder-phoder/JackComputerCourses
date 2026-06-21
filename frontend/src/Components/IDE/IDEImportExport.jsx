import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
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
  Users,
} from 'lucide-react'

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

const IDEImportExport = ({
  accessRole = 'user',
  shareBaseUrl,
  workspaceBaseUrl,
}) => {
  const [workspaces, setWorkspaces] = useState([])
  const [nodesByWorkspaceId, setNodesByWorkspaceId] = useState({})
  const [contacts, setContacts] = useState([])
  const [createdShares, setCreatedShares] = useState([])
  const [receivedShares, setReceivedShares] = useState([])
  const [selectedItemsByKey, setSelectedItemsByKey] = useState({})
  const [expandedWorkspaceIds, setExpandedWorkspaceIds] = useState(() => new Set())
  const [expandedFolderIds, setExpandedFolderIds] = useState(() => new Set())
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([])
  const [generatedLink, setGeneratedLink] = useState('')
  const [pastedLink, setPastedLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [shareLoadingMode, setShareLoadingMode] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [error, setError] = useState('')
  const [importError, setImportError] = useState('')

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
      const [workspacesResponse, contactsResponse, createdResponse, receivedResponse] = await Promise.all([
        axios.get(`${workspaceBaseUrl}/workspaces`, { withCredentials: true }),
        axios.get(`${shareBaseUrl}/contacts`, { withCredentials: true }),
        axios.get(`${shareBaseUrl}/exports`, { withCredentials: true }),
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
      setCreatedShares(createdResponse.data?.data?.shares || [])
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
      setCreatedShares((currentShares) => [share, ...currentShares].slice(0, 30))
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
    <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-5">
        <section className="border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-950 dark:text-slate-50">IDE Import / Export</h1>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                Share selected workspace content or open IDE content shared with you.
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
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">1</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Choose content to export</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Workspaces and folders start collapsed. Select any full workspace, folder or individual file.
                  </p>
                </div>
              </div>
            </div>

            <div className="max-h-[520px] overflow-y-auto py-2">
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
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">2</span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Create and share link</h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {selectedItems.length} selected item{selectedItems.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Case 1: Generate copyable link</p>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Anyone with this link can view the exported content in read-only mode.
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
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Case 2: Share directly</p>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {accessRole === 'faculty'
                      ? 'Faculty can share with one or more users.'
                      : 'Users can share with one faculty at a time.'}
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

            <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Imports</h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Open a shared IDE link or choose one shared directly with you.</p>
              </div>

              <div className="space-y-4 p-4">
                <form onSubmit={openPastedShare} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Option 1: Paste shared link</p>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={pastedLink}
                      onChange={(event) => setPastedLink(event.target.value)}
                      placeholder="Paste /shared-ide/... link"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </button>
                  </div>
                  {importError ? <p className="mt-2 text-sm font-semibold text-red-600 dark:text-red-300">{importError}</p> : null}
                </form>

                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Option 2: Shared with you</p>
                  <div className="mt-3 space-y-2">
                    {receivedShares.length ? receivedShares.map((share) => (
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
                    )) : (
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No direct IDE shares yet.</p>
                    )}
                  </div>
                </div>

                {createdShares.length ? (
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Recent exports</p>
                    <div className="mt-3 space-y-2">
                      {createdShares.slice(0, 3).map((share) => (
                        <button
                          type="button"
                          key={share._id}
                          onClick={() => copyLink(getShareUrl(share))}
                          className="flex w-full items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-left transition hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">{formatShareCounts(share)}</span>
                            <span className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">Copy export link</span>
                          </span>
                          <Copy className="h-4 w-4 shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default IDEImportExport
