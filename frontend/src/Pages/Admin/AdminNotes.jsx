import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const AdminNotes = () => {
  const { courseId } = useParams()
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  const [course, setCourse] = useState(null)
  const [notes, setNotes] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [driveFolderUrl, setDriveFolderUrl] = useState('')
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activePreviewFile, setActivePreviewFile] = useState(null)

  // Esc key closes modal & body scroll lock
  useEffect(() => {
    if (activePreviewFile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActivePreviewFile(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activePreviewFile])

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  // Fetch Course & Notes
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Fetch Course details
      const courseResponse = await axios.get(`${API_BASE_URL}/admin/courses/${courseId}`, {
        withCredentials: true,
      })
      if (!courseResponse.data?.success) {
        throw new Error(courseResponse.data?.message || 'Unable to fetch course')
      }
      setCourse(courseResponse.data?.data?.course || null)

      // 2. Fetch Notes config
      try {
        const notesResponse = await axios.get(`${API_BASE_URL}/admin/courses/${courseId}/notes`, {
          withCredentials: true,
        })
        if (notesResponse.data?.success && notesResponse.data?.data?.note) {
          const noteData = notesResponse.data.data.note
          setNotes(noteData)
          setTitle(noteData.title || '')
          setDriveFolderUrl(noteData.driveFolderUrl || '')
        } else {
          setNotes(null)
        }
      } catch (notesErr) {
        // If 404, it means notes aren't configured yet, which is expected
        if (notesErr.response?.status === 404) {
          setNotes(null)
          setTitle('')
          setDriveFolderUrl('')
        } else {
          throw notesErr
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to fetch details. Please try again.'))
    } finally {
      setLoading(false)
    }
  }, [courseId])

  // Verify Admin Auth on mount
  useEffect(() => {
    let isActive = true

    const verifyAdmin = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/admin/profile`, {
          withCredentials: true,
        })

        const admin = response.data?.data?.admin

        if (!response.data?.success || admin?.role !== 'admin') {
          throw new Error('Unauthorized admin')
        }

        if (!isActive) return

        setAuth({
          role: 'admin',
          phone: admin.phone,
          token: null,
        })
        setIsAuthorized(true)
        await fetchData()
      } catch {
        if (!isActive) return
        clearAuth()
        setIsAuthorized(false)
      } finally {
        if (isActive) {
          setCheckingAuth(false)
        }
      }
    }

    verifyAdmin()

    return () => {
      isActive = false
    }
  }, [clearAuth, fetchData, setAuth])

  // Handle Note Creation (POST)
  const handleCreateNotes = async (e) => {
    e.preventDefault()
    resetMessages()

    const trimmedTitle = title.trim()
    const trimmedUrl = driveFolderUrl.trim()

    if (!trimmedTitle) {
      setError('Title is required.')
      return
    }
    if (!trimmedUrl) {
      setError('Google Drive folder URL is required.')
      return
    }

    setSaving(true)
    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/courses/${courseId}/notes`,
        { title: trimmedTitle, driveFolderUrl: trimmedUrl },
        { withCredentials: true }
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to configure notes')
      }

      const noteData = response.data?.data?.note
      setNotes(noteData)
      setTitle(noteData.title)
      setDriveFolderUrl(noteData.driveFolderUrl)
      
      if (noteData.syncStatus === 'failed') {
        setError(`Notes saved but Google Drive sync failed: ${noteData.syncError}`)
      } else {
        setSuccess('Notes configuration created and synced successfully.')
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create notes configuration.'))
    } finally {
      setSaving(false)
    }
  }

  // Handle Note Update (PUT)
  const handleUpdateNotes = async (e) => {
    e.preventDefault()
    resetMessages()

    const trimmedTitle = title.trim()
    const trimmedUrl = driveFolderUrl.trim()

    if (!trimmedTitle) {
      setError('Title is required.')
      return
    }
    if (!trimmedUrl) {
      setError('Google Drive folder URL is required.')
      return
    }

    setSaving(true)
    try {
      const response = await axios.put(
        `${API_BASE_URL}/admin/courses/${courseId}/notes`,
        { title: trimmedTitle, driveFolderUrl: trimmedUrl },
        { withCredentials: true }
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to update notes')
      }

      const noteData = response.data?.data?.note
      setNotes(noteData)
      setTitle(noteData.title)
      setDriveFolderUrl(noteData.driveFolderUrl)

      if (noteData.syncStatus === 'failed') {
        setError(`Notes updated but Google Drive sync failed: ${noteData.syncError}`)
      } else {
        setSuccess('Notes configuration updated and synced successfully.')
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update notes configuration.'))
    } finally {
      setSaving(false)
    }
  }

  // Handle Manual Sync (POST /sync)
  const handleSyncNotes = async () => {
    resetMessages()
    setSyncing(true)
    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/courses/${courseId}/notes/sync`,
        {},
        { withCredentials: true }
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to sync notes')
      }

      const noteData = response.data?.data?.note
      setNotes(noteData)
      setSuccess('Notes successfully synchronized with Google Drive.')
    } catch (err) {
      setError(getErrorMessage(err, 'Synchronization failed. Make sure the folder is publicly accessible.'))
    } finally {
      setSyncing(false)
    }
  }

  // Handle Note Deletion (DELETE)
  const handleDeleteNotes = async () => {
    resetMessages()
    const confirmed = window.confirm(
      'Are you sure you want to delete this notes configuration? This will remove all synced file links.'
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/admin/courses/${courseId}/notes`,
        { withCredentials: true }
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete notes configuration')
      }

      setNotes(null)
      setTitle('')
      setDriveFolderUrl('')
      setSuccess('Notes configuration deleted successfully.')
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete notes configuration.'))
    } finally {
      setDeleting(false)
    }
  }

  // Render file icon helper
  const getFileIcon = (mimeType) => {
    if (mimeType.includes('pdf')) {
      return (
        <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h1.5m-1.5 3h4m-4 3h4" />
        </svg>
      )
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return (
        <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
    if (mimeType.includes('image')) {
      return (
        <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    }
    return (
      <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized || auth.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <AdminNavbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Navigation header */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            to={`/admin/courses/${courseId}`}
            className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            Back to Course
          </Link>
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            Loading course and notes details...
          </div>
        ) : course ? (
          <>
            {/* Header info */}
            <div className="mb-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Course Notes Management
              </span>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{course.title}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Slug: {course.slug}</p>
            </div>

            {/* Error and Success notifications */}
            {error && (
              <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 p-4 text-sm font-medium text-red-800 dark:text-red-300">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 p-4 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                {success}
              </div>
            )}

            {/* Main content grid */}
            {!notes ? (
              /* Create Configuration State */
              <div className="mx-auto max-w-xl rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="text-center mb-6">
                  <svg className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">Configure Course Notes</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Add a Google Drive folder link containing chapter notes files for this course.
                  </p>
                </div>

                <form onSubmit={handleCreateNotes} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Notes Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chapter Wise PDF Notes"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-950 dark:text-slate-50 shadow-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Google Drive Folder Link</label>
                    <input
                      type="url"
                      required
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={driveFolderUrl}
                      onChange={(e) => setDriveFolderUrl(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-950 dark:text-slate-50 shadow-sm focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">
                      Important: Make sure Google Drive sharing settings are set to &quot;Anyone with the link can view&quot;.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Creating & Syncing...' : 'Save & Sync Notes'}
                  </button>
                </form>
              </div>
            ) : (
              /* Notes Manage State (Update, Sync, List Files) */
              <div className="grid gap-8 lg:grid-cols-12">
                {/* Column 1: Config settings & CRUD actions (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Configuration</h2>
                    
                    {/* Status Display */}
                    <div className="mb-5 flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Sync Status:</span>
                      {notes.syncStatus === 'synced' && (
                        <span className="inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          Synced
                        </span>
                      )}
                      {notes.syncStatus === 'pending' && (
                        <span className="inline-flex rounded-full bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                          Pending
                        </span>
                      )}
                      {notes.syncStatus === 'failed' && (
                        <span className="inline-flex rounded-full bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                          Failed
                        </span>
                      )}
                    </div>

                    {/* Sync Error Block */}
                    {notes.syncStatus === 'failed' && notes.syncError && (
                      <div className="mb-4 rounded bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-3 text-xs text-amber-800 dark:text-amber-300 font-medium">
                        <strong>Error:</strong> {notes.syncError}
                      </div>
                    )}

                    {/* Sync timestamp */}
                    {notes.lastSyncedAt && (
                      <p className="mb-6 text-xs text-slate-400 dark:text-slate-500">
                        Last synced: {new Date(notes.lastSyncedAt).toLocaleString()}
                      </p>
                    )}

                    {/* Update Form */}
                    <form onSubmit={handleUpdateNotes} className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Notes Title</label>
                        <input
                          type="text"
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-950 dark:text-slate-50 shadow-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Google Drive Folder Link</label>
                        <input
                          type="url"
                          required
                          value={driveFolderUrl}
                          onChange={(e) => setDriveFolderUrl(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-950 dark:text-slate-50 shadow-sm focus:border-indigo-500 focus:outline-none"
                        />
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 truncate">
                          ID: <span className="font-mono text-[10px]">{notes.driveFolderId}</span>
                        </p>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={saving || syncing || deleting}
                          className="flex-1 flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow transition hover:bg-indigo-500 disabled:bg-indigo-400"
                        >
                          {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSyncNotes}
                          disabled={saving || syncing || deleting}
                          className="flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 hover:text-indigo-700 disabled:text-slate-400 dark:disabled:text-slate-600"
                        >
                          {syncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Danger Zone Delete */}
                  <div className="rounded-lg border border-red-200 dark:border-red-950 bg-white dark:bg-slate-900 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">Danger Zone</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      Deleting the notes configuration will sever the link between this course and the Google Drive folder.
                    </p>
                    <button
                      type="button"
                      onClick={handleDeleteNotes}
                      disabled={saving || syncing || deleting}
                      className="w-full flex items-center justify-center rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-bold text-red-700 dark:text-red-300 transition hover:bg-red-100 dark:hover:bg-red-950/60 disabled:cursor-not-allowed"
                    >
                      {deleting ? 'Deleting...' : 'Delete Notes Configuration'}
                    </button>
                  </div>
                </div>

                {/* Column 2: Synced Files list (7 cols) */}
                <div className="lg:col-span-7">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm min-h-[400px] flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{notes.title}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Files Synced from Drive</p>
                      </div>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {notes.files?.length || 0} files
                      </span>
                    </div>

                    {notes.files && notes.files.length > 0 ? (
                      <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-2">
                        {notes.files.map((file) => (
                          <div
                            key={file.fileId}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActivePreviewFile(file)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setActivePreviewFile(file)
                              }
                            }}
                            className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-3 transition hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-100/50 dark:hover:bg-slate-950/40 hover:shadow-sm cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="shrink-0">{getFileIcon(file.mimeType)}</div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={file.name}>
                                  {file.name}
                                </h4>
                                <p className="text-xs text-slate-400 dark:text-slate-500 truncate select-none">
                                  {file.mimeType.split('/').pop()?.toUpperCase()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActivePreviewFile(file)
                                }}
                                className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer"
                              >
                                Preview
                              </button>
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700"
                              >
                                Open Tab
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                        <svg className="h-10 w-10 text-slate-400 dark:text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.008 1.24l.885 1.77a2.25 2.25 0 002.007 1.24h1.98a2.25 2.25 0 002.007-1.24l.885-1.77a2.25 2.25 0 012.007-1.24h3.86m-18 0a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0" />
                        </svg>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No files found</p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-xs">
                          There are no files in the connected Drive folder, or the API key cannot access it. Double-check that folder permissions are set to public view.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-6 py-12 text-center text-sm font-semibold text-red-700 dark:text-red-300">
            Course not found.
          </div>
        )}
      </main>

      {/* Dynamic Iframe Preview Modal */}
      {activePreviewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 overflow-hidden">
          {/* Backdrop overlay */}
          <div
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm transition-opacity duration-300 ease-out cursor-pointer"
            onClick={() => setActivePreviewFile(null)}
          />

          {/* Modal content panel */}
          <div 
            style={{ width: '95vw', maxWidth: '1200px', height: '90vh' }}
            className="relative z-10 flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden transition-all duration-300 transform scale-100 animate-in fade-in zoom-in-95 ease-out"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
              <div className="min-w-0 pr-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate" title={activePreviewFile.name}>
                  {activePreviewFile.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 select-none">
                  {activePreviewFile.mimeType.split('/').pop()?.toUpperCase()} Document
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewFile(null)}
                className="rounded-lg p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close Preview"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Embedded Iframe */}
            <div className="flex-1 min-h-0 bg-slate-950 relative">
              <iframe
                src={`https://drive.google.com/file/d/${activePreviewFile.fileId}/preview`}
                title={activePreviewFile.name}
                className="w-full h-full border-0"
                style={{ display: 'block', width: '100%', height: '100%' }}
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminNotes
