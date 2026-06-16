import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import FacultyNavbar from '../../Components/Faculty/FacultyNavbar'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const getCount = (value) => {
  const count = Number(value)

  return Number.isFinite(count) && count > 0 ? count : 0
}

const getDurationLabel = (course) => (
  course?.isOpenToAll || !course?.duration ? 'N/A' : `${course.duration} mo`
)

const getPriceLabel = (value) => {
  const price = Number(value)

  if (!Number.isFinite(price)) {
    return 'N/A'
  }

  return price === 0 ? 'Free' : price
}

const getYoutubeVideoId = (value) => {
  const rawValue = String(value || '').trim()

  if (!rawValue) {
    return ''
  }

  try {
    const parsedUrl = new URL(rawValue.includes('://') ? rawValue : `https://${rawValue}`)

    if (parsedUrl.hostname.includes('youtu.be')) {
      return parsedUrl.pathname.split('/').filter(Boolean)[0] || ''
    }

    return parsedUrl.searchParams.get('v') || ''
  } catch {
    return ''
  }
}

const getYoutubeEmbedUrl = (youtubeVideoId) => {
  if (!youtubeVideoId) {
    return ''
  }

  const params = new URLSearchParams({
    controls: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    playsinline: '1',
    disablekb: '0',
    fs: '1',
  })

  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeVideoId)}?${params.toString()}`
}

const getPlayerSrc = (playerPath) => (
  playerPath?.startsWith('http') ? playerPath : `${API_BASE_URL}${playerPath || ''}`
)

const getVideoPosition = (video, index) => {
  const position = Number(video?.position)

  return Number.isFinite(position) && position >= 0 ? position : index
}

const getVideoKey = (chapter, video, index) => (
  video?.id || `${chapter._id}:${getVideoPosition(video, index)}`
)

const getVideoPlayerPath = (courseId, chapter, video, index) => {
  if (video?.playerPath) {
    return video.playerPath
  }

  if (video?.embedUrl) {
    return video.embedUrl
  }

  const youtubeVideoId = video?.youtubeVideoId || getYoutubeVideoId(video?.watchUrl)

  if (youtubeVideoId) {
    return getYoutubeEmbedUrl(youtubeVideoId)
  }

  if (courseId && chapter?._id) {
    return `/faculty/courses/${courseId}/chapters/${chapter._id}/videos/${getVideoPosition(video, index)}/embed`
  }

  return ''
}

const sortChapters = (chapters) => [...chapters].sort((first, second) => {
  const firstOrder = Number.isFinite(Number(first.order)) ? Number(first.order) : 0
  const secondOrder = Number.isFinite(Number(second.order)) ? Number(second.order) : 0

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder
  }

  return new Date(first.createdAt || 0) - new Date(second.createdAt || 0)
})

const normalizeChapters = (chapters, courseId) => sortChapters(chapters || []).map((chapter) => ({
  ...chapter,
  videos: (chapter.videos || []).map((video, index) => ({
    ...video,
    id: getVideoKey(chapter, video, index),
    title: video.title || `Lesson ${index + 1}`,
    duration: video.duration || '',
    playerPath: getVideoPlayerPath(courseId, chapter, video, index),
  })),
}))

const getCourseVideos = (chapters) => (
  chapters.flatMap((chapter) => (
    (chapter.videos || []).map((video) => ({
      key: video.id,
      chapter,
      video,
    }))
  ))
)

const CourseSummary = ({ course }) => {
  const courseTags = [course.category, course.level, course.language].filter(Boolean)

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={`${course.title} thumbnail`}
            className="h-36 w-full rounded-lg object-cover lg:w-56"
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center rounded-lg bg-indigo-50 text-3xl font-bold text-indigo-200 lg:w-56">
            J
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              course.isPublished
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
            >
              {course.isPublished ? 'Published' : 'Draft'}
            </span>
            {course.isOpenToAll ? (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Open to All
              </span>
            ) : null}
          </div>

          {course.slug ? (
            <p className="mt-2 text-sm font-medium text-slate-500">{course.slug}</p>
          ) : null}

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            {course.shortDescription || course.description || 'Course details are not available.'}
          </p>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-5">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Price
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">{getPriceLabel(course.price)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Duration
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">{getDurationLabel(course)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Chapters
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">{getCount(course.chapterCount)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Videos
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">{getCount(course.videoCount)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Access
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {course.isOpenToAll ? 'All' : getCount(course.accessUserCount)}
              </p>
            </div>
          </div>

          {courseTags.length ? (
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              {courseTags.map((tag, index) => (
                <span key={`${tag}-${index}`} className="rounded-full bg-slate-100 px-2 py-1">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

const FacultyCourseSidebar = ({
  chapters,
  selectedVideoKey,
  onSelectVideo,
}) => {
  const activeChapterId = useMemo(() => {
    const chapterWithSelectedVideo = chapters.find((chapter) => (
      (chapter.videos || []).some((video) => video.id === selectedVideoKey)
    ))

    if (chapterWithSelectedVideo) {
      return chapterWithSelectedVideo._id
    }

    const selectedChapterId = selectedVideoKey.split(':')[0]

    if (selectedChapterId && chapters.some((chapter) => chapter._id === selectedChapterId)) {
      return selectedChapterId
    }

    const firstChapterWithVideos = chapters.find((chapter) => chapter.videos?.length)

    return firstChapterWithVideos?._id || chapters[0]?._id || ''
  }, [chapters, selectedVideoKey])

  const [browsedChapterId, setBrowsedChapterId] = useState('')
  const [collapsedActiveChapterId, setCollapsedActiveChapterId] = useState('')
  const browsedChapterExists = chapters.some((chapter) => chapter._id === browsedChapterId)
  const activeChapterIsCollapsed = collapsedActiveChapterId === activeChapterId
  const openChapterId = browsedChapterExists
    ? browsedChapterId
    : activeChapterIsCollapsed ? '' : activeChapterId

  const toggleChapter = (chapterId) => {
    if (openChapterId === chapterId) {
      setBrowsedChapterId('')
      setCollapsedActiveChapterId(chapterId === activeChapterId ? chapterId : '')
      return
    }

    setCollapsedActiveChapterId('')
    setBrowsedChapterId(chapterId === activeChapterId ? '' : chapterId)
  }

  const handleSelectVideo = (videoKey) => {
    setBrowsedChapterId('')
    setCollapsedActiveChapterId('')
    onSelectVideo(videoKey)
  }

  return (
    <aside className="flex h-[70vh] max-h-170 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)] lg:max-h-190">
      <div className="shrink-0 border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-900">Chapters</h2>
        <p className="mt-1 text-sm text-slate-500">
          Select a lesson to start watching.
        </p>
      </div>

      {chapters.length ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {chapters.map((chapter, chapterIndex) => {
            const videos = chapter.videos || []
            const isOpen = chapter._id === openChapterId
            const isActiveChapter = chapter._id === activeChapterId

            return (
              <section key={chapter._id} className="overflow-hidden rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => toggleChapter(chapter._id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-indigo-600">
                      Chapter {chapterIndex + 1}
                    </span>
                    <span className="mt-1 block truncate text-sm font-bold text-slate-900">
                      {chapter.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-slate-500">
                    {isOpen ? 'Collapse' : isActiveChapter ? 'Current' : `${videos.length || chapter.videoCount || 0} videos`}
                  </span>
                </button>

                {isOpen ? (
                  videos.length ? (
                    <div className="space-y-2 bg-white p-2">
                      {videos.map((video, videoIndex) => {
                        const isSelected = selectedVideoKey === video.id

                        return (
                          <button
                            key={video.id}
                            type="button"
                            onClick={() => handleSelectVideo(video.id)}
                            className={`flex w-full gap-3 rounded-lg p-2 text-left transition ${
                              isSelected
                                ? 'bg-indigo-50 ring-1 ring-indigo-200'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {video.thumbnailUrl ? (
                              <img
                                src={video.thumbnailUrl}
                                alt=""
                                className="h-14 w-20 shrink-0 rounded-md object-cover"
                              />
                            ) : (
                              <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-400">
                                Video
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="line-clamp-2 text-sm font-semibold text-slate-900">
                                {video.title}
                              </span>
                              <span className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                                <span>Lesson {videoIndex + 1}</span>
                                {video.duration ? <span>{video.duration}</span> : null}
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="bg-white px-4 py-3 text-sm font-semibold text-slate-500">
                      No videos available.
                    </p>
                  )
                ) : null}
              </section>
            )
          })}
        </div>
      ) : (
        <p className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
          No chapters available.
        </p>
      )}
    </aside>
  )
}

