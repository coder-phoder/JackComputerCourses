import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import UserCourseSidebar from '../../Components/User/UserCourseSidebar'
import UserVideoPlayer from '../../Components/User/UserVideoPlayer'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const isAuthError = (error) => [401].includes(error?.response?.status)

const getPlayableVideos = (chapters) => (
  chapters.flatMap((chapter) => (
    (chapter.videos || []).map((video) => ({
      key: video.id,
      chapter,
      video,
    }))
  ))
)

const UserCoursePlayerPage = () => {
  const { courseId } = useParams()
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [course, setCourse] = useState(null)
  const [chapters, setChapters] = useState([])
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [error, setError] = useState('')
  const [selectedVideoKey, setSelectedVideoKey] = useState('')

  const playableVideos = useMemo(() => getPlayableVideos(chapters), [chapters])
  const selectedVideo = useMemo(() => (
    playableVideos.find((videoItem) => videoItem.key === selectedVideoKey) || null
  ), [playableVideos, selectedVideoKey])

  const fetchCourse = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingCourse(true)
      setError('')
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/user/courses/${courseId}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to fetch course')
      }

      if (shouldUpdate()) {
        const nextCourse = response.data?.data?.course || null
        const nextChapters = response.data?.data?.chapters || []
        const nextPlayableVideos = getPlayableVideos(nextChapters)

        setCourse(nextCourse)
        setChapters(nextChapters)
        setSelectedVideoKey((currentVideoKey) => (
          nextPlayableVideos.some((videoItem) => videoItem.key === currentVideoKey)
            ? currentVideoKey
            : nextPlayableVideos[0]?.key || ''
        ))
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
      setChapters([])
      setError(getErrorMessage(fetchError, 'Unable to load this course. Please try again.'))
    } finally {
      if (shouldUpdate()) {
        setLoadingCourse(false)
      }
    }
  }, [clearAuth, courseId])

  useEffect(() => {
    let isActive = true

    const verifyUserAndFetchCourse = async () => {
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
        await fetchCourse({ shouldUpdate: () => isActive })
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

    verifyUserAndFetchCourse()

    return () => {
      isActive = false
    }
  }, [clearAuth, fetchCourse, setAuth])

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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Course Player
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {course?.title || 'Loading course...'}
            </h1>
          </div>
          <Link
            to="/user/courses"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            My Courses
          </Link>
        </div>

        {error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center shadow-sm">
            <h2 className="text-lg font-bold text-red-800">Course unavailable</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-red-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => fetchCourse()}
              disabled={loadingCourse}
              className="mt-5 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {loadingCourse ? 'Retrying...' : 'Retry'}
            </button>
          </section>
        ) : loadingCourse ? (
          <section className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Loading course player...</p>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="order-1 min-w-0 lg:order-2">
              <UserVideoPlayer
                course={course}
                selectedVideo={selectedVideo}
              />
            </div>
            <div className="order-2 lg:order-1">
              <UserCourseSidebar
                chapters={chapters}
                selectedVideoKey={selectedVideoKey}
                onSelectVideo={setSelectedVideoKey}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default UserCoursePlayerPage
