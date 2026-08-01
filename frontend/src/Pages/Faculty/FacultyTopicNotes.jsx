import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, ChevronDown, ChevronUp, RefreshCw, Search } from 'lucide-react'
import DriveFileList from '../../Components/Common/DriveFileList'
import SyncStatusBadge from '../../Components/Common/SyncStatusBadge'
import FacultyNavbar from '../../Components/Faculty/FacultyNavbar'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const KIND_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'topic', label: 'Topic' },
  { value: 'course', label: 'Course' },
]

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const sortItems = (items) => [...items].sort((first, second) => (
  first.heading.localeCompare(second.heading, undefined, { sensitivity: 'base' })
))

// Topic notes and course notes come from different collections but read the same way here.
const toTopicItem = (topicNote) => ({
  kind: 'topic',
  id: topicNote._id,
  heading: topicNote.topic,
  subheading: topicNote.description || '',
  files: topicNote.files || [],
  syncStatus: topicNote.syncStatus,
})

const toCourseItem = (note) => ({
  kind: 'course',
  id: note._id,
  heading: note.courseTitle,
  subheading: note.title,
  files: note.files || [],
  syncStatus: note.syncStatus,
  courseId: note.courseId,
})

const FacultyTopicNotes = () => {
  const { auth, clearAuth } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(true)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [expandedId, setExpandedId] = useState('')

  const counts = useMemo(() => ({
    all: items.length,
    topic: items.filter((item) => item.kind === 'topic').length,
    course: items.filter((item) => item.kind === 'course').length,
  }), [items])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()

    return items.filter((item) => {
      if (kindFilter !== 'all' && item.kind !== kindFilter) {
        return false
      }

      return !query || `${item.heading} ${item.subheading}`.toLowerCase().includes(query)
    })
  }, [items, kindFilter, search])

  const fetchNotes = useCallback(async (shouldUpdate = () => true) => {
    try {
      const [topicResponse, courseResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/faculty/topic-notes`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/faculty/notes`, { withCredentials: true }),
      ])

      if (!topicResponse.data?.success || !courseResponse.data?.success) {
        throw new Error(topicResponse.data?.message || courseResponse.data?.message || 'Unable to fetch notes')
      }

      if (shouldUpdate()) {
        setItems(sortItems([
          ...(topicResponse.data?.data?.topicNotes || []).map(toTopicItem),
          ...(courseResponse.data?.data?.notes || []).map(toCourseItem),
        ]))
      }
    } catch (fetchError) {
      if (!shouldUpdate()) {
        return
      }

      if (isAuthError(fetchError)) {
        clearAuth()
        setIsAuthorized(false)
        return
      }

      setItems([])
      setError(getErrorMessage(fetchError, 'Unable to fetch notes. Please try again.'))
    } finally {
      if (shouldUpdate()) {
        setLoading(false)
      }
    }
  }, [clearAuth])

  useEffect(() => {
    let isActive = true

    const loadNotes = async () => {
      await fetchNotes(() => isActive)
    }

    loadNotes()

    return () => {
      isActive = false
    }
  }, [fetchNotes])

  const refreshNotes = () => {
    setLoading(true)
    setError('')
    fetchNotes()
  }

  if (!isAuthorized || auth.role !== 'faculty') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <FacultyNavbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Faculty Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Notes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Every notes folder published by the admin, whether it belongs to a course or stands on its own.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshNotes}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error ? (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={refreshNotes}
              disabled={loading}
              className="rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 transition hover:border-red-300 dark:hover:border-red-700 disabled:cursor-not-allowed disabled:text-red-300 dark:disabled:text-red-500"
            >
              Retry
            </button>
          </div>
        ) : null}

        {items.length ? (
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search topics and courses..."
                className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-sm">
              {KIND_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setKindFilter(filter.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    kindFilter === filter.value
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {filter.label} ({counts[filter.value]})
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {loading ? (
          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading notes...</p>
          </section>
        ) : filteredItems.length ? (
          <section className="grid gap-4">
            {filteredItems.map((item) => {
              const isExpanded = expandedId === item.id
              const isCourseNote = item.kind === 'course'
              const fileCount = item.files.length

              return (
                <article
                  key={item.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{item.heading}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isCourseNote
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                            : 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                        }`}>
                          {isCourseNote ? 'Course' : 'Topic'}
                        </span>
                        <SyncStatusBadge status={item.syncStatus} />
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {fileCount} {fileCount === 1 ? 'file' : 'files'}
                        </span>
                      </div>

                      {item.subheading ? (
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {isCourseNote ? `Notes: ${item.subheading}` : item.subheading}
                        </p>
                      ) : null}
                    </div>

                    {isCourseNote ? (
                      <Link
                        to={`/faculty/notes/${item.courseId}`}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                      >
                        Chapter view
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? '' : item.id)}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {isExpanded ? 'Hide files' : `Show files (${fileCount})`}
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 border-t border-slate-200 dark:border-slate-800 pt-3">
                      <DriveFileList
                        files={item.files}
                        emptyMessage="No files are available for these notes yet."
                      />
                    </div>
                  ) : null}
                </article>
              )
            })}
          </section>
        ) : (
          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {items.length ? 'No matching notes' : 'No notes yet'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
              {items.length
                ? 'Adjust your search or filter to find a notes folder.'
                : 'Notes will appear here once the admin publishes them.'}
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

export default FacultyTopicNotes