const FacultyVideoPlayer = ({ course, selectedVideo }) => {
  if (!selectedVideo) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">No videos available</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          Videos will appear here after the course chapters are synced.
        </p>
      </section>
    )
  }

  const { chapter, video } = selectedVideo

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {video.playerPath ? (
        <div className="aspect-video bg-slate-950">
          <iframe
            key={video.playerPath}
            src={getPlayerSrc(video.playerPath)}
            title={video.title}
            className="h-full w-full"
            loading="eager"
            allow="accelerometer; autoplay; encrypted-media; fullscreen; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center bg-slate-100 px-6 text-center">
          <p className="text-sm font-semibold text-slate-500">
            Video preview unavailable.
          </p>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          {chapter.name}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {video.title}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {course?.title || 'Course'}
          </span>
          {video.duration ? (
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {video.duration}
            </span>
          ) : null}
          {video.watchUrl ? (
            <a
              href={video.watchUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 transition hover:bg-indigo-100"
            >
              Open video
            </a>
          ) : null}
        </div>
      </div>
    </section>
  )
}

const DetailsList = ({ title, items }) => {
  if (!items?.length) {
    return null
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

const FacultyCoursePage = () => {
  const { courseId } = useParams()
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [course, setCourse] = useState(null)
  const [chapters, setChapters] = useState([])
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [error, setError] = useState('')
  const [selectedVideoKey, setSelectedVideoKey] = useState('')

  const courseVideos = useMemo(() => getCourseVideos(chapters), [chapters])
  const selectedVideo = useMemo(() => (
    courseVideos.find((videoItem) => videoItem.key === selectedVideoKey) || null
  ), [courseVideos, selectedVideoKey])

  const fetchCourse = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingCourse(true)
      setError('')
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/faculty/courses/${courseId}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to fetch course')
      }

      if (shouldUpdate()) {
        const nextCourse = response.data?.data?.course || null
        const nextChapters = normalizeChapters(
          response.data?.data?.chapters || [],
          nextCourse?._id || courseId,
        )
        const nextCourseVideos = getCourseVideos(nextChapters)

        setCourse(nextCourse)
        setChapters(nextChapters)
        setSelectedVideoKey((currentVideoKey) => (
          nextCourseVideos.some((videoItem) => videoItem.key === currentVideoKey)
            ? currentVideoKey
            : nextCourseVideos[0]?.key || ''
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

    const verifyFacultyAndFetchCourse = async () => {
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

    verifyFacultyAndFetchCourse()

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

  if (!isAuthorized || auth.role !== 'faculty') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <FacultyNavbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            to="/faculty/courses"
            className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            Back to courses
          </Link>
          <button
            type="button"
            onClick={() => fetchCourse()}
            disabled={loadingCourse}
            className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {loadingCourse ? 'Refreshing...' : 'Refresh'}
          </button>
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
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center text-sm font-semibold text-slate-500">
            Loading course...
          </div>
        ) : course ? (
          <>
            <CourseSummary course={course} />

            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <div className="order-1 min-w-0 lg:order-2">
                <FacultyVideoPlayer
                  course={course}
                  selectedVideo={selectedVideo}
                />
              </div>
              <div className="order-2 lg:order-1">
                <FacultyCourseSidebar
                  chapters={chapters}
                  selectedVideoKey={selectedVideoKey}
                  onSelectVideo={setSelectedVideoKey}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {course.description ? (
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
                  <h2 className="text-lg font-bold text-slate-900">Description</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {course.description}
                  </p>
                </section>
              ) : null}
              <DetailsList title="Highlights" items={course.highlights} />
              <DetailsList title="Prerequisites" items={course.prerequisites} />
              <DetailsList title="Tags" items={course.tags} />
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-12 text-center text-sm font-semibold text-red-700">
            Course not found.
          </div>
        )}
      </main>
    </div>
  )
}

export default FacultyCoursePage
