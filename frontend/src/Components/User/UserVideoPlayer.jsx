import { useEffect, useMemo, useRef } from 'react'

const API_BASE_URL = import.meta.env.VITE_BASE_URL
const VIDEO_EVENT_SOURCE = 'jack-course-player'

const getPlayerSrc = (playerPath, shouldAutoplay) => {
  if (!playerPath) {
    return ''
  }

  const baseSrc = playerPath.startsWith('http') ? playerPath : `${API_BASE_URL}${playerPath}`

  if (!shouldAutoplay) {
    return baseSrc
  }

  return `${baseSrc}${baseSrc.includes('?') ? '&' : '?'}autoplay=1`
}

const getOrigin = (url) => {
  try {
    return new URL(url, window.location.origin).origin
  } catch {
    return ''
  }
}

const UserVideoPlayer = ({
  course,
  selectedVideo,
  shouldAutoplay = false,
  onVideoEnded,
  className = '',
}) => {
  const frameRef = useRef(null)
  const videoKey = selectedVideo?.key || ''
  const playerSrc = useMemo(
    () => getPlayerSrc(selectedVideo?.video?.playerPath, shouldAutoplay),
    [selectedVideo, shouldAutoplay],
  )

  useEffect(() => {
    if (!playerSrc || !videoKey || !onVideoEnded) {
      return undefined
    }

    const playerOrigin = getOrigin(playerSrc)

    const handleMessage = (event) => {
      if (playerOrigin && event.origin !== playerOrigin) {
        return
      }

      if (event.source !== frameRef.current?.contentWindow) {
        return
      }

      const message = event.data

      if (message?.source !== VIDEO_EVENT_SOURCE || message?.type !== 'video-ended') {
        return
      }

      if (message.videoKey && message.videoKey !== videoKey) {
        return
      }

      onVideoEnded(videoKey)
    }

    window.addEventListener('message', handleMessage)

    return () => window.removeEventListener('message', handleMessage)
  }, [onVideoEnded, playerSrc, videoKey])

  if (!selectedVideo) {
    return (
      <section className={`rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm ${className}`}>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">No videos available</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
          Videos will appear here after the course chapters are synced.
        </p>
      </section>
    )
  }

  const { chapter, video } = selectedVideo

  return (
    <section className={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}>
      <div className="min-h-0 flex-1 bg-slate-950">
        <iframe
          key={video.playerPath}
          ref={frameRef}
          src={playerSrc}
          title={video.title}
          className="h-full w-full"
          loading="eager"
          allow="accelerometer; autoplay; encrypted-media; fullscreen; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allowFullScreen
        />
      </div>

      <div className="shrink-0 p-4 sm:p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          {chapter.name}
        </p>
        <h1 className="mt-2 line-clamp-2 text-xl font-bold text-slate-900 dark:text-slate-100">
          {video.title}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1">
            {course?.title || 'Course'}
          </span>
          {video.duration ? (
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1">
              {video.duration}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default UserVideoPlayer
