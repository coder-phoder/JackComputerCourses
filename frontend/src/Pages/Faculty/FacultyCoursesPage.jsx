import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import CourseCatalogControls from '../../Components/Common/CourseCatalogControls'
import {
  defaultCourseCatalogFilters,
  getFilteredSortedCourses,
} from '../../Components/Common/courseCatalogFilters'
import FacultyCourseCard from '../../Components/Faculty/FacultyCourseCard'
import FacultyNavbar from '../../Components/Faculty/FacultyNavbar'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const FacultyCoursesPage = () => {
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [courses, setCourses] = useState([])
  const [courseFilters, setCourseFilters] = useState(defaultCourseCatalogFilters)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [error, setError] = useState('')

  const filteredCourses = useMemo(
    () => getFilteredSortedCourses(courses, courseFilters),
    [courses, courseFilters],
  )

  const fetchCourses = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingCourses(true)
      setError('')
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/faculty/courses`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to fetch courses')
      }

      if (shouldUpdate()) {
        setCourses(response.data?.data?.courses || [])
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

      setCourses([])
      setError(getErrorMessage(fetchError, 'Unable to fetch courses. Please try again.'))
    } finally {
      if (shouldUpdate()) {
        setLoadingCourses(false)
      }
    }
  }, [clearAuth])

  useEffect(() => {
    let isActive = true

    const verifyFacultyAndFetchCourses = async () => {
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
        await fetchCourses({ shouldUpdate: () => isActive })
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

    verifyFacultyAndFetchCourses()

    return () => {
      isActive = false
    }
  }, [clearAuth, fetchCourses, setAuth])

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

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Faculty Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Courses</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Browse every course available on the website.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchCourses()}
            disabled={loadingCourses}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
          >
            {loadingCourses ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error ? (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchCourses()}
              disabled={loadingCourses}
              className="rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 transition hover:border-red-300 dark:hover:border-red-700 disabled:cursor-not-allowed disabled:text-red-300 dark:disabled:text-red-500"
            >
              Retry
            </button>
          </div>
        ) : null}

        {!loadingCourses && courses.length ? (
          <CourseCatalogControls
            courses={courses}
            filters={courseFilters}
            resultCount={filteredCourses.length}
            onFiltersChange={setCourseFilters}
          />
        ) : null}

        {loadingCourses ? (
          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading courses...</p>
          </section>
        ) : courses.length ? (
          filteredCourses.length ? (
            <section className="grid gap-5 lg:grid-cols-2">
              {filteredCourses.map((course) => (
                <FacultyCourseCard
                  key={course._id}
                  course={course}
                  detailUrl={`/faculty/courses/${course._id}`}
                />
              ))}
            </section>
          ) : (
            <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">No matching courses</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                Adjust your search, filters, or sorting to find a course.
              </p>
            </section>
          )
        ) : (
          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">No courses available yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
              Courses will appear here after they are added to the website.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

export default FacultyCoursesPage
