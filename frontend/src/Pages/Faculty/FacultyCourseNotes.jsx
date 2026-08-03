import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, File, FileText, Image as ImageIcon, Printer, RefreshCw, X } from 'lucide-react'
import FacultyNavbar from '../../Components/Faculty/FacultyNavbar'
import PageTour from '../../Components/Tour/PageTour'
import printDriveFile from '../../utils/printDriveFile'
import facultyCourseNotesPageTour from '../Tour/Faculty/FacultyCourseNotesPageTour'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const getFileTypeLabel = (mimeType) => {
  const fileType = String(mimeType || '').split('/').pop()

  return fileType ? fileType.toUpperCase() : 'FILE'
}

const getFileIcon = (mimeType) => {
  const normalizedMimeType = String(mimeType || '').toLowerCase()

  if (normalizedMimeType.includes('image')) {
    return <ImageIcon className="h-6 w-6 text-emerald-500" />
  }

  if (normalizedMimeType.includes('pdf') || normalizedMimeType.includes('document') || normalizedMimeType.includes('word')) {
    return <FileText className="h-6 w-6 text-red-500" />
  }

  return <File className="h-6 w-6 text-slate-500" />
}

const getSyncStatusClass = (status) => {
  if (status === 'synced') {
    return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
  }

  if (status === 'failed') {
    return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
  }

  return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
}

const getStatusLabel = (status) => {
  if (status === 'synced') {
    return 'Synced'
  }

  if (status === 'failed') {
    return 'Sync Failed'
  }

  return 'Pending'
}

const FacultyCourseNotes = () => {
  const { courseId } = useParams()
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [course, setCourse] = useState(null)
  const [notes, setNotes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePreviewFile, setActivePreviewFile] = useState(null)

  useEffect(() => {
    if (activePreviewFile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActivePreviewFile(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activePreviewFile])

  const fetchCourseNotes = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoading(true)
      setError('')
    }

    try {
      const courseResponse = await axios.get(`${API_BASE_URL}/faculty/courses/${courseId}`, {
        withCredentials: true,
      })

      if (!courseResponse.data?.success) {
        throw new Error(courseResponse.data?.message || 'Unable to fetch course')
      }

      let noteData = null

      try {
        const notesResponse = await axios.get(`${API_BASE_URL}/faculty/courses/${courseId}/notes`, {
          withCredentials: true,
        })

        if (!notesResponse.data?.success) {
          throw new Error(notesResponse.data?.message || 'Unable to fetch notes')
        }

        noteData = notesResponse.data?.data?.note || null
      } catch (notesError) {
        if (notesError?.response?.status !== 404) {
          throw notesError
        }
      }

      if (shouldUpdate()) {
        setCourse(courseResponse.data?.data?.course || null)
        setNotes(noteData)
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

      setCourse(null)
      setNotes(null)
      setError(getErrorMessage(fetchError, 'Unable to load course notes. Please try again.'))
    } finally {
      if (shouldUpdate()) {
        setLoading(false)
      }
    }
  }, [clearAuth, courseId])

  useEffect(() => {
    let isActive = true

    const verifyFacultyAndFetchCourseNotes = async () => {
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
        setCheckingAuth(false)
        await fetchCourseNotes({ shouldUpdate: () => isActive })
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

    verifyFacultyAndFetchCourseNotes()

    return () => {
      isActive = false
    }
  }, [clearAuth, fetchCourseNotes, setAuth])

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized || auth.role !== 'faculty') {
    return <Navigate to="/login" replace />
  }

  const files = notes?.files || []

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <FacultyNavbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              to="/faculty/notes"
              data-tour="faculty-course-notes-back"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Notes
            </Link>
            <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Course Notes
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
              {course?.title || 'Course notes'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {notes?.title || 'Chapter-wise notes synced for this course.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PageTour steps={facultyCourseNotesPageTour} />

            <button
              type="button"
              onClick={() => fetchCourseNotes()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error ? (
          <section className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-6 py-10 text-center shadow-sm">
            <h2 className="text-lg font-bold text-red-800 dark:text-red-200">Course notes unavailable</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-red-700 dark:text-red-300">
              {error}
            </p>
            <button
              type="button"
              onClick={() => fetchCourseNotes()}
              disabled={loading}
              className="mt-5 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {loading ? 'Retrying...' : 'Retry'}
            </button>
          </section>
        ) : loading ? (
          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading course notes...</p>
          </section>
        ) : notes ? (
          <section data-tour="faculty-course-notes" className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Chapters</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {files.length} {files.length === 1 ? 'chapter' : 'chapters'} available
                </p>
              </div>
              <span className={`inline-flex self-start rounded-full px-2.5 py-1 text-xs font-semibold sm:self-auto ${getSyncStatusClass(notes.syncStatus)}`}>
                {getStatusLabel(notes.syncStatus)}
              </span>
            </div>

            {files.length ? (
              <div className="grid gap-3">
                {files.map((file, index) => (
                  <div
                    key={file.fileId}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      onClick={() => setActivePreviewFile(file)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900">
                        {getFileIcon(file.mimeType)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-indigo-600">
                          Chapter {index + 1}
                        </span>
                        <span className="mt-1 block truncate text-sm font-bold text-slate-900 dark:text-slate-100" title={file.name}>
                          {file.name}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                          {getFileTypeLabel(file.mimeType)}
                        </span>
                      </span>
                    </button>

                    <div className="flex shrink-0 gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setActivePreviewFile(file)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-100 dark:hover:bg-indigo-900/40 sm:flex-none"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => printDriveFile(file)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 sm:flex-none"
                      >
                        <Printer className="h-4 w-4" />
                        Print
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">No chapters found</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                  This notes folder is configured, but no synced files are available yet.
                </p>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">No notes configured</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
              This course does not have notes available yet.
            </p>
          </section>
        )}
      </main>

      {activePreviewFile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-3 sm:p-6">
          <button
            type="button"
            aria-label="Close preview"
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            onClick={() => setActivePreviewFile(null)}
          />

          <div className="relative z-10 flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100" title={activePreviewFile.name}>
                  {activePreviewFile.name}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {getFileTypeLabel(activePreviewFile.mimeType)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewFile(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 bg-slate-950">
              <iframe
                src={`https://drive.google.com/file/d/${activePreviewFile.fileId}/preview`}
                title={activePreviewFile.name}
                className="h-full w-full border-0"
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default FacultyCourseNotes
