import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import DriveFileList from '../../Components/Common/DriveFileList'
import SyncStatusBadge from '../../Components/Common/SyncStatusBadge'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL
const TOPIC_NOTES_URL = `${API_BASE_URL}/admin/topic-notes`
const COURSE_NOTES_URL = `${API_BASE_URL}/admin/notes`
const COURSES_URL = `${API_BASE_URL}/admin/courses`

const getCourseNotesUrl = (courseId) => `${COURSES_URL}/${courseId}/notes`

const emptyForm = {
  topic: '',
  description: '',
  title: '',
  courseId: '',
  driveFolderUrl: '',
}

const KIND_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'topic', label: 'Topic' },
  { value: 'course', label: 'Course' },
]

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : 'Never')

const sortItems = (items) => [...items].sort((first, second) => (
  first.heading.localeCompare(second.heading, undefined, { sensitivity: 'base' })
))

// Standalone topic notes and course notes live in different collections but expose the
// same actions, so both are normalised into one shape keyed by `endpoint`.
const toTopicItem = (topicNote) => ({
  kind: 'topic',
  id: topicNote._id,
  endpoint: `${TOPIC_NOTES_URL}/${topicNote._id}`,
  heading: topicNote.topic,
  subheading: topicNote.description || '',
  topic: topicNote.topic,
  description: topicNote.description || '',
  title: '',
  driveFolderUrl: topicNote.driveFolderUrl,
  files: topicNote.files || [],
  syncStatus: topicNote.syncStatus,
  syncError: topicNote.syncError,
  lastSyncedAt: topicNote.lastSyncedAt,
})

const toCourseItem = (note, courseTitle) => ({
  kind: 'course',
  id: note._id,
  endpoint: getCourseNotesUrl(note.courseId),
  heading: courseTitle || note.courseTitle,
  subheading: note.title,
  topic: '',
  description: '',
  title: note.title,
  courseId: note.courseId,
  driveFolderUrl: note.driveFolderUrl,
  files: note.files || [],
  syncStatus: note.syncStatus,
  syncError: note.syncError,
  lastSyncedAt: note.lastSyncedAt,
})

const mergeServerNote = (item, serverNote) => ({
  ...item,
  heading: item.kind === 'topic' ? serverNote.topic : item.heading,
  subheading: item.kind === 'topic' ? serverNote.description || '' : serverNote.title,
  topic: serverNote.topic || '',
  description: serverNote.description || '',
  title: serverNote.title || '',
  driveFolderUrl: serverNote.driveFolderUrl,
  files: serverNote.files || [],
  syncStatus: serverNote.syncStatus,
  syncError: serverNote.syncError,
  lastSyncedAt: serverNote.lastSyncedAt,
})

const getServerNote = (response) => (
  response.data?.data?.topicNote || response.data?.data?.note
)

const AdminTopicNotes = () => {
  const { auth, clearAuth } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(true)
  const [items, setItems] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [expandedId, setExpandedId] = useState('')
  const [menuId, setMenuId] = useState('')
  const [busyId, setBusyId] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [newNoteKind, setNewNoteKind] = useState('topic')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

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

  // Only courses without notes can receive a new folder; the rest are edited in place.
  const availableCourses = useMemo(() => {
    const takenCourseIds = new Set(items.filter((item) => item.kind === 'course').map((item) => item.courseId))

    return courses.filter((course) => !takenCourseIds.has(course._id))
  }, [courses, items])

  const handleRequestError = useCallback((requestError, fallback) => {
    if (isAuthError(requestError)) {
      clearAuth()
      setIsAuthorized(false)
      return
    }

    setError(getErrorMessage(requestError, fallback))
  }, [clearAuth])

  const fetchNotes = useCallback(async (shouldUpdate = () => true) => {
    try {
      const [topicResponse, courseNotesResponse, coursesResponse] = await Promise.all([
        axios.get(TOPIC_NOTES_URL, { withCredentials: true }),
        axios.get(COURSE_NOTES_URL, { withCredentials: true }),
        axios.get(COURSES_URL, { withCredentials: true }),
      ])

      if (!topicResponse.data?.success || !courseNotesResponse.data?.success || !coursesResponse.data?.success) {
        throw new Error('Unable to fetch notes')
      }

      if (shouldUpdate()) {
        setItems(sortItems([
          ...(topicResponse.data?.data?.topicNotes || []).map((topicNote) => toTopicItem(topicNote)),
          ...(courseNotesResponse.data?.data?.notes || []).map((note) => toCourseItem(note)),
        ]))
        setCourses(coursesResponse.data?.data?.courses || [])
      }
    } catch (fetchError) {
      if (!shouldUpdate()) {
        return
      }

      setItems([])
      setCourses([])
      handleRequestError(fetchError, 'Unable to fetch notes. Please try again.')
    } finally {
      if (shouldUpdate()) {
        setLoading(false)
      }
    }
  }, [handleRequestError])

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

  useEffect(() => {
    if (!menuId) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuId('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuId])

  const refreshNotes = () => {
    setLoading(true)
    setError('')
    setSuccess('')
    fetchNotes()
  }

  const openCreateForm = () => {
    setError('')
    setSuccess('')
    setEditingItem(null)
    setNewNoteKind('topic')
    setForm(emptyForm)
    setIsFormOpen(true)
  }

  const openEditForm = (item) => {
    setError('')
    setSuccess('')
    setMenuId('')
    setEditingItem(item)
    setForm({
      topic: item.topic,
      description: item.description,
      title: item.title,
      courseId: item.courseId || '',
      driveFolderUrl: item.driveFolderUrl,
    })
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingItem(null)
    setForm(emptyForm)
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target

    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  const formKind = editingItem ? editingItem.kind : newNoteKind
  const isCourseForm = formKind === 'course'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const driveFolderUrl = form.driveFolderUrl.trim()
    const payload = isCourseForm
      ? { title: form.title.trim(), driveFolderUrl }
      : { topic: form.topic.trim(), description: form.description.trim(), driveFolderUrl }

    if (isCourseForm && !editingItem && !form.courseId) {
      setError('Select the course these notes belong to.')
      return
    }

    if (isCourseForm ? !payload.title : !payload.topic) {
      setError(isCourseForm ? 'Notes title is required.' : 'Topic is required.')
      return
    }

    if (!driveFolderUrl) {
      setError('Google Drive folder link is required.')
      return
    }

    setSaving(true)

    try {
      let response

      if (editingItem) {
        response = await axios.put(editingItem.endpoint, payload, { withCredentials: true })
      } else if (isCourseForm) {
        response = await axios.post(getCourseNotesUrl(form.courseId), payload, { withCredentials: true })
      } else {
        response = await axios.post(TOPIC_NOTES_URL, payload, { withCredentials: true })
      }

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to save notes')
      }

      const serverNote = getServerNote(response)
      const courseTitle = courses.find((course) => course._id === form.courseId)?.title

      setItems((currentItems) => sortItems(editingItem
        ? currentItems.map((item) => (item.id === editingItem.id ? mergeServerNote(item, serverNote) : item))
        : [
          ...currentItems,
          isCourseForm ? toCourseItem(serverNote, courseTitle) : toTopicItem(serverNote),
        ]))

      closeForm()

      if (serverNote.syncStatus === 'failed') {
        setError(`Notes saved, but the Google Drive sync failed: ${serverNote.syncError}`)
        return
      }

      setSuccess(editingItem ? 'Notes updated successfully.' : 'Notes added successfully.')
    } catch (saveError) {
      handleRequestError(saveError, 'Unable to save notes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async (item) => {
    setError('')
    setSuccess('')
    setMenuId('')
    setBusyId(item.id)

    try {
      const response = await axios.post(`${item.endpoint}/sync`, {}, { withCredentials: true })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to sync notes')
      }

      setItems((currentItems) => currentItems.map((currentItem) => (
        currentItem.id === item.id ? mergeServerNote(currentItem, getServerNote(response)) : currentItem
      )))
      setSuccess(`"${item.heading}" notes synced with Google Drive.`)
    } catch (syncError) {
      handleRequestError(syncError, 'Unable to sync notes. Make sure the folder is shared publicly.')

      if (!isAuthError(syncError)) {
        await fetchNotes()
      }
    } finally {
      setBusyId('')
    }
  }

  const handleDelete = async (item) => {
    setMenuId('')

    const confirmed = window.confirm(item.kind === 'course'
      ? `Remove the notes folder from the "${item.heading}" course? The course itself is not deleted.`
      : `Delete "${item.heading}" notes? Faculty will no longer see them.`)

    if (!confirmed) {
      return
    }

    setError('')
    setSuccess('')
    setBusyId(item.id)

    try {
      const response = await axios.delete(item.endpoint, { withCredentials: true })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete notes')
      }

      setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id))
      setSuccess('Notes deleted successfully.')
    } catch (deleteError) {
      handleRequestError(deleteError, 'Unable to delete notes. Please try again.')
    } finally {
      setBusyId('')
    }
  }

  if (!isAuthorized || auth.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <AdminNavbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Admin Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Notes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Every notes folder in one place: topic notes for any subject, plus the notes attached to each course.
              All of them are visible to faculty only.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshNotes}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Add notes
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error" className="shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess('')} aria-label="Dismiss message" className="shrink-0">
              <X className="h-4 w-4" />
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
              const isMenuOpen = menuId === item.id
              const isBusy = busyId === item.id
              const isCourseNote = item.kind === 'course'
              const fileCount = item.files.length

              return (
                <article
                  key={item.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
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
                        {isBusy ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Working...
                          </span>
                        ) : null}
                      </div>

                      {item.subheading ? (
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {isCourseNote ? `Notes: ${item.subheading}` : item.subheading}
                        </p>
                      ) : null}

                      {item.syncStatus === 'failed' && item.syncError ? (
                        <p className="mt-2 max-w-2xl rounded-lg border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                          {item.syncError}
                        </p>
                      ) : null}
                    </div>

                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setMenuId(isMenuOpen ? '' : item.id)}
                        disabled={isBusy}
                        aria-label={`Notes settings for ${item.heading}`}
                        aria-expanded={isMenuOpen}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
                      >
                        <Settings className="h-4 w-4" />
                      </button>

                      {isMenuOpen ? (
                        <>
                          <button
                            type="button"
                            aria-label="Close settings"
                            className="fixed inset-0 z-10 cursor-default"
                            onClick={() => setMenuId('')}
                          />
                          <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1 shadow-xl">
                            <div className="border-b border-slate-100 dark:border-slate-800 px-3 pb-2 pt-1.5">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Last synced
                              </p>
                              <p className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                {formatDateTime(item.lastSyncedAt)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSync(item)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Sync now
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit details
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="flex w-full items-center gap-2 border-t border-slate-100 dark:border-slate-800 px-3 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {isCourseNote ? 'Remove from course' : 'Delete notes'}
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
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
                        emptyMessage="No files found. Check that the Drive folder is shared with anyone who has the link, then sync again."
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
                : 'Add notes for a topic or for any course to share them with faculty.'}
            </p>
          </section>
        )}
      </main>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <button
            type="button"
            aria-label="Close form"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={closeForm}
          />

          <form
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {editingItem ? 'Edit notes' : 'Add notes'}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {editingItem && editingItem.kind === 'course'
                    ? `Course notes for ${editingItem.heading}.`
                    : 'Files are pulled from the Drive folder as soon as it is saved.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close form"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4">
              {!editingItem ? (
                <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-1">
                  {[
                    { value: 'topic', label: 'Topic notes' },
                    { value: 'course', label: 'Course notes' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setNewNoteKind(option.value)}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        newNoteKind === option.value
                          ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {isCourseForm ? (
                <>
                  {!editingItem ? (
                    <div>
                      <label htmlFor="courseId" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Course
                      </label>
                      <select
                        id="courseId"
                        name="courseId"
                        required
                        value={form.courseId}
                        onChange={handleFormChange}
                        disabled={!availableCourses.length}
                        className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        <option value="">Select a course</option>
                        {availableCourses.map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">
                        {availableCourses.length
                          ? 'Courses that already have notes are edited from their card.'
                          : 'Every course already has a notes folder.'}
                      </span>
                    </div>
                  ) : null}

                  <div>
                    <label htmlFor="title" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Notes title
                    </label>
                    <input
                      id="title"
                      name="title"
                      type="text"
                      required
                      value={form.title}
                      onChange={handleFormChange}
                      placeholder="e.g. Chapter Wise PDF Notes"
                      className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="topic" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Topic
                    </label>
                    <input
                      id="topic"
                      name="topic"
                      type="text"
                      required
                      value={form.topic}
                      onChange={handleFormChange}
                      placeholder="e.g. C Language"
                      className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Description <span className="font-medium text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={form.description}
                      onChange={handleFormChange}
                      placeholder="What these notes cover"
                      className="mt-1 block w-full resize-none rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="driveFolderUrl" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Google Drive folder link
                </label>
                <input
                  id="driveFolderUrl"
                  name="driveFolderUrl"
                  type="url"
                  required
                  value={form.driveFolderUrl}
                  onChange={handleFormChange}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">
                  Set Drive sharing to &quot;Anyone with the link can view&quot;. Changing the link re-syncs the files.
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400"
              >
                {saving ? 'Saving & syncing...' : editingItem ? 'Save changes' : 'Create & sync'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-400 dark:hover:border-slate-600 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

export default AdminTopicNotes
