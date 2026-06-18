import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, BookOpen, FileText, RefreshCw } from 'lucide-react'
import CourseCatalogControls from '../../Components/Common/CourseCatalogControls'
import {
  defaultCourseCatalogFilters,
  getFilteredSortedCourses,
} from '../../Components/Common/courseCatalogFilters'
import FacultyNavbar from '../../Components/Faculty/FacultyNavbar'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

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

const FacultyNotes = () => {
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [coursesWithNotes, setCoursesWithNotes] = useState([])
  const [courseFilters, setCourseFilters] = useState(defaultCourseCatalogFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const filteredCourses = useMemo(
    () => getFilteredSortedCourses(coursesWithNotes, courseFilters),
    [coursesWithNotes, courseFilters],
  )

  const fetchCoursesWithNotes = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoading(true)
      setError('')
    }

    try {
      const coursesResponse = await axios.get(`${API_BASE_URL}/faculty/courses`, {
        withCredentials: true,
      })

      if (!coursesResponse.data?.success) {
        throw new Error(coursesResponse.data?.message || 'Unable to fetch courses')
      }

      const courses = coursesResponse.data?.data?.courses || []
      const noteResults = await Promise.all(courses.map(async (course) => {
        try {
          const notesResponse = await axios.get(`${API_BASE_URL}/faculty/courses/${course._id}/notes`, {
            withCredentials: true,
          })

          const note = notesResponse.data?.data?.note

          return notesResponse.data?.success && note ? { ...course, note } : null
        } catch (noteError) {
          if (noteError?.response?.status === 404) {
            return null
          }

          throw noteError
        }
      }))

      if (shouldUpdate()) {
        setCoursesWithNotes(noteResults.filter(Boolean))
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

      setCoursesWithNotes([])
      setError(getErrorMessage(fetchError, 'Unable to fetch notes courses. Please try again.'))
    } finally {
      if (shouldUpdate()) {
        setLoading(false)
      }
    }
  }, [clearAuth])

  useEffect(() => {
    let isActive = true

    const verifyFacultyAndFetchNotes = async () => {
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
        await fetchCoursesWithNotes({ shouldUpdate: () => isActive })
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

    verifyFacultyAndFetchNotes()

    return () => {
      isActive = false
    }
  }, [clearAuth, fetchCoursesWithNotes, setAuth])

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <FacultyNavbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Faculty Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Notes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Browse courses that currently have synced notes available.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchCoursesWithNotes()}
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
              onClick={() => fetchCoursesWithNotes()}
              disabled={loading}
              className="rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 transition hover:border-red-300 dark:hover:border-red-700 disabled:cursor-not-allowed disabled:text-red-300 dark:disabled:text-red-500"
            >
              Retry
            </button>
          </div>
        ) : null}

        {!loading && coursesWithNotes.length ? (
          <CourseCatalogControls
            courses={coursesWithNotes}
            filters={courseFilters}
            resultCount={filteredCourses.length}
            onFiltersChange={setCourseFilters}
          />
        ) : null}

        {loading ? (
          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading notes...</p>
          </section>
        ) : coursesWithNotes.length ? (
          filteredCourses.length ? (
            <section className="grid gap-5 lg:grid-cols-2">
              {filteredCourses.map((course) => (
                <Link
                  key={course._id}
                  to={`/faculty/notes/${course._id}`}
                  className="flex h-full flex-col rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 sm:w-44 sm:shrink-0">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={`${course.title} thumbnail`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 text-4xl font-bold text-indigo-200">
                          J
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="line-clamp-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                          {course.title}
                        </h2>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getSyncStatusClass(course.note.syncStatus)}`}>
                          {getStatusLabel(course.note.syncStatus)}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {course.shortDescription || course.description || 'Course details are not available.'}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
                          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            <BookOpen className="h-3.5 w-3.5" />
                            Chapters
                          </p>
                          <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
                            {course.note.files?.length || 0}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
                          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            <FileText className="h-3.5 w-3.5" />
                            Notes
                          </p>
                          <p className="mt-1 truncate font-semibold text-slate-800 dark:text-slate-100">
                            {course.note.title}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 inline-flex items-center gap-2 self-start text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                        Open chapters
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </section>
          ) : (
            <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">No matching notes</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                Adjust your search, filters, or sorting to find a notes course.
              </p>
            </section>
          )
        ) : (
          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">No notes available yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
              Courses will appear here after notes are configured and synced.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

export default FacultyNotes
