import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import UserCourseCard from '../../Components/User/UserCourseCard'
import UserNavbar from '../../Components/User/UserNavbar'
import { useAuth } from '../../Context/AuthContext'

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
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [error, setError] = useState('')

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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans">
        <p className="text-sm font-semibold text-slate-600">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized || auth.role !== 'user') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <UserNavbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              User Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">My Courses</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Courses assigned to {auth.phone} are shown here.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchCourses()}
            disabled={loadingCourses}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {loadingCourses ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error ? (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchCourses()}
              disabled={loadingCourses}
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:text-red-300"
            >
              Retry
            </button>
          </div>
        ) : null}

        {loadingCourses ? (
          <section className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Loading your courses...</p>
          </section>
        ) : courses.length ? (
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <UserCourseCard
                key={course._id}
                course={course}
                playerUrl={`/user/courses/${course._id}/player`}
              />
            ))}
          </section>
        ) : (
          <section className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">No courses assigned yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Your assigned courses will appear here when an admin gives you access.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

export default UserCoursesPage
