import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import {
  Check,
  Clock,
  FileCode,
  Inbox,
  RefreshCw,
  Save,
  X,
} from 'lucide-react'
import FacultyNavbar from '../../Components/Faculty/FacultyNavbar'
import { useAuth } from '../../Context/AuthContext'
import { useTheme } from '../../Context/ThemeContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000'

const STATUS_META = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  accepted: { label: 'Accepted', className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  declined: { label: 'Declined', className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  changes_submitted: { label: 'Closed by faculty', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  changes_accepted: { label: 'Applied by user', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
  changes_declined: { label: 'Rejected by user', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
}

const MONACO_LANGUAGE = {
  c: 'c',
  cpp: 'cpp',
  java: 'java',
  python: 'python',
  javascript: 'javascript',
}

const MAIN_QUERY_STATUS_PRIORITY = ['pending', 'accepted']

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

const FacultyQueries = () => {
  const { auth, clearAuth, setAuth } = useAuth()
  const { isDark } = useTheme()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [queries, setQueries] = useState([])
  const [selectedQueryId, setSelectedQueryId] = useState('')
  const [reviewDrafts, setReviewDrafts] = useState({})
  const [responseDrafts, setResponseDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyQueryId, setBusyQueryId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
  const activeQueries = useMemo(
    () => queries.filter((query) => ['pending', 'accepted'].includes(query.status)),
    [queries],
  )
  const historyQueries = useMemo(
    () => queries.filter((query) => !['pending', 'accepted'].includes(query.status)),
    [queries],
  )
  const reviewedCode = mainQuery
    ? (reviewDrafts[mainQuery._id] ?? mainQuery.reviewedContent) || mainQuery.originalContent || ''
    : ''
  const facultyResponse = mainQuery
    ? (responseDrafts[mainQuery._id] ?? mainQuery.facultyResponse) || ''
    : ''

  useEffect(() => {
    setSelectedQueryId((currentId) => getPriorityQueryId(queries, currentId))
  }, [queries])

  const syncQueries = useCallback((nextQueries) => {
    setQueries(nextQueries)
    setSelectedQueryId((currentId) => getPriorityQueryId(nextQueries, currentId))
  }, [])

  const fetchQueries = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await axios.get(`${API_BASE_URL}/faculty/queries`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to load queries')
      }

      syncQueries(response.data?.data?.queries || [])
    } catch (queryError) {
      setError(getErrorMessage(queryError, 'Unable to load queries.'))
      syncQueries([])
    } finally {
      setLoading(false)
    }
  }, [syncQueries])

  useEffect(() => {
    let isActive = true

    const verifyFaculty = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/faculty/profile`, {
          withCredentials: true,
        })

        const faculty = response.data?.data?.faculty

        if (!response.data?.success || faculty?.role !== 'faculty') {
          throw new Error('Unauthorized faculty')
        }

        if (!isActive) {
          return
        }

        setAuth({
          role: 'faculty',
          phone: faculty.phone,
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

    verifyFaculty()

    return () => {
      isActive = false
    }
  }, [clearAuth, setAuth])

  useEffect(() => {
    if (!isAuthorized) {
      return
    }

    const timer = window.setTimeout(() => {
      fetchQueries()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchQueries, isAuthorized])

  const respondToQuery = async (query, action) => {
    setBusyQueryId(query._id)
    setError('')
    setSuccess('')

    try {
      const response = await axios.patch(`${API_BASE_URL}/faculty/queries/${query._id}/respond`, {
        action,
        facultyResponse,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to respond to query')
      }

      const updatedQuery = response.data?.data?.query

      setQueries((currentQueries) => currentQueries.map((currentQuery) => (
        currentQuery._id === updatedQuery._id ? updatedQuery : currentQuery
      )))
      setSelectedQueryId(updatedQuery._id)
      setSuccess(action === 'accept' ? 'Query accepted. You can now edit the code.' : 'Query declined successfully.')
    } catch (responseError) {
      setError(getErrorMessage(responseError, 'Unable to respond to query.'))
    } finally {
      setBusyQueryId('')
    }
  }

  const closeQuery = async (query) => {
    setBusyQueryId(query._id)
    setError('')
    setSuccess('')

    try {
      const response = await axios.patch(`${API_BASE_URL}/faculty/queries/${query._id}/close`, {
        reviewedContent: reviewedCode,
        facultyResponse,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to close query')
      }

      const updatedQuery = response.data?.data?.query

      setQueries((currentQueries) => currentQueries.map((currentQuery) => (
        currentQuery._id === updatedQuery._id ? updatedQuery : currentQuery
      )))
      setSelectedQueryId(updatedQuery._id)
      setSuccess('Query closed and sent to the user.')
    } catch (closeError) {
      setError(getErrorMessage(closeError, 'Unable to close query.'))
    } finally {
      setBusyQueryId('')
    }
  }

  const renderQueryButton = (query) => (
    <button
      key={query._id}
      type="button"
      onClick={() => setSelectedQueryId(query._id)}
      className={`w-full rounded-lg border p-3 text-left transition ${
        mainQuery?._id === query._id
          ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/30'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{query.fileName}</p>
          <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {query.workspaceName} · {query.userName || query.userPhone}
          </p>
        </div>
        <QueryStatusBadge status={query.status} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{query.message}</p>
    </button>
  )

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans dark:bg-slate-950">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized || auth.role !== 'faculty') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans dark:bg-slate-950">
      <FacultyNavbar />

      <main className="mx-auto grid min-h-0 w-full max-w-7xl flex-1 grid-cols-1 gap-4 overflow-hidden px-4 py-4 sm:px-6 lg:px-8 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Faculty Queries</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review student code queries.</p>
              </div>
              <button
                type="button"
                onClick={fetchQueries}
                disabled={loading}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {error ? (
            <div className="shrink-0 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="shrink-0 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              {success}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Open Queries</h2>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
              {loading ? (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading queries...</p>
              ) : activeQueries.length ? activeQueries.map(renderQueryButton) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center dark:border-slate-800">
                  <Inbox className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-700" />
                  <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">No open queries</p>
                </div>
              )}
            </div>
          </div>

          <details className="max-h-44 shrink-0 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <summary className="cursor-pointer text-sm font-bold text-slate-900 dark:text-slate-100">
              Query History ({historyQueries.length})
            </summary>
            <div className="mt-3 space-y-2">
              {historyQueries.length ? historyQueries.map(renderQueryButton) : (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No history yet.</p>
              )}
            </div>
          </details>
        </section>

        <section className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {mainQuery ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileCode className="h-5 w-5 shrink-0 text-slate-500" />
                      <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                        {mainQuery.fileName}
                      </h2>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {mainQuery.workspaceName} · {mainQuery.userName || mainQuery.userPhone}
                    </p>
                  </div>
                  <QueryStatusBadge status={mainQuery.status} />
                </div>

                <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  {mainQuery.message}
                </p>

                <div className="mt-4">
                  <label htmlFor="faculty-query-response" className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Faculty note
                  </label>
                  <textarea
                    id="faculty-query-response"
                    value={facultyResponse}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      setResponseDrafts((currentDrafts) => ({
                        ...currentDrafts,
                        [mainQuery._id]: nextValue,
                      }))
                    }}
                    disabled={!['pending', 'accepted'].includes(mainQuery.status)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Optional response for the student."
                    className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {mainQuery.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => respondToQuery(mainQuery, 'accept')}
                        disabled={busyQueryId === mainQuery._id}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:bg-slate-400"
                      >
                        <Check className="h-4 w-4" />
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => respondToQuery(mainQuery, 'decline')}
                        disabled={busyQueryId === mainQuery._id}
                        className="flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      >
                        <X className="h-4 w-4" />
                        Decline
                      </button>
                    </>
                  ) : null}
                  {mainQuery.status === 'accepted' ? (
                    <button
                      type="button"
                      onClick={() => closeQuery(mainQuery)}
                      disabled={busyQueryId === mainQuery._id}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:bg-slate-400"
                    >
                      <Save className="h-4 w-4" />
                      Close Query
                    </button>
                  ) : null}
                  {mainQuery.status === 'changes_submitted' ? (
                    <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Clock className="h-4 w-4" />
                      Waiting for user decision
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
                <div className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r dark:border-slate-800">
                  <div className="border-b border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    Student Snapshot
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
                <div className="flex min-h-0 flex-col">
                  <div className="border-b border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    Faculty Review
                  </div>
                  <div className="min-h-0 flex-1">
                    <Editor
                      height="100%"
                      language={MONACO_LANGUAGE[mainQuery.fileLanguage] || 'plaintext'}
                      theme={isDark ? 'vs-dark' : 'light'}
                      value={reviewedCode}
                      onChange={(value) => {
                        setReviewDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [mainQuery._id]: value || '',
                        }))
                      }}
                      options={{
                        readOnly: mainQuery.status !== 'accepted',
                        fontSize: 14,
                        minimap: { enabled: false },
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        tabSize: 4,
                        insertSpaces: true,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-0 items-center justify-center p-6 text-center">
              <div>
                <Inbox className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No query selected</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a query from the list.</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default FacultyQueries
