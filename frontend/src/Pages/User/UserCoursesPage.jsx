import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import CourseCatalogControls from '../../Components/Common/CourseCatalogControls'
import CourseExpiryNotice from '../../Components/Common/CourseExpiryNotice'
import PageTour from '../../Components/Tour/PageTour'
import {
  defaultCourseCatalogFilters,
  getFilteredSortedCourses,
} from '../../Components/Common/courseCatalogFilters'
import UserCourseCard from '../../Components/User/UserCourseCard'
import UserNavbar from '../../Components/User/UserNavbar'
import userCoursesPageTour from '../Tour/User/UserCoursesPageTour'
import { useAuth } from '../../Context/AuthContext'
import { getCourseExpiryWarning } from '../../utils/courseAccess'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const UserCoursesPage = () => {
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

  // Read off every course rather than the filtered grid: a deadline does not stop
  // mattering because a search is narrowing the page, and the soonest one is the one
  // worth leading with.
  const expirySummary = useMemo(() => {
    const expiringCourses = courses
      .map((course) => ({ course, warning: getCourseExpiryWarning(course) }))
      .filter((entry) => entry.warning)
      .sort((first, second) => first.warning.daysRemaining - second.warning.daysRemaining)

    if (!expiringCourses.length) {
      return null
    }

    const [mostUrgent] = expiringCourses

    if (expiringCourses.length === 1) {
      return {
        warning: mostUrgent.warning,
        title: `${mostUrgent.course.title}: ${mostUrgent.warning.chipLabel.toLowerCase()}`,
        detail: mostUrgent.warning.detail,
      }
    }

    return {
      warning: mostUrgent.warning,
      title: `${expiringCourses.length} of your courses are ending soon`,
      detail: `${mostUrgent.course.title} is the first to close (${mostUrgent.warning.chipLabel.toLowerCase()}).`,
    }
  }, [courses])

  const fetchCourses = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingCourses(true)
      setError('')
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/user/courses`, {
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
      setError(getErrorMessage(fetchError, 'Unable to fetch your courses. Please try again.'))
    } finally {
      if (shouldUpdate()) {
        setLoadingCourses(false)
      }
    }
  }, [clearAuth])

  useEffect(() => {
    let isActive = true

    const verifyUserAndFetchCourses = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user/profile`, {
          withCredentials: true,
        })

        const user = response.data?.data?.user

        if (!response.data?.success || user?.role !== 'user') {
          throw new Error('Unauthorized user')
        }

        if (!isActive) {
          return
        }

        setAuth({
          role: 'user',
          phone: user.phone,
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

    verifyUserAndFetchCourses()

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

  if (!isAuthorized || auth.role !== 'user') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <UserNavbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              User Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">My Courses</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Courses available to {auth.phone} are shown here.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PageTour steps={userCoursesPageTour} />

            <button
              type="button"
              data-tour="course-refresh"
              onClick={() => fetchCourses()}
              disabled={loadingCourses}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-300 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
            >
              {loadingCourses ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
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

        {!loadingCourses && expirySummary ? (
          <CourseExpiryNotice
            warning={expirySummary.warning}
            title={expirySummary.title}
            detail={expirySummary.detail}
            className="mb-6"
          />
        ) : null}

        {!loadingCourses && courses.length ? (
          <CourseCatalogControls
            accent="blue"
            courses={courses}
            filters={courseFilters}
            resultCount={filteredCourses.length}
            onFiltersChange={setCourseFilters}
          />
        ) : null}

        {loadingCourses ? (
          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading your courses...</p>
          </section>
        ) : courses.length ? (
          filteredCourses.length ? (
            <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCourses.map((course, index) => (
                <UserCourseCard
                  key={course._id}
                  course={course}
                  dataTour={index ? undefined : 'course-card'}
                  playerUrl={`/user/courses/${course._id}/player`}
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
              Available courses will appear here when they are published or assigned to you.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

export default UserCoursesPage
