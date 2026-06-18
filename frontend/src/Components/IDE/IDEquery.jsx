import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  ChevronDown,
  ChevronRight,
  Check,
  Clock,
  FileCode,
  Inbox,
  RefreshCw,
  Search,
  Send,
  X,
} from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000'

const STATUS_META = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  accepted: { label: 'Accepted by faculty', className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  declined: { label: 'Declined by faculty', className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  changes_submitted: { label: 'Review ready', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  changes_accepted: { label: 'Changes applied', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
  changes_declined: { label: 'Changes declined', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
}

const MAIN_QUERY_STATUS_PRIORITY = ['changes_submitted', 'accepted', 'pending']

const MONACO_LANGUAGE = {
  c: 'c',
  cpp: 'cpp',
  java: 'java',
  python: 'python',
  javascript: 'javascript',
}

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

const getPriorityQueryStatus = (queries) => (
  MAIN_QUERY_STATUS_PRIORITY.find((status) => queries.some((query) => query.status === status)) || ''
)

const getPriorityQueryId = (queries, preferredQueryId = '') => {
  const priorityStatus = getPriorityQueryStatus(queries)

  if (!priorityStatus) {
    return ''
  }

  const preferredQuery = queries.find((query) => query._id === preferredQueryId)

  if (preferredQuery?.status === priorityStatus) {
    return preferredQuery._id
  }

  return queries.find((query) => query.status === priorityStatus)?._id || ''
}

const QueryStatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

const IDEquery = ({ isDark = false, onNotificationCountChange, onWorkspaceNodeApplied }) => {
  const [queries, setQueries] = useState([])
  const [files, setFiles] = useState([])
  const [faculties, setFaculties] = useState([])
  const [fileSearch, setFileSearch] = useState('')
  const [facultySearch, setFacultySearch] = useState('')
  const [fileDropdownOpen, setFileDropdownOpen] = useState(false)
  const [facultyDropdownOpen, setFacultyDropdownOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedFaculty, setSelectedFaculty] = useState(null)
  const [message, setMessage] = useState('')
  const [selectedQueryId, setSelectedQueryId] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchingFiles, setSearchingFiles] = useState(false)
  const [searchingFaculties, setSearchingFaculties] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [busyQueryId, setBusyQueryId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [createQueryOpen, setCreateQueryOpen] = useState(false)
  const [querySectionOpen, setQuerySectionOpen] = useState('active')

  const selectedQuery = useMemo(
    () => queries.find((query) => query._id === selectedQueryId) || null,
    [queries, selectedQueryId],
  )
  const mainQuery = useMemo(() => {
    const priorityStatus = getPriorityQueryStatus(queries)

    if (!priorityStatus) {
      return null
    }

    if (selectedQuery?.status === priorityStatus) {
      return selectedQuery
    }

    return queries.find((query) => query.status === priorityStatus) || null
  }, [queries, selectedQuery])
  const mainFile = mainQuery ? null : selectedFile
  const activeQueries = useMemo(
    () => queries.filter((query) => ['pending', 'accepted', 'changes_submitted'].includes(query.status)),
    [queries],
  )
  const historyQueries = useMemo(
    () => queries.filter((query) => !['pending', 'accepted', 'changes_submitted'].includes(query.status)),
    [queries],
  )

  const syncQueries = useCallback((nextQueries, actionRequiredCount) => {
    setQueries(nextQueries)
    onNotificationCountChange?.(actionRequiredCount)

    setSelectedQueryId((currentId) => getPriorityQueryId(nextQueries, currentId))
  }, [onNotificationCountChange])

  const fetchQueries = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await axios.get(`${API_BASE_URL}/user/queries`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to load queries')
      }

      syncQueries(response.data?.data?.queries || [], response.data?.data?.actionRequiredCount || 0)
    } catch (queryError) {
      setError(getErrorMessage(queryError, 'Unable to load queries.'))
      syncQueries([], 0)
    } finally {
      setLoading(false)
    }
  }, [syncQueries])

  const searchFiles = useCallback(async (searchValue) => {
    setSearchingFiles(true)

    try {
      const response = await axios.get(`${API_BASE_URL}/user/queries/files/search`, {
        params: { search: searchValue },
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to search files')
      }

      setFiles(response.data?.data?.files || [])
    } catch (fileError) {
      setError(getErrorMessage(fileError, 'Unable to search files.'))
      setFiles([])
    } finally {
      setSearchingFiles(false)
    }
  }, [])

  const searchFaculties = useCallback(async (searchValue) => {
    setSearchingFaculties(true)

    try {
      const response = await axios.get(`${API_BASE_URL}/user/queries/faculties/search`, {
        params: { search: searchValue },
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to search faculties')
      }

      setFaculties(response.data?.data?.faculties || [])
    } catch (facultyError) {
      setError(getErrorMessage(facultyError, 'Unable to search faculties.'))
      setFaculties([])
    } finally {
      setSearchingFaculties(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchQueries()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchQueries])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      searchFiles(fileSearch)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [fileSearch, searchFiles])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      searchFaculties(facultySearch)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [facultySearch, searchFaculties])

  const resetForm = () => {
    setSelectedFile(null)
    setSelectedFaculty(null)
    setFileSearch('')
    setFacultySearch('')
    setFileDropdownOpen(false)
    setFacultyDropdownOpen(false)
    setMessage('')
  }

  const submitQuery = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedFile?._id) {
      setError('Select a code file before sending the query.')
      return
    }

    if (!selectedFaculty?._id) {
      setError('Select a faculty before sending the query.')
      return
    }

    if (!message.trim()) {
      setError('Enter a query message.')
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        fileId: selectedFile._id,
        facultyId: selectedFaculty._id,
        message: message.trim(),
      }
      const response = await axios.post(`${API_BASE_URL}/user/queries`, payload, { withCredentials: true })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to save query')
      }

      const savedQuery = response.data?.data?.query

      setQueries((currentQueries) => {
        const exists = currentQueries.some((query) => query._id === savedQuery._id)
        const nextQueries = exists
          ? currentQueries.map((query) => (query._id === savedQuery._id ? savedQuery : query))
          : [savedQuery, ...currentQueries]

        onNotificationCountChange?.(nextQueries.filter((query) => query.status === 'changes_submitted').length)
        return nextQueries
      })
      setSuccess('Query sent successfully.')
      resetForm()
      setCreateQueryOpen(false)
      setQuerySectionOpen('active')
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to save query.'))
    } finally {
      setSubmitting(false)
    }
  }

  const decideQuery = async (query, decision) => {
    setBusyQueryId(query._id)
    setError('')
    setSuccess('')

    try {
      const response = await axios.patch(`${API_BASE_URL}/user/queries/${query._id}/decision`, {
        decision,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to save decision')
      }

      const updatedQuery = response.data?.data?.query
      const updatedNode = response.data?.data?.node

      setQueries((currentQueries) => {
        const nextQueries = currentQueries.map((currentQuery) => (
          currentQuery._id === updatedQuery._id ? updatedQuery : currentQuery
        ))
        onNotificationCountChange?.(nextQueries.filter((currentQuery) => currentQuery.status === 'changes_submitted').length)
        return nextQueries
      })
      if (decision === 'accept' && updatedNode?._id) {
        onWorkspaceNodeApplied?.(updatedNode)
      }
      setSuccess(decision === 'accept' ? 'Faculty changes applied to your file.' : 'Faculty changes declined.')
    } catch (decisionError) {
      setError(getErrorMessage(decisionError, 'Unable to save decision.'))
    } finally {
      setBusyQueryId('')
    }
  }

  const toggleCreateQuery = () => {
    if (createQueryOpen) {
      setCreateQueryOpen(false)
      setQuerySectionOpen('active')
    } else {
      setCreateQueryOpen(true)
      setQuerySectionOpen('')
    }
  }

  const toggleQuerySection = (section) => {
    setCreateQueryOpen(false)
    setQuerySectionOpen((currentSection) => {
      if (currentSection !== section) {
        return section
      }

      return section === 'active' ? 'history' : 'active'
    })
  }

  const renderQueryButton = (query) => (
    <button
      key={query._id}
      type="button"
      onClick={() => setSelectedQueryId(query._id)}
      className={`w-full rounded-lg border p-3 text-left transition ${
        mainQuery?._id === query._id
          ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{query.fileName}</p>
          <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {query.workspaceName} · {query.facultyName}
          </p>
        </div>
        <QueryStatusBadge status={query.status} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{query.message}</p>
    </button>
  )

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">Queries</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            Send code files to faculty and review returned changes.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchQueries}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error || success ? (
        <div className="space-y-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          {error ? (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              {success}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <form onSubmit={submitQuery} className="shrink-0 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <button
              type="button"
              onClick={toggleCreateQuery}
              aria-expanded={createQueryOpen}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Create Query
              </span>
              {createQueryOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              )}
            </button>

            {createQueryOpen ? (
              <div className="mt-4 space-y-4">
              <div
                className="relative"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setFileDropdownOpen(false)
                  }
                }}
              >
                <label htmlFor="query-file-search" className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Code file
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-900">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    id="query-file-search"
                    value={fileSearch}
                    onFocus={() => setFileDropdownOpen(true)}
                    onClick={() => setFileDropdownOpen(true)}
                    onChange={(event) => {
                      setFileSearch(event.target.value)
                      setSelectedFile(null)
                      setFileDropdownOpen(true)
                    }}
                    placeholder="Search your code files"
                    className="min-w-0 flex-1 bg-transparent py-2 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                  />
                </div>
                {fileDropdownOpen ? (
                  <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
                    {searchingFiles ? (
                      <p className="p-3 text-sm font-medium text-slate-500 dark:text-slate-400">Searching files...</p>
                    ) : files.length ? files.map((file) => (
                      <button
                        key={file._id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setSelectedFile(file)
                          setFileSearch(file.name)
                          setFileDropdownOpen(false)
                        }}
                        className={`flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm transition last:border-b-0 dark:border-slate-800 ${
                          selectedFile?._id === file._id
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                        }`}
                      >
                        <FileCode className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{file.name}</span>
                        <span className="shrink-0 text-xs text-slate-400">{file.workspaceName}</span>
                      </button>
                    )) : (
                      <p className="p-3 text-sm font-medium text-slate-500 dark:text-slate-400">No code files found.</p>
                    )}
                  </div>
                ) : null}
              </div>

              <div
                className="relative"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setFacultyDropdownOpen(false)
                  }
                }}
              >
                <label htmlFor="query-faculty-search" className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Faculty
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-900">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    id="query-faculty-search"
                    value={facultySearch}
                    onFocus={() => setFacultyDropdownOpen(true)}
                    onClick={() => setFacultyDropdownOpen(true)}
                    onChange={(event) => {
                      setFacultySearch(event.target.value)
                      setSelectedFaculty(null)
                      setFacultyDropdownOpen(true)
                    }}
                    placeholder="Search faculty name or phone"
                    className="min-w-0 flex-1 bg-transparent py-2 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                  />
                </div>
                {facultyDropdownOpen ? (
                  <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
                    {searchingFaculties ? (
                      <p className="p-3 text-sm font-medium text-slate-500 dark:text-slate-400">Searching faculty...</p>
                    ) : faculties.length ? faculties.map((faculty) => (
                      <button
                        key={faculty._id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setSelectedFaculty(faculty)
                          setFacultySearch(faculty.name)
                          setFacultyDropdownOpen(false)
                        }}
                        className={`w-full border-b border-slate-100 px-3 py-2 text-left text-sm transition last:border-b-0 dark:border-slate-800 ${
                          selectedFaculty?._id === faculty._id
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                        }`}
                      >
                        <span className="block truncate font-semibold">{faculty.name}</span>
                        <span className="block truncate text-xs text-slate-400">{faculty.phone}</span>
                      </button>
                    )) : (
                      <p className="p-3 text-sm font-medium text-slate-500 dark:text-slate-400">No faculty found.</p>
                    )}
                  </div>
                ) : null}
              </div>

              <div>
                <label htmlFor="query-message" className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Message
                </label>
                <textarea
                  id="query-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={5}
                  maxLength={1000}
                  placeholder="Describe what you need reviewed."
                  className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-700"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Sending...' : 'Send Query'}
              </button>
              </div>
            ) : null}
          </form>

          <div className={`flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 ${!createQueryOpen && querySectionOpen === 'active' ? 'flex-1' : 'shrink-0'}`}>
            <button
              type="button"
              onClick={() => toggleQuerySection('active')}
              aria-expanded={!createQueryOpen && querySectionOpen === 'active'}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Active Queries ({activeQueries.length})
              </span>
              {!createQueryOpen && querySectionOpen === 'active' ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              )}
            </button>
            {!createQueryOpen && querySectionOpen === 'active' ? (
              <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
              {loading ? (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading queries...</p>
              ) : activeQueries.length ? (
                activeQueries.map(renderQueryButton)
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center dark:border-slate-800">
                  <Inbox className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-700" />
                  <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">No active queries</p>
                </div>
              )}
              </div>
            ) : null}
          </div>

          <div className={`flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 ${!createQueryOpen && querySectionOpen === 'history' ? 'flex-1' : 'shrink-0'}`}>
            <button
              type="button"
              onClick={() => toggleQuerySection('history')}
              aria-expanded={!createQueryOpen && querySectionOpen === 'history'}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Query History ({historyQueries.length})
              </span>
              {!createQueryOpen && querySectionOpen === 'history' ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              )}
            </button>
            {!createQueryOpen && querySectionOpen === 'history' ? (
              <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
                {historyQueries.length ? historyQueries.map(renderQueryButton) : (
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No history yet.</p>
                )}
              </div>
            ) : null}
          </div>
        </section>

        <section className="min-h-140 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          {mainQuery ? (
            <div className="flex h-full min-h-140 flex-col">
              <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileCode className="h-5 w-5 shrink-0 text-slate-500" />
                      <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                        {mainQuery.fileName}
                      </h2>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {mainQuery.workspaceName} · {mainQuery.facultyName}
                    </p>
                  </div>
                  <QueryStatusBadge status={mainQuery.status} />
                </div>
                <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {mainQuery.message}
                </p>
                {mainQuery.facultyResponse ? (
                  <p className="mt-3 whitespace-pre-wrap rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                    {mainQuery.facultyResponse}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {mainQuery.status === 'changes_submitted' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => decideQuery(mainQuery, 'accept')}
                        disabled={busyQueryId === mainQuery._id}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:bg-slate-400"
                      >
                        <Check className="h-4 w-4" />
                        Accept Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => decideQuery(mainQuery, 'decline')}
                        disabled={busyQueryId === mainQuery._id}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <X className="h-4 w-4" />
                        Decline Changes
                      </button>
                    </>
                  ) : null}
                  {mainQuery.status === 'accepted' ? (
                    <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      <Clock className="h-4 w-4" />
                      Faculty is reviewing this file
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
                <div className="flex min-h-90 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r dark:border-slate-800">
                  <div className="border-b border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    Original Snapshot
                  </div>
                  <div className="min-h-0 flex-1">
                    <Editor
                      height="100%"
                      language={MONACO_LANGUAGE[mainQuery.fileLanguage] || 'plaintext'}
                      theme={isDark ? 'vs-dark' : 'light'}
                      value={mainQuery.originalContent || ''}
                      options={{
                        readOnly: true,
                        fontSize: 14,
                        minimap: { enabled: false },
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                </div>
                <div className="flex min-h-90 flex-col">
                  <div className="border-b border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    Faculty Version
                  </div>
                  <div className="min-h-0 flex-1">
                    <Editor
                      height="100%"
                      language={MONACO_LANGUAGE[mainQuery.fileLanguage] || 'plaintext'}
                      theme={isDark ? 'vs-dark' : 'light'}
                      value={mainQuery.reviewedContent || mainQuery.originalContent || ''}
                      options={{
                        readOnly: true,
                        fontSize: 14,
                        minimap: { enabled: false },
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : mainFile ? (
            <div className="flex h-full min-h-140 flex-col">
              <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                <div className="flex min-w-0 items-center gap-2">
                  <FileCode className="h-5 w-5 shrink-0 text-slate-500" />
                  <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                    {mainFile.name}
                  </h2>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {mainFile.workspaceName} · {mainFile.language}
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="border-b border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  Selected File
                </div>
                <div className="min-h-0 flex-1">
                  <Editor
                    height="100%"
                    language={MONACO_LANGUAGE[mainFile.language] || 'plaintext'}
                    theme={isDark ? 'vs-dark' : 'light'}
                    value={mainFile.content || ''}
                    options={{
                      readOnly: true,
                      fontSize: 14,
                      minimap: { enabled: false },
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-140" />
          )}
        </section>
      </div>
    </main>
  )
}

export default IDEquery
